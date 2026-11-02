"""
Explainable Risk Scoring Engine.
Synthesizes deterministic rule findings with AI contextual evaluations
to produce a calibrated 0-100 risk score and level (Low, Medium, High).
"""
from typing import Dict, Any, List, Tuple


def calculate_risk_level(score: int) -> str:
    """
    Categorizes numerical score:
    0–29: low
    30–59: medium
    60–100: high
    """
    if score >= 60:
        return "high"
    elif score >= 30:
        return "medium"
    return "low"


def synthesize_risk_score(
    rule_results: Dict[str, Any],
    ai_results: Dict[str, Any],
) -> Tuple[int, str, List[Dict[str, Any]], List[str]]:
    """
    Fuses deterministic rule findings and AI model assessment:
    - Avoids double-counting identical flags.
    - Calibrates weights so neither completely overrides the other.
    - If critical rules are triggered (e.g. asking for OTP or ATM PIN), score floor is raised.
    - Deduplicates indicators across rule findings and AI indicators.
    """
    rule_score = rule_results.get("rule_score", 5)
    rule_indicators = rule_results.get("matched_indicators", [])
    has_critical = rule_results.get("has_critical_flags", False)

    ai_score = ai_results.get("risk_score")
    ai_indicators = ai_results.get("risk_indicators", [])
    ai_recommendations = ai_results.get("recommendations", [])

    # If AI provided a valid score, combine them thoughtfully
    if isinstance(ai_score, (int, float)):
        # 40% rule-based deterministic floor, 60% AI contextual assessment
        combined = (rule_score * 0.4) + (float(ai_score) * 0.6)
    else:
        combined = float(rule_score)

    # Critical rule override: If OTP/PIN or remote desktop app requested, minimum score is 75
    if has_critical:
        combined = max(combined, 75.0)

    # Cap between 0 and 100
    final_score = int(round(max(0.0, min(100.0, combined))))
    risk_level = calculate_risk_level(final_score)

    # Deduplicate combined indicators
    consolidated_indicators = []
    seen_phrases = set()

    for ind in rule_indicators:
        phrase_key = (ind.get("phrase") or ind.get("title") or "").strip().lower()
        if phrase_key:
            seen_phrases.add(phrase_key)
        consolidated_indicators.append({
            "title": ind.get("title", "Threat Flag"),
            "phrase": ind.get("phrase", ""),
            "explanation": ind.get("explanation", ""),
            "severity": ind.get("severity", "medium"),
            "source": "deterministic_rule"
        })

    for ind in ai_indicators:
        phrase = (ind.get("phrase") or "").strip().lower()
        title = (ind.get("title") or "").strip().lower()
        # Check if already covered by deterministic rules
        already_covered = any(phrase and (phrase in seen or seen in phrase) for seen in seen_phrases)
        if not already_covered:
            if phrase:
                seen_phrases.add(phrase)
            consolidated_indicators.append({
                "title": ind.get("title", "AI Indicator"),
                "phrase": ind.get("phrase", ""),
                "explanation": ind.get("explanation", ""),
                "severity": ind.get("severity", "medium"),
                "source": "ai_analysis"
            })

    # Default safety recommendations if AI did not provide any
    recommendations = list(ai_recommendations)
    if not recommendations:
        if risk_level == "high":
            recommendations = [
                "Do not reply, click any embedded links, or dial provided phone numbers.",
                "Never share your OTP, UPI PIN, password, or credit card details with anyone.",
                "Verify official contact info by searching the company's verified website directly.",
                "Report this message to your telecom operator and national cybercrime portal."
            ]
        elif risk_level == "medium":
            recommendations = [
                "Exercise caution before clicking any links or taking action.",
                "Independently verify the sender's identity through official channels.",
                "Do not make urgent payments or download unexpected applications."
            ]
        else:
            recommendations = [
                "No immediate threat patterns found, but maintain routine digital vigilance.",
                "Never share credentials or one-time passcodes with unsolicited callers."
            ]

    return final_score, risk_level, consolidated_indicators, recommendations

