"""
Routes for multi-model AI scam detection comparison.
Allows side-by-side analysis across Groq, Gemini, and Mistral.
"""
from flask import Blueprint, request, jsonify
from pydantic import ValidationError
from ..services.ai_router import AIRouter
from ..utils.validators import ScamCompareRequest
from ..utils.response_formatter import (
    format_error_response,
    format_success_response,
    compute_model_comparison
)

comparison_bp = Blueprint("comparison", __name__)
router = AIRouter()


@comparison_bp.route("/analyze/scam/compare", methods=["POST"])
def compare_scam():
    """
    Submits a suspicious message to multiple AI providers independently
    and returns individual results alongside comparative synthesis (common, unique, conflicting findings).
    """
    raw_json = request.get_json(silent=True)
    if not raw_json:
        return jsonify(format_error_response("Request body must be valid JSON", "INVALID_JSON")), 400

    try:
        req = ScamCompareRequest(**raw_json)
    except ValidationError as e:
        return jsonify(format_error_response("Validation failed", "VALIDATION_ERROR", e.errors())), 422

    # Query all selected providers
    provider_results = router.compare_providers(
        message=req.message,
        providers=req.providers
    )

    # Compute comparative findings (common, unique, conflicts, consensus)
    synthesis = compute_model_comparison(provider_results)

    return jsonify(format_success_response({
        "message_analyzed": req.message[:200] + ("..." if len(req.message) > 200 else ""),
        "models": provider_results,
        "synthesis": synthesis
    }))

