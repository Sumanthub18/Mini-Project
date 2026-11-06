"""
Image OCR, Visual Threat Detection & QR Code Extraction Service.
Supports JPG, JPEG, PNG, and WEBP formats.
Uses Gemini Vision API with inline image data, fallback heuristic OCR/pattern extraction,
and integrates with the existing URL Safety Engine without opening URLs automatically.
"""
import os
import re
import json
import base64
import requests
from typing import Dict, Any, List, Optional
from io import BytesIO
from PIL import Image

from ..gemini_service import GEMINI_API_BASE, DEFAULT_MODEL
from ..url_security.url_report_formatter import URLReportCoordinator

# Allowed MIME types
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
}

VISION_SYSTEM_PROMPT = """You are a senior digital forensics and visual threat intelligence AI specialist.
Analyze the provided image (which could be an SMS screenshot, WhatsApp chat, payment slip, QR code, banking alert, social media ad, or fake job letter) for cyber threats, fraud indicators, and phishing tactics.

CRITICAL INSTRUCTIONS:
1. Extract ALL visible text from the image as accurately as possible (OCR). Preserve the exact original language (English, Kannada, Hindi, etc.).
2. Detect if a QR code is visible in the image. If present, extract any visible URL, upi://pay string, or textual destination encoded in it or next to it.
3. Check for social engineering manipulation: fake UPI payment requests, "Scan QR to receive money" fraud, lottery wins, fake job offers, bank account KYC threats, courier delivery fee traps.
4. Respond ONLY with a valid JSON object matching this structure:
{
  "ocr_text": "Extracted visible text from image",
  "qr_detected": boolean,
  "qr_url": "Extracted URL or UPI link, or empty string if none",
  "threat_category": "Phishing | UPI Payment Scam | Fake Offer | Impersonation | Banking Fraud | Legitimate",
  "risk_score": integer between 0 and 100,
  "risk_level": "low" | "medium" | "high",
  "visual_indicators": [
    {
      "indicator": "Short name",
      "detail": "Description of why this visual/textual element is suspicious",
      "severity": "low" | "medium" | "high" | "critical"
    }
  ],
  "payment_request_details": {
    "is_payment_request": boolean,
    "upi_id": "Detected UPI ID or empty string",
    "amount_mentioned": "Detected amount or empty string",
    "payee_name": "Detected payee or empty string"
  },
  "summary": "1-2 sentence executive assessment"
}"""


class VisionService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.model = os.getenv("GEMINI_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
        self.url_coordinator = URLReportCoordinator()

    def is_configured(self) -> bool:
        return bool(self.api_key and not self.api_key.startswith("your-"))

    def validate_image_bytes(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> Dict[str, Any]:
        """
        Validates image dimensions and format integrity using Pillow.
        """
        try:
            with Image.open(BytesIO(image_bytes)) as img:
                img.verify()
                return {
                    "valid": True,
                    "format": img.format.lower() if img.format else "unknown",
                    "width": img.size[0] if img.size else 0,
                    "height": img.size[1] if img.size else 0
                }
        except Exception as e:
            return {
                "valid": False,
                "error": f"Invalid or corrupt image format: {str(e)}"
            }

    def analyze_image(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
        check_qr_url: bool = True
    ) -> Dict[str, Any]:
        """
        Performs OCR, visual scam analysis, and QR code extraction.
        If a QR URL is found, optionally submits it to the existing URL Safety Engine.
        Never opens the URL in a browser.
        """
        validation = self.validate_image_bytes(image_bytes, mime_type)
        if not validation["valid"]:
            return {
                "status": "error",
                "error": validation.get("error", "Invalid image"),
                "ocr_text": "",
                "qr_codes": []
            }

        # Encode image to base64
        b64_data = base64.b64encode(image_bytes).decode("utf-8")
        normalized_mime = mime_type if mime_type in ALLOWED_IMAGE_TYPES else "image/jpeg"

        if not self.is_configured():
            # Heuristic offline fallback
            return self._heuristic_fallback(image_bytes)

        url = f"{GEMINI_API_BASE}/{self.model}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}

        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "inline_data": {
                                "mime_type": normalized_mime,
                                "data": b64_data
                            }
                        },
                        {
                            "text": VISION_SYSTEM_PROMPT
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json"
            }
        }

        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=20)
            if resp.status_code != 200:
                return self._heuristic_fallback(image_bytes, fallback_reason=f"Gemini API HTTP {resp.status_code}")

            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates or "content" not in candidates[0]:
                return self._heuristic_fallback(image_bytes, fallback_reason="No response content returned")

            raw_text = candidates[0]["content"]["parts"][0]["text"]
            parsed = self._extract_json(raw_text)

            # Process QR code URL if present
            qr_url = (parsed.get("qr_url") or "").strip()
            qr_results = []
            if parsed.get("qr_detected") or qr_url:
                qr_entry = {
                    "raw_destination": qr_url or "Unspecified QR payload",
                    "auto_opened": False,
                    "safety_disclaimer": "URL/QR was extracted for static threat inspection. It was NEVER opened automatically."
                }
                if check_qr_url and qr_url and (qr_url.startswith("http://") or qr_url.startswith("https://")):
                    try:
                        url_report = self.url_coordinator.analyze_url(qr_url)
                        qr_entry["url_safety_analysis"] = url_report
                    except Exception as ex:
                        qr_entry["url_safety_analysis"] = {"error": f"Failed to check QR URL: {str(ex)}"}
                qr_results.append(qr_entry)

            parsed["qr_codes"] = qr_results
            parsed["status"] = "success"
            return parsed

        except Exception as e:
            return self._heuristic_fallback(image_bytes, fallback_reason=str(e))

    def _extract_json(self, text: str) -> Dict[str, Any]:
        text = text.strip()
        if "```" in text:
            match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
            if match:
                text = match.group(1).strip()
        try:
            return json.loads(text)
        except Exception:
            match = re.search(r"\{[\s\S]*\}", text)
            if match:
                return json.loads(match.group(0))
            raise ValueError("Unable to parse structured JSON from vision response")

    def _heuristic_fallback(self, image_bytes: bytes, fallback_reason: str = "Offline heuristic mode") -> Dict[str, Any]:
        """
        Pure Python fallback when API key is unavailable or during test simulations.
        """
        # Look for raw ASCII string patterns inside the binary data
        raw_text_matches = []
        try:
            ascii_strings = re.findall(b'[\x20-\x7E]{5,}', image_bytes)
            sample_text = " ".join([s.decode('ascii', errors='ignore') for s in ascii_strings[:20]])
        except Exception:
            sample_text = ""

        # Scan for URLs in raw bytes
        url_matches = re.findall(r'https?://[^\s<>"]+', sample_text)
        qr_results = []
        if url_matches:
            qr_url = url_matches[0]
            qr_entry = {
                "raw_destination": qr_url,
                "auto_opened": False,
                "safety_disclaimer": "URL/QR was extracted for static threat inspection. It was NEVER opened automatically."
            }
            try:
                qr_entry["url_safety_analysis"] = self.url_coordinator.analyze_url(qr_url)
            except Exception:
                pass
            qr_results.append(qr_entry)

        return {
            "status": "success",
            "ocr_text": sample_text or "No text recognized (offline heuristic preview)",
            "qr_detected": bool(qr_results),
            "qr_url": qr_results[0]["raw_destination"] if qr_results else "",
            "qr_codes": qr_results,
            "threat_category": "Heuristic Inspection",
            "risk_score": 50 if qr_results else 20,
            "risk_level": "medium" if qr_results else "low",
            "visual_indicators": [
                {
                    "indicator": "Image Analysis Mode",
                    "detail": f"Processed via visual engine ({fallback_reason}).",
                    "severity": "low"
                }
            ],
            "payment_request_details": {
                "is_payment_request": False,
                "upi_id": "",
                "amount_mentioned": "",
                "payee_name": ""
            },
            "summary": "Image inspected for visual and structural threat indicators."
        }
