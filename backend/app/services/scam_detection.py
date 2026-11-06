"""
Deterministic rule-based scam detection engine.
Identifies high-confidence threat patterns, keywords, suspicious URLs,
and social engineering tactics across 13 distinct scam categories.
Includes multilingual indicators (English, Hindi, Kannada).
"""
import re
from typing import List, Dict, Any, Tuple

# 13 Defined Scam Categories
SCAM_CATEGORIES = [
    "Phishing attacks",
    "Banking fraud",
    "UPI payment scams",
    "OTP and PIN theft",
    "Fake job offers",
    "Lottery and prize scams",
    "Investment fraud",
    "Fake customer support",
    "Courier and delivery scams",
    "Account suspension threats",
    "Impersonation",
    "Advance-fee fraud",
    "Social engineering",
]

# Category Pattern Signatures
CATEGORY_RULES = {
    "Phishing attacks": [
        r"(click(?:\s+here|\s+at)?|visit\s+link|open\s+url|tap\s+link|verify\s+at|login\s+at)\s*(https?://\S+|www\.\S+|\S+\.(?:xyz|top|ru|cc|tk|ml|cf|ga|bit\.ly|tinyurl))",
        r"(update\s+kyc|kyc\s+update|kyc\s+expired|expired\s+kyc|verify\s+pan|link\s+aadhaar|kyc\s+verification)",
        r"(लॉगिन\s+करें|केवाईसी\s+अपडेट|ಲಿಂಕ್\s+ಕ್ಲಿಕ್\s+ಮಾಡಿ)",
    ],
    "Banking fraud": [
        r"(sbi|hdfc|icici|axis|pnb|bob|bank)\s*(?:account\s+(?:is\s+)?)?(alert|notice|urgent|blocked|suspended|debit|credited)",
        r"(netbanking\s+blocked|debit\s+card\s+blocked|account\s+restricted|unauthorized\s+transaction)",
        r"(बैंक\s+खाता|खाता\s+ब्लॉक|ಬ್ಯಾಂಕ್\s+ಖಾತೆ)",
    ],
    "UPI payment scams": [
        r"(gpay|phonepe|paytm|bhim\s+upi|upi\s+pin)\s*(refund|cashback|collect\s+request|send\s+pin)",
        r"(scan\s+qr\s+code\s+to\s+receive|enter\s+upi\s+pin\s+to\s+claim|receive\s+money\s+pin)",
        r"(यूपीआई\s+पिन|कैशबैक|ಕ್ಯಾಶ್‌ಬ್ಯಾಕ್|ಯುಪಿಐ)",
    ],
    "OTP and PIN theft": [
        r"(share\s+otp|send\s+otp|provide\s+otp|tell\s+otp|verify\s+otp|enter\s+pin|atm\s+pin|cvv)",
        r"(otp\s+sent\s+to\s+your\s+mobile|bank\s+officer\s+asking\s+otp|verification\s+code)",
        r"(ओटीपी\s+शेयर|पिन\s+बताएं|ಓಟಿಪಿ)",
    ],
    "Fake job offers": [
        r"(work\s+from\s+home|part\s*time\s*job|daily\s*(?:rs|inr|\$)\s*[0-9,]+|earn\s*(?:rs|inr|\$)\s*[0-9,]+\s*daily)",
        r"(like\s+youtube\s+videos|telegram\s+job|task\s+based\s+earning|data\s+entry\s+job|registration\s+fee\s+for\s+job)",
        r"(घर\s+बैठे\s+कमाएं|पार्ट\s+टाइम\s+जॉब|ಕೆಲಸದ\s+ಅವಕಾಶ)",
    ],
    "Lottery and prize scams": [
        r"(congratulations|you\s+have\s+won|lottery\s+winner|lucky\s+draw|prize\s+money|claim\s+your\s+prize|kbc\s+lottery)",
        r"(won\s+(?:rs|inr|\$|£|€)\s*[0-9,]+|car\s+winner|iphone\s+winner)",
        r"(लॉटरी\s+जीती|इनाम|ಬಹುಮಾನ|ಲಾಟರಿ)",
    ],
    "Investment fraud": [
        r"(guaranteed\s+(?:return|profit|income)|double\s+your\s+money|crypto\s+investment|bitcoin\s+doubler)",
        r"(forex\s+trading\s+bot|instant\s+high\s+returns|100%\s+risk\s*free\s+investment|pump\s+and\s+dump)",
        r"(गारंटीड\s+मुनाफा|क्रिप्टो\s+इन्वेस्टमेंट)",
    ],
    "Fake customer support": [
        r"(toll\s*free\s*number|helpline\s*number|contact\s*customer\s*care\s*at\s*\+?[0-9]{10,12})",
        r"(anydesk|teamviewer|quicksupport|rustdesk|install\s+support\s+app)",
        r"(कस्टमर\s+केयर|हेल्पलाइन\s+नंबर|ಗ್ರಾಹಕ\s+ಸೇವೆ)",
    ],
    "Courier and delivery scams": [
        r"(package\s+cannot\s+be\s+delivered|customs\s+clearance\s+fee|address\s+confirmation\s+needed)",
        r"(fedex|dhl|india\s*post|blue\s*dart|ekart|delivery\s+failed|parcel\s+held)",
        r"(पार्सल\s+अटका|डिलीवरी\s+शुल्क|ಪಾರ್ಸೆಲ್)",
    ],
    "Account suspension threats": [
        r"(account\s+will\s+be\s+(?:suspended|blocked|terminated|closed|deactivated)\s+within\s+(?:24|12|48|2)\s*hours)",
        r"(electricity\s+power\s+will\s+be\s+disconnected\s+tonight|sim\s+card\s+will\s+be\s+blocked)",
        r"(बिजली\s+कट|सिम\s+ब्लॉक|ಖಾತೆ\s+ರದ್ದು)",
    ],
    "Impersonation": [
        r"(income\s+tax\s+department|cbi|police|customs\s+officer|reserve\s+bank\s+of\s+india|rbi\s+notice)",
        r"(high\s+court|digital\s+arrest|arrest\s+warrant\s+issued\s+against\s+you)",
        r"(सीबीआई|पुलिस|गिरफ्तारी|ನ್ಯಾಯಾಲಯ|ಪೊಲೀಸ್)",
    ],
    "Advance-fee fraud": [
        r"(processing\s+fee|stamp\s+duty|clearance\s+fee|transfer\s+fee\s+of\s*(?:rs|inr|\$)\s*[0-9,]+)",
        r"(foreign\s+currency\s+consignment|funds\s+pending\s+release|unclaimed\s+inheritance)",
        r"(प्रोसेसिंग\s+फीस|रिलीज\s+चार्ज)",
    ],
    "Social engineering": [
        r"(urgent\s+help\s+needed|friend\s+in\s+hospital|emergency\s+money|do\s+not\s+call\s+me|send\s+money\s+urgently)",
        r"(gift\s+card\s+for\s+boss|ceo\s+wire\s+transfer|secret\s+assignment)",
        r"(इमरजेंसी\s+मदद|জরুরি)",
    ],
}

# Suspicious Indicators
SUSPICIOUS_INDICATORS = [
    {
        "title": "Urgency / Threatening Pressure",
        "pattern": r"(urgent|immediately|act\s+now|within\s+(?:24|12|48|2)\s*hours|last\s+chance|expire\s+today|before\s+it\s*'?s\s+too\s+late|जल्दी|ತಕ್ಷಣ)",
        "explanation": "Scammers manufacture artificial urgency to panic targets into compliance before thinking critically.",
        "severity": "high",
        "weight": 20
    },
    {
        "title": "Credential or Secret Request",
        "pattern": r"(otp|pin|password|cvv|atm\s+card|netbanking\s+password|login\s+credentials|ओटीपी|पासवर्ड|ಓಟಿಪಿ)",
        "explanation": "Legitimate banks and services never ask for OTP, PIN, or passwords over SMS or email.",
        "severity": "critical",
        "weight": 35
    },
    {
        "title": "Unsolicited Financial Demand",
        "pattern": r"(registration\s+fee|processing\s+(?:fee|charge)|deposit\s+(?:rs|inr|\$)|pay\s+(?:fee|charge|first|\$|rs)|advance\s+payment|फीस|ಹಣ\s+ಪಾವತಿಸಿ)",
        "explanation": "Demanding advance payment for jobs, loans, or prize release is a hallmark of advance-fee fraud.",
        "severity": "high",
        "weight": 25
    },
    {
        "title": "Account Suspension / Service Threat",
        "pattern": r"(account\s+(?:is|will\s+be)?\s*(?:blocked|suspended|terminated|closed|deactivated)|electricity\s+power\s+will\s+be\s+disconnected|power\s+cut|disconnection|सिम\s+ब्लॉक|ಖಾತೆ\s+ರದ್ದು)",
        "explanation": "Threatening immediate account suspension or service shutoff is an intimidation tactic used to induce panic.",
        "severity": "high",
        "weight": 25
    },
    {
        "title": "Unrealistic Financial Reward",
        "pattern": r"(\$[0-9,]{5,}|(?:rs|inr)\s*[0-9,]{6,}|won\s+lottery|guaranteed\s+(?:return|profit)|100%\s+risk\s*free|इनाम|ಬಹುಮಾನ)",
        "explanation": "Promises of astronomical sums, guaranteed double returns, or unsolicited lottery wins are deceptive lures.",
        "severity": "high",
        "weight": 25
    },
    {
        "title": "Suspicious External Link / Shortener",
        "pattern": r"(https?://\S+|www\.\S+|bit\.ly/\S+|tinyurl\.com/\S+|t\.me/\S+|wa\.me/\S+|\.xyz|\.top|\.ru|\.cc)",
        "explanation": "Unsolicited URLs, link shorteners, and Telegram/WhatsApp redirection links are commonly used to mask malicious sites.",
        "severity": "medium",
        "weight": 15
    },
    {
        "title": "Remote Access Software Mention",
        "pattern": r"(anydesk|teamviewer|quicksupport|rustdesk|screen\s+share\s+app)",
        "explanation": "Asking targets to download remote desktop apps gives attackers direct control over phones and banking sessions.",
        "severity": "critical",
        "weight": 35
    },
    {
        "title": "Legal or Police Coercion",
        "pattern": r"(digital\s+arrest|arrest\s+warrant|cbi|police|customs\s+investigation|court\s+notice|गिरफ्तारी|ಪೊಲೀಸ್\s+ದೂರು)",
        "explanation": "Impersonating law enforcement or threatening 'digital arrest' is an intimidation tactic used in extortion scams.",
        "severity": "critical",
        "weight": 35
    }
]


def run_rule_based_detection(text: str) -> Dict[str, Any]:
    """
    Executes rule-based pattern matching on input text.
    Returns:
    - matched_indicators: list of structured indicator dictionaries
    - detected_categories: list of probable scam categories
    - rule_score: base 0-100 risk score
    - has_critical_flags: bool indicating critical threat
    """
    cleaned = text.strip()
    matched_indicators = []
    seen_titles = set()
    total_weight = 0

    # 1. Evaluate indicators
    for rule in SUSPICIOUS_INDICATORS:
        matches = re.findall(rule["pattern"], cleaned, flags=re.IGNORECASE)
        if matches:
            # Extract the actual matched phrase from the first match
            first_match = matches[0]
            matched_phrase = first_match if isinstance(first_match, str) else [m for m in first_match if m][0]

            if rule["title"] not in seen_titles:
                seen_titles.add(rule["title"])
                matched_indicators.append({
                    "title": rule["title"],
                    "phrase": matched_phrase[:60],
                    "explanation": rule["explanation"],
                    "severity": rule["severity"]
                })
                total_weight += rule["weight"]

    # 2. Evaluate categories
    detected_categories = []
    for cat_name, patterns in CATEGORY_RULES.items():
        for pat in patterns:
            if re.search(pat, cleaned, flags=re.IGNORECASE):
                if cat_name not in detected_categories:
                    detected_categories.append(cat_name)
                break

    # Calculate rule score (capped at 95 by rules alone to leave room for AI nuance)
    rule_score = min(95, total_weight)

    # If text is very short and no keywords found, rule_score is 0
    if not matched_indicators:
        rule_score = 5

    primary_category = detected_categories[0] if detected_categories else "Uncertain / Low Risk"

    return {
        "matched_indicators": matched_indicators,
        "detected_categories": detected_categories,
        "primary_category": primary_category,
        "rule_score": rule_score,
        "has_critical_flags": any(i["severity"] == "critical" for i in matched_indicators)
    }
