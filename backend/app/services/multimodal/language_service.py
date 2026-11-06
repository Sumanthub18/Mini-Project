"""
Regional Language Intelligence Service.
Supports English (en), Kannada (kn / ಕನ್ನಡ), and Hindi (hi / हिंदी).
Provides script detection, code-mixed language detection (Hinglish, Kanglish),
bilingual translation/formatting, and ensures original text is preserved verbatim.
"""
import re
from typing import Dict, Any, Tuple

# Pre-defined cybersecurity terminology and alert templates in Kannada and Hindi
LOCALIZED_TERMS = {
    "en": {
        "critical_alert": "CRITICAL THREAT DETECTED",
        "warning_alert": "SUSPICIOUS ACTIVITY DETECTED",
        "safe_notice": "NO OBVIOUS SCAM INDICATORS DETECTED",
        "never_share_otp": "Never share OTP, UPI PIN, or bank passwords with anyone.",
        "call_helpline": "Call National Cyber Crime Helpline 1930 immediately if money was debited.",
        "verify_official": "Verify through official bank or service website before taking any action.",
        "qr_warning": "QR codes are for paying money, NEVER for receiving money or winning prizes.",
        "deepfake_note": "Forensic video authenticity analysis requires specialized biometric tools; proceed with caution."
    },
    "kn": {
        "critical_alert": "ತೀವ್ರ ಸೈಬರ್ ಬೆದರಿಕೆ ಪತ್ತೆಯಾಗಿದೆ (CRITICAL THREAT)",
        "warning_alert": "ಸಂಶಯಾಸ್ಪದ ಚಟುವಟಿಕೆ ಕಂಡುಬಂದಿದೆ (SUSPICIOUS ACTIVITY)",
        "safe_notice": "ಯಾವುದೇ ಸ್ಪಷ್ಟ ವಂಚನೆಯ ಲಕ್ಷಣಗಳು ಕಂಡುಬಂದಿಲ್ಲ",
        "never_share_otp": "ಯಾವುದೇ ಕಾರಣಕ್ಕೂ OTP, UPI ಪಿನ್ ಅಥವಾ ಬ್ಯಾಂಕ್ ಪಾಸ್‌ವರ್ಡ್ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.",
        "call_helpline": "ಹಣ ಕಡಿತಗೊಂಡಿದ್ದರೆ ತಕ್ಷಣ 1930 ರಾಷ್ಟ್ರೀಯ ಸೈಬರ್ ಸಹಾಯವಾಣಿಗೆ ಕರೆ ಮಾಡಿ.",
        "verify_official": "ಯಾವುದೇ ಕ್ರಮ ಕೈಗೊಳ್ಳುವ ಮೊದಲು ಅಧಿಕೃತ ಬ್ಯಾಂಕ್ ಅಥವಾ ಸೇವಾ ವೆಬ್‌ಸೈಟ್‌ ಮೂಲಕ ಪರಿಶೀಲಿಸಿ.",
        "qr_warning": "QR ಕೋಡ್‌ಗಳು ಹಣ ಪಾವತಿಸಲು ಮಾತ್ರ, ಹಣ ಪಡೆಯಲು ಅಥವಾ ಬಹುಮಾನ ಗೆಲ್ಲಲು ಅಲ್ಲ.",
        "deepfake_note": "ವೀಡಿಯೊ ನೈಜತೆ ತಪಾಸಣೆಗೆ ವಿಶೇಷ ವಿಧಿವಿಜ್ಞಾನ ತಂತ್ರಜ್ಞಾನ ಅಗತ್ಯವಿದೆ; ಎಚ್ಚರಿಕೆಯಿಂದಿರಿ."
    },
    "hi": {
        "critical_alert": "गंभीर साइबर खतरा पाया गया (CRITICAL THREAT)",
        "warning_alert": "संदिग्ध गतिविधि पाई गई (SUSPICIOUS ACTIVITY)",
        "safe_notice": "कोई स्पष्ट धोखाधड़ी के संकेत नहीं मिले",
        "never_share_otp": "किसी के साथ भी अपना OTP, UPI पिन या बैंक पासवर्ड कभी साझा न करें।",
        "call_helpline": "यदि बैंक से पैसे कट गए हैं, तो तुरंत राष्ट्रीय साइबर हेल्पलाइन 1930 पर कॉल करें।",
        "verify_official": "कोई भी कदम उठाने से पहले आधिकारिक बैंक या संस्था की वेबसाइट से पुष्टि करें।",
        "qr_warning": "QR कोड केवल पैसे भेजने के लिए होता है, पैसे प्राप्त करने या इनाम पाने के लिए नहीं।",
        "deepfake_note": "वीडियो प्रामाणिकता विश्लेषण के लिए समर्पित फोरेंसिक उपकरणों की आवश्यकता होती है; सतर्क रहें।"
    }
}

# Regex ranges for Indian scripts
KANNADA_REGEX = re.compile(r'[\u0C80-\u0CFF]')
DEVANAGARI_REGEX = re.compile(r'[\u0900-\u097F]')

# Common code-mixed markers
HINGLISH_KEYWORDS = {
    "paisa", "paise", "khata", "aadhaar", "inam", "lottery", "jaldi", "bhejo",
    "karo", "kare", "mat", "dena", "sampark", "bijli", "bill", "kat", "jayega",
    "band", "hoga", "shukriya", "dhyan", "rakhe", "namaskar", "apna", "bhai"
}

KANGLISH_KEYWORDS = {
    "nimma", "namma", "khate", "hana", "bega", "kalsi", "madi", "beku",
    "illa", "hogi", "banni", "kelasa", "namaskara", "yaru", "enu", "hege",
    "biddide", "kanisutilla", "tumba", "swalpa"
}


class LanguageService:
    @staticmethod
    def detect_language(text: str) -> Dict[str, Any]:
        """
        Detects primary script and linguistic character of the input text.
        Returns:
            primary_code: 'en' | 'kn' | 'hi' | 'hinglish' | 'kanglish'
            normalized_lang: 'en' | 'kn' | 'hi'
            script: 'kannada' | 'devanagari' | 'latin' | 'mixed'
            confidence: float (0.0 to 1.0)
            is_mixed: bool
        """
        if not text or not text.strip():
            return {
                "primary_code": "en",
                "normalized_lang": "en",
                "script": "latin",
                "confidence": 0.5,
                "is_mixed": False,
                "display_name": "English"
            }

        clean = text.lower()
        total_len = len(text)

        kn_chars = len(KANNADA_REGEX.findall(text))
        hi_chars = len(DEVANAGARI_REGEX.findall(text))

        # Check script dominance
        if kn_chars > 3 and kn_chars / max(total_len, 1) > 0.15:
            is_mixed = bool(re.search(r'[a-zA-Z]{3,}', text))
            return {
                "primary_code": "kn",
                "normalized_lang": "kn",
                "script": "kannada",
                "confidence": min(1.0, 0.6 + (kn_chars / total_len)),
                "is_mixed": is_mixed,
                "display_name": "ಕನ್ನಡ (Kannada)"
            }

        if hi_chars > 3 and hi_chars / max(total_len, 1) > 0.15:
            is_mixed = bool(re.search(r'[a-zA-Z]{3,}', text))
            return {
                "primary_code": "hi",
                "normalized_lang": "hi",
                "script": "devanagari",
                "confidence": min(1.0, 0.6 + (hi_chars / total_len)),
                "is_mixed": is_mixed,
                "display_name": "हिंदी (Hindi)"
            }

        # Check Romanized / Code-mixed patterns
        words = set(re.findall(r'\b[a-zA-Z]{3,}\b', clean))
        hinglish_hits = words.intersection(HINGLISH_KEYWORDS)
        kanglish_hits = words.intersection(KANGLISH_KEYWORDS)

        if len(kanglish_hits) >= 2 or (len(kanglish_hits) >= 1 and len(words) <= 8):
            return {
                "primary_code": "kanglish",
                "normalized_lang": "kn",
                "script": "latin",
                "confidence": 0.85,
                "is_mixed": True,
                "display_name": "Kanglish (Kannada in Latin script)"
            }

        if len(hinglish_hits) >= 2 or (len(hinglish_hits) >= 1 and len(words) <= 8):
            return {
                "primary_code": "hinglish",
                "normalized_lang": "hi",
                "script": "latin",
                "confidence": 0.85,
                "is_mixed": True,
                "display_name": "Hinglish (Hindi in Latin script)"
            }

        return {
            "primary_code": "en",
            "normalized_lang": "en",
            "script": "latin",
            "confidence": 0.9,
            "is_mixed": False,
            "display_name": "English"
        }

    @staticmethod
    def get_localized_guidance(target_lang: str, risk_level: str) -> Dict[str, Any]:
        """
        Retrieves localized safety recommendations and alert headers.
        """
        code = target_lang if target_lang in ("kn", "hi") else "en"
        terms = LOCALIZED_TERMS.get(code, LOCALIZED_TERMS["en"])

        alert_text = terms["critical_alert"] if risk_level == "high" else (
            terms["warning_alert"] if risk_level == "medium" else terms["safe_notice"]
        )

        recommendations = [
            terms["never_share_otp"],
            terms["verify_official"]
        ]
        if risk_level == "high":
            recommendations.append(terms["call_helpline"])

        return {
            "language": code,
            "alert_header": alert_text,
            "localized_recommendations": recommendations,
            "qr_advisory": terms["qr_warning"],
            "video_advisory": terms["deepfake_note"]
        }

    @staticmethod
    def format_bilingual_explanation(
        original_text: str,
        detected_lang: str,
        target_lang: str = "en",
        english_summary: str = "",
        risk_level: str = "low",
        target_language: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Structures bilingual output preserving original extracted text verbatim.
        """
        effective_target = target_language or target_lang or "en"
        guidance = LanguageService.get_localized_guidance(effective_target, risk_level)

        return {
            "original_text": original_text,
            "detected_language": detected_lang,
            "target_language": effective_target,
            "explanation_english": english_summary,
            "localized_alert": guidance["alert_header"],
            "localized_recommendations": guidance["localized_recommendations"],
            "advisories": {
                "qr_warning": guidance["qr_advisory"],
                "video_advisory": guidance["video_advisory"]
            }
        }
