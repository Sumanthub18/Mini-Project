"""
Safe HTTP Redirect Analyzer and SSRF Defense.
Safely traces HTTP redirect chains hop-by-hop up to a configured depth.
Enforces rigorous pre-flight DNS and IP verification at EVERY hop to thwart SSRF,
DNS rebinding, private network scanning, and cloud metadata theft.
"""
from urllib.parse import urlparse, urljoin
import requests
from typing import Dict, Any, List, Optional
from .url_validator import resolve_hostname_safely, validate_url

MAX_REDIRECT_HOPS = 5
CONNECT_TIMEOUT = 3
READ_TIMEOUT = 4


class RedirectAnalyzer:
    def __init__(self, max_hops: int = MAX_REDIRECT_HOPS):
        self.max_hops = max_hops

    def trace_redirects(self, initial_url: str) -> Dict[str, Any]:
        """
        Safely inspects HTTP redirect headers hop-by-hop without executing scripts
        or downloading file bodies.
        """
        hops: List[Dict[str, Any]] = []
        current_url = initial_url
        visited_urls = set()
        ssrf_blocked = False
        ssrf_reason = None
        is_suspicious_redirect = False

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (Security-Scanner)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }

        for hop_index in range(1, self.max_hops + 1):
            if current_url in visited_urls:
                # Redirect loop detected
                return {
                    "has_redirects": len(hops) > 0,
                    "redirect_count": len(hops),
                    "initial_url": initial_url,
                    "final_url": current_url,
                    "hops": hops,
                    "is_suspicious_redirect": True,
                    "ssrf_blocked": False,
                    "loop_detected": True,
                    "summary": f"Redirect loop detected at hop {hop_index} ({current_url})."
                }

            visited_urls.add(current_url)

            # Step 1: Validate candidate URL syntax
            parsed = validate_url(current_url)
            if not parsed.get("valid"):
                return {
                    "has_redirects": len(hops) > 0,
                    "redirect_count": len(hops),
                    "initial_url": initial_url,
                    "final_url": current_url,
                    "hops": hops,
                    "is_suspicious_redirect": True,
                    "ssrf_blocked": False,
                    "error": f"Invalid redirect destination URL: {parsed.get('error')}",
                    "summary": "Redirect chain pointed to an invalid URL format."
                }

            hostname = parsed.get("hostname", "")

            # Step 2: SSRF Pre-flight DNS & IP check
            is_safe, resolved_ip, block_reason = resolve_hostname_safely(hostname)
            if not is_safe:
                ssrf_blocked = True
                ssrf_reason = block_reason
                hops.append({
                    "hop": hop_index,
                    "url": current_url,
                    "status_code": 0,
                    "resolved_ip": resolved_ip,
                    "blocked": True,
                    "block_reason": block_reason
                })
                break

            # Step 3: Perform non-redirecting HEAD or stream GET request
            try:
                # Prefer HEAD to avoid downloading bodies
                resp = requests.head(
                    current_url,
                    headers=headers,
                    allow_redirects=False,
                    timeout=(CONNECT_TIMEOUT, READ_TIMEOUT)
                )

                # Fallback to streaming GET if HEAD is not allowed (405 Method Not Allowed)
                if resp.status_code == 405:
                    resp = requests.get(
                        current_url,
                        headers=headers,
                        allow_redirects=False,
                        stream=True,
                        timeout=(CONNECT_TIMEOUT, READ_TIMEOUT)
                    )
                    # Close the socket immediately without reading body
                    resp.close()

                status_code = resp.status_code

                if status_code in (301, 302, 303, 307, 308):
                    location = resp.headers.get("Location")
                    if not location:
                        break

                    next_url = urljoin(current_url, location)
                    hops.append({
                        "hop": hop_index,
                        "from_url": current_url,
                        "to_url": next_url,
                        "status_code": status_code,
                        "resolved_ip": resolved_ip,
                        "blocked": False
                    })
                    current_url = next_url
                else:
                    # Final destination reached
                    hops.append({
                        "hop": hop_index,
                        "url": current_url,
                        "status_code": status_code,
                        "resolved_ip": resolved_ip,
                        "blocked": False
                    })
                    break

            except requests.exceptions.RequestException as e:
                # Network or connection error at this hop
                hops.append({
                    "hop": hop_index,
                    "url": current_url,
                    "status_code": 0,
                    "resolved_ip": resolved_ip,
                    "error": str(e),
                    "blocked": False
                })
                break

        redirect_count = len([h for h in hops if "to_url" in h])
        final_url = current_url

        # Check if destination domain differs substantially from initial domain
        try:
            initial_host = urlparse(initial_url).hostname or ""
            final_host = urlparse(final_url).hostname or ""
            if redirect_count > 0 and initial_host != final_host:
                is_suspicious_redirect = True
        except Exception:
            pass

        return {
            "has_redirects": redirect_count > 0,
            "redirect_count": redirect_count,
            "initial_url": initial_url,
            "final_url": final_url,
            "final_hostname": urlparse(final_url).hostname or "",
            "hops": hops,
            "is_suspicious_redirect": is_suspicious_redirect,
            "ssrf_blocked": ssrf_blocked,
            "ssrf_reason": ssrf_reason,
            "summary": (
                f"Blocked potential SSRF attack: {ssrf_reason}" if ssrf_blocked else
                f"Expanded through {redirect_count} redirect hop(s) to '{final_url}'." if redirect_count > 0 else
                "Direct URL. No redirects detected."
            )
        }
