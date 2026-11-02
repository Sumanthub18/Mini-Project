"""
Response formatter and schema for Day 4 Fake News Verification Engine.
"""
from typing import Dict, Any, List


def format_news_response(
    input_text: str,
    input_type: str,
    overall_verdict_info: Dict[str, Any],
    claims_list: List[Dict[str, Any]],
    fact_check_sources: List[Dict[str, Any]],
    evidence_sources: List[Dict[str, Any]],
    providers_used: List[str],
    limitations: List[str] = None,
    execution_time_ms: float = 0.0
) -> Dict[str, Any]:
    """
    Builds standardized, auditable Fake News verification JSON response.
    """
    default_limits = [
        "Analysis based on accessible public records, fact-checking archives, and AI evaluation.",
        "New or breaking stories may have limited reporting available.",
        "Verdicts indicate evidentiary alignment, not personal or political endorsements."
    ]

    return {
        "status": "success",
        "input_excerpt": input_text[:300] + ("..." if len(input_text) > 300 else ""),
        "input_type": input_type or "headline",
        "overall_verdict": overall_verdict_info.get("overall_verdict", "UNVERIFIED"),
        "confidence": overall_verdict_info.get("confidence", "medium"),
        "summary": overall_verdict_info.get("summary", ""),
        "claims_count": len(claims_list),
        "claims": claims_list,
        "fact_check_sources": fact_check_sources,
        "evidence_sources": evidence_sources,
        "providers_used": providers_used,
        "limitations": limitations or default_limits,
        "execution_time_ms": execution_time_ms
    }

