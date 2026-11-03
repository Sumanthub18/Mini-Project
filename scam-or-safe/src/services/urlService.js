/**
 * URL Safety and Threat Intelligence Service
 *
 * Connects to the Flask Backend (/api/url/analyze) for:
 * - Google Safe Browsing API v4 threat lookups
 * - VirusTotal multi-engine reputation checks
 * - Local protocol & transport security checks (HTTPS vs unencrypted HTTP)
 * - Suspicious URL pattern & social engineering keyword analysis (login, verify, update, reward, claim)
 * - Lookalike domain and typosquatting detection (Levenshtein distance, homoglyph modeling)
 * - Punycode (IDN homograph) and direct IP host detection
 * - URL shortener identification
 * - Suspicious subdomains and misleading URL path/parameter detection
 * - RDAP domain intelligence & age calculation
 * - Safe HTTP redirect tracing with SSRF & private IP defense
 * - AI-powered transparent explanation via Gemini & Groq
 *
 * Secret API keys reside strictly on the Flask backend and are never exposed in frontend code.
 */

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

export const EXAMPLE_URLS = [
  'https://google.com',
  'https://paypa1.com/secure-login',
  'http://sbi-online-kyc-verification.com/login',
  'https://bit.ly/claim-festive-gift2026',
  'http://45.33.32.156:8080/banking/auth',
  'http://verify-account.xyz/login?token=89234',
  'http://192.168.1.1/update-router',
]

export function isValidUrl(str) {
  if (!str || typeof str !== 'string') return false
  const trimmed = str.trim()
  try {
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
    const parsed = new URL(candidate)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    const host = parsed.hostname
    if (!host || host.includes(' ')) return false
    return host.includes('.') || host === 'localhost' || /^(\d{1,3}\.){3}\d{1,3}$/.test(host)
  } catch {
    return false
  }
}

/**
 * Checks connectivity and readiness of the backend URL Safety engine.
 */
export async function getUrlEngineHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/url/health`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return json.data
  } catch (err) {
    return {
      status: 'offline',
      service: 'Backend unreachable',
      providers: {
        google_safe_browsing: { configured: false },
        virustotal: { configured: false },
        local_structural_analysis: { active: false },
        rdap_domain_intel: { active: false },
        ssrf_safe_redirects: { active: false },
        ai_explainer: { active: false },
      },
    }
  }
}

/**
 * Analyzes a URL via the backend engine.
 *
 * @param {string} url - Target URL to analyze
 * @param {object} [options]
 * @param {boolean} [options.checkRedirects=true]
 * @param {string} [options.authToken]
 * @param {string} [options.userId]
 * @returns {Promise<object>}
 */
export async function analyzeUrl(url, options = {}) {
  const { checkRedirects = true, authToken, userId } = options

  if (!isValidUrl(url)) {
    throw new Error('Please enter a valid URL (e.g., https://example.com/path)')
  }

  const cleanUrl = /^https?:\/\//i.test(url.trim()) ? url.trim() : `http://${url.trim()}`

  try {
    const headers = { 'Content-Type': 'application/json' }
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`
    if (userId) headers['X-User-Id'] = userId

    const res = await fetch(`${API_BASE_URL}/api/url/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        url: cleanUrl,
        check_redirects: checkRedirects,
      }),
    })

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson?.error?.message || `Backend analysis failed (${res.status})`)
    }

    const json = await res.json()
    const data = json.data

    return {
      type: 'URL',
      url: cleanUrl,
      normalized_url: data.normalized_url || cleanUrl,
      score: data.risk_score,
      level: (data.risk_level || 'LOW').toUpperCase(),
      summary: data.summary,
      has_warnings: data.has_warnings,
      warnings: (data.warnings || []).map(w => (typeof w === 'string' ? { reason: w } : w)),
      recommendations: data.recommendations || [],
      ai_explanation: data.ai_explanation,
      domain_intelligence: data.domain_intelligence,
      threat_intelligence: data.threat_intelligence,
      security_disclaimer: data.security_disclaimer,
      redirect_analysis: data.redirect_analysis,
      contributing_factors: data.contributing_factors,
      execution_time_ms: data.execution_time_ms,
      isFallback: false,
    }
  } catch (backendError) {
    console.warn('[urlService] Backend call failed, using client fallback:', backendError.message)
    return runClientFallbackAnalysis(cleanUrl)
  }
}

/**
 * Fast reputation & structural check.
 */
export async function checkUrlReputation(url) {
  const cleanUrl = /^https?:\/\//i.test(url.trim()) ? url.trim() : `http://${url.trim()}`
  const res = await fetch(`${API_BASE_URL}/api/url/check-reputation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: cleanUrl }),
  })
  if (!res.ok) throw new Error('Reputation lookup failed')
  const json = await res.json()
  return json.data
}

/**
 * Submits user report feedback.
 */
export async function reportUrlFeedback({ url, reportType, comment }) {
  const res = await fetch(`${API_BASE_URL}/api/url/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, report_type: reportType, comment }),
  })
  if (!res.ok) throw new Error('Report submission failed')
  const json = await res.json()
  return json.data
}

/**
 * Local client-side fallback analysis when backend is offline.
 */
function runClientFallbackAnalysis(url) {
  let hostname = ''
  let scheme = 'http'
  try {
    const parsed = new URL(url)
    hostname = parsed.hostname.toLowerCase()
    scheme = parsed.protocol.replace(':', '')
  } catch {
    hostname = url
  }

  const warnings = []
  let score = 10

  const REPUTABLE = ['google.com', 'apple.com', 'microsoft.com', 'wikipedia.org', 'github.com', 'amazon.com']
  const isReputable = REPUTABLE.some(r => hostname === r || hostname.endsWith('.' + r))

  if (isReputable && scheme === 'https') {
    return {
      type: 'URL',
      url,
      normalized_url: url,
      score: 5,
      level: 'LOW',
      summary: 'No obvious suspicious indicators found. Note: Absence of a match does not guarantee 100% safety.',
      has_warnings: false,
      warnings: [],
      recommendations: [
        'Always verify that the address matches your expected service.',
        'Check for the secure HTTPS lock in your browser address bar.',
        'Do not assume any URL is 100% safe.',
      ],
      domain_intelligence: {
        hostname,
        root_domain: hostname,
        domain_age: 'Established (Reputable Domain)',
        is_https: true,
        scheme: 'https',
        is_reputable: true,
      },
      threat_intelligence: {
        google_safe_browsing: { status: 'offline', configured: false, match_found: false },
        virustotal: { status: 'offline', configured: false, has_report: false },
      },
      security_disclaimer: 'Absence of a match does not guarantee 100% safety. Never enter credentials on unverified websites.',
      redirect_analysis: { has_redirects: false, redirect_count: 0, hops: [] },
      isFallback: true,
    }
  }

  // Protocol check
  if (scheme !== 'https') {
    warnings.push({ reason: 'Unencrypted HTTP protocol detected. Data transmitted to this website is sent in plain text.' })
    score += 15
  }

  // Keywords check
  if (/login|verify|update|reward|claim|bonus|free|kyc|otp/i.test(url)) {
    warnings.push({ reason: 'URL contains sensitive authentication or incentive keywords (login, verify, update, reward, claim).' })
    score += 25
  }

  // Typosquatting heuristics
  if (/paypa1|paypai|amaz0n|g00gle|netfl1x|app1e/i.test(hostname)) {
    warnings.push({ reason: 'Domain visually mimics a major brand using character substitution (typosquatting).' })
    score += 50
  }

  // Brand keyword in domain
  if (/sbi|hdfc|icici|paypal|chase/i.test(hostname) && !/onlinesbi|sbi\.co\.in|hdfcbank|icicibank|paypal\.com/i.test(hostname)) {
    warnings.push({ reason: 'Domain contains a financial brand keyword but is not an official banking domain.' })
    score += 45
  }

  // IP address host
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    warnings.push({ reason: 'Direct numerical IP address used as hostname instead of a domain name.' })
    score += 35
  }

  // Suspicious TLD
  if (/\.(xyz|top|tk|ml|cf|ga|gq|buzz|icu|fit|rest)$/i.test(hostname)) {
    warnings.push({ reason: 'High-abuse top-level domain frequently associated with short-lived phishing sites.' })
    score += 20
  }

  // Shortener
  if (/bit\.ly|tinyurl\.com|t\.co|is\.gd|goo\.gl|ow\.ly/i.test(hostname)) {
    warnings.push({ reason: 'URL shortener detected; masks the final destination.' })
    score += 15
  }

  // SSRF check
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.|169\.254\.)/.test(hostname) || hostname === 'localhost') {
    warnings.push({ reason: 'Target points to a private network, internal loopback, or cloud metadata address (SSRF blocked).' })
    score = 100
  }

  const finalScore = Math.min(100, score)
  const level = finalScore >= 60 ? 'HIGH' : finalScore >= 30 ? 'MEDIUM' : 'LOW'
  const hasWarnings = warnings.length > 0

  return {
    type: 'URL',
    url,
    normalized_url: url,
    score: finalScore,
    level,
    summary: hasWarnings
      ? `${level} Risk URL (${finalScore}/100). Suspicious indicators detected.`
      : 'No obvious suspicious indicators found. Note: Absence of a match does not guarantee 100% safety.',
    has_warnings: hasWarnings,
    warnings,
    recommendations:
      level === 'HIGH'
        ? [
            'DO NOT open this link or input credentials.',
            'Delete unsolicited messages containing this link.',
            'Report the link as suspicious.',
          ]
        : [
            'Verify unexpected links with the sender through a trusted channel.',
            'Ensure HTTPS encryption is active before entering credentials.',
            'Remember that absence of detected indicators does not guarantee 100% safety.',
          ],
    domain_intelligence: {
      hostname,
      root_domain: hostname,
      domain_age: 'Unavailable (Backend offline)',
      is_https: scheme === 'https',
      scheme,
      is_reputable: false,
    },
    threat_intelligence: {
      google_safe_browsing: { status: 'offline', configured: false, match_found: false },
      virustotal: { status: 'offline', configured: false, has_report: false },
    },
    security_disclaimer: 'Absence of a match does not guarantee 100% safety. Never enter credentials on unverified websites.',
    redirect_analysis: { has_redirects: false, redirect_count: 0, hops: [] },
    isFallback: true,
  }
}
