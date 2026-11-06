"""
Supabase PostgreSQL service for backend data logging and verification.
Honors Row Level Security by utilizing authenticated user tokens when provided.
Supports Day 1-5 Scans, Evidence, Findings and Day 6 Chat Conversations & Multimodal Analyses.
"""
import os
import requests
from typing import Dict, Any, Optional, List

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

    def _get_headers(self, auth_token: Optional[str] = None) -> Optional[Dict[str, str]]:
        if auth_token:
            return {
                "Authorization": f"Bearer {auth_token}",
                "apikey": auth_token,
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            }
        elif self.has_privileged_access():
            return {
                "Authorization": f"Bearer {self.service_key}",
                "apikey": self.service_key,
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            }
        return None

    def save_scan_record(
        self,
        user_id: str,
        scan_data: Dict[str, Any],
        auth_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Persists a scan record to Supabase PostgreSQL using REST API.
        Prefers the user's auth token to respect RLS policies.
        Supports 'scam', 'news', 'url', and 'multimodal' scan types.
        """
        if not self.is_configured():
            return {"saved": False, "reason": "Supabase URL is not configured."}

        headers = self._get_headers(auth_token)
        if not headers:
            return {"saved": False, "reason": "No user token or service role key available."}

        # 1. Insert into public.scans
        scan_type = scan_data.get("scan_type", "scam")
        payload = {
            "user_id": user_id,
            "scan_type": scan_type,
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
            findings = scan_data.get("risk_indicators") or scan_data.get("findings", [])
            default_finding_type = f"{scan_type}_indicator"
            if scan_id and findings:
                findings_payload = [
                    {
                        "scan_id": scan_id,
                        "finding_type": f.get("type", default_finding_type),
                        "title": f.get("title", "Indicator")[:100],
                        "description": (f.get("explanation") or f.get("description") or f.get("phrase", ""))[:500],
                        "severity": f.get("severity", "medium")
                    }
                    for f in findings[:15]
                ]
                requests.post(
                    f"{self.url}/rest/v1/scan_findings",
                    headers=headers,
                    json=findings_payload,
                    timeout=8
                )

            # 3. Insert evidence_sources if present
            sources = scan_data.get("evidence_sources", [])
            if scan_id and sources:
                sources_payload = [
                    {
                        "scan_id": scan_id,
                        "title": s.get("title", "Security Evidence")[:200],
                        "publisher": s.get("publisher", "Threat Intelligence")[:100],
                        "source_url": s.get("source_url") or s.get("url", "")[:500],
                        "evidence_summary": s.get("summary") or s.get("description", "")[:500]
                    }
                    for s in sources[:10]
                ]
                requests.post(
                    f"{self.url}/rest/v1/evidence_sources",
                    headers=headers,
                    json=sources_payload,
                    timeout=8
                )

            return {"saved": True, "scan_id": scan_id}
        except Exception as e:
            return {"saved": False, "reason": str(e)}

    def get_recent_user_scans(
        self,
        user_id: str,
        limit: int = 5,
        auth_token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves the most recent scans for the user to provide cybersecurity context to the chatbot.
        """
        if not self.is_configured() or not user_id:
            return []

        headers = self._get_headers(auth_token)
        if not headers:
            return []

        try:
            resp = requests.get(
                f"{self.url}/rest/v1/scans?user_id=eq.{user_id}&order=created_at.desc&limit={limit}&select=id,scan_type,summary,risk_score,risk_level,created_at",
                headers=headers,
                timeout=6
            )
            if resp.status_code == 200:
                return resp.json()
            return []
        except Exception:
            return []

    def create_chat_conversation(
        self,
        user_id: str,
        title: str = "New Cyber Safety Chat",
        auth_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates a new conversation record in public.chat_conversations.
        """
        if not self.is_configured():
            return {"error": "Supabase not configured"}

        headers = self._get_headers(auth_token)
        if not headers:
            return {"error": "No authorization credentials available"}

        try:
            resp = requests.post(
                f"{self.url}/rest/v1/chat_conversations",
                headers=headers,
                json={"user_id": user_id, "title": title[:100]},
                timeout=6
            )
            if resp.status_code in (200, 201):
                records = resp.json()
                return records[0] if records else {"id": None}
            return {"error": resp.text}
        except Exception as e:
            return {"error": str(e)}

    def list_chat_conversations(
        self,
        user_id: str,
        auth_token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Lists all chat conversations for the user sorted by updated_at desc.
        """
        if not self.is_configured() or not user_id:
            return []

        headers = self._get_headers(auth_token)
        if not headers:
            return []

        try:
            resp = requests.get(
                f"{self.url}/rest/v1/chat_conversations?user_id=eq.{user_id}&order=updated_at.desc&limit=50",
                headers=headers,
                timeout=6
            )
            if resp.status_code == 200:
                return resp.json()
            return []
        except Exception:
            return []

    def get_chat_messages(
        self,
        conversation_id: str,
        user_id: Optional[str] = None,
        auth_token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves all messages for a specific conversation in chronological order.
        """
        if not self.is_configured() or not conversation_id:
            return []

        headers = self._get_headers(auth_token)
        if not headers:
            return []

        try:
            query = f"{self.url}/rest/v1/chat_messages?conversation_id=eq.{conversation_id}&order=created_at.asc"
            if user_id and not auth_token:
                query += f"&user_id=eq.{user_id}"

            resp = requests.get(query, headers=headers, timeout=6)
            if resp.status_code == 200:
                return resp.json()
            return []
        except Exception:
            return []

    def add_chat_message(
        self,
        conversation_id: str,
        user_id: str,
        role: str,
        content: str,
        language: str = "en",
        model_used: str = "auto",
        attachment_url: Optional[str] = None,
        auth_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Appends a message to a conversation and updates the conversation timestamp.
        """
        if not self.is_configured():
            return {"error": "Supabase not configured"}

        headers = self._get_headers(auth_token)
        if not headers:
            return {"error": "No authorization credentials available"}

        payload = {
            "conversation_id": conversation_id,
            "user_id": user_id,
            "role": role,
            "content": content,
            "language": language,
            "model_used": model_used,
            "attachment_url": attachment_url
        }

        try:
            resp = requests.post(
                f"{self.url}/rest/v1/chat_messages",
                headers=headers,
                json=payload,
                timeout=6
            )
            if resp.status_code in (200, 201):
                # Update conversation updated_at
                try:
                    requests.patch(
                        f"{self.url}/rest/v1/chat_conversations?id=eq.{conversation_id}",
                        headers=headers,
                        json={"updated_at": "now()"},
                        timeout=3
                    )
                except Exception:
                    pass
                records = resp.json()
                return records[0] if records else {"id": None}
            return {"error": resp.text}
        except Exception as e:
            return {"error": str(e)}

    def delete_chat_conversation(
        self,
        conversation_id: str,
        user_id: Optional[str] = None,
        auth_token: Optional[str] = None
    ) -> bool:
        """
        Deletes a conversation and cascades to its messages via foreign key.
        """
        if not self.is_configured() or not conversation_id:
            return False

        headers = self._get_headers(auth_token)
        if not headers:
            return False

        try:
            query = f"{self.url}/rest/v1/chat_conversations?id=eq.{conversation_id}"
            if user_id and not auth_token:
                query += f"&user_id=eq.{user_id}"

            resp = requests.delete(query, headers=headers, timeout=6)
            return resp.status_code in (200, 204)
        except Exception:
            return False

    def save_multimodal_analysis(
        self,
        user_id: str,
        scan_id: Optional[str],
        media_type: str,
        extracted_text: str,
        detected_language: str,
        qr_codes_found: List[Any],
        consensus_data: Dict[str, Any],
        auth_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Persists multimodal analysis details to public.multimodal_analyses.
        """
        if not self.is_configured():
            return {"saved": False, "reason": "Supabase not configured"}

        headers = self._get_headers(auth_token)
        if not headers:
            return {"saved": False, "reason": "No credentials available"}

        payload = {
            "user_id": user_id,
            "scan_id": scan_id,
            "media_type": media_type,
            "extracted_text": extracted_text[:5000] if extracted_text else "",
            "detected_language": detected_language,
            "qr_codes_found": qr_codes_found or [],
            "consensus_data": consensus_data or {}
        }

        try:
            resp = requests.post(
                f"{self.url}/rest/v1/multimodal_analyses",
                headers=headers,
                json=payload,
                timeout=6
            )
            if resp.status_code in (200, 201):
                records = resp.json()
                return {"saved": True, "id": records[0]["id"] if records else None}
            return {"saved": False, "reason": resp.text}
        except Exception as e:
            return {"saved": False, "reason": str(e)}
