"""
VirusTotal API v3 Integration.
Queries VirusTotal for multi-engine URL reputation, security engine verdicts,
and threat classifications while respecting rate limits and quotas.
"""
import os
import base64
import requests
from typing import Dict, Any, Optional

VT_API_BASE = "https://www.virustotal.com/api/v3"


class VirusTotalService:
    def __init__(self):
        self.api_key = os.getenv("VIRUSTOTAL_API_KEY", "").strip()

    def is_configured(self) -> bool:
        return bool(self.api_key and not self.api_key.startswith("your-"))

    @staticmethod
    def get_url_id(url: str) -> str:
        """
        Calculates the VirusTotal URL identifier (base64url encoded without '=' padding).
        """
        return base64.urlsafe_b64encode(url.encode("utf-8")).decode("utf-8").rstrip("=")

    def get_url_report(self, url: str) -> Dict[str, Any]:
        """
        Fetches existing scan report from VirusTotal.
        Does not consume URL scan submission quota if report already exists.
        """
        if not self.is_configured():
            return {
                "provider": "virustotal",
                "configured": False,
                "status": "unavailable",
                "has_report": False,
                "summary": "VirusTotal API key is not configured.",
                "disclaimer": "Multi-engine reputation lookup was skipped."
            }

        url_id = self.get_url_id(url)
        headers = {
            "x-apikey": self.api_key,
            "Accept": "application/json"
        }

        try:
            resp = requests.get(
                f"{VT_API_BASE}/urls/{url_id}",
                headers=headers,
                timeout=5
            )

            if resp.status_code == 200:
                data = resp.json().get("data", {})
                attributes = data.get("attributes", {})
                stats = attributes.get("last_analysis_stats", {})

                malicious = stats.get("malicious", 0)
                suspicious = stats.get("suspicious", 0)
                harmless = stats.get("harmless", 0)
                undetected = stats.get("undetected", 0)
                total = malicious + suspicious + harmless + undetected

                categories = attributes.get("categories", {})
                reputation = attributes.get("reputation", 0)
                last_analysis_date = attributes.get("last_analysis_date")

                is_flagged = (malicious + suspicious) > 0

                return {
                    "provider": "virustotal",
                    "configured": True,
                    "status": "report_found",
                    "has_report": True,
                    "scan_type": "existing_report",
                    "is_flagged": is_flagged,
                    "malicious_count": malicious,
                    "suspicious_count": suspicious,
                    "harmless_count": harmless,
                    "undetected_count": undetected,
                    "total_engines": total,
                    "detection_ratio": f"{malicious + suspicious}/{total}" if total > 0 else "0/0",
                    "reputation_score": reputation,
                    "categories": categories,
                    "last_analysis_date": last_analysis_date,
                    "summary": f"{malicious + suspicious} of {total} security vendors flagged this URL as malicious/suspicious." if total > 0 else "No engines flagged this URL.",
                    "disclaimer": "Aggregated results across 70+ antivirus and threat intelligence engines."
                }

            elif resp.status_code == 404:
                return {
                    "provider": "virustotal",
                    "configured": True,
                    "status": "not_found",
                    "has_report": False,
                    "scan_type": "none",
                    "malicious_count": 0,
                    "suspicious_count": 0,
                    "total_engines": 0,
                    "summary": "URL has not been previously analyzed in VirusTotal database.",
                    "disclaimer": "Absence of prior scan reports does not imply safety."
                }
            elif resp.status_code == 429:
                return {
                    "provider": "virustotal",
                    "configured": True,
                    "status": "rate_limited",
                    "has_report": False,
                    "summary": "VirusTotal API rate limit or quota exceeded.",
                    "disclaimer": "Standard VT public API allows 4 requests/minute, 500 requests/day."
                }
            elif resp.status_code in (401, 403):
                return {
                    "provider": "virustotal",
                    "configured": True,
                    "status": "auth_error",
                    "has_report": False,
                    "summary": f"VirusTotal authentication failed ({resp.status_code}). Check VIRUSTOTAL_API_KEY.",
                    "disclaimer": "Invalid API key."
                }
            else:
                return {
                    "provider": "virustotal",
                    "configured": True,
                    "status": "service_error",
                    "has_report": False,
                    "summary": f"VirusTotal returned HTTP {resp.status_code}.",
                    "disclaimer": "Service error occurred during report retrieval."
                }

        except requests.exceptions.Timeout:
            return {
                "provider": "virustotal",
                "configured": True,
                "status": "timeout",
                "has_report": False,
                "summary": "VirusTotal request timed out.",
                "disclaimer": "Timeout occurred."
            }
        except Exception as e:
            return {
                "provider": "virustotal",
                "configured": True,
                "status": "error",
                "has_report": False,
                "summary": f"VirusTotal query failed: {str(e)}",
                "disclaimer": "Error occurred."
            }
