"""
Explainable URL Risk Scoring Engine.
Calculates a transparent security risk score (0-100) and severity level (LOW, MEDIUM, HIGH)
based on concrete, evidence-backed security indicators and threat intelligence.
"""
from typing import Dict, Any, List, Tuple


def calculate_url_risk_score(
    validated_url: Dict[str, Any],
    domain_analysis: Dict[str, Any],
    rdap_intel: Dict[str, Any],
    redirect_intel: Dict[str, Any],
    safe_browsing: Dict[str, Any],
    virustotal: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Computes an explainable risk score from 0 to 100.
    Returns the integer score, risk level, contributing factors, and deductions.
    """
    contributing_factors: List[Dict[str, Any]] = []
    base_score = 10  # Baseline inquiry score

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

    # 2. Google Safe Browsing Matches
    if safe_browsing.get("match_found"):
        threat_type = safe_browsing.get("primary_threat", "MALWARE/PHISHING")
        contributing_factors.append({
            "category": "Google Safe Browsing Intelligence",
            "weight": 75,
            "severity": "critical",
            "description": f"URL is blacklisted in Google Safe Browsing threat database ({threat_type})."
        })

    # 3. VirusTotal Engine Detections
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

    # 5. Domain Structural Findings
    for f in domain_analysis.get("findings", []):
        ftype = f.get("type")
        if ftype == "ip_address_host":
            contributing_factors.append({
                "category": "Direct IP Host",
                "weight": 35,
                "severity": "high",
                "description": f.get("description")
            })
        elif ftype == "punycode_homograph":
            contributing_factors.append({
                "category": "Punycode Homograph",
                "weight": 40,
                "severity": "high",
                "description": f.get("description")
            })
        elif ftype == "embedded_credentials":
            contributing_factors.append({
                "category": "Embedded Credentials",
                "weight": 45,
                "severity": "critical",
                "description": f.get("description")
            })
        elif ftype in ("credential_harvesting", "open_redirect"):
            contributing_factors.append({
                "category": "Suspicious URL Parameter",
                "weight": 30,
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
        elif ftype == "excessive_hyphens":
            contributing_factors.append({
                "category": "Excessive Hyphens",
                "weight": 10,
                "severity": "low",
                "description": f.get("description")
            })

    # 6. Newly Registered Domain (RDAP)
    if rdap_intel.get("is_newly_registered"):
        age_days = rdap_intel.get("domain_age_days", 30)
        weight = 30 if age_days < 7 else 20
        contributing_factors.append({
            "category": "Domain Age Risk",
            "weight": weight,
            "severity": "medium",
            "description": f"Domain was registered very recently ({rdap_intel.get('domain_age_readable')}). High proportion of phishing domains are under 30 days old."
        })

    # 7. Suspicious Redirect Behavior
    if redirect_intel.get("is_suspicious_redirect"):
        contributing_factors.append({
            "category": "Obfuscated Redirect",
            "weight": 15,
            "severity": "medium",
            "description": redirect_intel.get("summary", "Redirect jumps between disparate domains.")
        })

    # Calculate raw sum
    total_added_weight = sum(f["weight"] for f in contributing_factors)
    raw_score = base_score + total_added_weight

    # 8. Mitigating Factors: Established Reputable Domain
    is_reputable = domain_analysis.get("is_reputable", False)
    if is_reputable and not safe_browsing.get("match_found") and vt_malicious == 0 and not brand_imp:
        # Reputable domain with clean reputation
        raw_score = min(raw_score, 15)
        contributing_factors.append({
            "category": "Reputable Domain Credit",
            "weight": -40,
            "severity": "info",
            "description": "Domain is recognized as a well-established, reputable global service."
        })

    # Clamp score to 0..100
    final_score = max(0, min(100, raw_score))

    # Determine risk level
    if final_score >= 60:
        level = "high"
    elif final_score >= 30:
        level = "medium"
    else:
        level = "low"

    return {
        "score": final_score,
        "level": level,
        "contributing_factors": contributing_factors,
        "factors_count": len(contributing_factors),
        "formula_summary": f"Calculated score {final_score}/100 ({level.upper()}) based on {len(contributing_factors)} active security indicator(s)."
    }
