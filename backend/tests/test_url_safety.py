"""
Automated Unit and Integration Tests for Day 5 URL Safety & Threat Intelligence Engine.
Tests all 19 required security test scenarios:
1. Normal website
2. Suspicious phishing URL
3. Shortened URL
4. Lookalike domain / typosquatting
5. Fake banking URL
6. IP-based URL
7. Punycode URL
8. Suspicious redirect
9. Malicious URL detected by threat intelligence
10. URL with no threat match
11. Safe Browsing unavailable
12. VirusTotal unavailable
13. Invalid URL
14. Private IP URL
15. Localhost URL
16. SSRF attempts (cloud metadata & loopback)
17. DNS resolution failures
18. Supabase authentication handling
19. Database persistence failure handling
"""
import unittest
import sys
import os
from unittest.mock import patch, MagicMock

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from app.services.url_security.url_validator import (
    validate_url, is_safe_ip, resolve_hostname_safely
)
from app.services.url_security.domain_analyzer import DomainAnalyzer
from app.services.url_security.safe_browsing_service import SafeBrowsingService
from app.services.url_security.virustotal_service import VirusTotalService
from app.services.url_security.rdap_service import RDAPService
from app.services.url_security.redirect_analyzer import RedirectAnalyzer
from app.services.url_security.url_risk_scoring import calculate_url_risk_score
from app.services.url_security.url_report_formatter import URLReportCoordinator


class TestURLSafetyEngine(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    # 1. Normal website
    def test_01_normal_website(self):
        analyzer = DomainAnalyzer()
        val = validate_url("https://www.google.com/search?q=cybersecurity")
        self.assertTrue(val["valid"])
        res = analyzer.analyze(val)
        self.assertTrue(res["is_reputable"])
        self.assertIsNone(res["brand_impersonation"])

    # 2. Suspicious phishing URL
    def test_02_suspicious_phishing_url(self):
        val = validate_url("http://secure-login-update.xyz/verify?token=12345")
        analyzer = DomainAnalyzer()
        res = analyzer.analyze(val)
        types = [f["type"] for f in res["findings"]]
        self.assertIn("suspicious_tld", types)
        self.assertIn("credential_harvesting", types)

    # 3. Shortened URL
    def test_03_shortened_url(self):
        analyzer = DomainAnalyzer()
        val = validate_url("https://bit.ly/promo-2026")
        res = analyzer.analyze(val)
        self.assertTrue(res["is_shortener"])

    # 4. Lookalike domain / typosquatting
    def test_04_lookalike_domain(self):
        analyzer = DomainAnalyzer()
        val = validate_url("https://paypa1.com/signin")
        res = analyzer.analyze(val)
        self.assertIsNotNone(res["brand_impersonation"])
        self.assertEqual(res["brand_impersonation"]["brand"], "paypal")

    # 5. Fake banking URL
    def test_05_fake_banking_url(self):
        analyzer = DomainAnalyzer()
        val = validate_url("http://sbi-online-kyc-verification.com/login.php")
        res = analyzer.analyze(val)
        self.assertIsNotNone(res["brand_impersonation"])
        self.assertEqual(res["brand_impersonation"]["brand"], "sbi")

    # 6. IP-based URL
    def test_06_ip_based_url(self):
        val = validate_url("http://45.33.32.156:8080/portal")
        self.assertTrue(val["valid"])
        self.assertTrue(val["is_ip"])
        analyzer = DomainAnalyzer()
        res = analyzer.analyze(val)
        types = [f["type"] for f in res["findings"]]
        self.assertIn("ip_address_host", types)
        self.assertIn("non_standard_port", types)

    # 7. Punycode URL (Homograph attack)
    def test_07_punycode_url(self):
        val = validate_url("http://xn--pple-43d.com/store")
        self.assertTrue(val["valid"])
        self.assertTrue(val["is_punycode"])
        analyzer = DomainAnalyzer()
        res = analyzer.analyze(val)
        types = [f["type"] for f in res["findings"]]
        self.assertIn("punycode_homograph", types)

    # 8. Suspicious redirect
    def test_08_suspicious_redirect(self):
        redirect_analyzer = RedirectAnalyzer()
        with patch("requests.head") as mock_head:
            mock_resp1 = MagicMock()
            mock_resp1.status_code = 301
            mock_resp1.headers = {"Location": "http://evil-tracker.com/landing"}

            mock_resp2 = MagicMock()
            mock_resp2.status_code = 200

            mock_head.side_effect = [mock_resp1, mock_resp2]

            with patch("app.services.url_security.redirect_analyzer.resolve_hostname_safely") as mock_dns:
                mock_dns.return_value = (True, "93.184.216.34", None)
                res = redirect_analyzer.trace_redirects("http://short.link/xyz")
                self.assertTrue(res["has_redirects"])
                self.assertEqual(res["redirect_count"], 1)
                self.assertEqual(res["final_url"], "http://evil-tracker.com/landing")

    # 9. Malicious URL detected by threat intelligence
    def test_09_threat_intelligence_match(self):
        svc = SafeBrowsingService()
        svc.api_key = "dummy-test-key"
        with patch("requests.post") as mock_post:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {
                "matches": [
                    {
                        "threatType": "MALWARE",
                        "platformType": "ANY_PLATFORM",
                        "threatEntryType": "URL"
                    }
                ]
            }
            mock_post.return_value = mock_resp
            res = svc.check_url("http://malware-site.test")
            self.assertTrue(res["match_found"])
            self.assertEqual(res["status"], "threat_detected")
            self.assertEqual(res["primary_threat"], "MALWARE")

    # 10. URL with no threat match
    def test_10_threat_intelligence_clean(self):
        svc = SafeBrowsingService()
        svc.api_key = "dummy-test-key"
        with patch("requests.post") as mock_post:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {}  # No matches
            mock_post.return_value = mock_resp
            res = svc.check_url("http://clean-site.test")
            self.assertFalse(res["match_found"])
            self.assertEqual(res["status"], "no_match_found")
            self.assertIn("Absence of a match does not guarantee safety", res["disclaimer"])

    # 11. Safe Browsing unavailable
    def test_11_safe_browsing_unavailable(self):
        svc = SafeBrowsingService()
        svc.api_key = ""
        res = svc.check_url("http://test.com")
        self.assertFalse(res["configured"])
        self.assertEqual(res["status"], "unavailable")

    # 12. VirusTotal unavailable
    def test_12_virustotal_unavailable(self):
        svc = VirusTotalService()
        svc.api_key = ""
        res = svc.get_url_report("http://test.com")
        self.assertFalse(res["configured"])
        self.assertEqual(res["status"], "unavailable")

    # 13. Invalid URL
    def test_13_invalid_url(self):
        val = validate_url("not_a_valid_url")
        self.assertFalse(val["valid"])
        val_ftp = validate_url("ftp://files.example.com")
        self.assertFalse(val_ftp["valid"])
        self.assertIn("Unsupported protocol", val_ftp["error"])

    # 14. Private IP URL (RFC1918)
    def test_14_private_ip_url(self):
        val_10 = validate_url("http://10.0.0.1/admin")
        self.assertTrue(val_10["is_private_or_local"])
        self.assertIn("Private", val_10["ip_security_reason"])

        val_192 = validate_url("http://192.168.1.1/login")
        self.assertTrue(val_192["is_private_or_local"])

    # 15. Localhost URL
    def test_15_localhost_url(self):
        val = validate_url("http://localhost:8080/secret")
        self.assertTrue(val["is_private_or_local"])

        val_loopback = validate_url("http://127.0.0.1:3000")
        self.assertTrue(val_loopback["is_private_or_local"])

    # 16. SSRF attempts (Cloud metadata)
    def test_16_ssrf_metadata_defense(self):
        val = validate_url("http://169.254.169.254/latest/meta-data/")
        self.assertTrue(val["is_private_or_local"])
        self.assertIn("metadata", val["ip_security_reason"].lower())

        tracer = RedirectAnalyzer()
        res = tracer.trace_redirects("http://169.254.169.254/latest/meta-data/")
        self.assertTrue(res["ssrf_blocked"])

    # 17. DNS resolution failure
    def test_17_dns_resolution_failure(self):
        is_safe, ip, err = resolve_hostname_safely("this-domain-definitely-does-not-exist-xyz12345.org")
        self.assertFalse(is_safe)
        self.assertTrue("DNS" in err or "resolution" in err)

    # 18. Supabase authentication handling
    def test_18_supabase_auth_handling(self):
        res = self.client.get("/api/url/history")
        self.assertEqual(res.status_code, 401)
        self.assertFalse(res.json["success"])

    # 19. Database persistence failure handling
    def test_19_database_persistence_graceful_failure(self):
        from app.services.supabase_service import SupabaseService
        svc = SupabaseService()
        svc.url = "https://invalid-supabase-test.supabase.co"
        svc.service_key = "invalid-key"
        res = svc.save_scan_record("fake-user-id", {"scan_type": "url", "summary": "test"})
        self.assertFalse(res["saved"])
        self.assertIn("reason", res)

    # End-to-End API test
    def test_20_api_url_analyze_endpoint(self):
        res = self.client.post(
            "/api/url/analyze",
            json={"url": "https://google.com", "check_redirects": False}
        )
        self.assertEqual(res.status_code, 200)
        json_data = res.json
        self.assertTrue(json_data["success"])
        data = json_data["data"]
        self.assertIn(data["risk_level"], ("low", "medium", "high"))
        self.assertIn("domain_intelligence", data)
        self.assertIn("threat_intelligence", data)
        self.assertIn("recommendations", data)


if __name__ == "__main__":
    unittest.main()
