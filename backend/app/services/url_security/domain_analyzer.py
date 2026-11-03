"""
Domain Threat & Pattern Analyzer.
Performs heuristic structural threat detection:
- Lookalike / typosquatting detection
- Brand impersonation (banking, fintech, tech, logistics)
- Excessive subdomains
- Suspicious TLDs
- Suspicious URL parameters (credential harvesting, open redirects)
- URL shorteners & unusual structural anomalies
"""
import re
from typing import Dict, Any, List, Optional, Tuple

# High-value targets for brand impersonation
KNOWN_BRANDS = {
    "paypal": {"official_domains": ["paypal.com", "paypal.me"], "category": "Fintech / Payment"},
    "google": {"official_domains": ["google.com", "google.co.in", "google.co.uk", "gmail.com", "youtube.com"], "category": "Tech Giant"},
    "apple": {"official_domains": ["apple.com", "icloud.com"], "category": "Tech Giant"},
    "microsoft": {"official_domains": ["microsoft.com", "live.com", "office.com", "outlook.com"], "category": "Tech Giant"},
    "amazon": {"official_domains": ["amazon.com", "amazon.in", "amazon.co.uk"], "category": "E-Commerce"},
    "netflix": {"official_domains": ["netflix.com"], "category": "Streaming Media"},
    "sbi": {"official_domains": ["onlinesbi.sbi", "sbi.co.in", "onlinesbi.com"], "category": "Banking (SBI)"},
    "hdfc": {"official_domains": ["hdfcbank.com", "hdfc.com"], "category": "Banking (HDFC)"},
    "icici": {"official_domains": ["icicibank.com"], "category": "Banking (ICICI)"},
    "chase": {"official_domains": ["chase.com"], "category": "Banking (Chase)"},
    "wellsfargo": {"official_domains": ["wellsfargo.com"], "category": "Banking (Wells Fargo)"},
    "bankofamerica": {"official_domains": ["bankofamerica.com", "bofa.com"], "category": "Banking (BofA)"},
    "whatsapp": {"official_domains": ["whatsapp.com", "wa.me"], "category": "Messaging"},
    "telegram": {"official_domains": ["telegram.org", "t.me"], "category": "Messaging"},
    "instagram": {"official_domains": ["instagram.com"], "category": "Social Media"},
    "facebook": {"official_domains": ["facebook.com", "fb.com"], "category": "Social Media"},
    "paytm": {"official_domains": ["paytm.com"], "category": "Payment / UPI"},
    "stripe": {"official_domains": ["stripe.com"], "category": "Payment"},
    "binance": {"official_domains": ["binance.com"], "category": "Cryptocurrency"},
    "coinbase": {"official_domains": ["coinbase.com"], "category": "Cryptocurrency"},
    "fedex": {"official_domains": ["fedex.com"], "category": "Logistics / Courier"},
    "dhl": {"official_domains": ["dhl.com"], "category": "Logistics / Courier"},
    "indiapost": {"official_domains": ["indiapost.gov.in"], "category": "Postal / Government"}
}

# Recognized URL Shortening domains
SHORTENER_DOMAINS = {
    "bit.ly", "tinyurl.com", "t.co", "is.gd", "goo.gl", "ow.ly",
    "buff.ly", "rebrand.ly", "cutt.ly", "shorturl.at", "qr.ae",
    "adf.ly", "bit.do", "shorte.st"
}

# Free or high-abuse TLDs frequently found in disposable phishing kits
SUSPICIOUS_TLDS = {
    "xyz", "top", "tk", "ml", "cf", "ga", "gq", "buzz", "fit", "rest",
    "icu", "cam", "work", "click", "link", "loan", "date", "racing",
    "download", "stream", "fun", "monster", "casa", "country"
}

# High-reputation safe domains
REPUTABLE_DOMAINS = {
    "google.com", "youtube.com", "wikipedia.org", "github.com",
    "microsoft.com", "apple.com", "amazon.com", "cloudflare.com",
    "mozilla.org", "reuters.com", "bbc.com", "bbc.co.uk", "nytimes.com",
    "who.int", "cdc.gov", "gov.in", "gov.uk", "whitehouse.gov"
}

# Levenshtein distance for typosquatting checks
def levenshtein_distance(s1: str, s2: str) -> int:
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]


def normalize_homoglyphs(domain: str) -> str:
    """Replaces common leetspeak & homoglyph substitutions."""
    replacements = {
        "0": "o",
        "1": "l",
        "3": "e",
        "4": "a",
        "5": "s",
        "7": "t",
        "8": "b",
        "@": "a",
        "vv": "w",
        "rn": "m",
        "cl": "d"
    }
    cleaned = domain.lower()
    for char, repl in replacements.items():
        cleaned = cleaned.replace(char, repl)
    return cleaned


class DomainAnalyzer:
    def __init__(self):
        pass

    def extract_domain_parts(self, hostname: str) -> Dict[str, Any]:
        """
        Parses hostname into subdomains, second-level domain, and TLD.
        """
        parts = hostname.lower().strip().split(".")
        if len(parts) <= 1:
            return {
                "tld": "",
                "root_domain": hostname,
                "subdomains": [],
                "subdomain_depth": 0
            }

        # Multi-part TLD handling (e.g. .co.in, .gov.in, .co.uk)
        if len(parts) >= 3 and parts[-2] in ("co", "gov", "ac", "edu", "org", "net") and len(parts[-1]) <= 3:
            tld = ".".join(parts[-2:])
            root_domain = ".".join(parts[-3:])
            subdomains = parts[:-3]
        else:
            tld = parts[-1]
            root_domain = ".".join(parts[-2:])
            subdomains = parts[:-2]

        return {
            "tld": tld,
            "root_domain": root_domain,
            "subdomains": subdomains,
            "subdomain_depth": len(subdomains)
        }

    def check_is_reputable(self, hostname: str) -> bool:
        """Checks if the domain is on the reputable root domain list."""
        clean = hostname.lower().strip()
        for rep in REPUTABLE_DOMAINS:
            if clean == rep or clean.endswith("." + rep):
                return True
        if clean.endswith(".gov") or clean.endswith(".gov.in") or clean.endswith(".edu"):
            return True
        return False

    def check_is_shortener(self, hostname: str) -> bool:
        """Checks if the domain belongs to a known URL shortener service."""
        clean = hostname.lower().strip()
        return clean in SHORTENER_DOMAINS or any(clean.endswith("." + s) for s in SHORTENER_DOMAINS)

    def analyze(self, validated_url: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyzes domain and URL structure for phishing, typosquatting,
        excessive subdomains, and credential theft keywords.
        """
        hostname = validated_url.get("hostname", "")
        raw_url = validated_url.get("raw_url", "")
        path = validated_url.get("path", "")
        query = validated_url.get("query", "")
        is_ip = validated_url.get("is_ip", False)
        is_punycode = validated_url.get("is_punycode", False)
        has_credentials = validated_url.get("has_credentials", False)
        port = validated_url.get("port")

        findings: List[Dict[str, Any]] = []
        is_reputable = self.check_is_reputable(hostname)
        is_shortener = self.check_is_shortener(hostname)

        domain_parts = self.extract_domain_parts(hostname)
        tld = domain_parts.get("tld", "")
        root_domain = domain_parts.get("root_domain", "")
        subdomains = domain_parts.get("subdomains", [])
        subdomain_depth = domain_parts.get("subdomain_depth", 0)

        # 1. IP Address Hostname
        if is_ip:
            findings.append({
                "type": "ip_address_host",
                "severity": "high",
                "title": "Direct IP Address Used as Hostname",
                "description": f"URL uses a numerical IP address ({hostname}) rather than a registered domain name. Legitimate services almost always use standard domain names."
            })

        # 2. Punycode / Internationalized Domain Name (Homograph Attack)
        if is_punycode:
            unicode_repr = validated_url.get("unicode_host", "")
            findings.append({
                "type": "punycode_homograph",
                "severity": "high",
                "title": "Punycode / Homograph Domain Detected",
                "description": f"Domain contains Punycode encoding ({hostname} -> {unicode_repr}). Phishers often use non-Latin homoglyphs to visually mimic trusted brand domains."
            })

        # 3. Embedded Credentials in URL Authority
        if has_credentials:
            findings.append({
                "type": "embedded_credentials",
                "severity": "critical",
                "title": "Embedded Authority Credentials (@ symbol)",
                "description": "URL includes embedded credentials or an '@' symbol in the authority component, a common evasion tactic to obscure the true destination domain."
            })

        # 4. Non-Standard Port
        if port and port not in (80, 443):
            findings.append({
                "type": "non_standard_port",
                "severity": "medium",
                "title": f"Non-Standard Port ({port})",
                "description": f"URL directs to port {port}. Commercial portals and banking services typically operate on standard HTTP (80) or HTTPS (443) ports."
            })

        # 5. Excessive Subdomains
        if subdomain_depth >= 3:
            findings.append({
                "type": "excessive_subdomains",
                "severity": "medium",
                "title": f"Excessive Subdomain Nesting ({subdomain_depth} levels)",
                "description": f"Subdomain structure ({'.'.join(subdomains)}) is deeply nested. Phishers frequently prepend legitimate brand names as subdomains on rogue parent domains."
            })

        # 6. High-Abuse / Suspicious TLD
        if tld in SUSPICIOUS_TLDS:
            findings.append({
                "type": "suspicious_tld",
                "severity": "medium",
                "title": f"High-Abuse Top-Level Domain (.{tld})",
                "description": f"The '.{tld}' TLD is statistically prevalent in disposable spam and short-lived phishing campaigns."
            })

        # 7. Brand Impersonation & Typosquatting
        brand_impersonation = None
        normalized_host = normalize_homoglyphs(root_domain)

        if not is_reputable:
            for brand, info in KNOWN_BRANDS.items():
                official_domains = info["official_domains"]
                is_official = any(root_domain == off or root_domain.endswith("." + off) for off in official_domains)

                if is_official:
                    continue

                # Check A: Exact Brand keyword present in root_domain or subdomains
                # e.g. "paypal-verification.com" or "apple.login-secure.tk"
                if brand in hostname:
                    brand_impersonation = {
                        "brand": brand,
                        "category": info["category"],
                        "impersonation_type": "keyword_presence",
                        "severity": "critical",
                        "title": f"Likely Brand Impersonation: {brand.capitalize()}",
                        "description": f"The domain '{hostname}' includes '{brand}' but is NOT an authorized domain for {brand.capitalize()} ({', '.join(official_domains)})."
                    }
                    findings.append(brand_impersonation)
                    break

                # Check B: Levenshtein Typosquatting on the root domain base
                root_base = root_domain.split(".")[0] if "." in root_domain else root_domain
                dist = levenshtein_distance(root_base, brand)
                norm_dist = levenshtein_distance(normalize_homoglyphs(root_base), brand)

                if (dist == 1 or norm_dist == 0 or (dist == 2 and len(brand) >= 6)) and root_base != brand:
                    brand_impersonation = {
                        "brand": brand,
                        "category": info["category"],
                        "impersonation_type": "typosquatting",
                        "severity": "critical",
                        "title": f"Typosquatting Detected: Mimics {brand.capitalize()}",
                        "description": f"Root domain '{root_base}' visually mimics '{brand}' with minor character substitution (Levenshtein distance: {dist})."
                    }
                    findings.append(brand_impersonation)
                    break

        # 8. Suspicious URL Parameters (Credential Harvesting & Open Redirects)
        suspicious_params = []
        param_patterns = [
            (r"(?:redirect|url|dest|next|target|return_to|goto)=https?://", "open_redirect", "Open redirect parameter targeting external URL"),
            (r"(?:token|otp|pin|password|passwd|card|cvv|ssn|auth_key)=", "credential_harvesting", "Sensitive authentication / credential capture parameter in query string"),
        ]
        for pattern, ptype, pdesc in param_patterns:
            if re.search(pattern, query, re.IGNORECASE):
                suspicious_params.append({"type": ptype, "description": pdesc})

        if suspicious_params:
            for sp in suspicious_params:
                findings.append({
                    "type": sp["type"],
                    "severity": "high",
                    "title": "Suspicious URL Parameter Detected",
                    "description": sp["description"]
                })

        # 9. Excessive Hyphens in Domain
        if root_domain.count("-") >= 3:
            findings.append({
                "type": "excessive_hyphens",
                "severity": "medium",
                "title": "Excessive Hyphens in Domain Name",
                "description": f"Domain contains {root_domain.count('-')} hyphens, a technique frequently used to create misleading compound names."
            })

        # 10. URL Shortener Flag
        if is_shortener:
            findings.append({
                "type": "url_shortener",
                "severity": "low",
                "title": "URL Shortener Service",
                "description": f"Domain '{hostname}' is a URL shortening service which conceals the ultimate destination of the link."
            })

        return {
            "hostname": hostname,
            "root_domain": root_domain,
            "tld": tld,
            "subdomains": subdomains,
            "subdomain_depth": subdomain_depth,
            "is_ip": is_ip,
            "is_punycode": is_punycode,
            "is_reputable": is_reputable,
            "is_shortener": is_shortener,
            "brand_impersonation": brand_impersonation,
            "findings_count": len(findings),
            "findings": findings
        }
