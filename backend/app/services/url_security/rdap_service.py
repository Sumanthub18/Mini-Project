"""
RDAP (Registration Data Access Protocol) Domain Intelligence Service.
Queries standardized RDAP servers to extract domain registration dates,
registrar names, nameservers, and calculate authentic domain age without hallucinations.
"""
from datetime import datetime, timezone
import requests
from typing import Dict, Any, Optional

RDAP_BOOTSTRAP_URL = "https://rdap.org/domain"


class RDAPService:
    def __init__(self, timeout_sec: int = 5):
        self.timeout = timeout_sec

    def lookup_domain(self, domain_name: str, is_ip: bool = False) -> Dict[str, Any]:
        """
        Retrieves registration and registrar metadata for a domain via RDAP.
        """
        clean_domain = domain_name.strip().lower()

        if is_ip or not clean_domain or "." not in clean_domain:
            return {
                "status": "not_applicable",
                "domain": clean_domain,
                "registration_date": None,
                "expiration_date": None,
                "domain_age_days": None,
                "domain_age_readable": "Not applicable (IP address / non-domain)",
                "registrar": None,
                "nameservers": [],
                "is_newly_registered": False,
                "summary": "RDAP lookup not applicable for raw IP addresses."
            }

        headers = {
            "Accept": "application/rdap+json, application/json",
            "User-Agent": "ScamOrSafe-URLSecurity/1.0"
        }

        try:
            resp = requests.get(
                f"{RDAP_BOOTSTRAP_URL}/{clean_domain}",
                headers=headers,
                timeout=self.timeout
            )

            if resp.status_code == 200:
                rdap_data = resp.json()

                # Extract event timestamps
                events = rdap_data.get("events", [])
                reg_date_str = None
                exp_date_str = None
                last_changed_str = None

                for ev in events:
                    action = ev.get("eventAction", "").lower()
                    date_val = ev.get("eventDate")
                    if action in ("registration", "created"):
                        reg_date_str = date_val
                    elif action in ("expiration", "expired"):
                        exp_date_str = date_val
                    elif action in ("last changed", "updated"):
                        last_changed_str = date_val

                # Calculate domain age
                age_days = None
                age_readable = "Unavailable"
                is_newly_registered = False

                if reg_date_str:
                    try:
                        # Normalize ISO format
                        clean_date = reg_date_str.replace("Z", "+00:00")
                        dt_registered = datetime.fromisoformat(clean_date)
                        now_utc = datetime.now(timezone.utc)
                        delta = now_utc - dt_registered
                        age_days = max(0, delta.days)

                        if age_days < 30:
                            is_newly_registered = True
                            age_readable = f"{age_days} day(s) (NEWLY REGISTERED)"
                        elif age_days < 365:
                            months = age_days // 30
                            age_readable = f"{months} month(s) ({age_days} days)"
                        else:
                            years = round(age_days / 365.25, 1)
                            age_readable = f"{years} year(s) ({age_days} days)"
                    except Exception:
                        pass

                # Extract Registrar name
                registrar_name = None
                entities = rdap_data.get("entities", [])
                for ent in entities:
                    roles = ent.get("roles", [])
                    if "registrar" in roles:
                        vcard = ent.get("vcardArray", [])
                        if len(vcard) > 1 and isinstance(vcard[1], list):
                            for prop in vcard[1]:
                                if len(prop) > 3 and prop[0] == "fn":
                                    registrar_name = prop[3]
                                    break
                        if not registrar_name and "handle" in ent:
                            registrar_name = ent.get("handle")

                # Extract Nameservers
                nameservers = []
                ns_list = rdap_data.get("nameservers", [])
                for ns in ns_list:
                    ns_name = ns.get("ldhName") or ns.get("handle")
                    if ns_name:
                        nameservers.append(ns_name.lower())

                return {
                    "status": "success",
                    "domain": clean_domain,
                    "registration_date": reg_date_str,
                    "expiration_date": exp_date_str,
                    "last_updated": last_changed_str,
                    "domain_age_days": age_days,
                    "domain_age_readable": age_readable,
                    "registrar": registrar_name or "Not publicly disclosed",
                    "nameservers": nameservers[:5],
                    "is_newly_registered": is_newly_registered,
                    "summary": f"Registered on {reg_date_str[:10] if reg_date_str else 'N/A'} via {registrar_name or 'unspecified registrar'}. Domain age: {age_readable}."
                }

            elif resp.status_code == 404:
                return {
                    "status": "not_found",
                    "domain": clean_domain,
                    "registration_date": None,
                    "expiration_date": None,
                    "domain_age_days": None,
                    "domain_age_readable": "Unavailable (Domain record not found in RDAP)",
                    "registrar": None,
                    "nameservers": [],
                    "is_newly_registered": False,
                    "summary": "Domain registration details could not be retrieved from public RDAP registry."
                }
            else:
                return {
                    "status": "unavailable",
                    "domain": clean_domain,
                    "registration_date": None,
                    "expiration_date": None,
                    "domain_age_days": None,
                    "domain_age_readable": "Unavailable",
                    "registrar": None,
                    "nameservers": [],
                    "is_newly_registered": False,
                    "summary": f"RDAP query returned status {resp.status_code}."
                }

        except requests.exceptions.Timeout:
            return {
                "status": "timeout",
                "domain": clean_domain,
                "registration_date": None,
                "expiration_date": None,
                "domain_age_days": None,
                "domain_age_readable": "Unavailable (RDAP query timed out)",
                "registrar": None,
                "nameservers": [],
                "is_newly_registered": False,
                "summary": "RDAP registry lookup timed out."
            }
        except Exception as e:
            return {
                "status": "error",
                "domain": clean_domain,
                "registration_date": None,
                "expiration_date": None,
                "domain_age_days": None,
                "domain_age_readable": "Unavailable",
                "registrar": None,
                "nameservers": [],
                "is_newly_registered": False,
                "summary": f"RDAP lookup failed: {str(e)}"
            }

