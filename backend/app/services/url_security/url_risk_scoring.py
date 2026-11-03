"""
Explainable Multi-Layered URL Risk Scoring Engine.
Synthesizes security risk scores (0-100) and severity levels (LOW, MEDIUM, HIGH)
by combining:
1. External Threat Intelligence (Google Safe Browsing & VirusTotal)
2. Local Structural Patterns (Typosquatting, brand impersonation, punycode, direct IPs)
3. Protocol & Keyword Checks (HTTP vs HTTPS, login, verify, update, reward, claim)
4. Domain Intelligence (RDAP age, registrar)
5. Safe Redirect & SSRF Defense telemetry
"""
from typing import Dict, Any, List, Tuple


def calculate_url_risk_score(
    validated_url: Dict[str, Any],
    domain_analysis: Dict[str, Any],
    rdap_intel: Dict[str, Any],
    redirect_intel: Dict[str, Any],
    safe_browsing: Dict[str, Any] = None,
    virustotal: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Computes an explainable risk score from 0 to 100.
    Returns the integer score, risk level, contributing factors, and formula notes.
    """
    contributing_factors: List[Dict[str, Any]] = []
    base_score = 10  # Baseline inquiry score

    safe_browsing = safe_browsing or {}
    virustotal = virustotal or {}

    # 1. SSRF & Internal IP Attacks (Immediate Max Risk)
    if validated_url.get("is_private_or_local") or redirect_intel.get("ssrf_blocked"):
        reason = validated_url.get("ip_security_reason") or redirect_intel.get("ssrf_reason") or "Internal / Private IP target"
        contributing_factors.append({
            "category": "SSRF & Internal Network Threat",
            "weight": 90,
            "severity": "critical",
            "description": f"Target address is an internal/private network IP, loopback, or cloud metadata endpoint: {reason}"
        })
        return {
            "score": 100,
            "level": "high",
            "status": "critical_threat",
            "contributing_factors": contributing_factors,
            "formula_summary": "Automatic maximum score due to internal IP or SSRF attempt."
        }

    # 2. Google Safe Browsing Matches (External Threat Intel)
    if safe_browsing.get("match_found"):
        threat_type = safe_browsing.get("primary_threat", "MALWARE/PHISHING")
        contributing_factors.append({
            "category": "Google Safe Browsing Intelligence",
            "weight": 75,
            "severity": "critical",
            "description": f"URL is blacklisted in Google Safe Browsing threat database ({threat_type})."
        })

    # 3. VirusTotal Multi-Engine Detections (External Threat Intel)
    vt_malicious = virustotal.get("malicious_count", 0)
    vt_suspicious = virustotal.get("suspicious_count", 0)
    if vt_malicious > 0 or vt_suspicious > 0:
        vt_weight = min(70, (vt_malicious * 15) + (vt_suspicious * 8))
        contributing_factors.append({
            "category": "VirusTotal Multi-Engine Intelligence",
            "weight": vt_weight,
            "severity": "high" if vt_malicious >= 3 else "medium",
            "description": f"{vt_malicious} security vendor(s) classified this URL as malicious, {vt_suspicious} as suspicious."
        })

    # 4. Brand Impersonation & Typosquatting
    brand_imp = domain_analysis.get("brand_impersonation")
    if brand_imp:
        contributing_factors.append({
            "category": "Brand Impersonation / Typosquatting",
            "weight": 50,
            "severity": "critical",
            "description": brand_imp.get("description", "URL impersonates a high-value brand.")
        })

    # 5. Local Structural, Protocol, & Keyword Findings
    for f in domain_analysis.get("findings", []):
        ftype = f.get("type")
        if ftype == "double_extension_deception":
            contributing_factors.append({
                "category": "Malware File Deception",
                "weight": 50,
                "severity": "critical",
                "description": f.get("description")
            })
        elif ftype == "embedded_credentials":
            contributing_factors.append({
                "category": "Obfuscated Authority (@ symbol)",
                "weight": 45,
                "severity": "critical",
                "description": f.get("description")
            })
        elif ftype == "punycode_homograph":
            contributing_factors.append({
                "category": "Punycode Homograph",
                "weight": 40,
                "severity": "high",
                "description": f.get("description")
            })
        elif ftype == "ip_address_host":
            contributing_factors.append({
                "category": "Direct IP Host",
                "weight": 35,
                "severity": "high",
                "description": f.get("description")
            })
        elif ftype == "unencrypted_sensitive_http":
            contributing_factors.append({
                "category": "Insecure Protocol (HTTP on Sensitive Page)",
                "weight": 30,
                "severity": "high",
                "description": f.get("description")
            })
        elif ftype == "suspicious_keywords":
            contributing_factors.append({
                "category": "Social Engineering Keywords",
                "weight": 25,
                "severity": f.get("severity", "medium"),
                "description": f.get("description")
            })
        elif ftype == "open_redirect_param":
            contributing_factors.append({
                "category": "Open Redirect Parameter",
                "weight": 25,
                "severity": "high",
                "description": f.get("description")
            })
        elif ftype == "subdomain_brand_prepending":
            contributing_factors.append({
                "category": "Deceptive Brand Subdomain",
                "weight": 25,
                "severity": "high",
                "description": f.get("description")
            })
        elif ftype == "suspicious_tld":
            contributing_factors.append({
                "category": "High-Abuse TLD",
                "weight": 20,
                "severity": "medium",
                "description": f.get("description")
            })
        elif ftype == "excessive_subdomains":
            contributing_factors.append({
                "category": "Excessive Subdomains",
                "weight": 15,
                "severity": "medium",
                "description": f.get("description")
            })
        elif ftype == "url_shortener":
            contributing_factors.append({
                "category": "URL Shortener Masking",
                "weight": 15,
                "severity": "low",
                "description": f.get("description")
            })
        elif ftype == "misleading_subpath":
            contributing_factors.append({
                "category": "Misleading URL Subpath",
                "weight": 15,
                "severity": "medium",
                "description": f.get("description")
            })
        elif ftype == "unencrypted_http":
            contributing_factors.append({
                "category": "Plaintext HTTP Protocol",
                "weight": 15,
                "severity": "medium",
                "description": f.get("description")
            })
        elif ftype == "non_standard_port":
            contributing_factors.append({
                "category": "Non-Standard Port",
                "weight": 15,
                "severity": "medium",
                "description": f.get("description")
            })
        elif ftype == "excessive_hyphens":
            contributing_factors.append({
                "category": "Excessive Hyphens",
                "weight": 10,
                "severity": "low",
                "description": f.get("description")
            })

    # 6. Domain Age Risk (RDAP)
    if rdap_intel.get("is_newly_registered"):
        age_days = rdap_intel.get("domain_age_days", 30)
        weight = 30 if age_days < 7 else 20
        contributing_factors.append({
            "category": "Newly Registered Domain",
            "weight": weight,
            "severity": "medium",
            "description": f"Domain was registered very recently ({rdap_intel.get('domain_age_readable')}). High proportion of phishing domains are under 30 days old."
        })

    # 7. Suspicious Redirect Behavior
    if redirect_intel.get("is_suspicious_redirect"):
        contributing_factors.append({
            "category": "Cross-Domain Redirect",
            "weight": 15,
            "severity": "medium",
            "description": redirect_intel.get("summary", "Redirect jumps between disparate domains.")
        })

    # Calculate raw sum
    total_added_weight = sum(f["weight"] for f in contributing_factors)
    raw_score = base_score + total_added_weight

    # 8. Mitigating Factors: Established Reputable Domain
    is_reputable = domain_analysis.get("is_reputable", False)
    has_active_threat = safe_browsing.get("match_found") or vt_malicious > 0 or brand_imp
    if is_reputable and not has_active_threat and not any(f["severity"] in ("high", "critical") for f in contributing_factors):
        raw_score = min(raw_score, 12)
        contributing_factors.append({
            "category": "Reputable Domain Credit",
            "weight": -40,
            "severity": "info",
            "description": "Domain is recognized as a well-established, reputable global service."
        })

    final_score = max(0, min(100, raw_score))

    # Risk level determination
    if final_score >= 60:
        level = "high"
    elif final_score >= 30:
        level = "medium"
    else:
        level = "low"

    if len(contributing_factors) == 0 or (len(contributing_factors) == 1 and contributing_factors[0].get("severity") == "info"):
        formula_summary = "No obvious suspicious indicators found."
    else:
        formula_summary = f"Calculated score {final_score}/100 ({level.upper()}) based on {len(contributing_factors)} active security indicator(s)."

    return {
        "score": final_score,
        "level": level,
        "contributing_factors": contributing_factors,
        "factors_count": len(contributing_factors),
        "formula_summary": formula_summary
    }
