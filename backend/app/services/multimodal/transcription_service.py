"""
Audio Transcription & Voice Scam Intelligence Service.
Supports MP3, WAV, M4A, and standard audio formats.
Uses Groq Whisper (whisper-large-v3) with regional language detection (en, kn, hi).
Extracts spoken transcripts and assesses them for voice fraud tactics (e.g. digital arrest,
courier customs scam, bank KYC threat, electricity cut warning).
"""
import os
import time
import requests
from typing import Dict, Any, Optional

GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
WHISPER_MODEL = "whisper-large-v3"

ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".aac"}
ALLOWED_AUDIO_MIMES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/m4a",
    "audio/mp4",
    "audio/x-m4a",
    "audio/ogg",
    "audio/aac"
}


class TranscriptionService:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY", "").strip()
        self.model = os.getenv("GROQ_WHISPER_MODEL", WHISPER_MODEL)

    def is_configured(self) -> bool:
        return bool(self.api_key and not self.api_key.startswith("your-"))

    def validate_audio_file(self, filename: str, mime_type: Optional[str] = None) -> bool:
        """
        Validates file extension and optional MIME type.
        """
        ext = os.path.splitext(filename.lower())[1] if filename else ""
        if ext in ALLOWED_AUDIO_EXTENSIONS:
            return True
        if mime_type and mime_type.lower() in ALLOWED_AUDIO_MIMES:
            return True
        return False

    def transcribe(
        self,
        audio_bytes: bytes,
        filename: str = "audio.mp3",
        language_hint: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Submits audio binary to Groq Whisper for transcription and language detection.
        Returns transcript, detected language, duration, and status.
        """
        if not audio_bytes or len(audio_bytes) < 32:
            return {
                "status": "error",
                "transcript": "",
                "language": "en",
                "error": "Audio file is empty or corrupted."
            }

        if not self.is_configured():
            return {
                "status": "unavailable",
                "transcript": "",
                "language": "en",
                "error": "GROQ_API_KEY is not configured for Whisper audio transcription. Transcription is unavailable."
            }

        start_time = time.perf_counter()
        headers = {
            "Authorization": f"Bearer {self.api_key}"
        }

        # Format files parameter for multipart/form-data
        content_type = "audio/mpeg"
        if filename.endswith(".wav"):
            content_type = "audio/wav"
        elif filename.endswith(".m4a"):
            content_type = "audio/m4a"

        files = {
            "file": (filename, audio_bytes, content_type)
        }
        data = {
            "model": self.model,
            "response_format": "verbose_json"
        }
        if language_hint and language_hint in ("en", "kn", "hi"):
            data["language"] = language_hint

        try:
            resp = requests.post(
                GROQ_TRANSCRIPTION_URL,
                headers=headers,
                files=files,
                data=data,
                timeout=30
            )
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

            if resp.status_code != 200:
                err_text = resp.text[:250]
                return {
                    "status": "error",
                    "transcript": "",
                    "language": "en",
                    "error": f"Audio transcription failed (HTTP {resp.status_code}): {err_text}",
                    "execution_time_ms": elapsed_ms
                }

            result_json = resp.json()
            transcript = (result_json.get("text") or "").strip()
            detected_lang = (result_json.get("language") or "english").lower()

            # Normalize language name to code
            lang_code = "en"
            if "kannada" in detected_lang or detected_lang == "kn":
                lang_code = "kn"
            elif "hindi" in detected_lang or detected_lang == "hi":
                lang_code = "hi"

            return {
                "status": "success",
                "transcript": transcript,
                "detected_language": lang_code,
                "detected_language_name": detected_lang.capitalize(),
                "duration_seconds": result_json.get("duration", 0),
                "execution_time_ms": elapsed_ms,
                "segments_count": len(result_json.get("segments", []))
            }

        except requests.exceptions.Timeout:
            return {
                "status": "timeout",
                "transcript": "",
                "language": "en",
                "error": "Transcription request timed out after 30 seconds."
            }
        except Exception as e:
            return {
                "status": "error",
                "transcript": "",
                "language": "en",
                "error": f"Transcription error: {str(e)}"
            }
