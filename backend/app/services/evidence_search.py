"""
Live Evidence Search Engine.
Retrieves real external news articles, government releases, and fact-checks.
Ranks sources by authority tier (Gov > Science > Fact-Check > Mainstream News).
Never hallucinates or fabricates URLs.
"""
import os
import requests
from typing import Dict, Any, List
from urllib.parse import quote_plus
from ..utils.source_validator import classify_source_authority, deduplicate_evidence_sources

DEFAULT_TIMEOUT = 10


class EvidenceSearchService:
    def __init__(self):
        self.tavily_key = os.getenv("TAVILY_API_KEY", "").strip() or os.getenv("SEARCH_API_KEY", "").strip()
        self.serpapi_key = os.getenv("SERPAPI_API_KEY", "").strip()
        self.provider = os.getenv("SEARCH_API_PROVIDER", "auto").lower()

    def is_configured(self) -> bool:
        return bool(self.tavily_key or self.serpapi_key)

    def search_evidence(self, query: str, max_results: int = 5) -> Dict[str, Any]:
        """
        Executes live search across verified news and official agencies.
        """
        clean_query = query.strip()
        if not clean_query:
            return {"configured": False, "results": [], "note": "Empty query"}

        # 1. Tavily Search API (Prioritized for AI search & fact-checking)
        if self.tavily_key:
            return self._search_tavily(clean_query, max_results)

        # 2. SerpAPI (Google Search)
        if self.serpapi_key:
            return self._search_serpapi(clean_query, max_results)

        # 3. Wikipedia Open Knowledge Retrieval (Official Free Encyclopedia API)
        wiki_results = self._search_wikipedia(clean_query, max_results)
        if wiki_results.get("results"):
            return wiki_results

        # 4. No Live Search Configured
        return {
            "configured": False,
            "provider": "none",
            "results": [],
            "note": "Live web search API is not configured (TAVILY_API_KEY or SERPAPI_API_KEY missing in backend/.env). Real-time web articles were not fetched."
        }

    def _search_tavily(self, query: str, max_results: int) -> Dict[str, Any]:
        url = "https://api.tavily.com/search"
        payload = {
            "api_key": self.tavily_key,
            "query": query,
            "search_depth": "advanced",
            "include_domains": [],
            "max_results": max_results,
            "include_answer": False
        }
        try:
            resp = requests.post(url, json=payload, timeout=DEFAULT_TIMEOUT)
            if resp.status_code == 200:
                data = resp.json()
                raw_results = data.get("results", [])
                formatted = []
                for r in raw_results:
                    formatted.append({
                        "title": r.get("title", "News Reference"),
                        "publisher": r.get("source") or r.get("url", "").split("/")[2],
                        "source_url": r.get("url", ""),
                        "published_at": r.get("published_date"),
                        "evidence_summary": r.get("content", "")[:350],
                        "source_provider": "tavily_live_search"
                    })
                ranked = deduplicate_evidence_sources(formatted)
                return {
                    "configured": True,
                    "provider": "tavily",
                    "results": ranked,
                    "note": f"Retrieved {len(ranked)} live sources via Tavily Search."
                }
            return {
                "configured": True,
                "provider": "tavily",
                "results": [],
                "note": f"Tavily API returned status {resp.status_code}: {resp.text[:150]}"
            }
        except Exception as e:
            return {
                "configured": True,
                "provider": "tavily",
                "results": [],
                "error": str(e),
                "note": "Live search request failed."
            }

    def _search_serpapi(self, query: str, max_results: int) -> Dict[str, Any]:
        url = "https://serpapi.com/search"
        params = {
            "api_key": self.serpapi_key,
            "q": query,
            "engine": "google",
            "num": max_results
        }
        try:
            resp = requests.get(url, params=params, timeout=DEFAULT_TIMEOUT)
            if resp.status_code == 200:
                data = resp.json()
                organic = data.get("organic_results", [])
                formatted = []
                for r in organic:
                    formatted.append({
                        "title": r.get("title", ""),
                        "publisher": r.get("displayed_link") or r.get("source", ""),
                        "source_url": r.get("link", ""),
                        "published_at": r.get("date"),
                        "evidence_summary": r.get("snippet", ""),
                        "source_provider": "serpapi_google_search"
                    })
                ranked = deduplicate_evidence_sources(formatted)
                return {
                    "configured": True,
                    "provider": "serpapi",
                    "results": ranked,
                    "note": f"Retrieved {len(ranked)} live sources via Google Search (SerpAPI)."
                }
            return {"configured": True, "provider": "serpapi", "results": [], "note": f"SerpAPI HTTP {resp.status_code}"}
        except Exception as e:
            return {"configured": True, "provider": "serpapi", "results": [], "error": str(e)}

    def _search_wikipedia(self, query: str, max_results: int) -> Dict[str, Any]:
        """
        Public Open Knowledge Search via Wikimedia REST API.
        Used when commercial search API keys are not supplied.
        """
        url = f"https://en.wikipedia.org/w/api.php?action=opensearch&search={quote_plus(query[:80])}&limit={max_results}&namespace=0&format=json"
        headers = {"User-Agent": "ScamOrSafeNewsVerification/1.0 (cybersecurity research)"}
        try:
            resp = requests.get(url, headers=headers, timeout=6)
            if resp.status_code == 200:
                data = resp.json()
                if len(data) >= 4 and len(data[1]) > 0:
                    titles = data[1]
                    summaries = data[2]
                    urls = data[3]
                    results = []
                    for t, s, u in zip(titles, summaries, urls):
                        if not s or "may refer to:" in s:
                            continue
                        results.append({
                            "title": f"Wikipedia: {t}",
                            "publisher": "Wikimedia Foundation",
                            "source_url": u,
                            "published_at": None,
                            "evidence_summary": s[:350],
                            "source_provider": "wikipedia_knowledge_base"
                        })
                    ranked = deduplicate_evidence_sources(results)
                    return {
                        "configured": False,
                        "provider": "wikipedia_reference",
                        "results": ranked,
                        "note": "Reference background retrieved from Wikimedia Open Knowledge Base."
                    }
        except Exception:
            pass
        return {"configured": False, "provider": "none", "results": []}

