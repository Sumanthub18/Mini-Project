"""
Centralized AI Model Router.
Coordinates primary, contextual, and fallback provider routing across
Groq, Google Gemini, and Mistral AI with strict audit trails.
"""
import time
from typing import Dict, Any, Optional, List
from .groq_service import GroqService
from .gemini_service import GeminiService
from .mistral_service import MistralService
from .scam_detection import run_rule_based_detection
from .risk_scoring import synthesize_risk_score, calculate_risk_level


class AIRouter:
    def __init__(self):
        self.groq = GroqService()
        self.gemini = GeminiService()
        self.mistral = MistralService()

    def get_providers_status(self) -> Dict[str, Any]:
        """
        Reports configured status and models for all providers without exposing secrets.
        """
        return {
            "groq": {
                "name": "Groq",
                "configured": self.groq.is_configured(),
                "model": self.groq.model,
                "role": "Primary fast classification & phrase extraction",
                "features": ["Ultra-low latency", "Structured JSON", "Phrase extraction"]
            },
            "gemini": {
                "name": "Google Gemini",
                "configured": self.gemini.is_configured(),
                "model": self.gemini.model,
                "role": "Contextual reasoning & social engineering detection",
                "features": ["Psychological manipulation analysis", "In-depth explanations", "Contextual nuance"]
            },
            "mistral": {
                "name": "Mistral AI",
                "configured": self.mistral.is_configured(),
                "model": self.mistral.model,
                "role": "Multilingual understanding & independent assessment",
                "features": ["Multilingual support (English, Hindi, Kannada)", "Robust fallback", "Regional threat patterns"]
            }
        }

    def analyze_scam(
        self,
        message: str,
        preferred_provider: str = "auto",
        include_contextual: bool = False
    ) -> Dict[str, Any]:
        """
        Executes scam detection using deterministic rules + intelligent AI model routing.
        """
        start_time = time.perf_counter()

        # 1. Run deterministic rule-based detection first
        rule_results = run_rule_based_detection(message)

        # 2. Determine provider order based on requested preference
        provider_preference = (preferred_provider or "auto").lower()

        if provider_preference == "gemini":
            priority_chain = [("gemini", self.gemini), ("groq", self.groq), ("mistral", self.mistral)]
        elif provider_preference == "mistral":
            priority_chain = [("mistral", self.mistral), ("groq", self.groq), ("gemini", self.gemini)]
        elif provider_preference == "groq":
            priority_chain = [("groq", self.groq), ("gemini", self.gemini), ("mistral", self.mistral)]
        else:
            # Auto router default:
            # If message contains Devanagari (Hindi) or Kannada scripts, prioritize Mistral
            has_indic_script = bool(any('\u0900' <= char <= '\u097F' or '\u0C80' <= char <= '\u0CFF' for char in message))
            if has_indic_script and self.mistral.is_configured():
                priority_chain = [("mistral", self.mistral), ("gemini", self.gemini), ("groq", self.groq)]
            else:
                priority_chain = [("groq", self.groq), ("gemini", self.gemini), ("mistral", self.mistral)]

        ai_response = None
        used_provider_name = None
        used_model_name = None
        fallback_used = False
        fallback_history = []

        # 3. Try providers in priority chain
        for idx, (p_name, service) in enumerate(priority_chain):
            if not service.is_configured():
                fallback_history.append(f"{p_name}: Not configured (API key missing)")
                continue

            res = service.analyze(message)
            if res.get("status") == "success" and "data" in res:
                ai_response = res["data"]
                used_provider_name = p_name
                used_model_name = res.get("model")
                if idx > 0:
                    fallback_used = True
                break
            else:
                err_msg = res.get("error", "Unknown error")
                fallback_history.append(f"{p_name}: {err_msg}")

        # 4. Contextual Gemini escalation if requested or if rule score is ambiguous
        contextual_note = None
        if include_contextual and used_provider_name != "gemini" and self.gemini.is_configured():
            gemini_res = self.gemini.analyze(message)
            if gemini_res.get("status") == "success":
                contextual_note = gemini_res["data"].get("summary")
                # Merge any unique social engineering indicators
                gemini_inds = gemini_res["data"].get("risk_indicators", [])
                if ai_response:
                    ai_response.setdefault("risk_indicators", []).extend(gemini_inds)

        # 5. Fallback to pure rule-based assessment if no AI provider was reachable
        if not ai_response:
            used_provider_name = "deterministic_rule_engine"
            used_model_name = "heuristic-v1"
            fallback_used = True
            fallback_history.append("All external AI providers were unavailable or unconfigured; fell back to deterministic rule engine.")

            primary_cat = rule_results["primary_category"]
            rule_score = rule_results["rule_score"]
            risk_level = calculate_risk_level(rule_score)

            ai_response = {
                "summary": f"Deterministic pattern matching identified {len(rule_results['matched_indicators'])} threat indicators. Primary threat category: {primary_cat}.",
                "scam_category": primary_cat,
                "risk_score": rule_score,
                "risk_level": risk_level,
                "risk_indicators": rule_results["matched_indicators"],
                "recommendations": [
                    "Exercise caution and independently verify the sender's identity.",
                    "Never disclose OTP, passwords, or personal credentials.",
                    "Do not click unsolicited links or install unknown software."
                ],
                "limitations": [
                    "Analysis performed by deterministic local rules because external AI providers were not configured."
                ]
            }

        # 6. Synthesize explainable score and merge indicators
        final_score, final_level, consolidated_indicators, final_recommendations = synthesize_risk_score(
            rule_results=rule_results,
            ai_results=ai_response
        )

        total_elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return {
            "provider": used_provider_name,
            "model": used_model_name,
            "requested_provider": preferred_provider,
            "fallback_used": fallback_used,
            "fallback_history": fallback_history,
            "summary": ai_response.get("summary", "Analysis completed."),
            "contextual_note": contextual_note,
            "scam_category": ai_response.get("scam_category", rule_results["primary_category"]),
            "risk_score": final_score,
            "risk_level": final_level,
            "is_scam": final_score >= 40,
            "risk_indicators": consolidated_indicators,
            "rule_findings": rule_results.get("matched_indicators", []),
            "recommendations": final_recommendations,
            "limitations": ai_response.get("limitations", [
                "Heuristic security evaluation. Threat score is not an absolute mathematical guarantee."
            ]),
            "execution_time_ms": total_elapsed_ms
        }

    def compare_providers(
        self,
        message: str,
        providers: List[str] = None
    ) -> Dict[str, Any]:
        """
        Executes independent analyses across specified providers and aggregates results.
        """
        target_providers = providers or ["groq", "gemini", "mistral"]
        services_map = {
            "groq": self.groq,
            "gemini": self.gemini,
            "mistral": self.mistral
        }

        results = {}
        for p in target_providers:
            svc = services_map.get(p)
            if not svc:
                results[p] = {
                    "status": "error",
                    "error": f"Unknown provider '{p}'",
                    "provider": p,
                    "model": "unknown"
                }
                continue

            if not svc.is_configured():
                results[p] = {
                    "status": "unavailable",
                    "error": f"API key for {p.upper()} is not configured.",
                    "provider": p,
                    "model": svc.model
                }
                continue

            # Execute query
            res = svc.analyze(message)
            results[p] = res

        return results

