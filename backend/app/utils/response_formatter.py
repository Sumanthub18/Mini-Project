"""
Response formatting and comparative synthesis utilities.
"""
from typing import Dict, Any, List


def format_error_response(message: str, error_code: str = "BAD_REQUEST", details: Any = None) -> Dict[str, Any]:
    return {
        "success": False,
        "error": {
            "code": error_code,
            "message": message,
            "details": details or {}
        }
    }


def format_success_response(data: Any, meta: Dict[str, Any] = None) -> Dict[str, Any]:
    resp = {
        "success": True,
        "data": data
    }
    if meta:
        resp["meta"] = meta
    return resp


def compute_model_comparison(results: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compares outputs from multiple AI providers and identifies:
    - Common findings (detected across 2+ models)
    - Unique findings (detected by only 1 model)
    - Conflicting findings (divergence in category or risk level)
    - Model consensus summary
    """
    successful_results = {p: res for p, res in results.items() if res.get("status") == "success"}

    if not successful_results:
        return {
            "common_findings": [],
            "unique_findings": {},
            "conflicting_findings": [],
            "consensus": {
                "agreement_level": "None",
                "consensus_category": "Undetermined",
                "risk_level": "Undetermined",
                "notes": "No models returned successful analyses to compare."
            }
        }

    # 1. Collect all indicators across successful models
    # We index by normalized title or keyword phrase
    all_indicators = []
    category_votes = {}
    risk_level_votes = {}
    scores = []

    for provider, res in successful_results.items():
        data = res.get("data", {})
        cat = data.get("scam_category") or "Unknown"
        category_votes[cat] = category_votes.get(cat, 0) + 1

        lvl = (data.get("risk_level") or "low").upper()
        risk_level_votes[lvl] = risk_level_votes.get(lvl, 0) + 1

        if "risk_score" in data and isinstance(data["risk_score"], (int, float)):
            scores.append(data["risk_score"])

        for ind in data.get("risk_indicators", []):
            phrase = ind.get("phrase", "").strip().lower()
            title = ind.get("title", "").strip().lower()
            all_indicators.append({
                "provider": provider,
                "title": ind.get("title"),
                "phrase": ind.get("phrase"),
                "explanation": ind.get("explanation"),
                "severity": ind.get("severity", "medium"),
                "key": phrase or title
            })

    # 2. Identify common vs unique findings
    # Group indicators by matching phrase or title
    grouped = {}
    for item in all_indicators:
        k = item["key"]
        if not k:
            continue
        # Check if matches an existing group
        matched_group = None
        for group_key in grouped:
            if k in group_key or group_key in k or item["title"].lower() in group_key:
                matched_group = group_key
                break

        target_key = matched_group or k
        if target_key not in grouped:
            grouped[target_key] = []
        grouped[target_key].append(item)

    common_findings = []
    unique_findings = {p: [] for p in successful_results}

    for key, items in grouped.items():
        providers_in_group = list({i["provider"] for i in items})
        first = items[0]
        if len(providers_in_group) >= 2:
            common_findings.append({
                "title": first["title"],
                "phrase": first["phrase"],
                "explanation": first["explanation"],
                "severity": first["severity"],
                "agreed_by": providers_in_group,
                "count": len(providers_in_group)
            })
        else:
            p = providers_in_group[0]
            unique_findings[p].append({
                "title": first["title"],
                "phrase": first["phrase"],
                "explanation": first["explanation"],
                "severity": first["severity"]
            })

    # 3. Detect conflicting findings
    conflicts = []

    # Risk level divergence
    distinct_levels = list(risk_level_votes.keys())
    if len(distinct_levels) > 1:
        level_items = []
        for p, res in successful_results.items():
            lvl = res.get("data", {}).get("risk_level", "unknown")
            level_items.append(f"{p}: {lvl}")
        conflicts.append({
            "type": "risk_level_divergence",
            "description": f"Models disagreed on severity level: {', '.join(level_items)}",
            "providers_involved": list(successful_results.keys())
        })

    # Category divergence
    distinct_cats = [c for c in category_votes if c.lower() not in {"legitimate", "safe", "unknown"}]
    if len(distinct_cats) > 1:
        cat_items = []
        for p, res in successful_results.items():
            cat = res.get("data", {}).get("scam_category", "unknown")
            cat_items.append(f"{p} -> {cat}")
        conflicts.append({
            "type": "scam_category_divergence",
            "description": f"Models classified message into different threat categories: {', '.join(cat_items)}",
            "providers_involved": list(successful_results.keys())
        })

    # 4. Consensus computation
    # Winner by plurality
    top_cat = max(category_votes.items(), key=lambda x: x[1])[0] if category_votes else "Uncertain"
    top_lvl = max(risk_level_votes.items(), key=lambda x: x[1])[0] if risk_level_votes else "LOW"
    avg_score = round(sum(scores) / len(scores)) if scores else 0

    agreement_pct = (category_votes.get(top_cat, 0) / len(successful_results)) * 100 if successful_results else 0
    agreement_label = "Unanimous" if agreement_pct == 100 else "Majority" if agreement_pct >= 50 else "Divided"

    return {
        "common_findings": common_findings,
        "unique_findings": unique_findings,
        "conflicting_findings": conflicts,
        "consensus": {
            "agreement_level": agreement_label,
            "consensus_category": top_cat,
            "risk_level": top_lvl,
            "synthesized_risk_score": avg_score,
            "total_models_evaluated": len(results),
            "successful_models": len(successful_results),
            "disclaimer": "Synthesized risk score reflects ensemble evaluation. Not a scientifically guaranteed probability."
        }
    }
