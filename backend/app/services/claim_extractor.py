"""
Claim Extraction Engine.
Extracts individual verifiable factual claims from text, identifying subject,
context, dates/locations, and verifiable evidence requirements while filtering out pure opinions.
"""
import re
import json
from typing import List, Dict, Any
from .groq_service import GroqService
from .gemini_service import GeminiService


CLAIM_PROMPT = """You are a senior professional fact-checking researcher.
Analyze the following text and extract INDIVIDUAL VERIFIABLE FACTUAL CLAIMS.

Guidelines:
1. Extract distinct, specific factual statements that can be verified as true or false.
2. Separate opinions, value judgments, predictions, jokes, or emotional commentary from factual claims.
3. For each claim, determine:
   - "claim": The clear, standalone statement of fact.
   - "subject": The main entity or subject (e.g. Government, Health Ministry, Company, Politician).
   - "category": Political, Health & Science, Government Scheme, Financial, or General News.
   - "context": Date, location, or timeframe if present.
   - "verification_criteria": What specific evidence (e.g., gazette notification, official study, press release) would verify or debunk it.

Respond strictly with valid JSON:
{
  "claims": [
    {
      "claim": "Clear factual statement",
      "subject": "Entity name",
      "category": "Health & Science",
      "context": "Timeline or location if mentioned",
      "verification_criteria": "Official peer-reviewed study or health ministry advisory"
    }
  ]
}"""


class ClaimExtractor:
    def __init__(self):
        self.groq = GroqService()
        self.gemini = GeminiService()

    def extract_claims(self, text: str) -> List[Dict[str, Any]]:
        """
        Extracts factual claims using Groq/Gemini LLM with deterministic sentence-splitter fallback.
        """
        cleaned = text.strip()
        if not cleaned:
            return []

        # 1. Try Groq for ultra-fast extraction
        if self.groq.is_configured():
            try:
                res = self.groq.analyze(f"{CLAIM_PROMPT}\n\nTEXT TO EXTRACT:\n{cleaned}")
                if res.get("status") == "success" and "data" in res:
                    data = res["data"]
                    if "claims" in data and isinstance(data["claims"], list) and len(data["claims"]) > 0:
                        return self._sanitize_extracted_claims(data["claims"])
            except Exception as e:
                pass

        # 2. Try Gemini
        if self.gemini.is_configured():
            try:
                res = self.gemini.analyze(f"{CLAIM_PROMPT}\n\nTEXT TO EXTRACT:\n{cleaned}")
                if res.get("status") == "success" and "data" in res:
                    data = res["data"]
                    if "claims" in data and isinstance(data["claims"], list) and len(data["claims"]) > 0:
                        return self._sanitize_extracted_claims(data["claims"])
            except Exception as e:
                pass

        # 3. Deterministic Heuristic Fallback
        return self._heuristic_claim_extraction(cleaned)

    def _sanitize_extracted_claims(self, claims: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        sanitized = []
        for c in claims:
            statement = str(c.get("claim", "")).strip()
            if not statement or len(statement) < 5:
                continue
            sanitized.append({
                "claim": statement,
                "subject": str(c.get("subject", "Unspecified Entity")),
                "category": str(c.get("category", "General News")),
                "context": str(c.get("context", "")),
                "verification_criteria": str(c.get("verification_criteria", "Reliable official records or reporting"))
            })
        return sanitized[:8]

    def _heuristic_claim_extraction(self, text: str) -> List[Dict[str, Any]]:
        """
        Splits text into candidate sentences and filters out pure opinions.
        """
        sentences = re.split(r"(?<=[.!?\n])\s+", text)
        opinion_markers = [
            "i think", "i believe", "in my opinion", "personally", "i feel",
            "looks like", "probably", "maybe", "great", "terrible", "awesome"
        ]

        claims = []
        for sent in sentences:
            s_clean = sent.strip()
            if len(s_clean) < 15:
                continue
            s_lower = s_clean.lower()
            if any(s_lower.startswith(m) for m in opinion_markers):
                continue

            # Identify probable category
            cat = "General News"
            if any(w in s_lower for w in ["covid", "virus", "cancer", "vaccine", "diet", "cure", "medicine"]):
                cat = "Health & Science"
            elif any(w in s_lower for w in ["government", "minister", "scheme", "subsidy", "laptop", "free", "tax", "rbi"]):
                cat = "Government Scheme"
            elif any(w in s_lower for w in ["election", "vote", "party", "bjp", "congress", "president", "court"]):
                cat = "Political"

            claims.append({
                "claim": s_clean,
                "subject": "Identified Claim",
                "category": cat,
                "context": "Input text",
                "verification_criteria": "Official statement, accredited journalism, or scientific data"
            })

        if not claims and text.strip():
            claims.append({
                "claim": text.strip(),
                "subject": "Main Submission",
                "category": "General News",
                "context": "",
                "verification_criteria": "Verifiable news or official public records"
            })

        return claims[:5]

