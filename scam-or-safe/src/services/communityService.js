import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import { reportUrlFeedback } from './urlService.js'

/**
 * Fetches community threat reports directly from Supabase.
 * Never returns fabricated or hardcoded placeholder reports.
 */
export async function fetchCommunityReports({ category = 'all', limit = 50 } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      reports: [],
      configured: false,
      tableMissing: false,
      error: null,
    }
  }

  try {
    let query = supabase
      .from('community_reports')
      .select('id, user_id, category, target_identifier, summary, reported_risk_level, verification_status, upvotes, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { data, error } = await query
    if (error) {
      const msg = (error.message || '').toLowerCase()
      const tableMissing =
        error.code === '42P01' ||
        msg.includes('does not exist') ||
        msg.includes('schema cache') ||
        msg.includes('could not find the table')

      return {
        reports: [],
        configured: true,
        tableMissing,
        error: tableMissing ? null : error,
      }
    }

    return {
      reports: data || [],
      configured: true,
      tableMissing: false,
      error: null,
    }
  } catch (error) {
    return {
      reports: [],
      configured: true,
      tableMissing: false,
      error,
    }
  }
}

/**
 * Submits a verified user's threat report to Supabase community_reports.
 * If category is phishing_url, also forwards structured feedback to backend URL engine.
 */
export async function submitCommunityReport({
  userId,
  category,
  targetIdentifier,
  summary,
  reportedRiskLevel = 'high',
}) {
  if (category === 'phishing_url' && /^https?:\/\//i.test(targetIdentifier)) {
    reportUrlFeedback({
      url: targetIdentifier,
      reportType: reportedRiskLevel === 'high' ? 'phishing' : 'suspicious',
      comment: summary,
    }).catch(() => {})
  }

  if (!isSupabaseConfigured || !supabase || !userId) {
    return {
      data: null,
      error: new Error('Supabase community database is not configured or user is not signed in.'),
    }
  }

  try {
    const { data, error } = await supabase
      .from('community_reports')
      .insert({
        user_id: userId,
        category,
        target_identifier: targetIdentifier,
        summary,
        reported_risk_level: reportedRiskLevel,
        verification_status: 'community_submitted',
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

