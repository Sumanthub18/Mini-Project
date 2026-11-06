"""
Unit and Integration Tests for Day 6: Advanced Multimodal AI & Cyber Safety Chatbot.
Covers Text, Kannada/Hindi, Image OCR, QR extraction, Audio transcription,
Video pipeline, Consensus Engine, Emergency triage, and Credential guardrails.
"""
import io
import json
import unittest
from unittest.mock import patch, MagicMock
from PIL import Image

from backend.app import create_app
from backend.app.services.multimodal.language_service import LanguageService
from backend.app.services.multimodal.consensus_engine import ConsensusEngine
from backend.app.services.chatbot.safety_chatbot import SafetyChatbot


def create_test_image_bytes(format="JPEG", color="blue", size=(100, 100)) -> bytes:
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


class TestMultimodalAndChatbot(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

    def test_multimodal_health(self):
        """Verify GET /api/multimodal/health reports operational status."""
        resp = self.client.get("/api/multimodal/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertTrue(data.get("success"))
        result = data.get("data", {})
        self.assertEqual(result.get("status"), "ready")
        self.assertIn("text_analysis", result.get("capabilities", {}))
        self.assertIn("en", result.get("capabilities", {}).get("regional_languages", []))
        self.assertIn("kn", result.get("capabilities", {}).get("regional_languages", []))
        self.assertIn("hi", result.get("capabilities", {}).get("regional_languages", []))

    def test_language_detection_kannada(self):
        """Verify Kannada script detection and normalized language code."""
        text = "ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆ ಬ್ಲಾಕ್ ಆಗಿದೆ. ತಕ್ಷಣ OTP ಕಳುಹಿಸಿ."
        res = LanguageService.detect_language(text)
        self.assertEqual(res["normalized_lang"], "kn")
        self.assertEqual(res["script"], "kannada")

    def test_language_detection_hindi(self):
        """Verify Hindi/Devanagari script detection."""
        text = "आपका बिजली बिल बाकी है, आज रात कनेक्शन काट दिया जाएगा। तुरंत भुगतान करें।"
        res = LanguageService.detect_language(text)
        self.assertEqual(res["normalized_lang"], "hi")
        self.assertEqual(res["script"], "devanagari")

    def test_language_detection_hinglish(self):
        """Verify Romanized Hindi (Hinglish) detection."""
        text = "bhai jaldi paisa bhejo lottery inam mila hai apna khata number do"
        res = LanguageService.detect_language(text)
        self.assertEqual(res["normalized_lang"], "hi")
        self.assertTrue(res["is_mixed"])

    def test_text_analysis_endpoint_scam(self):
        """Verify POST /api/analyze/multimodal with urgent banking phishing text."""
        payload = {
            "text": "URGENT: Your SBI account is suspended due to expired KYC. Click http://sbi-kyc-update.xyz to verify immediately.",
            "target_language": "en"
        }
        resp = self.client.post("/api/analyze/multimodal", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertTrue(data.get("success"))
        result = data.get("data", {})
        self.assertEqual(result.get("media_type"), "text")
        self.assertGreaterEqual(result.get("risk_score", 0), 70)
        self.assertEqual(result.get("risk_level"), "high")
        self.assertIn("consensus", result)
        self.assertIn("localized_recommendations", result.get("localization", {}))

    def test_text_analysis_kannada_threat(self):
        """Verify Kannada text scam evaluation and localized response."""
        payload = {
            "text": "ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆ ಬ್ಲಾಕ್ ಆಗಿದೆ. ತಕ್ಷಣ ಈ ಲಿಂಕ್ ಕ್ಲಿಕ್ ಮಾಡಿ OTP ಕಳುಹಿಸಿ.",
            "target_language": "kn"
        }
        resp = self.client.post("/api/analyze/multimodal", json=payload)
        self.assertEqual(resp.status_code, 200)
        result = resp.get_json().get("data", {})
        self.assertEqual(result.get("target_language"), "kn")
        self.assertIn("ನಿಮ್ಮ", result.get("localization", {}).get("original_text", ""))

    def test_image_analysis_endpoint(self):
        """Verify POST /api/analyze/image with valid image bytes."""
        img_bytes = create_test_image_bytes(format="JPEG")
        data = {
            "file": (io.BytesIO(img_bytes), "screenshot.jpg", "image/jpeg"),
            "target_language": "en"
        }
        resp = self.client.post("/api/analyze/image", data=data, content_type="multipart/form-data")
        self.assertEqual(resp.status_code, 200)
        body = resp.get_json()
        self.assertTrue(body.get("success"))
        res = body.get("data", {})
        self.assertEqual(res.get("media_type"), "image")
        self.assertIn("visual_analysis", res)
        self.assertIn("qr_codes_detected", res)

    def test_image_qr_code_handling(self):
        """Verify QR code extracted from image includes static warning and does NOT auto-open."""
        mock_vision_output = {
            "ocr_text": "Scan here to receive INR 50,000 lottery prize money",
            "qr_detected": True,
            "qr_url": "https://fake-lottery-prize.xyz/claim",
            "threat_category": "UPI Payment Scam",
            "risk_score": 85,
            "risk_level": "high",
            "visual_indicators": [{"indicator": "Fake Prize", "detail": "Lottery QR", "severity": "high"}],
            "payment_request_details": {"is_payment_request": True, "upi_id": "", "amount_mentioned": "50000", "payee_name": ""},
            "summary": "Suspicious scan-to-receive lottery QR code."
        }
        with patch("backend.app.services.multimodal.vision_service.VisionService.analyze_image") as mock_analyze:
            mock_analyze.return_value = {
                **mock_vision_output,
                "qr_codes": [{
                    "raw_destination": "https://fake-lottery-prize.xyz/claim",
                    "auto_opened": False,
                    "safety_disclaimer": "URL/QR was extracted for static threat inspection. It was NEVER opened automatically."
                }]
            }
            img_bytes = create_test_image_bytes()
            data = {"file": (io.BytesIO(img_bytes), "qr.png", "image/png")}
            resp = self.client.post("/api/analyze/image", data=data, content_type="multipart/form-data")
            self.assertEqual(resp.status_code, 200)
            res = resp.get_json().get("data", {})
            self.assertEqual(len(res.get("qr_codes_detected", [])), 1)
            qr = res["qr_codes_detected"][0]
            self.assertFalse(qr.get("auto_opened"))
            self.assertIn("NEVER opened automatically", qr.get("safety_disclaimer"))

    def test_audio_analysis_endpoint(self):
        """Verify POST /api/analyze/audio transcribes and evaluates voice scam."""
        mock_transcript = "This is CBI officer calling. Digital arrest warrant issued against you for money laundering. Transfer funds immediately."
        with patch("backend.app.services.multimodal.transcription_service.TranscriptionService.transcribe") as mock_trans:
            mock_trans.return_value = {
                "status": "success",
                "transcript": mock_transcript,
                "detected_language": "en",
                "detected_language_name": "English",
                "duration_seconds": 6.5
            }
            fake_audio = b"\x00" * 200
            data = {"file": (io.BytesIO(fake_audio), "police_call.mp3", "audio/mpeg")}
            resp = self.client.post("/api/analyze/audio", data=data, content_type="multipart/form-data")
            self.assertEqual(resp.status_code, 200)
            res = resp.get_json().get("data", {})
            self.assertEqual(res.get("media_type"), "audio")
            self.assertEqual(res.get("risk_level"), "high")
            self.assertGreaterEqual(res.get("risk_score", 0), 70)

    def test_video_analysis_pipeline_and_disclaimer(self):
        """Verify POST /api/analyze/video includes explicit deepfake disclaimer."""
        fake_video = b"\x00" * 500
        data = {"file": (io.BytesIO(fake_video), "sample.mp4", "video/mp4")}
        resp = self.client.post("/api/analyze/video", data=data, content_type="multipart/form-data")
        self.assertEqual(resp.status_code, 200)
        res = resp.get_json().get("data", {})
        self.assertEqual(res.get("media_type"), "video")
        self.assertIn("forensic_disclaimer", res)
        self.assertIn("Forensic deepfake detection is NOT claimed", res.get("forensic_disclaimer"))

    def test_consensus_engine_multi_model(self):
        """Verify ConsensusEngine computes agreement, spread, and missing evidence."""
        engine = ConsensusEngine()
        result = engine.evaluate_consensus("Dear customer your bank account is blocked, call 9876543210 and share OTP immediately.")
        self.assertIn("consensus_score", result)
        self.assertIn("agreement_percentage", result)
        self.assertIn("consensus_status", result)
        self.assertIn("rule_engine", result.get("model_votes", {}))
        self.assertIn("missing_evidence", result)
        self.assertGreaterEqual(len(result["missing_evidence"]), 1)

    def test_chatbot_message_basic(self):
        """Verify POST /api/chat/message returns a valid reply and conversation_id."""
        payload = {"message": "What is phishing?"}
        resp = self.client.post("/api/chat/message", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json().get("data", {})
        self.assertIn("reply", data)
        self.assertIn("conversation_id", data)
        self.assertFalse(data.get("is_emergency"))
        self.assertFalse(data.get("guardrail_triggered"))

    def test_chatbot_emergency_triage_shared_otp(self):
        """Verify emergency triage triggered when user says they entered UPI PIN or shared OTP."""
        payload = {"message": "Help! I accidentally shared my OTP and Rs 25,000 money was deducted from my account!"}
        resp = self.client.post("/api/chat/message", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json().get("data", {})
        self.assertTrue(data.get("is_emergency"))
        reply = data.get("reply", "")
        self.assertIn("1930", reply)
        self.assertIn("cybercrime.gov.in", reply)

    def test_chatbot_credential_guardrail(self):
        """Verify strict guardrail triggers when user types private password or OTP."""
        payload = {"message": "Here is my secret: password is MySecurePassword123 and my otp is 987654"}
        resp = self.client.post("/api/chat/message", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json().get("data", {})
        self.assertTrue(data.get("guardrail_triggered"))
        reply = data.get("reply", "")
        self.assertIn("CRITICAL PRIVACY WARNING", reply)
        self.assertIn("TrustLens will NEVER ask for private credentials", reply)

    def test_chat_upload_attachment(self):
        """Verify POST /api/chat/upload inspects uploaded screenshot for chat context."""
        img_bytes = create_test_image_bytes(color="red")
        data = {"file": (io.BytesIO(img_bytes), "evidence.jpg", "image/jpeg")}
        resp = self.client.post("/api/chat/upload", data=data, content_type="multipart/form-data")
        self.assertEqual(resp.status_code, 200)
        res = resp.get_json().get("data", {})
        self.assertIn("attachment_context", res)
        self.assertEqual(res.get("filename"), "evidence.jpg")


if __name__ == "__main__":
    unittest.main()
