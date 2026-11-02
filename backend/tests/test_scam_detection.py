"""
Automated Unit and Integration Tests for Day 3 AI Scam Detection Engine.
"""
import unittest
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from app.services.scam_detection import run_rule_based_detection
from app.services.risk_scoring import synthesize_risk_score, calculate_risk_level
from app.services.ai_router import AIRouter
from app.utils.response_formatter import compute_model_comparison


class TestScamDetectionEngine(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()
        self.router = AIRouter()

    # --- Test Suite 1: Rule-Based Detection Across Categories ---
    def test_banking_and_otp_theft(self):
        msg = "Dear SBI customer, your netbanking account will be blocked within 24 hours. Share OTP 4920 to verify KYC immediately."
        res = run_rule_based_detection(msg)
        self.assertGreater(res["rule_score"], 60)
        self.assertTrue(res["has_critical_flags"])
        titles = [i["title"] for i in res["matched_indicators"]]
        self.assertIn("Credential or Secret Request", titles)
        self.assertIn("Urgency / Threatening Pressure", titles)

    def test_lottery_prize_scam(self):
        msg = "Congratulations! You have won $1,000,000 in our international lucky draw. Pay processing fee of $150 to claim your prize."
        res = run_rule_based_detection(msg)
        self.assertGreater(res["rule_score"], 40)
        self.assertIn("Lottery and prize scams", res["detected_categories"])

    def test_fake_job_offer(self):
        msg = "Work from home part time job! Like YouTube videos and earn Rs 5000 daily. Pay registration fee to start immediately."
        res = run_rule_based_detection(msg)
        self.assertIn("Fake job offers", res["detected_categories"])
        self.assertGreater(res["rule_score"], 35)

    def test_multilingual_hindi_kannada_detection(self):
        hindi_msg = "प्रिय ग्राहक, आपका बैंक खाता ब्लॉक हो जाएगा। तुरंत ओटीपी बताएं।"
        res_hindi = run_rule_based_detection(hindi_msg)
        self.assertTrue(res_hindi["has_critical_flags"])

        kannada_msg = "ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆ ರದ್ದು ಮಾಡಲಾಗಿದೆ. ತಕ್ಷಣ ಓಟಿಪಿ ನೀಡಿ."
        res_kannada = run_rule_based_detection(kannada_msg)
        self.assertTrue(res_kannada["has_critical_flags"])

    def test_legitimate_safe_message(self):
        safe_msg = "Hi Sarah, let's meet tomorrow at 10 AM in the conference room to discuss the project quarterly roadmap. Thanks!"
        res = run_rule_based_detection(safe_msg)
        self.assertLess(res["rule_score"], 20)
        self.assertEqual(len(res["matched_indicators"]), 0)

    # --- Test Suite 2: Explainable Risk Scoring ---
    def test_risk_level_boundaries(self):
        self.assertEqual(calculate_risk_level(15), "low")
        self.assertEqual(calculate_risk_level(29), "low")
        self.assertEqual(calculate_risk_level(30), "medium")
        self.assertEqual(calculate_risk_level(59), "medium")
        self.assertEqual(calculate_risk_level(60), "high")
        self.assertEqual(calculate_risk_level(95), "high")

    def test_score_synthesis_no_double_counting(self):
        rule_results = {
            "rule_score": 70,
            "has_critical_flags": True,
            "matched_indicators": [
                {"title": "Urgent Threat", "phrase": "account blocked", "explanation": "Urgency", "severity": "high"}
            ]
        }
        ai_results = {
            "risk_score": 85,
            "risk_indicators": [
                {"title": "Urgent Threat", "phrase": "account blocked", "explanation": "Urgency", "severity": "high"},
                {"title": "Authority Bias", "phrase": "bank manager", "explanation": "Impersonation", "severity": "medium"}
            ],
            "recommendations": ["Do not share details"]
        }
        score, level, indicators, recs = synthesize_risk_score(rule_results, ai_results)
        self.assertGreaterEqual(score, 75)
        self.assertEqual(level, "high")
        # Should not have duplicate "account blocked" phrases
        phrases = [i["phrase"] for i in indicators if i["phrase"]]
        self.assertEqual(len(phrases), len(set(phrases)))

    # --- Test Suite 3: AI Router & Safe Fallbacks ---
    def test_router_status_structure(self):
        status = self.router.get_providers_status()
        self.assertIn("groq", status)
        self.assertIn("gemini", status)
        self.assertIn("mistral", status)
        for p, data in status.items():
            self.assertIn("configured", data)
            self.assertIn("model", data)
            self.assertIn("role", data)

    def test_router_fallback_when_unconfigured(self):
        # Even without external API keys, the router returns a valid analysis via rule engine
        msg = "URGENT: Click http://scam-site.xyz to unlock your frozen ATM card now!"
        res = self.router.analyze_scam(msg, preferred_provider="auto")
        self.assertIn("risk_score", res)
        self.assertIn("risk_level", res)
        self.assertIn("scam_category", res)
        self.assertTrue(res["fallback_used"])
        self.assertGreaterEqual(res["risk_score"], 30)

    # --- Test Suite 4: Multi-Model Comparison Synthesis ---
    def test_model_comparison_synthesis(self):
        mock_results = {
            "groq": {
                "status": "success",
                "data": {
                    "scam_category": "Phishing attacks",
                    "risk_score": 85,
                    "risk_level": "high",
                    "risk_indicators": [
                        {"title": "Urgent language", "phrase": "act now", "explanation": "Pressure", "severity": "high"}
                    ]
                }
            },
            "gemini": {
                "status": "success",
                "data": {
                    "scam_category": "Phishing attacks",
                    "risk_score": 80,
                    "risk_level": "high",
                    "risk_indicators": [
                        {"title": "Urgent language", "phrase": "act now", "explanation": "Pressure", "severity": "high"},
                        {"title": "Psychological Fear", "phrase": "police notice", "explanation": "Fear tactic", "severity": "high"}
                    ]
                }
            },
            "mistral": {
                "status": "unavailable",
                "error": "MISTRAL_API_KEY is not configured."
            }
        }
        comparison = compute_model_comparison(mock_results)
        self.assertEqual(len(comparison["common_findings"]), 1)
        self.assertEqual(comparison["common_findings"][0]["title"], "Urgent language")
        self.assertEqual(comparison["consensus"]["consensus_category"], "Phishing attacks")
        self.assertEqual(comparison["consensus"]["agreement_level"], "Unanimous")

    # --- Test Suite 5: Flask API Endpoints ---
    def test_api_health(self):
        resp = self.client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        json_data = resp.get_json()
        self.assertTrue(json_data["success"])
        self.assertEqual(json_data["data"]["status"], "healthy")

    def test_api_providers_list(self):
        resp = self.client.get("/api/ai/providers")
        self.assertEqual(resp.status_code, 200)
        json_data = resp.get_json()
        self.assertTrue(json_data["success"])
        self.assertIn("groq", json_data["data"])

    def test_api_analyze_scam_endpoint(self):
        payload = {
            "message": "Congratulations! You have won a free gift card. Click here: http://claim-now.xyz",
            "provider": "auto"
        }
        resp = self.client.post("/api/analyze/scam", json=payload)
        self.assertEqual(resp.status_code, 200)
        json_data = resp.get_json()
        self.assertTrue(json_data["success"])
        data = json_data["data"]
        self.assertIn("risk_score", data)
        self.assertIn("risk_level", data)
        self.assertIn("scam_category", data)

    def test_api_analyze_validation_error(self):
        # Empty message should fail validation
        resp = self.client.post("/api/analyze/scam", json={"message": ""})
        self.assertEqual(resp.status_code, 422)

    def test_api_compare_endpoint(self):
        payload = {
            "message": "Your debit card is blocked. Send PIN to reactive.",
            "providers": ["groq", "gemini"]
        }
        resp = self.client.post("/api/analyze/scam/compare", json=payload)
        self.assertEqual(resp.status_code, 200)
        json_data = resp.get_json()
        self.assertTrue(json_data["success"])
        self.assertIn("models", json_data["data"])
        self.assertIn("synthesis", json_data["data"])


if __name__ == "__main__":
    unittest.main()

