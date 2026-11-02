import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'

/**
 * Service module for scan data management using Supabase PostgreSQL.
 * Adheres to Row Level Security by scoping operations with auth.uid().
 */

/**
 * Saves a completed scan along with its findings and evidence sources.
 *
 * @param {object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.scanType - 'scam' | 'news' | 'url'
 * @param {string} [params.summary] - Summary or input excerpt
 * @param {number} [params.riskScore] - 0 to 100
 * @param {string} [params.riskLevel] - 'low' | 'medium' | 'high'
 * @param {string} [params.resultStatus] - 'completed' | 'pending' | 'failed'
 * @param {Array<object>} [params.findings] - Array of finding objects
 * @param {Array<object>} [params.evidenceSources] - Array of source objects
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function saveScan({
  userId,
  scanType,
  summary,
  riskScore,
  riskLevel,
  resultStatus = 'completed',
  findings = [],
  evidenceSources = [],
}) {
  if (!isSupabaseConfigured || !userId) {
    return {
      data: {
        id: 'local-' + Date.now(),
        user_id: userId || 'local-user',
        scan_type: scanType?.toLowerCase(),
        summary,
        risk_score: riskScore,
        risk_level: riskLevel?.toLowerCase(),
        result_status: resultStatus,
        created_at: new Date().toISOString(),
      },
      error: null,
    }
  }

  try {
    // 1. Insert into scans
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .insert({
        user_id: userId,
        scan_type: scanType.toLowerCase(),
        summary: summary ? String(summary).slice(0, 1000) : null,
        risk_score: typeof riskScore === 'number' ? Math.round(riskScore) : null,
        risk_level: riskLevel ? riskLevel.toLowerCase() : null,
        result_status: resultStatus,
      })
      .select()
      .single()

    if (scanError) throw scanError

    // 2. Insert scan findings if any
    if (findings.length > 0 && scan?.id) {
      const findingsToInsert = findings.map(f => ({
        scan_id: scan.id,
        finding_type: f.finding_type || f.type || 'indicator',
        title: f.title || f.phrase || 'Threat Indicator',
        description: f.description || f.reason || 'Identified during scan',
        severity: f.severity ? f.severity.toLowerCase() : null,
      }))

      const { error: findingsError } = await supabase
        .from('scan_findings')
        .insert(findingsToInsert)

      if (findingsError) console.error('Failed to save scan findings:', findingsError)
    }

    // 3. Insert evidence sources if any
    if (evidenceSources.length > 0 && scan?.id) {
      const sourcesToInsert = evidenceSources.map(s => ({
        scan_id: scan.id,
        title: s.title || s.name || 'Reference Source',
        publisher: s.publisher || null,
        source_url: s.source_url || s.url || 'https://google.com',
        published_at: s.published_at || null,
        evidence_summary: s.evidence_summary || s.summary || null,
      }))

      const { error: sourcesError } = await supabase
        .from('evidence_sources')
        .insert(sourcesToInsert)

      if (sourcesError) console.error('Failed to save evidence sources:', sourcesError)
    }

    return { data: scan, error: null }
  } catch (error) {
    console.error('Error saving scan to Supabase:', error)
    return { data: null, error }
  }
}

/**
 * Retrieves paginated scans for the current user with filtering and search.
 *
 * @param {string} userId - Authenticated user UUID
 * @param {object} options
 * @param {string} [options.search]
 * @param {string} [options.scanType] - 'all' | 'scam' | 'news' | 'url'
 * @param {string} [options.riskLevel] - 'all' | 'low' | 'medium' | 'high'
 * @param {number} [options.page=1]
 * @param {number} [options.limit=10]
 * @returns {Promise<{ data: Array<object>, count: number, error: object|null }>}
 */
export async function getUserScans(userId, {
  search = '',
  scanType = 'all',
  riskLevel = 'all',
  page = 1,
  limit = 10,
} = {}) {
  if (!isSupabaseConfigured || !userId) {
    return { data: [], count: 0, error: null }
  }

  try {
    let query = supabase
      .from('scans')
      .select('*, scan_findings(*), evidence_sources(*)', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (scanType && scanType.toLowerCase() !== 'all') {
      query = query.eq('scan_type', scanType.toLowerCase())
    }

    if (riskLevel && riskLevel.toLowerCase() !== 'all') {
      query = query.eq('risk_level', riskLevel.toLowerCase())
    }

    if (search && search.trim()) {
      query = query.ilike('summary', `%${search.trim()}%`)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) throw error

    return { data: data || [], count: count || 0, error: null }
  } catch (error) {
    console.error('Error fetching user scans:', error)
    return { data: [], count: 0, error }
  }
}

/**
 * Retrieves full details for a specific scan, including findings, evidence, and feedback.
 *
 * @param {string} scanId
 * @param {string} userId
 */
export async function getScanById(scanId, userId) {
  if (!isSupabaseConfigured || !userId) {
    return { data: null, error: null }
  }

  try {
    const { data, error } = await supabase
      .from('scans')
      .select('*, scan_findings(*), evidence_sources(*), feedback(*)')
      .eq('id', scanId)
      .eq('user_id', userId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * Deletes a scan record owned by the authenticated user.
 * Cascade deletion removes findings, evidence, and feedback automatically.
 *
 * @param {string} scanId
 * @param {string} userId
 */
export async function deleteScan(scanId, userId) {
  if (!isSupabaseConfigured || !userId) {
    return { success: true, error: null }
  }

  try {
    const { error } = await supabase
      .from('scans')
      .delete()
      .eq('id', scanId)
      .eq('user_id', userId)

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('Error deleting scan:', error)
    return { success: false, error }
  }
}

/**
 * Fetches computed dashboard statistics directly from user scans in Supabase.
 * Does not count failed or incomplete scans.
 *
 * @param {string} userId
 */
export async function getDashboardStats(userId) {
  if (!isSupabaseConfigured || !userId) {
    return {
      stats: {
        total: 0,
        scamCount: 0,
        newsCount: 0,
        urlCount: 0,
        highRiskCount: 0,
      },
      recent: [],
      distribution: [
        { name: 'Scam', value: 0, color: '#ff006e' },
        { name: 'Fake News', value: 0, color: '#bf00ff' },
        { name: 'URL', value: 0, color: '#00d4ff' },
      ],
      error: null,
    }
  }

  try {
    // Only fetch completed scans
    const { data: scans, error } = await supabase
      .from('scans')
      .select('id, scan_type, summary, risk_score, risk_level, result_status, created_at')
      .eq('user_id', userId)
      .eq('result_status', 'completed')
      .order('created_at', { ascending: false })

    if (error) throw error

    const all = scans || []
    const scamCount = all.filter(s => s.scan_type === 'scam').length
    const newsCount = all.filter(s => s.scan_type === 'news').length
    const urlCount = all.filter(s => s.scan_type === 'url').length
    const highRiskCount = all.filter(s => s.risk_level?.toLowerCase() === 'high').length

    const distribution = [
      { name: 'Scam', value: scamCount, color: '#ff006e' },
      { name: 'Fake News', value: newsCount, color: '#bf00ff' },
      { name: 'URL', value: urlCount, color: '#00d4ff' },
    ]

    const stats = {
      total: all.length,
      scamCount,
      newsCount,
      urlCount,
      highRiskCount,
    }

    const recent = all.slice(0, 5)

    return { stats, recent, distribution, error: null }
  } catch (error) {
    console.error('Error calculating dashboard stats:', error)
    return {
      stats: { total: 0, scamCount: 0, newsCount: 0, urlCount: 0, highRiskCount: 0 },
      recent: [],
      distribution: [
        { name: 'Scam', value: 0, color: '#ff006e' },
        { name: 'Fake News', value: 0, color: '#bf00ff' },
        { name: 'URL', value: 0, color: '#00d4ff' },
      ],
      error,
    }
  }
}

/**
 * Submits feedback for a completed scan.
 */
export async function submitScanFeedback({ scanId, userId, rating, comment }) {
  if (!isSupabaseConfigured || !userId) {
    return { success: true, error: null }
  }

  try {
    const { data, error } = await supabase
      .from('feedback')
      .upsert(
        {
          scan_id: scanId,
          user_id: userId,
          rating,
          comment,
        },
        { onConflict: 'scan_id, user_id' }
      )
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error submitting feedback:', error)
    return { data: null, error }
  }
}
