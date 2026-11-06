"""
Unified Multimodal Analyzer Coordinator.
Coordinates analysis across Text, Images, Audio, and Video.
Integrates Vision, Transcription, Video Frame Inspection, Regional Language Intelligence,
Consensus Engine, and Supabase Persistence.
"""
from typing import Dict, Any, Optional, List
from .vision_service import VisionService
from .transcription_service import TranscriptionService
from .video_service import VideoService
from .language_service import LanguageService
from .consensus_engine import ConsensusEngine
from ..supabase_service import SupabaseService


class MultimodalAnalyzer:
    def __init__(self):
        self.vision = VisionService()
        self.transcription = TranscriptionService()
        self.video = VideoService()
        self.language = LanguageService()
        self.consensus = ConsensusEngine()
        self.supabase = SupabaseService()

    def get_health(self) -> Dict[str, Any]:
        """
        Reports operational readiness of multimodal services without leaking secrets.
        """
        return {
            "status": "ready",
            "capabilities": {
                "text_analysis": True,
                "image_ocr_and_qr": self.vision.is_configured(),
                "audio_transcription": self.transcription.is_configured(),
                "video_analysis": True,
                "has_system_ffmpeg": self.video.has_ffmpeg(),
                "regional_languages": ["en", "kn", "hi"],
                "ai_consensus_engine": True
            },
            "models_available": {
                "groq_whisper": self.transcription.is_configured(),
                "gemini_vision": self.vision.is_configured(),
                "mistral_multilingual": self.consensus.mistral.is_configured(),
                "groq_consensus": self.consensus.groq.is_configured()
            }
        }

    def analyze_text(
        self,
        text: str,
        target_language: str = "en",
        user_id: Optional[str] = None,
        auth_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyzes plain text (SMS, WhatsApp, Banking, Email, Social media).
        """
        clean_text = (text or "").strip()
        lang_meta = self.language.detect_language(clean_text)
        detected_lang = lang_meta.get("normalized_lang", "en")
        effective_target = target_language if target_language in ("en", "kn", "hi") else detected_lang

        # Run Consensus
        consensus_res = self.consensus.evaluate_consensus(clean_text)
        risk_level = consensus_res["consensus_level"]
        risk_score = consensus_res["consensus_score"]

        # Localized Guidance
        localized_out = self.language.format_bilingual_explanation(
            original_text=clean_text,
            detected_lang=detected_lang,
            target_language=effective_target,
            english_summary=f"Analysis of text content identified risk level: {risk_level.upper()}.",
            risk_level=risk_level
        )

        result = {
            "media_type": "text",
            "content": clean_text,
            "detected_language": lang_meta,
            "target_language": effective_target,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "consensus": consensus_res,
            "localization": localized_out,
            "recommendations": localized_out["localized_recommendations"],
            "summary": f"Text assessed as {risk_level.upper()} risk ({risk_score}/100) with {consensus_res['agreement_percentage']}% consensus."
        }

        # Optional Supabase persistence
        if user_id:
            scan_data = {
                "scan_type": "multimodal",
                "summary": f"[Text] {result['summary']}",
                "risk_score": risk_score,
                "risk_level": risk_level,
                "risk_indicators": [
                    {"title": f"Consensus: {consensus_res['consensus_status']}", "explanation": f"Score {risk_score}/100", "severity": risk_level}
                ]
            }
            db_res = self.supabase.save_scan_record(user_id=user_id, scan_data=scan_data, auth_token=auth_token)
            scan_id = db_res.get("scan_id")
            self.supabase.save_multimodal_analysis(
                user_id=user_id,
                scan_id=scan_id,
                media_type="text",
                extracted_text=clean_text,
                detected_language=detected_lang,
                qr_codes_found=[],
                consensus_data=consensus_res,
                auth_token=auth_token
            )
            result["database_persistence"] = db_res

        return result

    def analyze_image(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
        target_language: str = "en",
        user_id: Optional[str] = None,
        auth_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyzes uploaded image (JPG, PNG, WEBP), performs OCR, extracts QR codes,
        evaluates visual threats, and runs consensus.
        """
        vision_res = self.vision.analyze_image(image_bytes, mime_type=mime_type, check_qr_url=True)
        ocr_text = vision_res.get("ocr_text", "")

        # Language Detection on OCR text
        lang_meta = self.language.detect_language(ocr_text)
        detected_lang = lang_meta.get("normalized_lang", "en")
        effective_target = target_language if target_language in ("en", "kn", "hi") else detected_lang

        # Run Consensus on OCR text + visual indicators
        consensus_text = f"{ocr_text}\nVisual Category: {vision_res.get('threat_category', '')}\nSummary: {vision_res.get('summary', '')}"
        consensus_res = self.consensus.evaluate_consensus(consensus_text)

        # Merge visual score and consensus score
        visual_score = vision_res.get("risk_score", 0)
        consensus_score = consensus_res.get("consensus_score", 0)
        final_score = max(visual_score, consensus_score) if visual_score > 0 else consensus_score
        final_level = "high" if final_score >= 70 else ("medium" if final_score >= 35 else "low")

        # Bilingual localization
        localized_out = self.language.format_bilingual_explanation(
            original_text=ocr_text,
            detected_lang=detected_lang,
            target_language=effective_target,
            english_summary=vision_res.get("summary", "Image content analyzed."),
            risk_level=final_level
        )

        qr_codes = vision_res.get("qr_codes", [])

        result = {
            "media_type": "image",
            "extracted_text": ocr_text,
            "detected_language": lang_meta,
            "target_language": effective_target,
            "risk_score": final_score,
            "risk_level": final_level,
            "visual_analysis": vision_res,
            "qr_codes_detected": qr_codes,
            "consensus": consensus_res,
            "localization": localized_out,
            "recommendations": localized_out["localized_recommendations"],
            "summary": f"Image assessed as {final_level.upper()} risk ({final_score}/100). {len(qr_codes)} QR code(s) detected."
        }

        # Optional Supabase persistence
        if user_id:
            scan_data = {
                "scan_type": "multimodal",
                "summary": f"[Image] {result['summary']}",
                "risk_score": final_score,
                "risk_level": final_level,
                "risk_indicators": [
                    {"title": f"Visual Threat: {vision_res.get('threat_category')}", "explanation": vision_res.get("summary", ""), "severity": final_level}
                ]
            }
            db_res = self.supabase.save_scan_record(user_id=user_id, scan_data=scan_data, auth_token=auth_token)
            scan_id = db_res.get("scan_id")
            self.supabase.save_multimodal_analysis(
                user_id=user_id,
                scan_id=scan_id,
                media_type="image",
                extracted_text=ocr_text,
                detected_language=detected_lang,
                qr_codes_found=qr_codes,
                consensus_data=consensus_res,
                auth_token=auth_token
            )
            result["database_persistence"] = db_res

        return result

    def analyze_audio(
        self,
        audio_bytes: bytes,
        filename: str = "voice.mp3",
        target_language: str = "en",
        user_id: Optional[str] = None,
        auth_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transcribes audio (MP3, WAV, M4A) and assesses transcript for scam patterns.
        """
        trans_res = self.transcription.transcribe(audio_bytes, filename=filename)
        transcript = trans_res.get("transcript", "")
        detected_lang = trans_res.get("detected_language", "en")
        effective_target = target_language if target_language in ("en", "kn", "hi") else detected_lang

        # Detect script or linguistic properties of transcript
        lang_meta = self.language.detect_language(transcript)

        # Run Consensus on Transcript
        consensus_res = self.consensus.evaluate_consensus(transcript)
        risk_score = consensus_res.get("consensus_score", 0)
        risk_level = consensus_res.get("consensus_level", "low")

        # Bilingual localization
        localized_out = self.language.format_bilingual_explanation(
            original_text=transcript,
            detected_lang=detected_lang,
            target_language=effective_target,
            english_summary=f"Voice audio transcript assessed with risk level {risk_level.upper()}.",
            risk_level=risk_level
        )

        result = {
            "media_type": "audio",
            "transcript": transcript,
            "transcription_metadata": trans_res,
            "detected_language": lang_meta,
            "target_language": effective_target,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "consensus": consensus_res,
            "localization": localized_out,
            "recommendations": localized_out["localized_recommendations"],
            "summary": f"Voice audio transcript evaluated as {risk_level.upper()} risk ({risk_score}/100)."
        }

        # Optional Supabase persistence
        if user_id:
            scan_data = {
                "scan_type": "multimodal",
                "summary": f"[Audio] {result['summary']}",
                "risk_score": risk_score,
                "risk_level": risk_level,
                "risk_indicators": [
                    {"title": "Audio Voice Analysis", "explanation": result["summary"], "severity": risk_level}
                ]
            }
            db_res = self.supabase.save_scan_record(user_id=user_id, scan_data=scan_data, auth_token=auth_token)
            scan_id = db_res.get("scan_id")
            self.supabase.save_multimodal_analysis(
                user_id=user_id,
                scan_id=scan_id,
                media_type="audio",
                extracted_text=transcript,
                detected_language=detected_lang,
                qr_codes_found=[],
                consensus_data=consensus_res,
                auth_token=auth_token
            )
            result["database_persistence"] = db_res

        return result

    def analyze_video(
        self,
        video_bytes: bytes,
        filename: str = "video.mp4",
        target_language: str = "en",
        user_id: Optional[str] = None,
        auth_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Coordinates video processing: frame sampling, audio transcription, visual OCR,
        and scam risk scoring with explicit deepfake disclaimer.
        """
        video_res = self.video.process_video(video_bytes, filename=filename, language_hint=target_language)
        combined_content = video_res.get("combined_content", "")
        detected_lang = video_res.get("detected_language", "en")
        effective_target = target_language if target_language in ("en", "kn", "hi") else detected_lang

        lang_meta = self.language.detect_language(combined_content)

        # Run Consensus on combined transcript and visual text
        consensus_res = self.consensus.evaluate_consensus(combined_content)
        risk_score = consensus_res.get("consensus_score", 0)
        risk_level = consensus_res.get("consensus_level", "low")

        # Bilingual localization
        localized_out = self.language.format_bilingual_explanation(
            original_text=combined_content,
            detected_lang=detected_lang,
            target_language=effective_target,
            english_summary=f"Video audio transcript and visual frames assessed as {risk_level.upper()} risk.",
            risk_level=risk_level
        )

        qr_codes = video_res.get("qr_codes", [])

        result = {
            "media_type": "video",
            "video_metadata": {
                "has_ffmpeg": video_res.get("has_system_ffmpeg"),
                "frames_analyzed": video_res.get("frames_analyzed"),
                "transcription_status": video_res.get("transcription_status")
            },
            "transcript": video_res.get("transcript", ""),
            "visual_text": video_res.get("visual_text", ""),
            "qr_codes_detected": qr_codes,
            "detected_language": lang_meta,
            "target_language": effective_target,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "consensus": consensus_res,
            "localization": localized_out,
            "recommendations": localized_out["localized_recommendations"],
            "forensic_disclaimer": video_res.get("forensic_disclaimer"),
            "summary": f"Video content assessed as {risk_level.upper()} risk ({risk_score}/100)."
        }

        # Optional Supabase persistence
        if user_id:
            scan_data = {
                "scan_type": "multimodal",
                "summary": f"[Video] {result['summary']}",
                "risk_score": risk_score,
                "risk_level": risk_level,
                "risk_indicators": [
                    {"title": "Video Inspection", "explanation": result["summary"], "severity": risk_level}
                ]
            }
            db_res = self.supabase.save_scan_record(user_id=user_id, scan_data=scan_data, auth_token=auth_token)
            scan_id = db_res.get("scan_id")
            self.supabase.save_multimodal_analysis(
                user_id=user_id,
                scan_id=scan_id,
                media_type="video",
                extracted_text=combined_content,
                detected_language=detected_lang,
                qr_codes_found=qr_codes,
                consensus_data=consensus_res,
                auth_token=auth_token
            )
            result["database_persistence"] = db_res

        return result

