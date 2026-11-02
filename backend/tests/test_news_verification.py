"""
Unit and integration tests for Day 4 AI-Powered Fake News Verification Engine.
Tests claim extraction, evidence ranking, verdict generation, and API endpoints.
"""
import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from app.services.claim_extractor import ClaimExtractor
from app.services.news_verdict import determine_claim_verdict, compute_overall_news_verdict
from app.utils.source_validator import classify_source_authority, deduplicate_evidence_sources
from app.services.news_analyzer import NewsAnalyzer


class TestNewsVerificationEngine(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()
        self.extractor = ClaimExtractor()
        self.analyzer = NewsAnalyzer()

    # --- Test 1 & 12: Multiple Claims Extraction & Opinion Filtering ---
    def test_claim_extraction_multiple_claims(self):
        text = "Government has announced free laptops for all college students. Registration closes tomorrow. In my opinion, this is a great move!"
        claims = self.extractor.extract_claims(text)
        self.assertGreaterEqual(len(claims), 1)
        statements = [c["claim"].lower() for c in claims]
        # Opinion should be separated/filtered out
        self.assertFalse(any("in my opinion" in s for s in statements))

    # --- Test 9 & 10: Multilingual Claims (Hindi & Kannada) ---
    def test_multilingual_claim_extraction(self):
        hindi_text = "भारत सरकार सभी कॉलेज छात्रों को मुफ्त लैपटॉप वितरित कर रही है। कल तक आवेदन करें।"
        hindi_claims = self.extractor.extract_claims(hindi_text)
        self.assertGreaterEqual(len(hindi_claims), 1)

        kannada_text = "ಕರ್ನಾಟಕ ಸರ್ಕಾರ ಎಲ್ಲಾ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಉಚಿತ ಲ್ಯಾಪ್ಟಾಪ್ ಘೋಷಿಸಿದೆ."
        kannada_claims = self.extractor.extract_claims(kannada_text)
        self.assertGreaterEqual(len(kannada_claims), 1)

    # --- Test 2 & 7: Fake Scheme & Scientific Misinformation Verdicts ---
    def test_contradicted_verdict(self):
        eval_debunk = {
            "is_contradicted": True,
            "is_supported": False,
            "is_mixed": False,
            "contradicting_evidence": [
                {"title": "PIB Fact Check: Free Laptop Scheme is Fake", "publisher": "PIB Fact Check"}
            ],
            "supporting_evidence": [],
            "explanation": "Debunked by PIB Fact Check."
        }
        res = determine_claim_verdict(eval_debunk, authority_level="very_high")
        self.assertEqual(res["verdict"], "CONTRADICTED")
        self.assertEqual(res["confidence"], "high")

    def test_supported_verdict(self):
        eval_support = {
            "is_supported": True,
            "is_contradicted": False,
            "is_mixed": False,
            "supporting_evidence": [
                {"title": "Press Information Bureau Gazette Release", "publisher": "PIB India"},
                {"title": "The Hindu Report", "publisher": "The Hindu"}
            ],
            "contradicting_evidence": [],
            "explanation": "Confirmed by government gazette."
        }
        res = determine_claim_verdict(eval_support, authority_level="very_high")
        self.assertEqual(res["verdict"], "SUPPORTED")
        self.assertEqual(res["confidence"], "high")

    # --- Test 5: Partially True / Mixed Claims ---
    def test_mixed_verdict(self):
        eval_mixed = {
            "is_mixed": True,
            "supporting_evidence": [{"summary": "Scheme exists in one state"}],
            "contradicting_evidence": [{"summary": "Not nationwide and laptops are subsidized, not free"}],
            "explanation": "State subsidy exists, but claim of free nationwide distribution is false."
        }
        res = determine_claim_verdict(eval_mixed)
        self.assertEqual(res["verdict"], "MIXED")

    # --- Test 6 & 13: Unsupported Claim / No Fact-Check Found ---
    def test_unverified_and_insufficient_evidence(self):
        eval_insufficient = {
            "is_insufficient": True,
            "supporting_evidence": [],
            "contradicting_evidence": [],
            "explanation": "No matching fact checks or reliable news reports found."
        }
        res = determine_claim_verdict(eval_insufficient)
        self.assertEqual(res["verdict"], "INSUFFICIENT EVIDENCE")
        self.assertEqual(res["confidence"], "low")

    # --- Overall Verdict Synthesis ---
    def test_overall_verdict_synthesis(self):
        claims_all_fake = [{"verdict": "CONTRADICTED"}, {"verdict": "CONTRADICTED"}]
        self.assertEqual(compute_overall_news_verdict(claims_all_fake)["overall_verdict"], "CONTRADICTED")

        claims_mixed = [{"verdict": "SUPPORTED"}, {"verdict": "CONTRADICTED"}]
        self.assertEqual(compute_overall_news_verdict(claims_mixed)["overall_verdict"], "MIXED")

        claims_supported = [{"verdict": "SUPPORTED"}, {"verdict": "SUPPORTED"}]
        self.assertEqual(compute_overall_news_verdict(claims_supported)["overall_verdict"], "SUPPORTED")

    # --- Source Authority Tiering & Deduplication ---
    def test_source_authority_tiering(self):
        gov = classify_source_authority("https://pib.gov.in/PressReleasePage.aspx?PRID=123")
        self.assertEqual(gov["tier"], 1)
        self.assertTrue(gov["is_primary"])

        science = classify_source_authority("https://www.nature.com/articles/s41586-020-2012-7")
        self.assertEqual(science["tier"], 2)

        factcheck = classify_source_authority("https://www.altnews.in/viral-claim-debunked")
        self.assertEqual(factcheck["tier"], 3)

        news = classify_source_authority("https://www.reuters.com/world/india/story")
        self.assertEqual(news["tier"], 4)

    def test_evidence_deduplication(self):
        raw_sources = [
            {"source_url": "https://reuters.com/article/1", "title": "Article 1"},
            {"source_url": "https://reuters.com/article/1?utm_source=twitter", "title": "Article 1"},
            {"source_url": "https://pib.gov.in/release", "title": "PIB Release"}
        ]
        deduped = deduplicate_evidence_sources(raw_sources)
        self.assertEqual(len(deduped), 2)
        # Government source (tier 1) should be ranked first
        self.assertEqual(deduped[0]["authority"]["tier"], 1)

    # --- API Endpoints ---
    def test_api_news_health(self):
        resp = self.client.get("/api/news/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["data"]["status"], "healthy")

    def test_api_news_claims_extraction(self):
        resp = self.client.post("/api/news/claims", json={"text": "ISRO launched Chandrayaan-3 successfully to the lunar south pole."})
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertTrue(data["success"])
        self.assertGreaterEqual(data["data"]["count"], 1)

    def test_api_news_analyze_full_pipeline(self):
        payload = {
            "text": "Breaking news: UNESCO declares Indian National Anthem as the best anthem in the world.",
            "input_type": "viral_forward",
            "language": "en"
        }
        resp = self.client.post("/api/news/analyze", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertTrue(data["success"])
        res_data = data["data"]
        self.assertIn("overall_verdict", res_data)
        self.assertIn("claims", res_data)
        self.assertIn("evidence_sources", res_data)
        self.assertIn("providers_used", res_data)

    def test_api_news_validation_rejects_empty(self):
        resp = self.client.post("/api/news/analyze", json={"text": ""})
        self.assertEqual(resp.status_code, 422)


if __name__ == "__main__":
    unittest.main()

