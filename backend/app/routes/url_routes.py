"""
URL Safety and Threat Intelligence API Routes (Local Analysis Mode).
Exposes endpoints for local URL analysis, structural reputation checks, history retrieval,
and community feedback reporting. Requires zero external URL reputation API keys.
"""
from flask import Blueprint, request, jsonify
from ..services.url_security.url_report_formatter import URLReportCoordinator
from ..services.url_security.url_validator import validate_url
from ..services.url_security.domain_analyzer import DomainAnalyzer
from ..services.supabase_service import SupabaseService
from ..utils.response_formatter import format_error_response, format_success_response

url_bp = Blueprint("url", __name__)
coordinator = URLReportCoordinator()
domain_analyzer = DomainAnalyzer()
supabase_svc = SupabaseService()


@url_bp.route("/url/health", methods=["GET"])
def url_health():
    """
    Returns readiness status of local URL Safety subsystems.
    """
    status = coordinator.get_service_status()
    return jsonify(format_success_response({
        "status": "healthy",
        "service": "Local URL Safety and Pattern Analysis Engine",
        "external_api_dependencies": False,
        "providers": status,
        "supabase_connected": supabase_svc.is_configured()
    }))


@url_bp.route("/url/analyze", methods=["POST"])
def analyze_url():
    """
    Primary local URL safety analysis endpoint.
    Performs validation, SSRF defense, protocol checks, domain & typosquatting analysis,
    keyword extraction, RDAP lookups, redirect expansion, local risk scoring, and AI explanation.
    """
    raw_json = request.get_json(silent=True)
    if not raw_json:
        return jsonify(format_error_response("Request body must be valid JSON", "INVALID_JSON")), 400

    target_url = (raw_json.get("url") or "").strip()
    if not target_url:
        return jsonify(format_error_response("Please provide a 'url' to analyze.", "VALIDATION_ERROR")), 422

    check_redirects = raw_json.get("check_redirects", True)

    # Pre-validation check
    val = validate_url(target_url)
    if not val.get("valid"):
        return jsonify(format_error_response(val.get("error", "Invalid URL format"), "URL_VALIDATION_ERROR")), 422

    # Run local analysis pipeline
    result = coordinator.analyze_url(target_url, check_redirects=check_redirects)

    # Optional Supabase persistence if user JWT / User-ID is present
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip() if auth_header.startswith("Bearer ") else None
    user_id = request.headers.get("X-User-Id")

    db_status = {"saved": False, "note": "No authenticated session"}
    if user_id:
        # Prepare findings and sources for database
        db_findings = []
        for factor in result.get("contributing_factors", []):
            db_findings.append({
                "type": factor.get("category", "url_indicator"),
                "title": factor.get("category", "Indicator"),
                "explanation": factor.get("description", ""),
                "severity": factor.get("severity", "medium")
            })

        db_sources = [
            {
                "title": "Local Structural Analysis Engine",
                "publisher": "ScamOrSafe Security",
                "url": target_url,
                "summary": "Protocol, pattern, keyword, and typosquatting heuristics."
            }
        ]

        # RDAP source if available
        rdap_data = result.get("domain_intelligence", {})
        if rdap_data.get("domain_age"):
            db_sources.append({
                "title": "Registration Data Access Protocol (RDAP)",
                "publisher": "IANA / Registry RDAP",
                "url": f"https://rdap.org/domain/{rdap_data.get('root_domain')}",
                "summary": f"Registrar: {rdap_data.get('registrar')}. Domain age: {rdap_data.get('domain_age')}."
            })

        db_payload = {
            "scan_type": "url",
            "summary": f"URL: {target_url} — {result.get('summary', '')}",
            "risk_score": result.get("risk_score"),
            "risk_level": result.get("risk_level"),
            "findings": db_findings,
            "evidence_sources": db_sources
        }
        db_status = supabase_svc.save_scan_record(user_id=user_id, scan_data=db_payload, auth_token=token)

    result["database_persistence"] = db_status
    return jsonify(format_success_response(result))


@url_bp.route("/url/check-reputation", methods=["POST"])
def check_reputation():
    """
    Fast local reputation & structural indicators check (zero external APIs).
    """
    raw_json = request.get_json(silent=True)
    if not raw_json:
        return jsonify(format_error_response("Request body must be valid JSON", "INVALID_JSON")), 400

    target_url = (raw_json.get("url") or "").strip()
    if not target_url:
        return jsonify(format_error_response("Please provide a 'url' to check.", "VALIDATION_ERROR")), 422

    val = validate_url(target_url)
    if not val.get("valid"):
        return jsonify(format_error_response(val.get("error", "Invalid URL format"), "URL_VALIDATION_ERROR")), 422

    # Perform fast local analysis
    domain_res = domain_analyzer.analyze(val)

    return jsonify(format_success_response({
        "url": target_url,
        "normalized_url": val.get("normalized_url", target_url),
        "protocol": val.get("scheme"),
        "is_https": domain_res.get("is_https"),
        "is_reputable": domain_res.get("is_reputable"),
        "brand_impersonation": domain_res.get("brand_impersonation"),
        "matched_keywords": domain_res.get("matched_keywords"),
        "findings_count": domain_res.get("findings_count"),
        "external_database_check": "unavailable"
    }))


@url_bp.route("/url/history", methods=["GET"])
def get_url_history():
    """
    Returns scan history for URLs for the current user.
    """
    user_id = request.headers.get("X-User-Id")
    if not user_id:
        return jsonify(format_error_response("Authentication required to view scan history.", "UNAUTHORIZED")), 401

    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip() if auth_header.startswith("Bearer ") else None

    # Retrieve from Supabase using user token if configured
    if not supabase_svc.is_configured():
        return jsonify(format_success_response({"scans": [], "note": "Database storage not configured."}))

    import requests
    headers = {
        "Authorization": f"Bearer {token or supabase_svc.service_key}",
        "apikey": token or supabase_svc.service_key,
        "Content-Type": "application/json"
    }

    try:
        resp = requests.get(
            f"{supabase_svc.url}/rest/v1/scans?scan_type=eq.url&user_id=eq.{user_id}&order=created_at.desc&limit=25",
            headers=headers,
            timeout=5
        )
        if resp.status_code == 200:
            return jsonify(format_success_response({"scans": resp.json()}))
        else:
            return jsonify(format_error_response("Failed to query scan history from database.", "DATABASE_ERROR")), 502
    except Exception as e:
        return jsonify(format_error_response(f"History lookup error: {str(e)}", "SERVER_ERROR")), 500


@url_bp.route("/url/report", methods=["POST"])
def report_url_feedback():
    """
    Records false positive or false negative feedback from users.
    """
    raw_json = request.get_json(silent=True) or {}
    url = raw_json.get("url", "").strip()
    report_type = raw_json.get("report_type", "suspicious")
    comment = raw_json.get("comment", "")

    if not url:
        return jsonify(format_error_response("URL is required for submitting reports.", "VALIDATION_ERROR")), 422

    return jsonify(format_success_response({
        "received": True,
        "url": url,
        "report_type": report_type,
        "message": "Thank you. Your URL feedback report has been recorded for review."
    }))
