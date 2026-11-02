"""
Evidence Evaluation Engine.
Analyzes retrieved evidence against extracted claims to determine support,
contradiction, credibility weight, recency, and sufficiency.
"""
from typing import Dict, Any, List
from .groq_service import GroqService
from .gemini_service import GeminiService


EVAL_PROMPT = """You are an objective, rigorous fact-checking evidence evaluator.
Your role is to strictly analyze the provided EVIDENCE SOURCES against the specific TARGET CLAIM.

CRITICAL INSTRUCTIONS:
1. Do NOT invent facts or cite URLs not present in the provided evidence.
2. Rely strictly on the provided evidence excerpts and fact-check publisher ratings.
3. Classify evidence into:
   - "supporting": excerpts that directly substantiate the claim.
   - "contradicting": excerpts that debunk, refute, or disprove the claim.
   - "contextual": background information that neither fully supports nor refutes.
4. Assess:
   - "is_contradicted": true if reliable evidence disproves it.
   - "is_supported": true if verified evidence confirms it.
   - "is_mixed": true if some aspects are true but other key parts are false/misleading.
   - "is_insufficient": true if not enough reliable evidence exists to make a definitive call.
   - "explanation": 2-3 sentence neutral, objective explanation.

Respond strictly in valid JSON:
{
  "is_supported": false,
  "is_contradicted": true,
  "is_mixed": false,
  "is_insufficient": false,
  "explanation": "Fact-checkers and official health agencies confirm that...",
  "supporting_points": [],
  "contradicting_points": ["Fact-check organizations confirm that this message is a recurring hoax..."],
  "limitations": ["Evaluated against certified fact-check archives and published sources."]
}"""


class EvidenceEvaluator:
    def __init__(self):
        self.groq = GroqService()
        self.gemini = GeminiService()

    def evaluate_claim_evidence(
        self,
        claim: Dict[str, Any],
        fact_checks: List[Dict[str, Any]],
        evidence_sources: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Evaluates evidence sources against a target claim.
        """
        claim_text = claim.get("claim", "")

        # 1. Check for immediate authoritative fact-check debunking
        direct_debunks = []
        direct_supports = []

        for fc in fact_checks:
            rating = (fc.get("publisher_rating") or "").lower()
            publisher = fc.get("publisher", "Fact-Checker")
            fc_url = fc.get("source_url", "")

            # Common fact check negative ratings
            if any(term in rating for term in ["false", "fake", "hoax", "incorrect", "pants on fire", "fabricated", "misleading", "scam"]):
                direct_debunks.append({
                    "title": f"Fact Check by {publisher}: Rated '{fc.get('publisher_rating')}'",
                    "publisher": publisher,
                    "source_url": fc_url,
                    "published_at": fc.get("review_date"),
                    "summary": f"Rated '{fc.get('publisher_rating')}' by {publisher}."
                })
            elif any(term in rating for term in ["true", "correct", "accurate", "verified"]):
                direct_supports.append({
                    "title": f"Fact Check by {publisher}: Rated '{fc.get('publisher_rating')}'",
                    "publisher": publisher,
                    "source_url": fc_url,
                    "published_at": fc.get("review_date"),
                    "summary": f"Rated '{fc.get('publisher_rating')}' by {publisher}."
                })

        # 2. Build evidence summary for AI reasoning
        evidence_corpus = []
        for fc in fact_checks:
            evidence_corpus.append(f"[FACT CHECK] Publisher: {fc.get('publisher')} | Rating: {fc.get('publisher_rating')} | URL: {fc.get('source_url')}")
        for es in evidence_sources:
            evidence_corpus.append(f"[SEARCH SOURCE] Title: {es.get('title')} | Publisher: {es.get('publisher')} | Excerpt: {es.get('evidence_summary', '')[:200]}")

        evidence_str = "\n".join(evidence_corpus) if evidence_corpus else "No external fact-checks or web articles available."

        # 3. Call AI evaluator (Groq or Gemini)
        eval_result = None
        user_prompt = f"{EVAL_PROMPT}\n\nTARGET CLAIM: \"{claim_text}\"\n\nRETRIEVED EVIDENCE:\n{evidence_str}"

        if self.groq.is_configured() and evidence_corpus:
            try:
                res = self.groq.analyze(user_prompt)
                if res.get("status") == "success" and "data" in res:
                    eval_result = res["data"]
            except Exception:
                pass

        if not eval_result and self.gemini.is_configured() and evidence_corpus:
            try:
                res = self.gemini.analyze(user_prompt)
                if res.get("status") == "success" and "data" in res:
                    eval_result = res["data"]
            except Exception:
                pass

        # 4. Synthesize final evaluation
        supporting_evidence = direct_supports
        contradicting_evidence = direct_debunks

        # If AI detected points, append them
        if eval_result:
            for s_pt in eval_result.get("supporting_points", []):
                supporting_evidence.append({"summary": s_pt, "source": "AI Evidence Synthesis"})
            for c_pt in eval_result.get("contradicting_points", []):
                contradicting_evidence.append({"summary": c_pt, "source": "AI Evidence Synthesis"})

        has_debunk = len(contradicting_evidence) > 0 or (eval_result and eval_result.get("is_contradicted"))
        has_support = len(supporting_evidence) > 0 or (eval_result and eval_result.get("is_supported"))
        is_mixed = (eval_result and eval_result.get("is_mixed")) or (has_debunk and has_support)
        is_insufficient = not evidence_corpus or (eval_result and eval_result.get("is_insufficient"))

        explanation = ""
        if eval_result and eval_result.get("explanation"):
            explanation = eval_result["explanation"]
        elif direct_debunks:
            explanation = f"Directly contradicted by certified fact-checker ({direct_debunks[0]['publisher']}), who rated it '{direct_debunks[0]['title']}'."
        elif direct_supports:
            explanation = f"Corroborated by verified sources including {direct_supports[0]['publisher']}."
        elif is_insufficient:
            explanation = "Insufficient reliable evidence was found to verify or disprove this claim."
        else:
            explanation = "Evaluation completed against available open records."

        return {
            "is_supported": bool(has_support and not is_mixed),
            "is_contradicted": bool(has_debunk and not is_mixed),
            "is_mixed": bool(is_mixed),
            "is_insufficient": bool(is_insufficient),
            "supporting_evidence": supporting_evidence,
            "contradicting_evidence": contradicting_evidence,
            "explanation": explanation,
            "limitations": eval_result.get("limitations", ["Based on available searchable public archives."]) if eval_result else ["Search records limited."]
        }

