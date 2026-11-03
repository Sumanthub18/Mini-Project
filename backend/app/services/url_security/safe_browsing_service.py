"""
Google Safe Browsing API v4 Integration.
Checks URLs against Google's threat databases for malware, phishing,
social engineering, and unwanted software.
"""
import os
import requests
from typing import Dict, Any, List

SAFE_BROWSING_ENDPOINT = "https://safebrowsing.googleapis.com/v4/threatMatches:find"
THREAT_TYPES = [
    "MALWARE",
    "SOCIAL_ENGINEERING",
    "UNWANTED_SOFTWARE",
    "POTENTIALLY_HARMFUL_APPLICATION"
]


class SafeBrowsingService:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_SAFE_BROWSING_API_KEY", "").strip()

    def is_configured(self) -> bool:
        return bool(self.api_key and not self.api_key.startswith("your-"))

    def check_url(self, url: str) -> Dict[str, Any]:
        """
        Queries Google Safe Browsing v4 threatMatches:find API.
        """
        if not self.is_configured():
            return {
                "provider": "google_safe_browsing",
                "configured": False,
                "status": "unavailable",
                "match_found": False,
                "matches": [],
                "summary": "Google Safe Browsing API key is not configured.",
                "disclaimer": "Threat intelligence lookup via Google Safe Browsing was skipped."
            }

        headers = {"Content-Type": "application/json"}
        payload = {
            "client": {
                "clientId": "scam-or-safe-threat-intel",
                "clientVersion": "1.0.0"
            },
            "threatInfo": {
                "threatTypes": THREAT_TYPES,
                "platformTypes": ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries": [{"url": url}]
            }
        }

        try:
            resp = requests.post(
                f"{SAFE_BROWSING_ENDPOINT}?key={self.api_key}",
                json=payload,
                headers=headers,
                timeout=5
            )

            if resp.status_code == 200:
                data = resp.json()
                raw_matches = data.get("matches", [])
                if raw_matches:
                    formatted_matches = []
                    for m in raw_matches:
                        formatted_matches.append({
                            "threat_type": m.get("threatType"),
                            "platform_type": m.get("platformType"),
                            "threat_entry_type": m.get("threatEntryType"),
                            "cache_duration": m.get("cacheDuration", "300s")
                        })
                    return {
                        "provider": "google_safe_browsing",
                        "configured": True,
                        "status": "threat_detected",
                        "match_found": True,
                        "threat_count": len(formatted_matches),
                        "matches": formatted_matches,
                        "primary_threat": formatted_matches[0]["threat_type"],
                        "summary": f"Identified as {formatted_matches[0]['threat_type']} by Google Safe Browsing.",
                        "disclaimer": "This URL is listed on Google's threat database."
                    }
                else:
                    return {
                        "provider": "google_safe_browsing",
                        "configured": True,
                        "status": "no_match_found",
                        "match_found": False,
                        "threat_count": 0,
                        "matches": [],
                        "summary": "No threat matches found in Google Safe Browsing database.",
                        "disclaimer": "Absence of a match does not guarantee safety. Newly crafted or targeted phishing pages may not yet be indexed."
                    }

            elif resp.status_code in (400, 403):
                return {
                    "provider": "google_safe_browsing",
                    "configured": True,
                    "status": "auth_error",
                    "match_found": False,
                    "matches": [],
                    "summary": f"Google Safe Browsing API returned authentication error ({resp.status_code}).",
                    "disclaimer": "Check that GOOGLE_SAFE_BROWSING_API_KEY is valid and enabled in Google Cloud Console."
                }
            else:
                return {
                    "provider": "google_safe_browsing",
                    "configured": True,
                    "status": "service_error",
                    "match_found": False,
                    "matches": [],
                    "summary": f"Safe Browsing API returned status {resp.status_code}.",
                    "disclaimer": "Service temporarily unavailable."
                }

        except requests.exceptions.Timeout:
            return {
                "provider": "google_safe_browsing",
                "configured": True,
                "status": "timeout",
                "match_found": False,
                "matches": [],
                "summary": "Google Safe Browsing request timed out.",
                "disclaimer": "Network timeout occurred while querying Safe Browsing."
            }
        except Exception as e:
            return {
                "provider": "google_safe_browsing",
                "configured": True,
                "status": "error",
                "match_found": False,
                "matches": [],
                "summary": f"Safe Browsing lookup failed: {str(e)}",
                "disclaimer": "Error occurred during threat lookup."
            }
