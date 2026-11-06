"""
TrustLens AI Cyber Safety Assistant API Routes.
Exposes endpoints for conversation management, incident triage messaging,
file attachments, and conversation history.
"""
import uuid
from flask import Blueprint, request, jsonify
from ..services.chatbot.safety_chatbot import SafetyChatbot
from ..services.multimodal.vision_service import VisionService
from ..services.supabase_service import SupabaseService
from ..utils.response_formatter import format_error_response, format_success_response

chat_bp = Blueprint("chat", __name__)
chatbot = SafetyChatbot()
vision = VisionService()
supabase = SupabaseService()


@chat_bp.route("/chat/message", methods=["POST"])
def send_chat_message():
    """
    Submits a message to TrustLens AI Cyber Safety Assistant.
    Retrieves user past scan context, applies safety guardrails and emergency triage,
    and returns localized actionable advice.
    """
    raw_json = request.get_json(silent=True) or {}
    message = (raw_json.get("message") or "").strip()
    if not message:
        return jsonify(format_error_response("Message cannot be empty.", "VALIDATION_ERROR")), 422

    conversation_id = raw_json.get("conversation_id")
    model_choice = raw_json.get("model", "auto")
    language = raw_json.get("language", "en")
    attachment_context = raw_json.get("attachment_context")

    user_id = request.headers.get("X-User-Id")
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip() if auth_header.startswith("Bearer ") else None

    # Fetch recent scan context for authenticated users
    recent_scans = []
    if user_id:
        try:
            recent_scans = supabase.get_recent_user_scans(user_id=user_id, limit=3, auth_token=token)
        except Exception:
            recent_scans = []

    # Retrieve conversation history if conversation_id provided
    history = []
    if conversation_id and user_id:
        try:
            stored_msgs = supabase.get_chat_messages(conversation_id=conversation_id, user_id=user_id, auth_token=token)
            for m in stored_msgs:
                history.append({"role": m.get("role", "user"), "content": m.get("content", "")})
        except Exception:
            pass

    # Ensure conversation exists if user is authenticated
    if user_id and not conversation_id:
        try:
            # Generate title from first message
            title = message[:40] + ("..." if len(message) > 40 else "")
            conv_record = supabase.create_chat_conversation(user_id=user_id, title=title, auth_token=token)
            conversation_id = conv_record.get("id")
        except Exception:
            conversation_id = str(uuid.uuid4())
    elif not conversation_id:
        conversation_id = str(uuid.uuid4())

    # Generate assistant reply
    reply_data = chatbot.generate_reply(
        message=message,
        conversation_history=history,
        model_choice=model_choice,
        target_language=language,
        user_scans_context=recent_scans,
        attachment_context=attachment_context
    )

    # Persist user message and assistant reply if authenticated
    if user_id and conversation_id:
        try:
            # Only store user message if guardrail was not triggered on credentials
            stored_user_msg = message if not reply_data.get("guardrail_triggered") else "[Redacted sensitive credentials]"
            supabase.add_chat_message(
                conversation_id=conversation_id,
                user_id=user_id,
                role="user",
                content=stored_user_msg,
                language=language,
                model_used=model_choice,
                auth_token=token
            )
            supabase.add_chat_message(
                conversation_id=conversation_id,
                user_id=user_id,
                role="assistant",
                content=reply_data["reply"],
                language=language,
                model_used=reply_data["model_used"],
                auth_token=token
            )
        except Exception:
            pass

    response_payload = {
        "conversation_id": conversation_id,
        "reply": reply_data["reply"],
        "model_used": reply_data["model_used"],
        "language": reply_data["language"],
        "is_emergency": reply_data["is_emergency"],
        "guardrail_triggered": reply_data["guardrail_triggered"]
    }
    return jsonify(format_success_response(response_payload))


@chat_bp.route("/chat/upload", methods=["POST"])
def upload_chat_attachment():
    """
    Accepts an image or screenshot attachment to accompany a chat query.
    Extracts OCR text and threat details to pass as context.
    """
    if "file" not in request.files:
        return jsonify(format_error_response("No attachment file uploaded.", "VALIDATION_ERROR")), 422

    file = request.files["file"]
    mime_type = file.mimetype or "image/jpeg"
    file_bytes = file.read()

    if not file_bytes:
        return jsonify(format_error_response("Uploaded file is empty.", "VALIDATION_ERROR")), 422

    # Perform OCR / threat scan
    analysis = vision.analyze_image(file_bytes, mime_type=mime_type, check_qr_url=True)

    summary_context = (
        f"File: {file.filename}\n"
        f"OCR Text: {analysis.get('ocr_text', 'None')}\n"
        f"Threat Category: {analysis.get('threat_category', 'Unknown')}\n"
        f"Risk Score: {analysis.get('risk_score', 0)}/100"
    )
    if analysis.get("qr_codes"):
        summary_context += f"\nDetected QR Destination: {analysis['qr_codes'][0].get('raw_destination')}"

    return jsonify(format_success_response({
        "filename": file.filename,
        "attachment_context": summary_context,
        "analysis_preview": {
            "risk_score": analysis.get("risk_score"),
            "risk_level": analysis.get("risk_level"),
            "threat_category": analysis.get("threat_category"),
            "ocr_text_preview": (analysis.get("ocr_text") or "")[:200]
        }
    }))


@chat_bp.route("/chat/conversations", methods=["GET"])
def list_conversations():
    """
    Lists conversations for the authenticated user.
    """
    user_id = request.headers.get("X-User-Id")
    if not user_id:
        return jsonify(format_error_response("Authentication required.", "UNAUTHORIZED")), 401

    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip() if auth_header.startswith("Bearer ") else None

    convs = supabase.list_chat_conversations(user_id=user_id, auth_token=token)
    return jsonify(format_success_response({"conversations": convs}))


@chat_bp.route("/chat/conversations/<conversation_id>", methods=["GET"])
def get_conversation_history(conversation_id: str):
    """
    Retrieves message history for a conversation.
    """
    user_id = request.headers.get("X-User-Id")
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip() if auth_header.startswith("Bearer ") else None

    messages = supabase.get_chat_messages(conversation_id=conversation_id, user_id=user_id, auth_token=token)
    return jsonify(format_success_response({
        "conversation_id": conversation_id,
        "messages": messages
    }))


@chat_bp.route("/chat/conversations/<conversation_id>", methods=["DELETE"])
def delete_conversation(conversation_id: str):
    """
    Deletes a conversation and its messages.
    """
    user_id = request.headers.get("X-User-Id")
    if not user_id:
        return jsonify(format_error_response("Authentication required.", "UNAUTHORIZED")), 401

    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip() if auth_header.startswith("Bearer ") else None

    deleted = supabase.delete_chat_conversation(conversation_id=conversation_id, user_id=user_id, auth_token=token)
    return jsonify(format_success_response({
        "deleted": deleted,
        "conversation_id": conversation_id
    }))

