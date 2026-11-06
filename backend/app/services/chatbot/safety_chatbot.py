"""
TrustLens AI Cyber Safety Assistant Engine.
Provides interactive cyber incident guidance, emergency financial fraud triage,
contextual recall of user's past scans, and strict credential guardrails.
Supports English, Kannada, and Hindi across Gemini, Groq, and Mistral models.
"""
import os
import re
from typing import Dict, Any, List, Optional
from ..gemini_service import GeminiService
from ..groq_service import GroqService
from ..mistral_service import MistralService
from ..supabase_service import SupabaseService
from ..multimodal.language_service import LanguageService

SYSTEM_PROMPT_TEMPLATE = """You are TrustLens AI Cyber Safety Assistant — an authoritative, empathetic cybersecurity and digital fraud response expert.
You assist citizens with digital safety, scam verification, social engineering defense, and emergency post-incident triage.

CRITICAL SECURITY GUARDRAILS:
1. NEVER ask the user for passwords, OTPs, UPI PINs, CVVs, or credit card numbers.
2. If the user appears to have shared credentials or lost money, trigger EMERGENCY PROTOCOL immediately with specific actionable steps:
   - Call National Cyber Crime Helpline 1930 immediately (India) or local emergency cyber helpline.
   - File an official complaint on https://cybercrime.gov.in.
   - Call bank helpline immediately to freeze netbanking, UPI, and debit cards.
   - For remote access software (AnyDesk, TeamViewer), disconnect internet and uninstall the application.
3. Keep answers clear, supportive, and formatted in clean markdown bullet points.
4. Support the conversation in the user's requested language ({target_language}).

{context_section}
"""

CREDENTIAL_LEAK_PATTERNS = [
    r'\b(?:password|passwd|pwd)\s*(?:is|:|=)\s*\S+',
    r'\b(?:otp|one\s*time\s*password)\s*(?:is|:|=)\s*\d{4,8}',
    r'\b(?:upi\s*pin|atm\s*pin|pin)\s*(?:is|:|=)\s*\d{4,6}',
    r'\b(?:cvv|cvc)\s*(?:is|:|=)\s*\d{3,4}',
    r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b'  # 16-digit card number
]

EMERGENCY_TRIGGER_PATTERNS = [
    r"(?:shared|gave|entered|told|sent|provided)\s+(?:my\s+|the\s+)?(?:otp|one\s*time\s*password|upi\s*pin|atm\s*pin|pin|cvv)",
    r"otp\s+share\s+kiya",
    r"(?:money|amount|funds|paise|hana)\s*(?:was\s+|got\s+)?(?:deducted|debited|cut|kat\s+gaye|kadtavagide|lost|stolen|gone)",
    r"(?:fraud\s+ho\s+gaya|scammed|cheated|lost\s+money|lost\s+funds)",
    r"(?:downloaded|installed)\s+(?:anydesk|teamviewer|quicksupport|rustdesk|screen\s+share)",
    r"(?:digital\s+arrest|police\s+call\s+threatening|customs\s+arrest)"
]


class SafetyChatbot:
    def __init__(self):
        self.gemini = GeminiService()
        self.groq = GroqService()
        self.mistral = MistralService()
        self.supabase = SupabaseService()
        self.language = LanguageService()

    def check_credential_leak(self, text: str) -> Optional[str]:
        """
        Inspects message for accidental password/OTP/PIN submission.
        """
        for pat in CREDENTIAL_LEAK_PATTERNS:
            if re.search(pat, text, flags=re.IGNORECASE):
                return (
                    "⚠️ **CRITICAL PRIVACY WARNING**: It looks like you may have pasted a private password, OTP, UPI PIN, or card number. "
                    "**TrustLens will NEVER ask for private credentials.** Please do NOT paste sensitive secrets in this chat. "
                    "If you already shared this PIN/OTP with anyone suspicious, **contact your bank and freeze your account immediately**."
                )
        return None

    def check_emergency_triage(self, text: str) -> bool:
        """
        Detects if user is experiencing active financial loss or credential compromise.
        """
        for pat in EMERGENCY_TRIGGER_PATTERNS:
            if re.search(pat, text, flags=re.IGNORECASE):
                return True
        return False

    def get_emergency_response(self, target_lang: str = "en") -> str:
        """
        Returns structured high-priority emergency recovery steps.
        """
        if target_lang == "kn":
            return (
                "🚨 **ತುರ್ತು ಸೈಬರ್ ವಂಚನೆ ಪ್ರತಿಕ್ರಿಯೆ ಪ್ರೋಟೋಕಾಲ್ (EMERGENCY RESPONSE)**\n\n"
                "ನೀವು OTP / UPI ಪಿನ್ ಹಂಚಿಕೊಂಡಿದ್ದರೆ ಅಥವಾ ಹಣ ಕಡಿತಗೊಂಡಿದ್ದರೆ, ತಕ್ಷಣ ಈ ಕೆಳಗಿನ ಕ್ರಮಗಳನ್ನು ಕೈಗೊಳ್ಳಿ:\n\n"
                "1. 📞 **ತಕ್ಷಣ 1930 ಗೆ ಕರೆ ಮಾಡಿ**: ರಾಷ್ಟ್ರೀಯ ಸೈಬರ್ ಅಪರಾಧ ಸಹಾಯವಾಣಿಗೆ (1930) ಕರೆ ಮಾಡಿ ಹಣ ವರ್ಗಾವಣೆಯನ್ನು ತಡೆಹಿಡಿಯಲು ವಿನಂತಿಸಿ.\n"
                "2. 🏦 **ಬ್ಯಾಂಕ್ ಖಾತೆ ಮತ್ತು ಕಾರ್ಡ್ ಬ್ಲಾಕ್ ಮಾಡಿ**: ನಿಮ್ಮ ಬ್ಯಾಂಕ್‌ಗೆ ಕರೆ ಮಾಡಿ ಅಥವಾ ನೆಟ್‌ಬ್ಯಾಂಕಿಂಗ್ ಆ್ಯಪ್ ಮೂಲಕ UPI ಮತ್ತು ಡೆಬಿಟ್ ಕಾರ್ಡ್ ತಕ್ಷಣ ಫ್ರೀಜ್ ಮಾಡಿ.\n"
                "3. 🌐 **ದೂರು ದಾಖಲಿಸಿ**: ಅಧಿಕೃತ ರಾಷ್ಟ್ರೀಯ ಸೈಬರ್ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ (https://cybercrime.gov.in) ದೂರು ದಾಖಲಿಸಿ.\n"
                "4. 📲 **ರಿಮೋಟ್ ಆ್ಯಪ್ ತೆಗೆದುಹಾಕಿ**: AnyDesk ಅಥವಾ TeamViewer ಇನ್‌ಸ್ಟಾಲ್ ಮಾಡಿದ್ದರೆ, ಇಂಟರ್ನೆಟ್ ಆಫ್ ಮಾಡಿ ತಕ್ಷಣ ಅನ್‌ಇನ್‌ಸ್ಟಾಲ್ ಮಾಡಿ.\n"
                "5. ⚠️ **ಮುಂದಿನ OTP ಹಂಚಿಕೊಳ್ಳಬೇಡಿ**: ವಂಚಕರು ಮತ್ತೆ ಕರೆ ಮಾಡಿದರೆ ಯಾವುದೇ ಮಾಹಿತಿ ನೀಡಬೇಡಿ."
            )
        elif target_lang == "hi":
            return (
                "🚨 **आपातकालीन साइबर धोखाधड़ी सहायता प्रोटोकॉल (EMERGENCY RESPONSE)**\n\n"
                "यदि आपने गलती से OTP/UPI पिन साझा कर दिया है या आपके बैंक से पैसे कट गए हैं, तो तुरंत ये कदम उठाएं:\n\n"
                "1. 📞 **तुरंत 1930 पर कॉल करें**: राष्ट्रीय साइबर अपराध हेल्पलाइन (1930) पर तुरंत रिपोर्ट करें ताकि धोखेबाज के खाते में पैसे फ्रीज कराए जा सकें।\n"
                "2. 🏦 **बैंक और UPI तुरंत ब्लॉक करें**: अपने बैंक के कस्टमर केयर पर कॉल करके नेटबैंकिंग, UPI और डेबिट कार्ड तुरंत बंद करवाएं।\n"
                "3. 🌐 **आधिकारिक शिकायत दर्ज करें**: https://cybercrime.gov.in पोर्टल पर शिकायत दर्ज कराएं और पावती (Acknowledgment) सुरक्षित रखें।\n"
                "4. 📲 **रिमोट ऐप हटाएं**: अगर AnyDesk या TeamViewer डाउनलोड किया था, तो इंटरनेट तुरंत बंद करें और ऐप अनइंस्टॉल करें।\n"
                "5. ⚠️ **आगे कोई OTP न दें**: धोखेबाज बैंक अधिकारी बनकर दोबारा कॉल कर सकते हैं, कोई जानकारी न दें।"
            )
        else:
            return (
                "🚨 **EMERGENCY CYBER FRAUD INCIDENT PROTOCOL**\n\n"
                "If you entered your UPI PIN, shared an OTP, or money was debited from your account, take these critical steps **immediately (Golden Hour)**:\n\n"
                "1. 📞 **Call 1930 Immediately**: Dial the National Cyber Crime Helpline (**1930** in India) to request an immediate freeze on the fraudulent transaction.\n"
                "2. 🏦 **Freeze Bank Account & Cards**: Contact your bank's 24/7 fraud helpline immediately to block netbanking, disable UPI, and hotlist debit/credit cards.\n"
                "3. 🌐 **File Official Report**: Register an incident complaint on the National Cyber Crime Reporting Portal at **[cybercrime.gov.in](https://cybercrime.gov.in)**.\n"
                "4. 📲 **Remove Remote Apps**: If instructed to install AnyDesk, TeamViewer, or QuickSupport, disconnect Wi-Fi/data immediately and uninstall the app.\n"
                "5. ⚠️ **Never Follow Up With the Caller**: Attackers often call back claiming to be fraud investigators asking for another 'refund OTP'. Never provide it."
            )

    def generate_reply(
        self,
        message: str,
        conversation_history: List[Dict[str, str]],
        model_choice: str = "auto",
        target_language: str = "en",
        user_scans_context: Optional[List[Dict[str, Any]]] = None,
        attachment_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Processes user chat message with context awareness, model routing, and guardrails.
        """
        clean_msg = (message or "").strip()

        # 1. Guardrail check
        guardrail_warning = self.check_credential_leak(clean_msg)
        if guardrail_warning:
            return {
                "reply": guardrail_warning,
                "model_used": "safety-guardrail",
                "language": target_language,
                "is_emergency": False,
                "guardrail_triggered": True
            }

        # 2. Emergency check
        is_emergency = self.check_emergency_triage(clean_msg)
        emergency_prefix = ""
        if is_emergency:
            emergency_prefix = self.get_emergency_response(target_language) + "\n\n---\n\n"

        # 3. Build context section
        context_lines = []
        if user_scans_context:
            context_lines.append("USER'S RECENT SECURITY SCANS:")
            for s in user_scans_context[:3]:
                stype = s.get("scan_type", "scan").upper()
                score = s.get("risk_score", "N/A")
                summary = s.get("summary", "")[:120]
                context_lines.append(f"- [{stype}] Risk: {score}/100 — {summary}")

        if attachment_context:
            context_lines.append(f"ATTACHED FILE / SCREENSHOT ANALYSIS:\n{attachment_context}")

        context_section = "\n".join(context_lines) if context_lines else "No recent scan history available."

        lang_name = "Kannada (ಕನ್ನಡ)" if target_language == "kn" else ("Hindi (हिंदी)" if target_language == "hi" else "English")
        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            target_language=lang_name,
            context_section=context_section
        )

        # 4. Model Selection & Execution
        chosen_provider = "groq"
        if model_choice == "gemini":
            chosen_provider = "gemini"
        elif model_choice == "mistral":
            chosen_provider = "mistral"
        elif model_choice == "auto":
            if target_language in ("kn", "hi") and self.mistral.is_configured():
                chosen_provider = "mistral"
            elif self.groq.is_configured():
                chosen_provider = "groq"
            elif self.gemini.is_configured():
                chosen_provider = "gemini"

        # Format conversation messages
        assistant_text = ""
        model_name = chosen_provider

        # Call Groq
        if chosen_provider == "groq" and self.groq.is_configured():
            try:
                import requests
                messages = [{"role": "system", "content": system_prompt}]
                for h in conversation_history[-8:]:
                    messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
                messages.append({"role": "user", "content": clean_msg})

                resp = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.groq.api_key}", "Content-Type": "application/json"},
                    json={
                        "model": self.groq.model,
                        "messages": messages,
                        "temperature": 0.3,
                        "max_tokens": 1024
                    },
                    timeout=15
                )
                if resp.status_code == 200:
                    assistant_text = resp.json()["choices"][0]["message"]["content"]
                    model_name = f"Groq ({self.groq.model})"
            except Exception:
                pass

        # Fallback / Gemini
        if not assistant_text and self.gemini.is_configured():
            try:
                import requests
                from ..gemini_service import GEMINI_API_BASE
                prompt_full = f"{system_prompt}\n\nUser Question:\n{clean_msg}"
                url = f"{GEMINI_API_BASE}/{self.gemini.model}:generateContent?key={self.gemini.api_key}"
                resp = requests.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json={"contents": [{"parts": [{"text": prompt_full}]}]},
                    timeout=15
                )
                if resp.status_code == 200:
                    candidates = resp.json().get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        assistant_text = candidates[0]["content"]["parts"][0]["text"]
                        model_name = f"Gemini ({self.gemini.model})"
            except Exception:
                pass

        # Fallback / Mistral
        if not assistant_text and self.mistral.is_configured():
            try:
                import requests
                from ..mistral_service import MISTRAL_API_URL
                messages = [{"role": "system", "content": system_prompt}]
                for h in conversation_history[-8:]:
                    messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
                messages.append({"role": "user", "content": clean_msg})

                resp = requests.post(
                    MISTRAL_API_URL,
                    headers={"Authorization": f"Bearer {self.mistral.api_key}", "Content-Type": "application/json"},
                    json={"model": self.mistral.model, "messages": messages, "temperature": 0.3},
                    timeout=15
                )
                if resp.status_code == 200:
                    assistant_text = resp.json()["choices"][0]["message"]["content"]
                    model_name = f"Mistral ({self.mistral.model})"
            except Exception:
                pass

        # Pure Heuristic Fallback if offline/unconfigured
        if not assistant_text:
            if is_emergency:
                assistant_text = "Please follow the emergency steps above immediately. Do not share any further OTPs or personal credentials."
            else:
                assistant_text = (
                    "I am standing by to assist you with cyber safety, scam verification, and digital threat defense. "
                    "You can paste suspicious messages, upload screenshots, or ask how to handle potential fraud."
                )
            model_name = "TrustLens Rule Engine (Offline)"

        final_reply = f"{emergency_prefix}{assistant_text}"

        return {
            "reply": final_reply,
            "model_used": model_name,
            "language": target_language,
            "is_emergency": is_emergency,
            "guardrail_triggered": False
        }
