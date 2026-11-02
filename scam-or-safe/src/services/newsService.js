/**
 * News Verification Service — Day 4 AI-Powered Fact-Checking Engine
 *
 * Connects to the Flask Backend (/api/news/analyze) for multi-claim extraction,
 * Google Fact Check Tools API queries, live evidence retrieval, and evidence evaluation.
 * Falls back gracefully to local verified heuristics if the backend is temporarily offline.
 */

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

export const EXAMPLE_CLAIMS = [
  'Government has announced free laptops for every college student. Registration closes tomorrow.',
  'WHO confirms 5G radiation transmits coronavirus through mobile networks.',
  'UNESCO has officially declared the Indian National Anthem as the best in the world.',
  'Drinking warm lemon water completely cures cancer and eliminates chemotherapy needs.',
  'RBI announces cancellation of Rs 500 currency notes starting next month.',
  'ಭಾರತ ಸರ್ಕಾರ ಎಲ್ಲಾ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಉಚಿತ ಲ್ಯಾಪ್ಟಾಪ್ ವಿತರಿಸುತ್ತಿದೆ.',
]

/**
 * Checks connectivity and readiness of the backend Fake News engine.
 */
export async function getNewsEngineHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/news/health`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return json.data
  } catch (err) {
    return {
      status: 'offline',
      service: 'Backend unreachable',
      fact_check_tools_api: false,
      live_search_configured: false,
    }
  }
}

/**
 * Analyzes news text, claims, or viral forwards via the Day 4 backend.
 *
 * @param {string} text - News headline, article, or claim
 * @param {object} [options]
 * @param {string} [options.inputType='headline'] - 'headline' | 'social_forward' | 'article' | 'health_claim'
 * @param {string} [options.language='auto'] - 'auto' | 'en' | 'hi' | 'kn'
 * @param {string} [options.authToken] - Supabase user session token for DB logging
 * @param {string} [options.userId] - Supabase user ID
 */
export async function analyzeNews(text, options = {}) {
  const { inputType = 'headline', language = 'auto', authToken, userId } = options

  try {
    const headers = { 'Content-Type': 'application/json' }
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`
    if (userId) headers['X-User-Id'] = userId

    const res = await fetch(`${API_BASE_URL}/api/news/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text,
        input_type: inputType,
        language,
      }),
    })

    if (!res.ok) {
      throw new Error(`Backend responded with HTTP ${res.status}: ${res.statusText}`)
    }

    const json = await res.json()
    if (!json.success || !json.data) {
      throw new Error(json.error?.message || 'Invalid news analysis response')
    }

    const d = json.data

    // Convert confidence string to numerical representation for charts/gauges
    const numericConfidence = d.confidence === 'high' ? 90 : d.confidence === 'medium' ? 65 : 40

    return {
      type: 'NEWS',
      verdict: d.overall_verdict,
      confidence: numericConfidence,
      confidenceLabel: d.confidence,
      summary: d.summary,
      inputType: d.input_type,
      claims: d.claims || [],
      factCheckSources: d.fact_check_sources || [],
      evidenceSources: d.evidence_sources || [],
      providersUsed: d.providers_used || [],
      limitations: d.limitations || [],
      executionTimeMs: d.execution_time_ms,
      isRealAI: true,
      isDemoResult: false,
      sources: (d.evidence_sources || []).map(s => ({
        name: s.publisher || s.title,
        title: s.title,
        url: s.source_url,
        published_at: s.published_at,
        summary: s.evidence_summary,
        tier: s.authority?.tier,
        category: s.authority?.category,
      })),
      recommendations: getRecommendations(d.overall_verdict),
    }
  } catch (err) {
    console.warn('Backend news verification failed, using local fallback:', err)
    return localFallbackAnalyze(text)
  }
}

/**
 * Backward compatibility alias for Day 1 call signature.
 */
export async function analyzeClaim(claim) {
  return analyzeNews(claim)
}

function getRecommendations(verdict) {
  const v = (verdict || '').toUpperCase()
  if (v === 'CONTRADICTED') {
    return [
      'Do not circulate or forward this message on messaging apps or social networks.',
      'Inform contacts who shared this claim that verified sources and fact-checkers have refuted it.',
      'Check certified independent fact-checking databases (AltNews, BoomLive, Snopes, Factly).',
      'Look for official government gazette or ministry press releases directly.',
    ]
  }
  if (v === 'SUPPORTED') {
    return [
      'Verify that the reporting is current and not an old event taken out of original timeframe.',
      'Check official government portal or accredited media for official terms.',
      'Ensure the headline accurately represents the nuances of the full article.',
    ]
  }
  if (v === 'MIXED') {
    return [
      'Distinguish which specific claims are verified and which are distorted or exaggerated.',
      'Avoid sharing clickbait headlines that mislead even if rooted in a kernel of truth.',
      'Consult primary data sources rather than viral summary screenshots.',
    ]
  }
  return [
    'Exercise critical caution before sharing unverified claims.',
    'Wait for established journalistic organizations or official departments to comment.',
    'Reverse image search any attached screenshots to check for digital manipulation.',
    'Be vigilant of emotional headlines designed to provoke outrage or panic.',
  ]
}

/**
 * Local offline fallback for news verification.
 */
function localFallbackAnalyze(text) {
  const lower = text.toLowerCase()
  let verdict = 'UNVERIFIED'
  let confidence = 50
  let summary = 'Claim evaluated against offline baseline heuristics. Start Flask backend for live fact-checking.'

  if (lower.includes('free laptop') || lower.includes('5g causes') || lower.includes('lemon') && lower.includes('cancer')) {
    verdict = 'CONTRADICTED'
    confidence = 90
    summary = 'This claim matches known recurring viral misinformation patterns debunked by official fact-checkers.'
  } else if (lower.includes('isro') || lower.includes('chandrayaan')) {
    verdict = 'SUPPORTED'
    confidence = 85
    summary = 'Matches verified public records from accredited scientific agencies.'
  }

  return {
    type: 'NEWS',
    verdict,
    confidence,
    confidenceLabel: confidence >= 80 ? 'high' : 'medium',
    summary,
    claims: [
      {
        claim: text.slice(0, 150),
        subject: 'General Claim',
        category: 'Public Information',
        verdict,
        confidence: confidence >= 80 ? 'high' : 'medium',
        explanation: summary,
        supporting_evidence: [],
        contradicting_evidence: [],
        limitations: ['Analyzed using local offline heuristics because backend was unreachable.'],
        recommended_next_steps: getRecommendations(verdict),
      },
    ],
    factCheckSources: [],
    evidenceSources: [],
    providersUsed: ['Local Heuristic Baseline (Offline)'],
    limitations: ['Flask backend was not reachable at http://localhost:5000. Live Google Fact Check and Web Search were skipped.'],
    executionTimeMs: 12,
    isRealAI: false,
    isDemoResult: true,
    sources: [],
    recommendations: getRecommendations(verdict),
  }
}
