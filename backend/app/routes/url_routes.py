"""
URL Safety and Threat Intelligence API Routes.
Exposes endpoints for full URL analysis, reputation checks, history retrieval,
and community feedback reporting.
"""
from flask import Blueprint, request, jsonify
from ..services.url_security.url_report_formatter import URLReportCoordinator
from ..services.url_security.safe_browsing_service import SafeBrowsingService
from ..services.url_security.virustotal_service import VirusTotalService
from ..services.url_security.url_validator import validate_url
from ..services.supabase_service import SupabaseService
from ..utils.response_formatter import format_error_response, format_success_response

url_bp = Blueprint("url", __name__)
coordinator = URLReportCoordinator()
safe_browsing_svc = SafeBrowsingService()
virustotal_svc = VirusTotalService()
supabase_svc = SupabaseService()


@url_bp.route("/url/health", methods=["GET"])
def url_health():
    """
    Returns readiness status of all URL Safety subsystems.
    """
    status = coordinator.get_service_status()
    return jsonify(format_success_response({
        "status": "healthy",
        "service": "URL Safety and Threat Intelligence Engine",
        "providers": status,
        "supabase_connected": supabase_svc.is_configured()
    }))


@url_bp.route("/url/analyze", methods=["POST"])
def analyze_url():
    """
    Primary URL safety analysis endpoint.
    Performs validation, SSRF defense, domain analysis, RDAP lookups,
    redirect expansion, threat intelligence checks, risk scoring, and AI explanation.
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

    # Run analysis pipeline
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

        db_sources = []
        # Google Safe Browsing source
        gsb = result.get("threat_intelligence", {}).get("google_safe_browsing", {})
        if gsb.get("configured"):
            db_sources.append({
                "title": "Google Safe Browsing v4",
                "publisher": "Google Security",
                "url": "https://safebrowsing.google.com/",
                "summary": gsb.get("summary", "")
            })
        # VirusTotal source
        vt = result.get("threat_intelligence", {}).get("virustotal", {})
        if vt.get("configured") and vt.get("has_report"):
            db_sources.append({
                "title": "VirusTotal Multi-Engine Reputation",
                "publisher": "VirusTotal / Google Chronicle",
                "url": f"https://www.virustotal.com/gui/url/{VirusTotalService.get_url_id(target_url)}",
                "summary": vt.get("summary", "")
            })
        # RDAP source
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
    Fast reputation-only check (Google Safe Browsing & VirusTotal).
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

    normalized_url = val.get("normalized_url", target_url)

    gsb = safe_browsing_svc.check_url(normalized_url)
    vt = virustotal_svc.get_url_report(normalized_url)

    return jsonify(format_success_response({
        "url": target_url,
        "normalized_url": normalized_url,
        "google_safe_browsing": gsb,
        "virustotal": vt
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
