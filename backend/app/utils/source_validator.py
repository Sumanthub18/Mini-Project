"""
Source validation, authority tiering, and credibility scoring for news verification.
Prioritizes official government bodies, scientific journals, IFCN fact-checkers, and reputable news.
"""
import re
from urllib.parse import urlparse
from typing import Dict, Any, List

# Authority Tiers and Known Domains
TIER_1_GOVERNMENT = {
    "gov", "gov.in", "pib.gov.in", "who.int", "cdc.gov", "fda.gov", "rbi.org.in",
    "isro.gov.in", "nasa.gov", "un.org", "mohfw.gov.in", "eci.gov.in", "whitehouse.gov",
    "gov.uk", "europa.eu", "nih.gov", "icmr.gov.in"
}

TIER_2_SCIENTIFIC = {
    "nature.com", "thelancet.com", "nejm.org", "sciencemag.org", "bmj.com",
    "cell.com", "pnas.org", "ncbi.nlm.nih.gov", "sciencedirect.com", "jamanetwork.com",
    "arxiv.org", "springer.com", "wiley.com"
}

TIER_3_FACTCHECK = {
    "snopes.com", "altnews.in", "boomlive.in", "factly.in", "politifact.com",
    "factcheck.org", "fullfact.org", "afp.com", "reuters.com/fact-check",
    "vishvasnews.com", "newsmobile.in", "thequint.com/news/webqoof", "indiatoday.in/fact-check"
}

TIER_4_REPUTABLE_NEWS = {
    "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk", "thehindu.com",
    "indianexpress.com", "ndtv.com", "timesofindia.indiatimes.com", "hindustantimes.com",
    "bloomberg.com", "theguardian.com", "wsj.com", "nytimes.com", "washingtonpost.com",
    "economist.com", "aljazeera.com", "dw.com", "france24.com", "npr.org",
    "prajavani.net", "vijaykarnataka.com", "dhaftary.com", "dainikbhaskar.com", "amarujala.com"
}

SUSPICIOUS_DOMAINS = {
    "blogspot.com", "wordpress.com", "wixsite.com", "weebly.com"
}


def extract_domain(url: str) -> str:
    """Extracts lowercase clean hostname from URL."""
    try:
        parsed = urlparse(url)
        netloc = parsed.netloc.lower()
        # Remove port and www
        netloc = re.sub(r":\d+$", "", netloc)
        return re.sub(r"^www\.", "", netloc)
    except Exception:
        return ""


def classify_source_authority(url: str, publisher: str = "") -> Dict[str, Any]:
    """
    Evaluates domain credibility and assigns an authority tier (1 to 5) and credibility weight.
    """
    domain = extract_domain(url)
    pub_lower = (publisher or "").lower()

    # 1. Tier 1: Government and Official Agencies
    if domain.endswith(".gov") or domain.endswith(".gov.in") or domain in TIER_1_GOVERNMENT or "pib" in domain or "who.int" in domain:
        return {
            "tier": 1,
            "category": "Government & Official Agency",
            "weight": 1.0,
            "is_primary": True,
            "credibility": "very_high",
            "domain": domain
        }

    # 2. Tier 2: Scientific & Medical Journals
    if any(s in domain for s in TIER_2_SCIENTIFIC) or "pubmed" in domain:
        return {
            "tier": 2,
            "category": "Scientific & Academic Journal",
            "weight": 0.95,
            "is_primary": True,
            "credibility": "very_high",
            "domain": domain
        }

    # 3. Tier 3: Certified Fact-Checkers
    if any(fc in domain for fc in TIER_3_FACTCHECK) or "factcheck" in domain or "fact-check" in pub_lower:
        return {
            "tier": 3,
            "category": "Independent Fact-Checking Organization",
            "weight": 0.90,
            "is_primary": False,
            "credibility": "high",
            "domain": domain
        }

    # 4. Tier 4: Reputable News Media
    if any(news in domain for news in TIER_4_REPUTABLE_NEWS):
        return {
            "tier": 4,
            "category": "Established News Organization",
            "weight": 0.80,
            "is_primary": False,
            "credibility": "medium_high",
            "domain": domain
        }

    # 5. Suspicious / Self-Published Platforms
    if any(sus in domain for sus in SUSPICIOUS_DOMAINS) or domain.endswith((".xyz", ".top", ".cc")):
        return {
            "tier": 5,
            "category": "User-Generated or Low-Confidence Blog",
            "weight": 0.30,
            "is_primary": False,
            "credibility": "low",
            "domain": domain
        }

    # Default general web domain
    return {
        "tier": 4,
        "category": "General Web Source",
        "weight": 0.60,
        "is_primary": False,
        "credibility": "moderate",
        "domain": domain
    }


def deduplicate_evidence_sources(sources: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Removes duplicate evidence links and ranks sources by authority tier and relevance.
    """
    seen_urls = set()
    seen_titles = set()
    cleaned = []

    for s in sources:
        url = (s.get("source_url") or s.get("url") or "").strip()
        title = (s.get("title") or "").strip().lower()

        if not url:
            continue

        clean_url = url.split("?")[0].rstrip("/")
        if clean_url in seen_urls:
            continue
        if title and title in seen_titles:
            continue

        seen_urls.add(clean_url)
        if title:
            seen_titles.add(title)

        auth = classify_source_authority(url, s.get("publisher", ""))
        s_copy = dict(s)
        s_copy["authority"] = auth
        s_copy["source_url"] = url
        cleaned.append(s_copy)

    # Rank by tier (Tier 1 first)
    cleaned.sort(key=lambda x: x["authority"]["tier"])
    return cleaned

