"""
Master News Verification Orchestrator.
Coordinates Claim Extraction, Fact-Check Search, Live Evidence Retrieval,
Evidence Evaluation, and Transparent Verdict Synthesis.
"""
import time
from typing import Dict, Any, List
from .claim_extractor import ClaimExtractor
from .factcheck_service import FactCheckService
from .evidence_search import EvidenceSearchService
from .evidence_evaluator import EvidenceEvaluator
from .news_verdict import determine_claim_verdict, compute_overall_news_verdict
from ..utils.news_formatter import format_news_response
from ..utils.source_validator import deduplicate_evidence_sources


class NewsAnalyzer:
    def __init__(self):
        self.claim_extractor = ClaimExtractor()
        self.factcheck_service = FactCheckService()
        self.evidence_search = EvidenceSearchService()
        self.evidence_evaluator = EvidenceEvaluator()

    def analyze_news(
        self,
        text: str,
        input_type: str = "headline",
        language: str = "auto"
    ) -> Dict[str, Any]:
        """
        Executes full fake news verification pipeline.
        """
        start_time = time.perf_counter()
        clean_text = text.strip()

        providers_used = []
        if self.claim_extractor.groq.is_configured():
            providers_used.append(f"Groq ({self.claim_extractor.groq.model})")
        elif self.claim_extractor.gemini.is_configured():
            providers_used.append(f"Google Gemini ({self.claim_extractor.gemini.model})")
        else:
            providers_used.append("Heuristic Claim Extractor")

        if self.factcheck_service.is_configured():
            providers_used.append("Google Fact Check Tools API")

        # 1. Extract distinct factual claims
        raw_claims = self.claim_extractor.extract_claims(clean_text)

        evaluated_claims = []
        all_fact_checks = []
        all_evidence = []

        # 2. Evaluate each claim individually
        for c in raw_claims:
            claim_text = c.get("claim", "")

            # A. Search existing professional fact checks
            fc_res = self.factcheck_service.search_fact_checks(claim_text, language)
            matches = fc_res.get("matches", [])
            all_fact_checks.extend(matches)

            # B. Live web evidence retrieval
            search_res = self.evidence_search.search_evidence(claim_text)
            evidence_items = search_res.get("results", [])
            all_evidence.extend(evidence_items)

            if search_res.get("provider") and search_res["provider"] != "none":
                p_label = f"Search Provider ({search_res['provider']})"
                if p_label not in providers_used:
                    providers_used.append(p_label)

            # C. Evaluate evidence against claim
            eval_res = self.evidence_evaluator.evaluate_claim_evidence(
                claim=c,
                fact_checks=matches,
                evidence_sources=evidence_items
            )

            # D. Determine claim verdict & confidence
            verdict_info = determine_claim_verdict(eval_res)

            evaluated_claims.append({
                "claim": claim_text,
                "subject": c.get("subject", "Entity"),
                "category": c.get("category", "General"),
                "verdict": verdict_info["verdict"],
                "confidence": verdict_info["confidence"],
                "explanation": verdict_info["explanation"],
                "supporting_evidence": verdict_info["supporting_evidence"],
                "contradicting_evidence": verdict_info["contradicting_evidence"],
                "limitations": verdict_info["limitations"],
                "recommended_next_steps": verdict_info["recommended_next_steps"]
            })

        # 3. Compute overall synthesis
        overall_info = compute_overall_news_verdict(evaluated_claims)

        # 4. Deduplicate all collected sources
        deduped_evidence = deduplicate_evidence_sources(all_evidence)
        deduped_factchecks = []
        seen_fc_urls = set()
        for fc in all_fact_checks:
            url = fc.get("source_url", "")
            if url and url not in seen_fc_urls:
                seen_fc_urls.add(url)
                deduped_factchecks.append(fc)

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return format_news_response(
            input_text=clean_text,
            input_type=input_type,
            overall_verdict_info=overall_info,
            claims_list=evaluated_claims,
            fact_check_sources=deduped_factchecks[:8],
            evidence_sources=deduped_evidence[:10],
            providers_used=providers_used,
            execution_time_ms=elapsed_ms
        )

