/**
 * URL Safety Service — Day 1 Frontend Stub
 *
 * NOTE: This module does NOT visit, fetch, or check any submitted URL.
 * Results are demo outputs based on simple pattern matching.
 * Real URL checks via Google Safe Browsing and VirusTotal will be integrated later.
 */

const SUSPICIOUS_PATTERNS = [
  { pattern: /paypa1|paypai/i, reason: 'Domain mimics PayPal using character substitution (typosquatting).' },
  { pattern: /\.tk$|\.ml$|\.cf$|\.ga$|\.gq$/i, reason: 'Free TLD commonly used in phishing campaigns.' },
  { pattern: /login.*\.(xyz|top|click|online|site|fun)/i, reason: 'Login page on suspicious TLD.' },
  { pattern: /free.*prize|claim.*reward|winner/i, reason: 'URL contains prize or reward claim language.' },
  { pattern: /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/i, reason: 'Direct IP address instead of domain name.' },
  { pattern: /bit\.ly|tinyurl|t\.co|ow\.ly|is\.gd/i, reason: 'Shortened URL hides the actual destination.' },
  { pattern: /@/i, reason: 'URL contains @ symbol which can be used to disguise the real destination.' },
  { pattern: /https?:\/\/[^/]+-[^/]+-[^/]+\./i, reason: 'Excessive hyphens in domain name is a phishing indicator.' },
  { pattern: /account.*suspend|verify.*account|update.*info/i, reason: 'URL language suggests credential harvesting.' },
]

const SAFE_DOMAINS = [
  'google.com', 'youtube.com', 'wikipedia.org', 'github.com',
  'microsoft.com', 'apple.com', 'amazon.com', 'bbc.com', 'bbc.co.uk',
  'reuters.com', 'nytimes.com', 'gov.in', 'gov.uk', 'edu',
]

export function isValidUrl(str) {
  try {
    const url = new URL(str)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function isSafeDomain(url) {
  try {
    const { hostname } = new URL(url)
    return SAFE_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))
  } catch {
    return false
  }
}

/**
 * Simulates URL safety analysis.
 * Does NOT fetch or visit the URL.
 * Returns a demo result only.
 * @param {string} url
 * @returns {Promise<object>}
 */
export async function analyzeUrl(url) {
  await new Promise(r => setTimeout(r, 1600))

  if (!isValidUrl(url)) {
    throw new Error('Invalid URL format. Please enter a full URL starting with http:// or https://')
  }

  if (isSafeDomain(url)) {
    return {
      type: 'URL',
      url,
      score: Math.floor(Math.random() * 15) + 3,
      level: 'LOW',
      summary: 'This domain is recognised as a well-known, reputable website. No suspicious patterns detected.',
      warnings: [],
      recommendations: [
        'Always ensure the page you visit matches exactly what you expected.',
        'Check for HTTPS padlock in your browser address bar.',
      ],
      isDemoResult: true,
    }
  }

  const triggered = SUSPICIOUS_PATTERNS.filter(({ pattern }) => pattern.test(url))
  const score = triggered.length > 0
    ? Math.min(95, triggered.length * 22 + Math.floor(Math.random() * 15) + 20)
    : Math.floor(Math.random() * 30) + 10

  const level = score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW'

  const warnings = triggered.map(({ pattern: _, reason }) => ({ reason }))

  const recommendations =
    level === 'HIGH'
      ? [
          'Do not visit this URL.',
          'Do not enter any personal information if you have already visited.',
          "Report the URL to your browser's phishing report feature.",
          'Run a full antivirus scan if you clicked the link.',
        ]
      : level === 'MEDIUM'
      ? [
          'Exercise caution before visiting this URL.',
          'Verify the website through official channels.',
          'Avoid entering credentials or personal data.',
        ]
      : [
          'No major warning signs detected, but always verify unexpected links.',
          'Ensure you intended to visit this address.',
        ]

  return {
    type: 'URL',
    url,
    score,
    level,
    summary:
      level === 'HIGH'
        ? 'Multiple risk indicators detected. This URL is likely unsafe.'
        : level === 'MEDIUM'
        ? 'Some suspicious patterns detected. Proceed with caution.'
        : 'No major risk indicators detected in URL structure.',
    warnings,
    recommendations,
    isDemoResult: true,
  }
}
