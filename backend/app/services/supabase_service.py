"""
Supabase PostgreSQL service for backend data logging and verification.
Honors Row Level Security by utilizing authenticated user tokens when provided.
"""
import os
import requests
from typing import Dict, Any, Optional

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()


class SupabaseService:
    def __init__(self):
        self.url = SUPABASE_URL
        self.service_key = SUPABASE_SERVICE_ROLE_KEY

    def is_configured(self) -> bool:
        return bool(self.url and not self.url.startswith("https://your-"))

    def has_privileged_access(self) -> bool:
        return bool(self.is_configured() and self.service_key and not self.service_key.startswith("your-"))

    def save_scan_record(
        self,
        user_id: str,
        scan_data: Dict[str, Any],
        auth_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Persists a scan record to Supabase PostgreSQL using REST API.
        Prefers the user's auth token to respect RLS policies.
        """
        if not self.is_configured():
            return {"saved": False, "reason": "Supabase URL is not configured."}

        # Select authorization key
        auth_header = None
        apikey_header = None

        if auth_token:
            auth_header = f"Bearer {auth_token}"
            apikey_header = auth_token
        elif self.has_privileged_access():
            auth_header = f"Bearer {self.service_key}"
            apikey_header = self.service_key
        else:
            return {"saved": False, "reason": "No user token or service role key available."}

        headers = {
            "Authorization": auth_header,
            "apikey": apikey_header,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

        # 1. Insert into public.scans
        payload = {
            "user_id": user_id,
            "scan_type": "scam",
            "summary": scan_data.get("summary", "")[:1000],
            "risk_score": scan_data.get("risk_score"),
            "risk_level": scan_data.get("risk_level"),
            "result_status": "completed"
        }

        try:
            resp = requests.post(
                f"{self.url}/rest/v1/scans",
                headers=headers,
                json=payload,
                timeout=8
            )
            if resp.status_code not in (200, 201):
                return {"saved": False, "reason": f"PostgreSQL error: {resp.text}"}

            inserted_scans = resp.json()
            scan_id = inserted_scans[0]["id"] if inserted_scans else None

            # 2. Insert scan_findings if scan_id present
            findings = scan_data.get("risk_indicators", [])
            if scan_id and findings:
                findings_payload = [
                    {
                        "scan_id": scan_id,
                        "finding_type": "scam_indicator",
                        "title": f.get("title", "Indicator")[:100],
                        "description": f.get("explanation", f.get("phrase", ""))[:500],
                        "severity": f.get("severity", "medium")
                    }
                    for f in findings[:10]
                ]
                requests.post(
                    f"{self.url}/rest/v1/scan_findings",
                    headers=headers,
                    json=findings_payload,
                    timeout=8
                )

            return {"saved": True, "scan_id": scan_id}
        except Exception as e:
            return {"saved": False, "reason": str(e)}

