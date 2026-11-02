/**
 * Scam Analysis Service — Day 3 Advanced Multi-Model AI Detection
 *
 * Connects to the Flask AI Backend (Groq, Google Gemini, Mistral AI, and Rule Engine).
 * Falls back safely to deterministic local heuristics if backend is offline.
 */

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

/**
 * Checks connectivity and AI provider availability from the Flask backend.
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, { method: 'GET' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return json.data
  } catch (err) {
    return {
      status: 'offline',
      service: 'Backend unreachable',
      any_ai_configured: false,
      providers: {}
    }
  }
}

/**
 * Retrieves the list of supported AI providers and their active models.
 */
export async function getAIProviders() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ai/providers`, { method: 'GET' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return json.data
  } catch (err) {
    return {
      groq: { name: 'Groq', configured: false, model: 'llama-3.3-70b-versatile' },
      gemini: { name: 'Google Gemini', configured: false, model: 'gemini-1.5-flash' },
      mistral: { name: 'Mistral AI', configured: false, model: 'mistral-small-latest' }
    }
  }
}

/**
 * Analyzes a suspicious message via the Flask AI backend.
 *
 * @param {string} message - Untrusted user input message
 * @param {object} [options]
 * @param {string} [options.provider='auto'] - 'auto' | 'groq' | 'gemini' | 'mistral'
 * @param {boolean} [options.includeContextual=false]
 * @param {string} [options.authToken] - Supabase JWT for authenticated DB sync
 * @param {string} [options.userId] - Supabase User UUID
 * @returns {Promise<object>} Standardized scam analysis result
 */
export async function analyzeScamMessage(message, options = {}) {
  const { provider = 'auto', includeContextual = false, authToken, userId } = options

  try {
    const headers = { 'Content-Type': 'application/json' }
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`
    if (userId) headers['X-User-Id'] = userId

    const res = await fetch(`${API_BASE_URL}/api/analyze/scam`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        provider,
        include_contextual: includeContextual,
      }),
    })

    if (!res.ok) {
      throw new Error(`Backend error: ${res.status} ${res.statusText}`)
    }

    const payload = await res.json()
    if (!payload.success || !payload.data) {
      throw new Error(payload.error?.message || 'Invalid backend response')
    }

    const d = payload.data
    const isRealAI = d.provider !== 'deterministic_rule_engine'

    return {
      type: 'SCAM',
      score: d.risk_score,
      level: (d.risk_level || 'low').toUpperCase(),
      summary: d.summary,
      category: d.scam_category,
      provider: d.provider,
      model: d.model,
      fallbackUsed: d.fallback_used,
      fallbackHistory: d.fallback_history || [],
      executionTimeMs: d.execution_time_ms,
      isRealAI,
      isDemoResult: !isRealAI,
      warnings: (d.risk_indicators || []).map(ind => ({
        phrase: ind.phrase,
        title: ind.title,
        reason: ind.explanation,
        severity: ind.severity,
      })),
      recommendations: d.recommendations || [],
      limitations: d.limitations || [],
      contextualNote: d.contextual_note,
    }
  } catch (err) {
    console.warn('Backend unavailable, utilizing local fallback heuristics:', err)
    return localFallbackScamAnalysis(message)
  }
}

/**
 * Compares an untrusted message across Groq, Gemini, and Mistral in parallel.
 *
 * @param {string} message
 * @param {Array<string>} [providers=['groq', 'gemini', 'mistral']]
 * @returns {Promise<object>} Multi-model comparison and synthesis report
 */
export async function compareScamModels(message, providers = ['groq', 'gemini', 'mistral']) {
  const res = await fetch(`${API_BASE_URL}/api/analyze/scam/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, providers }),
  })

  if (!res.ok) {
    throw new Error(`Comparison API error: ${res.status} ${res.statusText}`)
  }

  const payload = await res.json()
  if (!payload.success || !payload.data) {
    throw new Error(payload.error?.message || 'Failed to compare models')
  }

  return payload.data
}

/**
 * Local fallback heuristics when Flask backend is not running.
 */
function localFallbackScamAnalysis(message) {
  const lower = message.toLowerCase()
  const patterns = [
    { title: 'Credential Request', phrase: 'otp', reason: 'Legitimate organizations never ask for OTPs.', severity: 'critical', weight: 35 },
    { title: 'Urgent Threat', phrase: 'account will be blocked', reason: 'Manufactured urgency to induce compliance.', severity: 'high', weight: 25 },
    { title: 'Financial Demand', phrase: 'processing fee', reason: 'Advance fee requests are fraudulent lures.', severity: 'high', weight: 25 },
    { title: 'Unrealistic Prize', phrase: 'lottery', reason: 'Unsolicited lottery winnings are deceptive advance-fee scams.', severity: 'high', weight: 25 },
    { title: 'Suspicious Link', phrase: 'http', reason: 'Links in unverified messages often lead to phishing.', severity: 'medium', weight: 15 },
  ]

  const matched = patterns.filter(p => lower.includes(p.phrase))
  const score = matched.length === 0 ? 10 : Math.min(95, matched.reduce((a, b) => a + b.weight, 0))
  const level = score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW'

  return {
    type: 'SCAM',
    score,
    level,
    summary: matched.length > 0
      ? `Local heuristic detection identified ${matched.length} threat indicators. (Backend offline)`
      : 'No high-confidence threat indicators detected. (Backend offline)',
    category: matched.length > 0 ? 'Phishing / Impersonation' : 'Uncertain',
    provider: 'local_browser_heuristic',
    model: 'offline-fallback',
    fallbackUsed: true,
    isRealAI: false,
    isDemoResult: true,
    executionTimeMs: 15,
    warnings: matched.map(m => ({
      title: m.title,
      phrase: m.phrase,
      reason: m.reason,
      severity: m.severity,
    })),
    recommendations: [
      'Do not click unexpected links or disclose credentials.',
      'Start the Python Flask backend on port 5000 for multi-model AI analysis.',
    ],
    limitations: ['Generated locally because Flask backend was unreachable.'],
  }
}
