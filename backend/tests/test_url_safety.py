"""
Automated Unit and Integration Tests for URL Safety & Threat Intelligence Engine.
Tests all threat intelligence integrations and local structural security analyzers:
1. Normal website with clean indicators returning 'No obvious suspicious indicators found'
2. HTTPS vs HTTP protocol checks
3. Suspicious keywords (login, verify, update, reward, claim, kyc, otp)
4. Shortened URL detection (bit.ly)
5. Lookalike domain / typosquatting (paypa1.com -> paypal)
6. Fake banking URL impersonation (sbi-online-kyc-verification.com)
7. IP-based URL structure (45.33.32.156:8080)
8. Punycode / Homograph attacks (xn--pple-43d.com)
9. Double file extension deception (invoice.pdf.exe)
10. Open redirect parameter exploitation
11. Safe redirect tracing
12. Malicious URL detected by Google Safe Browsing
13. URL with no Safe Browsing match (clean disclaimer verification)
14. Safe Browsing unconfigured handling
15. VirusTotal unconfigured handling
16. Private IP URL blocking (SSRF RFC1918)
17. Localhost URL blocking
18. SSRF cloud metadata blocking (169.254.169.254)
19. DNS resolution failure handling
20. Invalid URL syntax rejection
21. Supabase authentication handling
22. End-to-end /api/url/analyze API integration
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

    # 1. Normal website with clean indicators
    def test_01_normal_website_clean(self):
        coordinator = URLReportCoordinator()
        res = coordinator.analyze_url("https://www.google.com/search?q=cybersecurity", check_redirects=False)
        self.assertTrue(res["success"])
        self.assertIn("No obvious suspicious indicators found", res["summary"])
        self.assertEqual(res["risk_level"], "low")
        self.assertFalse(res["has_warnings"])

    # 2. Protocol check: Unencrypted HTTP on sensitive page
    def test_02_http_protocol_check(self):
        analyzer = DomainAnalyzer()
        val = validate_url("http://portal-service.com/login?verify=true")
        res = analyzer.analyze(val)
        types = [f["type"] for f in res["findings"]]
        self.assertIn("unencrypted_sensitive_http", types)

    # 3. Suspicious keywords (login, verify, update, reward, claim)
    def test_03_suspicious_keywords(self):
        analyzer = DomainAnalyzer()
        val = validate_url("https://festive-bonus-claim.net/claim?reward=1000&update=profile")
        res = analyzer.analyze(val)
        types = [f["type"] for f in res["findings"]]
        self.assertIn("suspicious_keywords", types)
        matched = res["matched_keywords"]
        self.assertTrue(any(k in matched for k in ["claim", "reward", "update", "bonus"]))

    # 4. Shortened URL detection
    def test_04_shortened_url(self):
        analyzer = DomainAnalyzer()
        val = validate_url("https://bit.ly/promo-2026")
        res = analyzer.analyze(val)
        self.assertTrue(res["is_shortener"])
        types = [f["type"] for f in res["findings"]]
        self.assertIn("url_shortener", types)

    # 5. Lookalike domain / typosquatting
    def test_05_lookalike_domain(self):
        analyzer = DomainAnalyzer()
        val = validate_url("https://paypa1.com/signin")
        res = analyzer.analyze(val)
        self.assertIsNotNone(res["brand_impersonation"])
        self.assertEqual(res["brand_impersonation"]["brand"], "paypal")

    # 6. Fake banking URL impersonation
    def test_06_fake_banking_url(self):
        analyzer = DomainAnalyzer()
        val = validate_url("http://sbi-online-kyc-verification.com/login.php")
        res = analyzer.analyze(val)
        self.assertIsNotNone(res["brand_impersonation"])
        self.assertEqual(res["brand_impersonation"]["brand"], "sbi")

    # 7. IP-based URL
    def test_07_ip_based_url(self):
        val = validate_url("http://45.33.32.156:8080/portal")
        self.assertTrue(val["valid"])
        self.assertTrue(val["is_ip"])
        analyzer = DomainAnalyzer()
        res = analyzer.analyze(val)
        types = [f["type"] for f in res["findings"]]
        self.assertIn("ip_address_host", types)
        self.assertIn("non_standard_port", types)

    # 8. Punycode / Homograph domain
    def test_08_punycode_url(self):
        val = validate_url("http://xn--pple-43d.com/store")
        self.assertTrue(val["valid"])
        self.assertTrue(val["is_punycode"])
        analyzer = DomainAnalyzer()
        res = analyzer.analyze(val)
        types = [f["type"] for f in res["findings"]]
        self.assertIn("punycode_homograph", types)

    # 9. Misleading URL paths & double file extensions
    def test_09_double_extension_deception(self):
        analyzer = DomainAnalyzer()
        val = validate_url("https://download-center.net/files/statement.pdf.exe")
        res = analyzer.analyze(val)
        types = [f["type"] for f in res["findings"]]
        self.assertIn("double_extension_deception", types)

    # 10. Open redirect parameter
    def test_10_open_redirect_parameter(self):
        analyzer = DomainAnalyzer()
        val = validate_url("https://redirector.net/out?dest=https://external-site.com")
        res = analyzer.analyze(val)
        types = [f["type"] for f in res["findings"]]
        self.assertIn("open_redirect_param", types)

    # 11. Suspicious redirect chain tracing
    def test_11_suspicious_redirect(self):
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

    # 12. Threat intelligence match (Google Safe Browsing)
    def test_12_threat_intelligence_match(self):
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

    # 13. URL with no Safe Browsing match (clean disclaimer verification)
    def test_13_threat_intelligence_clean(self):
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

    # 14. Safe Browsing unconfigured handling
    def test_14_safe_browsing_unconfigured(self):
        svc = SafeBrowsingService()
        svc.api_key = ""
        res = svc.check_url("http://test.com")
        self.assertFalse(res["configured"])
        self.assertEqual(res["status"], "unavailable")

    # 15. VirusTotal unconfigured handling
    def test_15_virustotal_unconfigured(self):
        svc = VirusTotalService()
        svc.api_key = ""
        res = svc.get_url_report("http://test.com")
        self.assertFalse(res["configured"])
        self.assertEqual(res["status"], "unavailable")

    # 16. Private IP URL (SSRF defense RFC1918)
    def test_16_private_ip_url(self):
        val_10 = validate_url("http://10.0.0.1/admin")
        self.assertTrue(val_10["is_private_or_local"])
        self.assertIn("Private", val_10["ip_security_reason"])

        val_192 = validate_url("http://192.168.1.1/login")
        self.assertTrue(val_192["is_private_or_local"])

    # 17. Localhost URL blocking
    def test_17_localhost_url(self):
        val = validate_url("http://localhost:8080/secret")
        self.assertTrue(val["is_private_or_local"])

        val_loopback = validate_url("http://127.0.0.1:3000")
        self.assertTrue(val_loopback["is_private_or_local"])

    # 18. SSRF attempts (Cloud metadata)
    def test_18_ssrf_metadata_defense(self):
        val = validate_url("http://169.254.169.254/latest/meta-data/")
        self.assertTrue(val["is_private_or_local"])
        self.assertIn("metadata", val["ip_security_reason"].lower())

        tracer = RedirectAnalyzer()
        res = tracer.trace_redirects("http://169.254.169.254/latest/meta-data/")
        self.assertTrue(res["ssrf_blocked"])

    # 19. DNS resolution failure
    def test_19_dns_resolution_failure(self):
        is_safe, ip, err = resolve_hostname_safely("this-domain-definitely-does-not-exist-xyz12345.org")
        self.assertFalse(is_safe)
        self.assertTrue("DNS" in err or "resolution" in err)

    # 20. Invalid URL syntax
    def test_20_invalid_url(self):
        val = validate_url("not_a_valid_url")
        self.assertFalse(val["valid"])
        val_ftp = validate_url("ftp://files.example.com")
        self.assertFalse(val_ftp["valid"])

    # 21. Supabase authentication handling
    def test_21_supabase_auth_handling(self):
        res = self.client.get("/api/url/history")
        self.assertEqual(res.status_code, 401)
        self.assertFalse(res.json["success"])

    # 22. End-to-End /api/url/analyze API integration
    def test_22_api_url_analyze_endpoint(self):
        res = self.client.post(
            "/api/url/analyze",
            json={"url": "https://paypa1.com/secure-login", "check_redirects": False}
        )
        self.assertEqual(res.status_code, 200)
        json_data = res.json
        self.assertTrue(json_data["success"])
        data = json_data["data"]
        self.assertEqual(data["risk_level"], "high")
        self.assertGreaterEqual(data["risk_score"], 60)
        self.assertIn("domain_intelligence", data)
        self.assertIn("threat_intelligence", data)
        self.assertIn("recommendations", data)


if __name__ == "__main__":
    unittest.main()
