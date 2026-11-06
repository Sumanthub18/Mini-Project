"""
Multimodal AI Analysis API Routes.
Exposes endpoints for Text, Image, Audio, and Video threat analysis,
QR code extraction with static URL safety checks, Regional Language Intelligence,
and Multi-Model Consensus evaluation.
"""
from flask import Blueprint, request, jsonify
from ..services.multimodal.multimodal_analyzer import MultimodalAnalyzer
from ..utils.response_formatter import format_error_response, format_success_response

multimodal_bp = Blueprint("multimodal", __name__)
analyzer = MultimodalAnalyzer()


@multimodal_bp.route("/multimodal/health", methods=["GET"])
def multimodal_health():
    """
    Returns readiness status of all Multimodal subsystems.
    """
    health_info = analyzer.get_health()
    return jsonify(format_success_response(health_info))


@multimodal_bp.route("/analyze/multimodal", methods=["POST"])
def analyze_multimodal_general():
    """
    Unified multimodal analysis entry point.
    Handles multipart/form-data with file or JSON with raw text.
    """
    user_id = request.headers.get("X-User-Id")
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip() if auth_header.startswith("Bearer ") else None

    # Check if a file was uploaded
    if "file" in request.files:
        file = request.files["file"]
        media_type = request.form.get("media_type", "").lower()
        target_lang = request.form.get("target_language", "en")
        filename = file.filename or "upload"
        mime_type = file.mimetype or "application/octet-stream"
        file_bytes = file.read()

        if not file_bytes:
            return jsonify(format_error_response("Uploaded file is empty.", "VALIDATION_ERROR")), 422

        if media_type == "image" or mime_type.startswith("image/"):
            result = analyzer.analyze_image(
                image_bytes=file_bytes,
                mime_type=mime_type,
                target_language=target_lang,
                user_id=user_id,
                auth_token=token
            )
            return jsonify(format_success_response(result))

        elif media_type == "audio" or mime_type.startswith("audio/"):
            result = analyzer.analyze_audio(
                audio_bytes=file_bytes,
                filename=filename,
                target_language=target_lang,
                user_id=user_id,
                auth_token=token
            )
            return jsonify(format_success_response(result))

        elif media_type == "video" or mime_type.startswith("video/"):
            result = analyzer.analyze_video(
                video_bytes=file_bytes,
                filename=filename,
                target_language=target_lang,
                user_id=user_id,
                auth_token=token
            )
            return jsonify(format_success_response(result))

    # JSON text payload
    raw_json = request.get_json(silent=True) or {}
    text_content = raw_json.get("text") or raw_json.get("content") or request.form.get("text", "")
    if text_content:
        target_lang = raw_json.get("target_language") or request.form.get("target_language", "en")
        result = analyzer.analyze_text(
            text=text_content,
            target_language=target_lang,
            user_id=user_id,
            auth_token=token
        )
        return jsonify(format_success_response(result))

    return jsonify(format_error_response(
        "Please provide either a 'file' (image/audio/video) or a 'text' string to analyze.",
        "MISSING_INPUT"
    )), 422


@multimodal_bp.route("/analyze/image", methods=["POST"])
def analyze_image_endpoint():
    """
    Dedicated image analysis endpoint.
    Extracts OCR text, checks for visual scam patterns, and detects QR codes.
    """
    if "file" not in request.files:
        return jsonify(format_error_response("No image file uploaded under 'file' parameter.", "VALIDATION_ERROR")), 422

    file = request.files["file"]
    mime_type = file.mimetype or "image/jpeg"
    target_lang = request.form.get("target_language", "en")
    user_id = request.headers.get("X-User-Id")
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip() if auth_header.startswith("Bearer ") else None

    file_bytes = file.read()
    if not file_bytes:
        return jsonify(format_error_response("Image file is empty.", "VALIDATION_ERROR")), 422

    result = analyzer.analyze_image(
        image_bytes=file_bytes,
        mime_type=mime_type,
        target_language=target_lang,
        user_id=user_id,
        auth_token=token
    )
    return jsonify(format_success_response(result))


@multimodal_bp.route("/analyze/audio", methods=["POST"])
def analyze_audio_endpoint():
    """
    Dedicated audio transcription and voice fraud analysis endpoint.
    """
    if "file" not in request.files:
        return jsonify(format_error_response("No audio file uploaded under 'file' parameter.", "VALIDATION_ERROR")), 422

    file = request.files["file"]
    filename = file.filename or "audio.mp3"
    target_lang = request.form.get("target_language", "en")
    user_id = request.headers.get("X-User-Id")
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip() if auth_header.startswith("Bearer ") else None

    file_bytes = file.read()
    if not file_bytes:
        return jsonify(format_error_response("Audio file is empty.", "VALIDATION_ERROR")), 422

    result = analyzer.analyze_audio(
        audio_bytes=file_bytes,
        filename=filename,
        target_language=target_lang,
        user_id=user_id,
        auth_token=token
    )
    return jsonify(format_success_response(result))


@multimodal_bp.route("/analyze/video", methods=["POST"])
def analyze_video_endpoint():
    """
    Dedicated video frame and speech transcription endpoint.
    """
    if "file" not in request.files:
        return jsonify(format_error_response("No video file uploaded under 'file' parameter.", "VALIDATION_ERROR")), 422

    file = request.files["file"]
    filename = file.filename or "video.mp4"
    target_lang = request.form.get("target_language", "en")
    user_id = request.headers.get("X-User-Id")
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip() if auth_header.startswith("Bearer ") else None

    file_bytes = file.read()
    if not file_bytes:
        return jsonify(format_error_response("Video file is empty.", "VALIDATION_ERROR")), 422

    result = analyzer.analyze_video(
        video_bytes=file_bytes,
        filename=filename,
        target_language=target_lang,
        user_id=user_id,
        auth_token=token
    )
    return jsonify(format_success_response(result))

