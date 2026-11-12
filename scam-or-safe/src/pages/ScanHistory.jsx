import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  Trash2,
  RefreshCw,
  X,
  Star,
  AlertTriangle,
  ExternalLink,
  History,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useScanHistory } from '../hooks/useScanHistory.jsx'
import { submitScanFeedback } from '../services/scanDatabaseService.js'
import { useToast } from '../hooks/useToast.jsx'
import { SectionHeader, RiskBadge, EmptyState } from '../components/ResultComponents.jsx'
import {
  formatDateTime,
  truncate,
  riskColor,
  scanTypeLabel,
  scanTypeIcon,
  normalizeRiskLevel,
} from '../utils/helpers.js'

const TYPES = ['ALL', 'SCAM', 'NEWS', 'URL', 'MULTIMODAL']
const LEVELS = ['ALL', 'HIGH', 'MEDIUM', 'LOW']
const PAGE_SIZE = 10

const LEVEL_COLORS = {
  ALL: '#00E5FF',
  HIGH: '#FF5B78',
  MEDIUM: '#FFBF69',
  LOW: '#5EE6A8',
}

export default function ScanHistory() {
  const { user } = useAuth()
  const { history, loading, error, deleteScanItem, clearHistory, refreshHistory } = useScanHistory()
  const { toast, addToast } = useToast()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [levelFilter, setLevelFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [selectedScan, setSelectedScan] = useState(null)
  const [rating, setRating] = useState(5)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)

  const notify = (msg, type = 'info') => {
    if (toast?.[type]) toast[type](msg)
    else if (addToast) addToast(msg, type)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (history || []).filter((scan) => {
      const scanType = (scan.type || scan.scan_type || '').toUpperCase()
      const riskLevel = normalizeRiskLevel(
        scan.result?.level || scan.riskLevel || scan.risk_level || 'low'
      ).toUpperCase()
      const content = `${scan.input || ''} ${scan.target || ''} ${scan.summary || ''} ${
        scan.result?.summary || ''
      }`.toLowerCase()

      if (typeFilter !== 'ALL' && scanType !== typeFilter) return false
      if (levelFilter !== 'ALL' && riskLevel !== levelFilter) return false
      if (q && !content.includes(q)) return false
      return true
    })
  }, [history, search, typeFilter, levelFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSearch = (e) => {
    setSearch(e.target.value)
    setPage(1)
  }
  const handleTypeFilter = (t) => {
    setTypeFilter(t)
    setPage(1)
  }
  const handleLevelFilter = (l) => {
    setLevelFilter(l)
    setPage(1)
  }

  const handleDelete = async (scanId, e) => {
    e.stopPropagation()
    await deleteScanItem(scanId)
    if (selectedScan?.id === scanId) setSelectedScan(null)
    notify('Scan record removed.', 'info')
  }

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault()
    if (!selectedScan?.id) return
    setFeedbackSubmitting(true)
    const { error: fbErr } = await submitScanFeedback({
      scanId: selectedScan.id,
      userId: user?.id,
      rating,
      comment: feedbackComment.trim(),
    })
    setFeedbackSubmitting(false)
    if (fbErr) {
      notify(fbErr.message || 'Could not save feedback.', 'error')
    } else {
      setFeedbackComment('')
      notify('Feedback saved to database.', 'success')
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SectionHeader
          badge="VERIFICATION LOGS"
          title="Scan History"
          subtitle="Search, inspect, and manage your recorded scam, fact-check, URL, and multimodal assessments."
        />
        <div className="flex items-center gap-2">
          <button type="button" onClick={refreshHistory} className="tl-btn-ghost text-xs py-2 px-3.5">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => {
                clearHistory()
                notify('Session history cleared.', 'info')
              }}
              className="tl-btn-ghost text-xs py-2 px-3.5 hover:text-[#FF5B78]"
            >
              <Trash2 size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          className="p-3 rounded-xl text-xs font-mono text-[#FFBF69]"
          style={{ background: 'rgba(255,191,105,0.1)', border: '1px solid rgba(255,191,105,0.3)' }}
        >
          {error}
        </div>
      )}

      {/* Search & Filters */}
      <div className="tl-glass-card p-4 sm:p-5 space-y-4">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgba(236,232,255,0.48)]"
          />
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Search submitted messages, URLs, or summaries..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm text-[#F4F2FF] placeholder-[rgba(236,232,255,0.4)] focus:outline-none focus:border-[#00E5FF]/55"
            style={{ background: 'rgba(13,8,48,0.68)', border: '1px solid rgba(196,178,255,0.16)' }}
          />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => {
              const active = typeFilter === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeFilter(t)}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-mono transition-all"
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
                          color: 'rgba(236,232,255,0.62)',
                        }
                  }
                >
                  {t}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map((l) => {
              const c = LEVEL_COLORS[l] || '#00E5FF'
              const active = levelFilter === l
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => handleLevelFilter(l)}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-mono transition-all"
                  style={{
                    background: active ? `${c}20` : 'rgba(13,8,48,0.55)',
                    border: `1px solid ${active ? `${c}66` : 'rgba(196,178,255,0.14)'}`,
                    color: active ? c : 'rgba(236,232,255,0.62)',
                  }}
                >
                  {l === 'ALL' ? 'ALL RISK' : l}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Table / Empty State */}
      {loading && history.length === 0 ? (
        <div className="tl-glass-card p-12 text-center font-mono text-xs text-[rgba(236,232,255,0.6)]">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-[#00E5FF]" />
          Loading scan history...
        </div>
      ) : history.length === 0 ? (
        <EmptyState
          icon={<History size={28} />}
          title="No Scan History Yet"
          description="Run an inspection in Scam Detection, Fake News, URL Safety, or Multimodal AI to populate your verification log."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={28} />}
          title="No Matching Records"
          description="Try clearing or adjusting your search query and risk filters."
        />
      ) : (
        <>
          <div className="tl-glass-card overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr
                  className="border-b text-[11px] font-mono uppercase tracking-wider text-[rgba(236,232,255,0.52)]"
                  style={{ borderColor: 'rgba(196,178,255,0.14)', background: 'rgba(13,8,48,0.6)' }}
                >
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Content / Summary</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Risk</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs" style={{ borderColor: 'rgba(196,178,255,0.08)' }}>
                {paginated.map((scan) => {
                  const type = scan.type || scan.scan_type || 'scam'
                  const level = scan.result?.level || scan.riskLevel || scan.risk_level
                  const ts = scan.timestamp || scan.created_at
                  const text = scan.input || scan.target || scan.summary || scan.result?.summary
                  return (
                    <tr
                      key={scan.id}
                      onClick={() => setSelectedScan(scan)}
                      className="cursor-pointer hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-3.5 px-4 text-base">{scanTypeIcon(type)}</td>
                      <td className="py-3.5 px-4 font-mono text-[rgba(236,232,255,0.85)] max-w-[320px] truncate">
                        {truncate(text, 64)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#A78BFA] whitespace-nowrap">
                        {scanTypeLabel(type)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {level ? <RiskBadge level={level} /> : <span className="text-[rgba(236,232,255,0.45)]">N/A</span>}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[rgba(236,232,255,0.58)] whitespace-nowrap">
                        {formatDateTime(ts)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => handleDelete(scan.id, e)}
                          title="Delete scan"
                          className="p-1.5 rounded-lg text-[rgba(236,232,255,0.5)] hover:text-[#FF5B78] hover:bg-[#FF5B78]/10 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="tl-btn-ghost text-xs py-2 px-4 disabled:opacity-35"
              >
                ← Prev
              </button>
              <span className="text-xs font-mono text-[rgba(236,232,255,0.65)]">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="tl-btn-ghost text-xs py-2 px-4 disabled:opacity-35"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Details Modal */}
      {selectedScan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(7, 4, 24, 0.8)', backdropFilter: 'blur(10px)' }}
          onClick={() => setSelectedScan(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 rounded-3xl tl-glass-strong space-y-5"
            style={{ border: '1px solid rgba(196,178,255,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-4 border-b" style={{ borderColor: 'rgba(196,178,255,0.14)' }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{scanTypeIcon(selectedScan.type)}</span>
                  <h3 className="font-display font-bold text-base text-[#F4F2FF]">
                    {scanTypeLabel(selectedScan.type)} Verification Details
                  </h3>
                </div>
                <p className="font-mono text-xs text-[rgba(236,232,255,0.55)]">
                  ID: {selectedScan.id} • {formatDateTime(selectedScan.timestamp)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScan(null)}
                className="p-1.5 rounded-lg text-[rgba(236,232,255,0.6)] hover:text-[#F4F2FF]"
              >
                <X size={18} />
              </button>
            </div>

            <div
              className="p-4 rounded-2xl space-y-1"
              style={{ background: 'rgba(13,8,48,0.68)', border: '1px solid rgba(196,178,255,0.14)' }}
            >
              <p className="text-[11px] font-mono text-[#00E5FF]">Submitted Content / Target</p>
              <p className="text-xs sm:text-sm font-mono text-[#F4F2FF] whitespace-pre-wrap break-words">
                {selectedScan.input || selectedScan.target || selectedScan.summary}
              </p>
            </div>

            <div
              className="flex items-center justify-between p-4 rounded-2xl"
              style={{ background: 'rgba(111,120,255,0.12)', border: '1px solid rgba(141,148,255,0.28)' }}
            >
              <div>
                <p className="text-[11px] font-mono text-[rgba(236,232,255,0.6)]">Assessment Verdict</p>
                <p
                  className="font-display font-bold text-lg"
                  style={{
                    color: riskColor(selectedScan.result?.level || selectedScan.riskLevel || 'low'),
                  }}
                >
                  {(selectedScan.result?.level || selectedScan.riskLevel || 'LOW').toUpperCase()} RISK{' '}
                  {(selectedScan.result?.score ?? selectedScan.riskScore) != null &&
                    `(${selectedScan.result?.score ?? selectedScan.riskScore}/100)`}
                </p>
              </div>
              <RiskBadge level={selectedScan.result?.level || selectedScan.riskLevel || 'low'} />
            </div>

            {selectedScan.findings?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-mono text-[rgba(236,232,255,0.65)]">
                  Scan Findings ({selectedScan.findings.length})
                </p>
                <div className="space-y-2">
                  {selectedScan.findings.map((f, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl flex items-start gap-2.5 text-xs"
                      style={{ background: 'rgba(13,8,48,0.6)', border: '1px solid rgba(196,178,255,0.12)' }}
                    >
                      <AlertTriangle size={14} className="mt-0.5 text-[#FFBF69] flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-[#F4F2FF]">{f.title || f.phrase}</p>
                        <p className="text-[rgba(236,232,255,0.7)]">{f.description || f.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedScan.evidence?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-mono text-[rgba(236,232,255,0.65)]">
                  Evidence Sources ({selectedScan.evidence.length})
                </p>
                <div className="space-y-2">
                  {selectedScan.evidence.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl flex items-center justify-between gap-2 text-xs"
                      style={{ background: 'rgba(13,8,48,0.6)', border: '1px solid rgba(196,178,255,0.12)' }}
                    >
                      <div>
                        <p className="font-semibold text-[#F4F2FF]">{s.title || s.name}</p>
                        <p className="text-[rgba(236,232,255,0.62)]">{s.publisher || 'Source'}</p>
                      </div>
                      {s.source_url && (
                        <a
                          href={s.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#00E5FF] hover:underline flex items-center gap-1 font-mono"
                        >
                          Source <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback */}
            <form onSubmit={handleFeedbackSubmit} className="pt-4 border-t space-y-3" style={{ borderColor: 'rgba(196,178,255,0.14)' }}>
              <p className="text-xs font-mono text-[rgba(236,232,255,0.65)]">Submit Accuracy Feedback</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[rgba(236,232,255,0.6)]">Rating:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className="text-[#FFBF69] hover:scale-110 transition-transform"
                  >
                    <Star size={16} fill={star <= rating ? '#FFBF69' : 'none'} />
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Optional notes on assessment accuracy..."
                  className="flex-1 px-3.5 py-2 rounded-xl text-xs bg-[#0D0830] border border-[rgba(196,178,255,0.18)] text-[#F4F2FF] outline-none"
                />
                <button
                  type="submit"
                  disabled={feedbackSubmitting}
                  className="tl-btn-primary text-xs py-2 px-4 whitespace-nowrap"
                >
                  {feedbackSubmitting ? 'Saving...' : 'Save Feedback'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
