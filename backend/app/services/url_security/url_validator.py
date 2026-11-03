"""
URL Validator and SSRF Protection Module.
Validates URL syntax, normalizes schemes, detects punycode / IP addresses,
and enforces strict IP / SSRF safeguards (blocking private IPs, localhost, cloud metadata).
"""
import re
import socket
import ipaddress
from urllib.parse import urlparse, urlunparse
from typing import Dict, Any, Tuple, Optional

# Denied hostnames and metadata addresses
DENIED_HOSTS = {
    "localhost",
    "127.0.0.1",
    "::1",
    "0.0.0.0",
    "metadata.google.internal",
    "instance-data",
}

# Cloud metadata addresses
METADATA_IPS = {
    "169.254.169.254",
    "169.254.170.2",
    "fd00:ec2::254",
}


def is_valid_ip(address: str) -> bool:
    """Checks whether the given string is a valid IPv4 or IPv6 address."""
    try:
        ipaddress.ip_address(address)
        return True
    except ValueError:
        return False


def is_safe_ip(ip_str: str) -> Tuple[bool, Optional[str]]:
    """
    Validates that an IP address is a safe public address and not private,
    loopback, link-local, multicast, or cloud metadata.
    """
    try:
        ip = ipaddress.ip_address(ip_str.strip("[]"))
    except ValueError:
        return False, "Invalid IP address syntax"

    # Cloud metadata check
    if str(ip) in METADATA_IPS:
        return False, "Cloud metadata service IP address access is blocked"

    if ip.is_loopback:
        return False, "Loopback address (localhost) access is blocked"
    if ip.is_private:
        return False, "Private RFC1918 / unique-local network access is blocked"
    if ip.is_link_local:
        return False, "Link-local address access is blocked"
    if ip.is_multicast:
        return False, "Multicast address access is blocked"
    if ip.is_reserved:
        return False, "Reserved address space access is blocked"
    if ip.is_unspecified:
        return False, "Unspecified 0.0.0.0 / :: address access is blocked"

    # Special check for IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        return is_safe_ip(str(ip.ipv4_mapped))

    return True, None


def resolve_hostname_safely(hostname: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Resolves a hostname using DNS and verifies that all resolved IP addresses
    are safe public IPs. Prevents SSRF and internal network scanning.
    """
    clean_host = hostname.strip().lower().strip("[]")

    if clean_host in DENIED_HOSTS:
        return False, None, f"Access to internal host '{clean_host}' is blocked"

    # If it's a direct IP, check directly
    if is_valid_ip(clean_host):
        is_safe, reason = is_safe_ip(clean_host)
        if not is_safe:
            return False, clean_host, reason
        return True, clean_host, None

    try:
        # Resolve via getaddrinfo to handle both IPv4 and IPv6
        addr_info = socket.getaddrinfo(clean_host, None)
        if not addr_info:
            return False, None, "DNS resolution returned no records"

        resolved_ips = []
        for family, _, _, _, sockaddr in addr_info:
            ip_candidate = sockaddr[0]
            resolved_ips.append(ip_candidate)
            is_safe, reason = is_safe_ip(ip_candidate)
            if not is_safe:
                return False, ip_candidate, f"DNS resolved to forbidden address ({ip_candidate}): {reason}"

        primary_ip = resolved_ips[0] if resolved_ips else None
        return True, primary_ip, None

    except socket.gaierror as e:
        return False, None, f"DNS resolution failed: {str(e)}"
    except Exception as e:
        return False, None, f"DNS lookup error: {str(e)}"


def validate_url(url_string: str) -> Dict[str, Any]:
    """
    Validates, parses, and normalizes a candidate URL string.
    Returns metadata including hostname, punycode status, IP address status,
    and SSRF / security warnings.
    """
    if not url_string or not isinstance(url_string, str):
        return {
            "valid": False,
            "error": "URL cannot be empty.",
            "url": url_string or ""
        }

    raw = url_string.strip()
    if len(raw) < 4:
        return {"valid": False, "error": "URL is too short.", "url": raw}
    if len(raw) > 4096:
        return {"valid": False, "error": "URL exceeds maximum length of 4096 characters.", "url": raw}

    # Ensure protocol scheme is present
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", raw):
        raw = "http://" + raw

    try:
        parsed = urlparse(raw)
    except Exception as e:
        return {"valid": False, "error": f"Malformed URL syntax: {str(e)}", "url": raw}

    scheme = (parsed.scheme or "").lower()
    if scheme not in ("http", "https"):
        return {
            "valid": False,
            "error": f"Unsupported protocol scheme '{scheme}'. Only HTTP and HTTPS are permitted.",
            "url": raw
        }

    netloc = parsed.netloc.strip()
    if not netloc:
        return {"valid": False, "error": "URL must contain a valid hostname or domain.", "url": raw}

    # Check for embedded credentials (e.g. http://user:pass@domain.com)
    has_credentials = False
    auth_credentials = None
    if "@" in netloc:
        has_credentials = True
        auth_credentials, _, netloc = netloc.rpartition("@")

    # Extract hostname and optional port
    hostname = parsed.hostname or ""
    port = parsed.port

    if not hostname:
        return {"valid": False, "error": "Could not extract a valid host from URL.", "url": raw}

    hostname = hostname.lower()

    if " " in hostname or ("." not in hostname and hostname not in DENIED_HOSTS and not is_valid_ip(hostname)):
        return {"valid": False, "error": f"Invalid hostname or domain '{hostname}'.", "url": raw}

    # Punycode / IDN detection
    is_punycode = "xn--" in hostname
    unicode_host = hostname
    if is_punycode:
        try:
            unicode_host = hostname.encode("utf-8").decode("idna")
        except Exception:
            pass

    # Direct IP detection
    is_ip = is_valid_ip(hostname.strip("[]"))
    ip_version = None
    is_private_or_local = False
    ip_security_reason = None

    if is_ip:
        try:
            ip_obj = ipaddress.ip_address(hostname.strip("[]"))
            ip_version = ip_obj.version
            is_safe, reason = is_safe_ip(str(ip_obj))
            if not is_safe:
                is_private_or_local = True
                ip_security_reason = reason
        except ValueError:
            pass
    elif hostname in DENIED_HOSTS:
        is_private_or_local = True
        ip_security_reason = f"Hostname '{hostname}' is a reserved internal host."

    # Reconstruct normalized URL
    normalized_path = parsed.path if parsed.path else "/"
    normalized_query = parsed.query
    normalized_netloc = hostname + (f":{port}" if port and port not in (80, 443) else "")
    normalized_url = urlunparse((scheme, normalized_netloc, normalized_path, parsed.params, normalized_query, parsed.fragment))

    return {
        "valid": True,
        "error": None,
        "raw_url": url_string,
        "normalized_url": normalized_url,
        "scheme": scheme,
        "netloc": normalized_netloc,
        "hostname": hostname,
        "port": port,
        "path": normalized_path,
        "query": normalized_query,
        "is_ip": is_ip,
        "ip_version": ip_version,
        "is_private_or_local": is_private_or_local,
        "ip_security_reason": ip_security_reason,
        "is_punycode": is_punycode,
        "unicode_host": unicode_host,
        "has_credentials": has_credentials,
        "auth_credentials": auth_credentials
    }
