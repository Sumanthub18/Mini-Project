"""
Routes for single scam message analysis, health checking, and provider discovery.
"""
from flask import Blueprint, request, jsonify
from pydantic import ValidationError
from ..services.ai_router import AIRouter
from ..services.supabase_service import SupabaseService
from ..utils.validators import ScamAnalyzeRequest
from ..utils.response_formatter import format_error_response, format_success_response

scam_bp = Blueprint("scam", __name__)
router = AIRouter()
supabase_svc = SupabaseService()


@scam_bp.route("/health", methods=["GET"])
def health_check():
    """
    Returns service health and provider configuration status without leaking keys.
    """
    providers_status = router.get_providers_status()
    any_ai_configured = any(p["configured"] for p in providers_status.values())

    return jsonify(format_success_response({
        "status": "healthy",
        "service": "Scam or Safe? Day 3 AI Detection Engine",
        "version": "3.0.0",
        "any_ai_configured": any_ai_configured,
        "providers": {
            p_name: {
                "configured": meta["configured"],
                "model": meta["model"]
            }
            for p_name, meta in providers_status.items()
        },
        "supabase_connected": supabase_svc.is_configured()
    }))


@scam_bp.route("/ai/providers", methods=["GET"])
def list_providers():
    """
    Returns details on available AI providers, supported models, and capabilities.
    """
    return jsonify(format_success_response(router.get_providers_status()))


@scam_bp.route("/analyze/scam", methods=["POST"])
def analyze_scam():
    """
    Analyzes a suspicious message using the intelligent multi-model router.
    """
    raw_json = request.get_json(silent=True)
    if not raw_json:
        return jsonify(format_error_response("Request body must be valid JSON", "INVALID_JSON")), 400

    try:
        req = ScamAnalyzeRequest(**raw_json)
    except ValidationError as e:
        return jsonify(format_error_response("Validation failed", "VALIDATION_ERROR", e.errors())), 422

    # Execute analysis
    analysis_result = router.analyze_scam(
        message=req.message,
        preferred_provider=req.provider,
        include_contextual=req.include_contextual or False
    )

    # Optional: If client supplied an Authorization Bearer token (from Supabase Auth),
    # attempt backend database save with caller's authenticated session
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip() if auth_header.startswith("Bearer ") else None
    user_id = request.headers.get("X-User-Id")

    db_save_status = None
    if token and user_id:
        db_save_status = supabase_svc.save_scan_record(
            user_id=user_id,
            scan_data=analysis_result,
            auth_token=token
        )

    return jsonify(format_success_response(
        data=analysis_result,
        meta={"db_saved": db_save_status.get("saved") if db_save_status else False}
    ))

