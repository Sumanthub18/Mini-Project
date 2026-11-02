"""
Google Fact Check Tools API Service.
Queries official fact-check records, extracts publisher textual verdicts, and cites certified reviews.
"""
import os
import requests
from typing import Dict, Any, List

FACTCHECK_API_URL = "https://factchecktools.googleapis.com/v1alpha1/claims:search"


class FactCheckService:
    def __init__(self):
        # Allow dedicated GOOGLE_FACT_CHECK_API_KEY or fallback to GEMINI_API_KEY
        self.api_key = (
            os.getenv("GOOGLE_FACT_CHECK_API_KEY", "").strip() or
            os.getenv("GEMINI_API_KEY", "").strip()
        )

    def is_configured(self) -> bool:
        return bool(self.api_key and not self.api_key.startswith("your-"))

    def search_fact_checks(self, query: str, language_code: str = "") -> Dict[str, Any]:
        """
        Queries Google Fact Check Tools API for previously debunked or verified claims.
        """
        if not self.is_configured():
            return {
                "configured": False,
                "searched": False,
                "total_results": 0,
                "matches": [],
                "note": "Google Fact Check Tools API key is not configured."
            }

        params = {
            "query": query[:250],
            "key": self.api_key,
            "pageSize": 5
        }
        if language_code and language_code.lower() in ("hi", "kn", "en"):
            params["languageCode"] = language_code.lower()

        try:
            resp = requests.get(FACTCHECK_API_URL, params=params, timeout=10)
            if resp.status_code != 200:
                err_msg = resp.text[:200]
                return {
                    "configured": True,
                    "searched": False,
                    "error": f"Fact Check API HTTP {resp.status_code}: {err_msg}",
                    "matches": []
                }

            data = resp.json()
            raw_claims = data.get("claims", [])
            matches = []

            for rc in raw_claims:
                claim_text = rc.get("text", "")
                claimant = rc.get("claimant", "")
                claim_date = rc.get("claimDate", "")

                for review in rc.get("claimReview", []):
                    pub_info = review.get("publisher", {})
                    matches.append({
                        "claim_text": claim_text,
                        "claimant": claimant,
                        "claim_date": claim_date,
                        "title": review.get("title") or f"Fact Check: {claim_text[:60]}...",
                        "publisher": pub_info.get("name", "Certified Fact-Checker"),
                        "publisher_site": pub_info.get("site", ""),
                        "source_url": review.get("url", ""),
                        "review_date": review.get("reviewDate", ""),
                        "publisher_rating": review.get("textualRating", "Unrated"),
                        "language_code": review.get("languageCode", "en"),
                        "source_type": "google_fact_check_tools"
                    })

            return {
                "configured": True,
                "searched": True,
                "total_results": len(matches),
                "matches": matches[:6],
                "note": f"Found {len(matches)} matching professional fact-check articles." if matches else "No matching fact-checks located in Google Fact Check database."
            }
        except requests.exceptions.Timeout:
            return {
                "configured": True,
                "searched": False,
                "error": "Google Fact Check API timed out.",
                "matches": []
            }
        except Exception as e:
            return {
                "configured": True,
                "searched": False,
                "error": f"Fact Check query failed: {str(e)}",
                "matches": []
            }

