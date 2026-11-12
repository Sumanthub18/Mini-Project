import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  ShieldAlert,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Database,
  Send,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../hooks/useToast.jsx'
import { fetchCommunityReports, submitCommunityReport } from '../services/communityService.js'
import { SectionHeader, RiskBadge, EmptyState } from '../components/ResultComponents.jsx'
import { formatDateTime } from '../utils/helpers.js'

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'scam', label: 'Scam Message' },
  { id: 'phishing_url', label: 'Phishing URL' },
  { id: 'upi_fraud', label: 'UPI / Banking Fraud' },
  { id: 'job_scam', label: 'Fake Job Offer' },
  { id: 'fake_news', label: 'Misinformation' },
  { id: 'other', label: 'Other' },
]

const STATUS_BADGE = {
  verified: { label: 'Verified', color: '#5EE6A8', bg: 'rgba(94,230,168,0.12)' },
  under_review: { label: 'Under Review', color: '#00E5FF', bg: 'rgba(0,229,255,0.12)' },
  community_submitted: { label: 'Community Report', color: '#FFBF69', bg: 'rgba(255,191,105,0.12)' },
}

export default function CommunityIntelligence() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [configured, setConfigured] = useState(true)
  const [filterCat, setFilterCat] = useState('all')
  const [showForm, setShowForm] = useState(false)

  // Submission form state
  const [category, setCategory] = useState('scam')
  const [targetIdentifier, setTargetIdentifier] = useState('')
  const [summary, setSummary] = useState('')
  const [reportedRiskLevel, setReportedRiskLevel] = useState('high')
  const [submitting, setSubmitting] = useState(false)

  const loadReports = async (cat = filterCat) => {
    setLoading(true)
    const res = await fetchCommunityReports({ category: cat })
    setReports(res.reports || [])
    setTableMissing(Boolean(res.tableMissing))
    setConfigured(Boolean(res.configured))
    setLoading(false)
  }

  useEffect(() => {
    loadReports(filterCat)
  }, [filterCat])

  // Compute trending categories strictly from real retrieved reports (zero fabricated stats)
  const categoryStats = useMemo(() => {
    const counts = {}
    reports.forEach((r) => {
      counts[r.category] = (counts[r.category] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => ({
        id: cat,
        label: CATEGORIES.find((c) => c.id === cat)?.label || cat,
        count,
      }))
  }, [reports])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!targetIdentifier.trim() || !summary.trim()) {
      toast.error('Please enter both a suspicious target/pattern and a brief description.')
      return
    }
    setSubmitting(true)
    const { data, error } = await submitCommunityReport({
      userId: user?.id,
      category,
      targetIdentifier: targetIdentifier.trim(),
      summary: summary.trim(),
      reportedRiskLevel,
    })
    setSubmitting(false)

    if (error) {
      toast.error(error.message || 'Could not submit report. Ensure the community_reports migration is applied.')
      return
    }

    if (data) {
      setReports((prev) => [data, ...prev])
    }
    setTargetIdentifier('')
    setSummary('')
    setShowForm(false)
    toast.success('Community threat report submitted.')
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SectionHeader
          badge="SHARED THREAT FEED"
          title="Community Intelligence"
          subtitle="Real user-submitted scam alerts, suspicious domains, and misinformation reports backed by Supabase RLS."
        />

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadReports(filterCat)}
            className="tl-btn-ghost text-xs py-2 px-3.5"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="tl-btn-primary text-xs py-2 px-4"
          >
            <Plus size={14} /> Report Threat
          </button>
        </div>
      </div>

      {/* Report Submission Form */}
      {showForm && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="tl-glass-card p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-[#F4F2FF] flex items-center gap-2">
              <ShieldAlert size={17} className="text-[#00E5FF]" />
              Submit Threat Report
            </h2>
            <span className="text-[11px] font-mono text-[rgba(236,232,255,0.55)]">
              Do not include personal OTPs, phone numbers, or sensitive secrets
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-[rgba(236,232,255,0.68)] mb-1.5">
                Threat Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-[#0D0830] border border-[rgba(196,178,255,0.2)] text-[#F4F2FF] focus:outline-none"
              >
                {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-[rgba(236,232,255,0.68)] mb-1.5">
                Assessed Risk Level
              </label>
              <select
                value={reportedRiskLevel}
                onChange={(e) => setReportedRiskLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-[#0D0830] border border-[rgba(196,178,255,0.2)] text-[#F4F2FF] focus:outline-none"
              >
                <option value="high">High Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="low">Low / Informational</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-[rgba(236,232,255,0.68)] mb-1.5">
              Suspicious Domain / Pattern / Claim Headline
            </label>
            <input
              type="text"
              value={targetIdentifier}
              onChange={(e) => setTargetIdentifier(e.target.value)}
              placeholder="e.g. https://fake-kyc-update.xyz or 'Pay Rs 999 fee for data entry job'"
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-[#0D0830] border border-[rgba(196,178,255,0.2)] text-[#F4F2FF] placeholder-[rgba(236,232,255,0.38)] focus:outline-none focus:border-[#00E5FF]/55"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-[rgba(236,232,255,0.68)] mb-1.5">
              What Happened / Observed Indicators
            </label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Describe why this looks suspicious (impersonated brand, payment demand, domain mismatch)..."
              className="w-full px-3.5 py-2.5 rounded-xl text-xs text-[#F4F2FF] placeholder-[rgba(236,232,255,0.38)] bg-[#0D0830] border border-[rgba(196,178,255,0.2)] focus:outline-none focus:border-[#00E5FF]/55"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="tl-btn-ghost text-xs py-2 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="tl-btn-primary text-xs py-2 px-5 disabled:opacity-50"
            >
              <Send size={13} />
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </motion.form>
      )}

      {/* Migration Notice if community_reports isn't deployed yet */}
      {(!configured || tableMissing) && (
        <div
          className="p-4 rounded-2xl flex items-start gap-3 text-xs font-mono"
          style={{
            background: 'rgba(255, 191, 105, 0.09)',
            border: '1px solid rgba(255, 191, 105, 0.32)',
            color: '#FFBF69',
          }}
        >
          <Database size={18} className="flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Community Reports Table Not Yet Provisioned</p>
            <p className="text-[rgba(236,232,255,0.78)]">
              Apply the Supabase migration{' '}
              <code>scam-or-safe/supabase/migrations/20261112000000_community_intelligence.sql</code>{' '}
              in your Supabase SQL Editor to store and view real community submissions. TrustLens AI does not display synthetic or fabricated threat reports.
            </p>
          </div>
        </div>
      )}

      {/* Filter Bar + Category Counts strictly from real rows */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 space-y-4">
          <div className="tl-glass-card p-5 space-y-3">
            <h2 className="font-display text-sm font-semibold text-[#F4F2FF] flex items-center gap-2">
              <Users size={16} className="text-[#00E5FF]" />
              Category Breakdown
            </h2>
            <p className="text-xs text-[rgba(236,232,255,0.58)]">
              Computed strictly from stored community reports ({reports.length} loaded).
            </p>

            {categoryStats.length === 0 ? (
              <p className="text-xs font-mono text-[rgba(236,232,255,0.48)] py-4">
                No reported categories available yet.
              </p>
            ) : (
              <div className="space-y-2 pt-1">
                {categoryStats.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl flex items-center justify-between text-xs"
                    style={{ background: 'rgba(13,8,48,0.6)', border: '1px solid rgba(196,178,255,0.12)' }}
                  >
                    <span className="text-[#F4F2FF]">{item.label}</span>
                    <span className="font-mono font-bold text-[#00E5FF]">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4">
          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => {
              const active = filterCat === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFilterCat(c.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-mono transition-all"
                  style={
                    active
                      ? {
                          background: 'rgba(111,120,255,0.28)',
                          border: '1px solid rgba(0,229,255,0.45)',
                          color: '#F4F2FF',
                        }
                      : {
                          background: 'rgba(13,8,48,0.55)',
                          border: '1px solid rgba(196,178,255,0.14)',
                          color: 'rgba(236,232,255,0.65)',
                        }
                  }
                >
                  {c.label}
                </button>
              )
            })}
          </div>

          {/* Reports List */}
          {loading ? (
            <div className="tl-glass-card p-12 text-center font-mono text-xs text-[rgba(236,232,255,0.6)]">
              <RefreshCw size={22} className="animate-spin mx-auto mb-3 text-[#00E5FF]" />
              Querying Supabase community reports...
            </div>
          ) : reports.length === 0 ? (
            <EmptyState
              icon={<Users size={28} />}
              title="No Community Reports Yet"
              description="No reports have been recorded for this filter yet. Click 'Report Threat' above to share a verified scam alert or suspicious URL."
            />
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => {
                const statusInfo = STATUS_BADGE[rep.verification_status] || STATUS_BADGE.community_submitted
                return (
                  <div key={rep.id} className="tl-glass-card p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <RiskBadge level={rep.reported_risk_level} />
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-[#6F78FF]/15 text-[#A78BFA] border border-[#6F78FF]/30">
                          {CATEGORIES.find((c) => c.id === rep.category)?.label || rep.category}
                        </span>
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-mono flex items-center gap-1"
                          style={{ background: statusInfo.bg, color: statusInfo.color }}
                        >
                          {rep.verification_status === 'verified' ? (
                            <CheckCircle2 size={11} />
                          ) : rep.verification_status === 'under_review' ? (
                            <Clock size={11} />
                          ) : (
                            <AlertTriangle size={11} />
                          )}
                          {statusInfo.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[rgba(236,232,255,0.52)]">
                        {formatDateTime(rep.created_at)}
                      </span>
                    </div>

                    <p className="text-xs font-mono text-[#00E5FF] break-all">
                      {rep.target_identifier}
                    </p>
                    <p className="text-sm text-[rgba(236,232,255,0.85)] leading-relaxed">
                      {rep.summary}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

