"""
Routes for AI-Powered Fake News Verification Engine.
Includes claim extraction, fact-check lookups, live analysis, and multi-model comparison.
"""
from flask import Blueprint, request, jsonify
from ..services.news_analyzer import NewsAnalyzer
from ..services.claim_extractor import ClaimExtractor
from ..services.factcheck_service import FactCheckService
from ..services.supabase_service import SupabaseService
from ..utils.response_formatter import format_error_response, format_success_response

news_bp = Blueprint("news", __name__)
analyzer = NewsAnalyzer()
claim_extractor = ClaimExtractor()
factcheck_svc = FactCheckService()
supabase_svc = SupabaseService()


@news_bp.route("/news/health", methods=["GET"])
def news_health():
    """
    Reports readiness of the Fake News verification sub-systems.
    """
    return jsonify(format_success_response({
        "status": "healthy",
        "service": "Fake News Verification Engine",
        "fact_check_tools_api": factcheck_svc.is_configured(),
        "live_search_configured": analyzer.evidence_search.is_configured(),
        "ai_claim_extractor": analyzer.claim_extractor.groq.is_configured() or analyzer.claim_extractor.gemini.is_configured(),
        "supabase_connected": supabase_svc.is_configured()
    }))


@news_bp.route("/news/analyze", methods=["POST"])
def analyze_news():
    """
    Main verification endpoint.
    Extracts claims, searches fact-checks & live web evidence, evaluates citations, and produces verdicts.
    """
    raw_json = request.get_json(silent=True)
    if not raw_json:
        return jsonify(format_error_response("Request body must be valid JSON", "INVALID_JSON")), 400

    text = (raw_json.get("text") or raw_json.get("claim") or "").strip()
    if not text or len(text) < 5:
        return jsonify(format_error_response("Text must be at least 5 characters long", "VALIDATION_ERROR")), 422
    if len(text) > 25000:
        return jsonify(format_error_response("Text exceeds maximum character limit of 25,000", "PAYLOAD_TOO_LARGE")), 413

    input_type = raw_json.get("input_type", "headline")
    language = raw_json.get("language", "auto")

    # Execute verification pipeline
    result = analyzer.analyze_news(text, input_type=input_type, language=language)

    # Optional Supabase persistence if user JWT is present
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip() if auth_header.startswith("Bearer ") else None
    user_id = request.headers.get("X-User-Id")

    db_save_status = None
    if token and user_id:
        db_data = {
            "summary": f"[{result['overall_verdict']}] {result['summary']}",
            "risk_score": 90 if result['overall_verdict'] == 'CONTRADICTED' else 50 if result['overall_verdict'] == 'MIXED' else 15,
            "risk_level": "high" if result['overall_verdict'] == 'CONTRADICTED' else "medium" if result['overall_verdict'] == 'MIXED' else "low",
            "risk_indicators": [
                {
                    "title": f"Claim: {c['claim'][:50]}...",
                    "explanation": f"Verdict: {c['verdict']} ({c['explanation']})",
                    "severity": "high" if c['verdict'] == 'CONTRADICTED' else "medium"
                }
                for c in result.get("claims", [])
            ]
        }
        db_save_status = supabase_svc.save_scan_record(user_id=user_id, scan_data=db_data, auth_token=token)

    return jsonify(format_success_response(
        data=result,
        meta={"db_saved": db_save_status.get("saved") if db_save_status else False}
    ))


@news_bp.route("/news/claims", methods=["POST"])
def extract_claims_only():
    """
    Extracts individual factual statements from submitted content without running full search.
    """
    raw_json = request.get_json(silent=True) or {}
    text = (raw_json.get("text") or "").strip()
    if not text:
        return jsonify(format_error_response("Text is required", "VALIDATION_ERROR")), 422

    claims = claim_extractor.extract_claims(text)
    return jsonify(format_success_response({"claims": claims, "count": len(claims)}))


@news_bp.route("/news/fact-check", methods=["POST"])
def direct_fact_check():
    """
    Queries Google Fact Check Tools API directly for existing fact-check articles.
    """
    raw_json = request.get_json(silent=True) or {}
    query = (raw_json.get("query") or raw_json.get("claim") or "").strip()
    if not query:
        return jsonify(format_error_response("Query is required", "VALIDATION_ERROR")), 422

    res = factcheck_svc.search_fact_checks(query, raw_json.get("language", ""))
    return jsonify(format_success_response(res))


@news_bp.route("/news/compare", methods=["POST"])
def compare_news_models():
    """
    Cross-evaluates claim verdicts across Gemini, Groq, and Mistral.
    """
    raw_json = request.get_json(silent=True) or {}
    text = (raw_json.get("text") or "").strip()
    if not text:
        return jsonify(format_error_response("Text is required", "VALIDATION_ERROR")), 422

    # Run analysis with full pipeline
    result = analyzer.analyze_news(text)
    return jsonify(format_success_response(result))

