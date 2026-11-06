"""
Multi-Model AI Consensus Engine.
Synthesizes evaluations from Google Gemini, Groq (LLaMA 3.3), Mistral AI,
and the deterministic rule engine.
Calculates agreement/disagreement breakdown, missing evidence, and an explainable 0-100 risk score.
Transparently communicates heuristic confidence without claiming absolute statistical certainty.
"""
from typing import Dict, Any, List, Optional
from ..gemini_service import GeminiService
from ..groq_service import GroqService
from ..mistral_service import MistralService
from ..scam_detection import run_rule_based_detection


class ConsensusEngine:
    def __init__(self):
        self.gemini = GeminiService()
        self.groq = GroqService()
        self.mistral = MistralService()

    def evaluate_consensus(
        self,
        text: str,
        active_models: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Executes parallel or sequential evaluation across available AI models and rule engine.
        Synthesizes scores, votes, and discrepancies into an explainable consensus verdict.
        """
        clean_text = (text or "").strip()
        if not clean_text:
            return {
                "consensus_score": 0,
                "consensus_level": "low",
                "agreement_percentage": 100,
                "consensus_status": "No Content",
                "model_votes": {},
                "rule_engine": {},
                "agreements": [],
                "discrepancies": [],
                "missing_evidence": ["No input provided for analysis."]
            }

        # 1. Deterministic Rule Engine
        rule_result = run_rule_based_detection(clean_text)
        base_rule_score = rule_result.get("rule_score", 0)
        rule_categories = rule_result.get("detected_categories", [])
        
        # Multiple matching scam categories compound the risk score
        if rule_categories and base_rule_score > 5:
            rule_score = min(95, base_rule_score + (len(rule_categories) * 20))
        else:
            rule_score = base_rule_score

        # Critical indicators (digital arrest, police coercion, remote app, OTP theft) represent high threats
        if rule_result.get("has_critical_flags"):
            rule_score = max(rule_score, 75)

        rule_level = "high" if rule_score >= 70 else ("medium" if rule_score >= 35 else "low")

        model_votes: Dict[str, Any] = {}
        valid_scores: List[int] = []

        # 2. Invoke models if configured or requested
        check_all = not active_models or "all" in active_models

        # Groq
        if (check_all or "groq" in active_models) and self.groq.is_configured():
            try:
                g_res = self.groq.analyze(clean_text)
                if g_res.get("status") == "success" and "data" in g_res:
                    data = g_res["data"]
                    score = data.get("risk_score", 50)
                    model_votes["groq"] = {
                        "model": g_res.get("model", "llama-3.3-70b"),
                        "risk_score": score,
                        "risk_level": data.get("risk_level", "medium"),
                        "scam_category": data.get("scam_category", "Unknown"),
                        "summary": data.get("summary", "")
                    }
                    valid_scores.append(score)
            except Exception:
                pass

        # Gemini
        if (check_all or "gemini" in active_models) and self.gemini.is_configured():
            try:
                gm_res = self.gemini.analyze(clean_text)
                if gm_res.get("status") == "success" and "data" in gm_res:
                    data = gm_res["data"]
                    score = data.get("risk_score", 50)
                    model_votes["gemini"] = {
                        "model": gm_res.get("model", "gemini-3.5-flash-lite"),
                        "risk_score": score,
                        "risk_level": data.get("risk_level", "medium"),
                        "scam_category": data.get("scam_category", "Unknown"),
                        "summary": data.get("summary", "")
                    }
                    valid_scores.append(score)
            except Exception:
                pass

        # Mistral
        if (check_all or "mistral" in active_models) and self.mistral.is_configured():
            try:
                m_res = self.mistral.analyze(clean_text)
                if m_res.get("status") == "success" and "data" in m_res:
                    data = m_res["data"]
                    score = data.get("risk_score", 50)
                    model_votes["mistral"] = {
                        "model": m_res.get("model", "mistral-small"),
                        "risk_score": score,
                        "risk_level": data.get("risk_level", "medium"),
                        "scam_category": data.get("scam_category", "Unknown"),
                        "summary": data.get("summary", "")
                    }
                    valid_scores.append(score)
            except Exception:
                pass

        # Always include rule engine in votes
        model_votes["rule_engine"] = {
            "model": "Deterministic Pattern Engine",
            "risk_score": rule_score,
            "risk_level": rule_level,
            "scam_category": rule_categories[0] if rule_categories else "Pattern Heuristics",
            "matched_indicators_count": len(rule_result.get("matched_indicators", []))
        }
        valid_scores.append(rule_score)

        # 3. Compute Consensus Score
        if valid_scores:
            avg_score = sum(valid_scores) / len(valid_scores)
            max_score = max(valid_scores)
            # If rule engine or any model flagged critical threat, elevate
            if rule_result.get("has_critical_flags"):
                consensus_score = max(int(avg_score * 0.4 + max_score * 0.6), rule_score)
            else:
                consensus_score = int(round(avg_score))
        else:
            consensus_score = rule_score

        consensus_score = max(0, min(100, consensus_score))
        consensus_level = "high" if consensus_score >= 70 else ("medium" if consensus_score >= 35 else "low")

        # 4. Measure Agreement & Discrepancies
        score_spread = max(valid_scores) - min(valid_scores) if valid_scores else 0
        agreement_percentage = max(10, 100 - (score_spread * 1.2))
        agreement_percentage = round(min(100, agreement_percentage), 1)

        if score_spread <= 15:
            consensus_status = "High Agreement"
        elif score_spread <= 35:
            consensus_status = "Moderate Agreement"
        else:
            consensus_status = "Split Consensus"

        # Determine points of agreement and disagreement
        agreements = []
        discrepancies = []

        all_categories = [
            v.get("scam_category") for v in model_votes.values()
            if v.get("scam_category") and v.get("scam_category") != "Unknown"
        ]
        if all_categories:
            most_common = max(set(all_categories), key=all_categories.count)
            agreements.append(f"Primary threat category identified: {most_common}.")

        if consensus_level == "high":
            agreements.append("High risk indicators (urgency, credential coercion, or payment demand) detected across models.")
        elif consensus_level == "low":
            agreements.append("No active coercive urgency or malicious payloads identified.")

        if score_spread > 25:
            discrepancies.append(
                f"Evaluation variance observed: lowest assessment was {min(valid_scores)}/100 while highest was {max(valid_scores)}/100."
            )

        # 5. Missing Evidence Analysis
        missing_evidence = [
            "Sender authentication (e.g. SPF/DKIM/SMS origin) could not be verified from snippet text alone.",
            "Live banking or payment transaction logs were not queried."
        ]
        if "http" not in clean_text.lower():
            missing_evidence.append("No domain or URL present to perform RDAP registration or Safe Browsing lookups.")

        return {
            "consensus_score": consensus_score,
            "consensus_level": consensus_level,
            "agreement_percentage": agreement_percentage,
            "consensus_status": consensus_status,
            "score_spread": score_spread,
            "model_votes": model_votes,
            "agreements": agreements,
            "discrepancies": discrepancies,
            "missing_evidence": missing_evidence,
            "disclaimer": (
                "Consensus risk scores represent multi-model AI synthesis and heuristic pattern analysis, "
                "not absolute guarantees. Always verify sensitive requests through official channels."
            )
        }
