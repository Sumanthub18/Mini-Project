"""
Local Domain Threat, Protocol, & Pattern Analyzer.
Performs comprehensive local structural threat detection without external reputation APIs:
- HTTP vs HTTPS protocol security checks
- Suspicious keywords (login, verify, update, reward, claim, kyc, otp, bonus, free)
- Lookalike / typosquatting & brand impersonation detection
- Punycode / IDN homoglyph attacks
- Direct IP address hosts & non-standard port detection
- URL shortener identification
- Suspicious and excessive subdomains
- Misleading URL paths, double file extensions, and parameter exploitation
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
    "download", "stream", "fun", "monster", "casa", "country", "top"
}

# High-reputation safe domains
REPUTABLE_DOMAINS = {
    "google.com", "youtube.com", "wikipedia.org", "github.com",
    "microsoft.com", "apple.com", "amazon.com", "cloudflare.com",
    "mozilla.org", "reuters.com", "bbc.com", "bbc.co.uk", "nytimes.com",
    "who.int", "cdc.gov", "gov.in", "gov.uk", "whitehouse.gov"
}

# Targeted suspicious keywords
HIGH_RISK_KEYWORDS = [
    # Credential & Account keywords
    ("login", "credential_keyword", "Login or authentication portal keyword"),
    ("signin", "credential_keyword", "Sign-in portal keyword"),
    ("verify", "urgency_keyword", "Account verification keyword"),
    ("verification", "urgency_keyword", "Verification procedure keyword"),
    ("update", "urgency_keyword", "Mandatory update keyword"),
    ("re-verify", "urgency_keyword", "Re-verification demand keyword"),
    ("kyc", "financial_keyword", "KYC financial compliance keyword"),
    ("otp", "financial_keyword", "One-Time Password capture keyword"),
    ("account", "credential_keyword", "User account terminology"),
    ("security", "trust_keyword", "Security assurance lure"),
    ("banking", "financial_keyword", "Banking portal terminology"),
    ("wallet", "financial_keyword", "Cryptocurrency or payment wallet keyword"),
    # Incentive, prize, & reward keywords
    ("reward", "lure_keyword", "Financial reward lure keyword"),
    ("claim", "lure_keyword", "Prize or benefit claim keyword"),
    ("bonus", "lure_keyword", "Monetary bonus lure keyword"),
    ("free", "lure_keyword", "Free incentive or gift lure keyword"),
    ("lottery", "lure_keyword", "Lottery winning lure keyword"),
    ("prize", "lure_keyword", "Prize entitlement lure keyword"),
    ("cashback", "lure_keyword", "Cashback payment lure keyword"),
    ("airdrop", "lure_keyword", "Crypto airdrop claim lure keyword"),
    ("gift", "lure_keyword", "Free gift claim keyword")
]


def levenshtein_distance(s1: str, s2: str) -> int:
    """Calculates Levenshtein edit distance between two strings."""
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
    """Replaces common leetspeak and visually deceptive homoglyphs."""
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

        # Handle two-part ccTLDs (.co.in, .gov.in, .co.uk)
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
        clean = hostname.lower().strip()
        for rep in REPUTABLE_DOMAINS:
            if clean == rep or clean.endswith("." + rep):
                return True
        if clean.endswith(".gov") or clean.endswith(".gov.in") or clean.endswith(".edu"):
            return True
        return False

    def check_is_shortener(self, hostname: str) -> bool:
        clean = hostname.lower().strip()
        return clean in SHORTENER_DOMAINS or any(clean.endswith("." + s) for s in SHORTENER_DOMAINS)

    def analyze(self, validated_url: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes local structural inspection across protocol, domain, path, and parameters.
        """
        scheme = validated_url.get("scheme", "http").lower()
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

        # Combine path and query for keyword inspection
        full_path_query = (path + "?" + query).lower()

        # 1. Protocol Check (HTTPS vs Unencrypted HTTP)
        is_https = (scheme == "https")
        if not is_https:
            # Check if unencrypted HTTP is carrying authentication / banking / reward lures
            has_sensitive_ctx = any(kw in full_path_query or kw in hostname for kw, _, _ in HIGH_RISK_KEYWORDS)
            if has_sensitive_ctx:
                findings.append({
                    "type": "unencrypted_sensitive_http",
                    "severity": "high",
                    "title": "Unencrypted HTTP Protocol on Sensitive Portal",
                    "description": "URL transmits data using plain unencrypted HTTP while referencing authentication, banking, or credential keywords. Any entered data is susceptible to interception (Man-in-the-Middle)."
                })
            else:
                findings.append({
                    "type": "unencrypted_http",
                    "severity": "medium",
                    "title": "Unencrypted HTTP Protocol",
                    "description": "URL does not use modern HTTPS encryption (padlock). Traffic is sent in plain text over the network."
                })

        # 2. Suspicious Keywords (login, verify, update, reward, claim, kyc, otp, etc.)
        matched_keywords = []
        for kw, kw_type, kw_label in HIGH_RISK_KEYWORDS:
            # Look for keyword surrounded by boundaries or slashes
            pattern = rf"(?:^|[/_\-\.\?&=]){kw}(?:$|[/_\-\.\?&=])"
            if re.search(pattern, full_path_query) or (kw in hostname and not is_reputable):
                matched_keywords.append(kw)

        if matched_keywords and not is_reputable:
            kw_list_str = ", ".join(f"'{k}'" for k in sorted(set(matched_keywords))[:5])
            findings.append({
                "type": "suspicious_keywords",
                "severity": "high" if any(k in matched_keywords for k in ["login", "verify", "otp", "kyc", "banking"]) else "medium",
                "title": f"Suspicious Social Engineering Keywords Detected ({kw_list_str})",
                "description": f"URL incorporates high-urgency keywords ({kw_list_str}) commonly utilized in social engineering lures, fake portal verification, and credential harvesting."
            })

        # 3. Direct Numerical IP Address as Hostname
        if is_ip:
            findings.append({
                "type": "ip_address_host",
                "severity": "high",
                "title": "Direct IP Address Used as Hostname",
                "description": f"Target host '{hostname}' is a raw numerical IP rather than a registered domain name. Legitimate web services rarely direct users to naked IP addresses."
            })

        # 4. Punycode / IDN Homoglyph Detection
        if is_punycode:
            unicode_repr = validated_url.get("unicode_host", "")
            findings.append({
                "type": "punycode_homograph",
                "severity": "high",
                "title": "Punycode Homograph Domain Detected",
                "description": f"Domain contains Punycode encoding ({hostname} -> {unicode_repr}). Phishers use non-Latin homoglyphs to visually impersonate trusted domains."
            })

        # 5. Lookalike Domain & Typosquatting Detection
        brand_impersonation = None
        normalized_host = normalize_homoglyphs(root_domain)

        if not is_reputable:
            for brand, info in KNOWN_BRANDS.items():
                official_domains = info["official_domains"]
                is_official = any(root_domain == off or root_domain.endswith("." + off) for off in official_domains)

                if is_official:
                    continue

                # Check A: Exact Brand keyword present in unauthorized root_domain or subdomains
                if brand in hostname:
                    brand_impersonation = {
                        "brand": brand,
                        "category": info["category"],
                        "impersonation_type": "keyword_presence",
                        "severity": "critical",
                        "title": f"Brand Impersonation Detected: {brand.capitalize()}",
                        "description": f"The domain '{hostname}' includes '{brand}' but is NOT an authorized domain for {brand.capitalize()} ({', '.join(official_domains)})."
                    }
                    findings.append(brand_impersonation)
                    break

                # Check B: Levenshtein distance on root base (e.g. paypa1, g00gle, netfl1x)
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
                        "description": f"Root domain '{root_base}' visually mimics '{brand}' with character substitution (Levenshtein distance: {dist})."
                    }
                    findings.append(brand_impersonation)
                    break

        # 6. Embedded Credentials / Obfuscation via '@' Symbol
        if has_credentials:
            findings.append({
                "type": "embedded_credentials",
                "severity": "critical",
                "title": "Embedded Authority Credentials (@ symbol)",
                "description": "URL includes an '@' symbol in the authority component. Browsers ignore everything before '@', misleading users about the real destination."
            })

        # 7. Non-Standard Port
        if port and port not in (80, 443):
            findings.append({
                "type": "non_standard_port",
                "severity": "medium",
                "title": f"Non-Standard Port ({port})",
                "description": f"URL connects to port {port}. Commercial portals and banking services typically operate on standard HTTP (80) or HTTPS (443) ports."
            })

        # 8. Suspicious Subdomains
        # A: Excessive subdomain depth
        if subdomain_depth >= 3:
            findings.append({
                "type": "excessive_subdomains",
                "severity": "medium",
                "title": f"Excessive Subdomain Nesting ({subdomain_depth} levels)",
                "description": f"Subdomain structure ({'.'.join(subdomains)}) is deeply nested. Attackers frequently prepend legitimate brand names as subdomains on rogue parent domains."
            })

        # B: Brand keyword inside subdomains on unverified root domain
        if subdomains and not is_reputable:
            for sub in subdomains:
                for brand in KNOWN_BRANDS:
                    if brand in sub and not brand_impersonation:
                        findings.append({
                            "type": "subdomain_brand_prepending",
                            "severity": "high",
                            "title": f"Brand Keyword in Subdomain: '{brand}'",
                            "description": f"Subdomain '{sub}' contains '{brand}', creating a misleading impression of official affiliation on the unrelated parent domain '{root_domain}'."
                        })
                        break

        # 9. High-Abuse TLD
        if tld in SUSPICIOUS_TLDS:
            findings.append({
                "type": "suspicious_tld",
                "severity": "medium",
                "title": f"High-Abuse Top-Level Domain (.{tld})",
                "description": f"The '.{tld}' TLD is statistically prevalent in disposable spam and short-lived phishing campaigns."
            })

        # 10. URL Shortener Service
        if is_shortener:
            findings.append({
                "type": "url_shortener",
                "severity": "low",
                "title": "URL Shortener Service Detected",
                "description": f"Domain '{hostname}' is a URL shortening service that conceals the ultimate landing page."
            })

        # 11. Misleading URL Paths & File Extensions
        # A: Double file extension (e.g., invoice.pdf.exe)
        if re.search(r"\.(pdf|doc|docx|xlsx|jpg|png)\.(exe|scr|vbs|bat|cmd|ps1|apk|jar|msi)$", path, re.IGNORECASE):
            findings.append({
                "type": "double_extension_deception",
                "severity": "critical",
                "title": "Double File Extension Deception Detected",
                "description": "Path disguises an executable file using a double extension (e.g., .pdf.exe), a classic malware delivery mechanism."
            })

        # B: Misleading domain-like subpath (e.g. /paypal.com/signin)
        if re.search(r"/(?:www\.)?[a-zA-Z0-9-]+\.(?:com|org|net|gov|edu)/", path, re.IGNORECASE):
            findings.append({
                "type": "misleading_subpath",
                "severity": "medium",
                "title": "Domain-Like String in URL Path",
                "description": "The URL path includes a simulated domain name string designed to deceive casual inspection in browser address bars."
            })

        # 12. Misleading Query Parameters (Open Redirects & Token Extraction)
        if re.search(r"(?:redirect|url|dest|next|target|return_to|goto)=https?://", query, re.IGNORECASE):
            findings.append({
                "type": "open_redirect_param",
                "severity": "high",
                "title": "Open Redirect Destination Parameter",
                "description": "Query string contains an external redirect parameter ('redirect=' / 'url='), which can be exploited to bounce victims to hostile sites."
            })

        # 13. Excessive Hyphens in Root Domain
        if root_domain.count("-") >= 3:
            findings.append({
                "type": "excessive_hyphens",
                "severity": "medium",
                "title": "Excessive Hyphens in Domain Name",
                "description": f"Domain contains {root_domain.count('-')} hyphens, a technique frequently used to create misleading compound names."
            })

        return {
            "hostname": hostname,
            "root_domain": root_domain,
            "tld": tld,
            "subdomains": subdomains,
            "subdomain_depth": subdomain_depth,
            "is_https": is_https,
            "scheme": scheme,
            "is_ip": is_ip,
            "is_punycode": is_punycode,
            "is_reputable": is_reputable,
            "is_shortener": is_shortener,
            "brand_impersonation": brand_impersonation,
            "matched_keywords": list(set(matched_keywords)),
            "findings_count": len(findings),
            "findings": findings
        }
