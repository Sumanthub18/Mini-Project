"""
URL Security Report Formatter and AI Explainer.
Coordinates all URL security sub-services and leverages the centralized
AIRouter to generate explainable, evidence-grounded security narratives.
"""
import time
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from .url_validator import validate_url
from .safe_browsing_service import SafeBrowsingService
from .virustotal_service import VirusTotalService
from .domain_analyzer import DomainAnalyzer
from .rdap_service import RDAPService
from .redirect_analyzer import RedirectAnalyzer
from .url_risk_scoring import calculate_url_risk_score
from ..ai_router import AIRouter


AI_URL_EXPLANATION_PROMPT = """You are a senior cyber threat intelligence analyst and web security engineer.
Analyze the following URL security findings and provide a transparent, evidence-grounded assessment.

CRITICAL INSTRUCTIONS:
1. Base your explanation strictly on the retrieved security evidence below.
2. DO NOT invent threat intelligence, domain registrations, or malware infections that are not in the evidence.
3. If threat intelligence was unavailable or returned no match, explicitly state that rather than assuming the URL is benign or malicious.
4. Provide actionable, protective advice for end users.

EVIDENCE DATA:
{evidence_json}

Respond ONLY with a valid JSON object matching this exact structure:
{{
  "summary": "1-2 sentence executive assessment of URL safety and risk",
  "threat_explanation": "Detailed explanation of detected security markers or why the link is suspicious",
  "domain_evaluation": "Nuanced analysis of domain structure, TLD, age, or impersonation traits",
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2",
    "Specific actionable recommendation 3"
  ],
  "limitations": [
    "Note regarding unavailable lookups or heuristic limitations"
  ]
}}"""


class URLReportCoordinator:
    def __init__(self):
        self.safe_browsing = SafeBrowsingService()
        self.virustotal = VirusTotalService()
        self.domain_analyzer = DomainAnalyzer()
        self.rdap = RDAPService()
        self.redirect_analyzer = RedirectAnalyzer()
        self.ai_router = AIRouter()

    def get_service_status(self) -> Dict[str, Any]:
        """Returns configuration status of URL security providers."""
        return {
            "google_safe_browsing": {
                "configured": self.safe_browsing.is_configured(),
                "role": "Known malware, phishing, and social engineering threat matching"
            },
            "virustotal": {
                "configured": self.virustotal.is_configured(),
                "role": "Multi-engine antivirus and threat reputation intelligence"
            },
            "rdap_domain_intel": {
                "configured": True,
                "role": "Registration date, domain age, and registrar metadata via IANA/RDAP"
            },
            "ssrf_safe_redirects": {
                "configured": True,
                "role": "Safe HTTP hop tracing with private IP and cloud metadata blocking"
            },
            "ai_explainer": {
                "configured": self.ai_router.groq.is_configured() or self.ai_router.gemini.is_configured(),
                "role": "Behavioral threat explanation and user safety guidance"
            }
        }

    def analyze_url(self, raw_url: str, check_redirects: bool = True) -> Dict[str, Any]:
        """
        Executes complete URL security pipeline:
        1. Validation & SSRF check
        2. Domain heuristic & brand impersonation analysis
        3. RDAP domain age & registration lookup
        4. Safe redirect tracing
        5. Threat intelligence (Google Safe Browsing + VirusTotal)
        6. Explainable risk scoring
        7. Grounded AI explanation
        """
        start_time = time.perf_counter()

        # Step 1: Validation
        validation = validate_url(raw_url)
        if not validation.get("valid"):
            return {
                "success": False,
                "error": validation.get("error", "Invalid URL"),
                "url": raw_url,
                "risk_score": 0,
                "risk_level": "low"
            }

        url_to_analyze = validation.get("normalized_url", raw_url)
        hostname = validation.get("hostname", "")
        is_ip = validation.get("is_ip", False)
        is_private_or_local = validation.get("is_private_or_local", False)

        # Step 2: Domain Structure & Brand Impersonation
        domain_intel = self.domain_analyzer.analyze(validation)

        # Step 3: RDAP Domain Age & Registration Lookup
        rdap_intel = self.rdap.lookup_domain(domain_intel.get("root_domain", hostname), is_ip=is_ip)

        # Step 4: Safe Redirect Tracing
        if check_redirects and not is_private_or_local:
            redirect_intel = self.redirect_analyzer.trace_redirects(url_to_analyze)
        else:
            redirect_intel = {
                "has_redirects": False,
                "redirect_count": 0,
                "initial_url": url_to_analyze,
                "final_url": url_to_analyze,
                "hops": [],
                "is_suspicious_redirect": False,
                "ssrf_blocked": is_private_or_local,
                "ssrf_reason": validation.get("ip_security_reason"),
                "summary": "Redirect tracing skipped for internal IP or by configuration."
            }

        # Step 5: Threat Intelligence Lookups
        safe_browsing_result = self.safe_browsing.check_url(url_to_analyze)
        virustotal_result = self.virustotal.get_url_report(url_to_analyze)

        # Step 6: Risk Scoring
        risk_evaluation = calculate_url_risk_score(
            validated_url=validation,
            domain_analysis=domain_intel,
            rdap_intel=rdap_intel,
            redirect_intel=redirect_intel,
            safe_browsing=safe_browsing_result,
            virustotal=virustotal_result
        )

        # Step 7: Build Evidence Bundle for AI Explanation
        evidence_bundle = {
            "url": url_to_analyze,
            "hostname": hostname,
            "risk_score": risk_evaluation.get("score"),
            "risk_level": risk_evaluation.get("level"),
            "is_ip_address": is_ip,
            "is_punycode": validation.get("is_punycode"),
            "domain_age": rdap_intel.get("domain_age_readable"),
            "registrar": rdap_intel.get("registrar"),
            "brand_impersonation": domain_intel.get("brand_impersonation"),
            "google_safe_browsing": {
                "status": safe_browsing_result.get("status"),
                "match_found": safe_browsing_result.get("match_found"),
                "matches": safe_browsing_result.get("matches")
            },
            "virustotal": {
                "status": virustotal_result.get("status"),
                "detection_ratio": virustotal_result.get("detection_ratio"),
                "malicious_count": virustotal_result.get("malicious_count")
            },
            "redirects": {
                "redirect_count": redirect_intel.get("redirect_count"),
                "final_url": redirect_intel.get("final_url"),
                "ssrf_blocked": redirect_intel.get("ssrf_blocked")
            },
            "suspicious_indicators": risk_evaluation.get("contributing_factors", [])
        }

        # Step 8: AI Explanation via AI Router
        ai_explanation = self._generate_ai_explanation(evidence_bundle)

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Build Standardized Warnings and Recommendations
        warnings = [
            f.get("description")
            for f in risk_evaluation.get("contributing_factors", [])
            if f.get("severity") in ("medium", "high", "critical")
        ]

        recommendations = ai_explanation.get("recommendations", [])
        if not recommendations:
            if risk_evaluation.get("level") == "high":
                recommendations = [
                    "DO NOT click this link or enter passwords or personal data.",
                    "Delete the message containing this link.",
                    "Report the URL to your organization's security team or browser phishing reporting."
                ]
            elif risk_evaluation.get("level") == "medium":
                recommendations = [
                    "Exercise caution. Verify the destination domain manually in a search engine.",
                    "Do not enter financial credentials, credit cards, or OTP codes.",
                    "Verify the sender if this link was received in an unsolicited email or SMS."
                ]
            else:
                recommendations = [
                    "Standard precautions: ensure the browser displays a valid HTTPS padlock.",
                    "Verify the address bar matches the intended service."
                ]

        return {
            "success": True,
            "url": raw_url,
            "normalized_url": url_to_analyze,
            "risk_score": risk_evaluation.get("score"),
            "risk_level": risk_evaluation.get("level"),
            "summary": ai_explanation.get("summary") or risk_evaluation.get("formula_summary"),
            "warnings": warnings,
            "recommendations": recommendations,
            "ai_explanation": ai_explanation,
            "domain_intelligence": {
                "hostname": hostname,
                "root_domain": domain_intel.get("root_domain"),
                "tld": domain_intel.get("tld"),
                "subdomains": domain_intel.get("subdomains"),
                "subdomain_depth": domain_intel.get("subdomain_depth"),
                "is_ip": is_ip,
                "is_punycode": validation.get("is_punycode"),
                "unicode_host": validation.get("unicode_host"),
                "domain_age": rdap_intel.get("domain_age_readable"),
                "domain_age_days": rdap_intel.get("domain_age_days"),
                "registration_date": rdap_intel.get("registration_date"),
                "registrar": rdap_intel.get("registrar"),
                "nameservers": rdap_intel.get("nameservers"),
                "is_reputable": domain_intel.get("is_reputable"),
                "is_shortener": domain_intel.get("is_shortener")
            },
            "threat_intelligence": {
                "google_safe_browsing": safe_browsing_result,
                "virustotal": virustotal_result
            },
            "redirect_analysis": redirect_intel,
            "contributing_factors": risk_evaluation.get("contributing_factors", []),
            "execution_time_ms": elapsed_ms,
            "analyzed_at": datetime.now(timezone.utc).isoformat()
        }

    def _generate_ai_explanation(self, evidence: Dict[str, Any]) -> Dict[str, Any]:
        """
        Invokes Gemini or Groq to synthesize an explanation from concrete evidence.
        Falls back to rule-based explanation if providers are unavailable.
        """
        evidence_str = json.dumps(evidence, indent=2)
        prompt = AI_URL_EXPLANATION_PROMPT.format(evidence_json=evidence_str)

        # Attempt with Gemini or Groq
        try:
            if self.ai_router.gemini.is_configured():
                res = self.ai_router.gemini.analyze(prompt)
                if res.get("status") == "success" and "data" in res:
                    return res["data"]
            elif self.ai_router.groq.is_configured():
                res = self.ai_router.groq.analyze(prompt)
                if res.get("status") == "success" and "data" in res:
                    return res["data"]
        except Exception:
            pass

        # Fallback deterministic explanation
        level = evidence.get("risk_level", "low")
        score = evidence.get("risk_score", 0)
        factors = evidence.get("suspicious_indicators", [])

        if level == "high":
            summary = f"High Risk URL ({score}/100). Significant security indicators or threat patterns detected."
            threat_exp = "The URL exhibits characteristics associated with malicious phishing campaigns, brand impersonation, or dangerous redirect patterns."
        elif level == "medium":
            summary = f"Medium Risk URL ({score}/100). URL contains suspicious parameters, recent registration, or unverified structural attributes."
            threat_exp = "While not flagged in active threat databases, the domain structure warrants caution before entering sensitive details."
        else:
            summary = f"Low Risk URL ({score}/100). Standard domain syntax with no overt phishing indicators or threat blacklist matches."
            threat_exp = "No known malicious patterns or threat blacklist hits were found for this address."

        return {
            "summary": summary,
            "threat_explanation": threat_exp,
            "domain_evaluation": f"Host '{evidence.get('hostname')}' evaluated with domain age {evidence.get('domain_age')}.",
            "recommendations": [
                "Verify the domain in your browser before entering sensitive information.",
                "Ensure HTTPS encryption is active."
            ],
            "limitations": [
                "Analysis includes structural evaluation, RDAP registration records, and available threat databases."
            ]
        }
