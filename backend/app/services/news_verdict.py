"""
News Verdict Generator.
Assigns transparent verdicts: SUPPORTED, CONTRADICTED, MIXED, UNVERIFIED, INSUFFICIENT EVIDENCE.
Provides confidence calibration, explanations, and actionable next steps.
"""
from typing import Dict, Any, List

VALID_VERDICTS = [
    "SUPPORTED",
    "CONTRADICTED",
    "MIXED",
    "UNVERIFIED",
    "INSUFFICIENT EVIDENCE"
]


def determine_claim_verdict(evaluation: Dict[str, Any], authority_level: str = "moderate") -> Dict[str, Any]:
    """
    Assigns a verdict for an individual claim based on evidence evaluation.
    """
    is_sup = evaluation.get("is_supported", False)
    is_con = evaluation.get("is_contradicted", False)
    is_mix = evaluation.get("is_mixed", False)
    is_ins = evaluation.get("is_insufficient", False)

    supporting = evaluation.get("supporting_evidence", [])
    contradicting = evaluation.get("contradicting_evidence", [])
    explanation = evaluation.get("explanation", "")

    if is_con:
        verdict = "CONTRADICTED"
        confidence = "high" if len(contradicting) >= 2 or authority_level == "very_high" else "medium"
        next_steps = [
            "Do not circulate or forward this message on social networks.",
            "Inform contacts who forwarded this claim that it has been refuted.",
            "Refer to certified fact-checkers and primary government notifications."
        ]
    elif is_mix:
        verdict = "MIXED"
        confidence = "medium"
        next_steps = [
            "Examine which specific details are supported and which are distorted.",
            "Do not accept sensationalized headlines without reading the full context.",
            "Consult original source documentation."
        ]
    elif is_sup:
        verdict = "SUPPORTED"
        confidence = "high" if len(supporting) >= 2 or authority_level == "very_high" else "medium"
        next_steps = [
            "Verify that the reporting is current and not an old event taken out of timeframe.",
            "Check official portal for updates or detailed terms."
        ]
    elif is_ins or (not supporting and not contradicting):
        verdict = "INSUFFICIENT EVIDENCE"
        confidence = "low"
        next_steps = [
            "Exercise caution before sharing unverified claims.",
            "Wait for accredited news agencies or government press bureaus to report.",
            "Perform targeted search on official gazette portals."
        ]
    else:
        verdict = "UNVERIFIED"
        confidence = "low"
        next_steps = [
            "Check if credible journalists have covered this statement.",
            "Look for direct video footage, transcripts, or official press releases."
        ]

    return {
        "verdict": verdict,
        "confidence": confidence,
        "explanation": explanation or f"Claim evaluated as {verdict}.",
        "supporting_evidence": supporting,
        "contradicting_evidence": contradicting,
        "limitations": evaluation.get("limitations", [
            "Confidence reflects completeness of accessible public evidence, not an absolute guarantee."
        ]),
        "recommended_next_steps": next_steps
    }


def compute_overall_news_verdict(claims_evaluations: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Synthesizes overall verdict for content containing multiple claims.
    """
    if not claims_evaluations:
        return {
            "overall_verdict": "UNVERIFIED",
            "confidence": "low",
            "summary": "No verifiable factual claims could be extracted from the text."
        }

    verdicts = [c.get("verdict") for c in claims_evaluations]

    contradicted_count = verdicts.count("CONTRADICTED")
    supported_count = verdicts.count("SUPPORTED")
    mixed_count = verdicts.count("MIXED")
    unverified_count = verdicts.count("UNVERIFIED")
    insufficient_count = verdicts.count("INSUFFICIENT EVIDENCE")

    total = len(verdicts)

    if contradicted_count == total:
        overall = "CONTRADICTED"
        confidence = "high"
        summary = "All extracted claims in this message are directly contradicted by credible fact-checks or official records."
    elif contradicted_count > 0 and supported_count > 0:
        overall = "MIXED"
        confidence = "medium"
        summary = f"Content contains mixed claims: {supported_count} supported and {contradicted_count} refuted. Key aspects are misleading."
    elif mixed_count > 0:
        overall = "MIXED"
        confidence = "medium"
        summary = "The submission contains partially accurate information combined with misleading or unverified elements."
    elif supported_count == total:
        overall = "SUPPORTED"
        confidence = "high"
        summary = "All verifiable claims in this submission are supported by credible sources."
    elif supported_count > 0 and (unverified_count > 0 or insufficient_count > 0):
        overall = "MIXED"
        confidence = "medium"
        summary = f"Some claims ({supported_count}) find corroboration, while others remain unverified."
    elif contradicted_count > 0:
        overall = "CONTRADICTED"
        confidence = "medium"
        summary = f"Key claim(s) in this message have been contradicted by fact-checking archives or official statements."
    elif insufficient_count > 0 and unverified_count == 0 and supported_count == 0:
        overall = "INSUFFICIENT EVIDENCE"
        confidence = "low"
        summary = "Insufficient reliable public records exist to definitively verify or refute these claims."
    else:
        overall = "UNVERIFIED"
        confidence = "low"
        summary = "Available public records do not establish whether these claims are true or false."

    return {
        "overall_verdict": overall,
        "confidence": confidence,
        "summary": summary
    }

