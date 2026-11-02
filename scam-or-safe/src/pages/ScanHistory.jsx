import { useState, useMemo } from 'react'
import {
  Search, Trash2, ExternalLink, X, AlertTriangle, ShieldCheck,
  RefreshCw, Star, Info, ChevronRight
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useScanHistory } from '../hooks/useScanHistory.jsx'
import { submitScanFeedback } from '../services/scanDatabaseService.js'
import { useToast } from '../hooks/useToast.jsx'
import { SectionHeader, Card, EmptyState, RiskBadge } from '../components/ResultComponents.jsx'
import { formatDateTime, truncate, scanTypeLabel, scanTypeIcon, riskColor } from '../utils/helpers.js'

const TYPES = ['ALL', 'SCAM', 'NEWS', 'URL']
const LEVELS = ['ALL', 'HIGH', 'MEDIUM', 'LOW']
const LEVEL_COLORS = { HIGH: '#ff006e', MEDIUM: '#ffb800', LOW: '#00ff9f' }

export default function ScanHistory() {
  const { user, isConfigured } = useAuth()
  const { history, loading, error, deleteScanItem, clearHistory, refreshHistory } = useScanHistory()
  const { addToast } = useToast()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [levelFilter, setLevelFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [selectedScan, setSelectedScan] = useState(null)
  const [rating, setRating] = useState(5)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const PER_PAGE = 10

  const filtered = useMemo(() => {
    return history.filter(s => {
      const sType = s.type?.toUpperCase() || ''
      const matchType = typeFilter === 'ALL' || sType === typeFilter
      const sLevel = s.result?.level?.toUpperCase() || ''
      const matchLevel = levelFilter === 'ALL' || sLevel === levelFilter
      const searchTarget = (s.input || s.result?.summary || '').toLowerCase()
      const matchSearch = !search.trim() || searchTarget.includes(search.trim().toLowerCase())
      return matchType && matchLevel && matchSearch
    })
  }, [history, search, typeFilter, levelFilter])

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1) }
  const handleTypeFilter = (t) => { setTypeFilter(t); setPage(1) }
  const handleLevelFilter = (l) => { setLevelFilter(l); setPage(1) }

  const handleDelete = async (scanId, e) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to delete this scan record?')) {
      await deleteScanItem(scanId)
      if (selectedScan?.id === scanId) setSelectedScan(null)
      addToast('Scan record deleted.', 'info')
    }
  }

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault()
    if (!selectedScan?.id || !user?.id) return
    setFeedbackSubmitting(true)

    const { error: fbErr } = await submitScanFeedback({
      scanId: selectedScan.id,
      userId: user.id,
      rating,
      comment: feedbackComment.trim(),
    })
    setFeedbackSubmitting(false)

    if (fbErr) {
      addToast('Failed to record feedback.', 'error')
    } else {
      addToast('Feedback saved! Thank you for improving threat intelligence.', 'success')
      setFeedbackComment('')
    }
  }

  return (
    <div className="max-w-5xl mx-auto animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-2 flex-wrap gap-4">
        <SectionHeader
          title="SCAN HISTORY"
          subtitle={`// ${history.length} records retrieved from ${isConfigured ? 'Supabase PostgreSQL' : 'session cache'}`}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshHistory()}
            disabled={loading}
            className="btn-neon px-3 py-2 text-xs font-mono tracking-widest flex items-center gap-1.5"
            style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> SYNC
          </button>
          {history.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Delete all scan records for your account?')) {
                  clearHistory()
                  addToast('Scan history cleared.', 'info')
                }
              }}
              className="flex items-center gap-2 px-3 py-2 text-xs font-mono tracking-widest transition-all"
              style={{
                background: '#ff006e08',
                color: '#ff006e88',
                border: '1px solid #ff006e22',
                clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#ff006e18'; e.currentTarget.style.color = '#ff006e' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ff006e08'; e.currentTarget.style.color = '#ff006e88' }}
            >
              <Trash2 size={12} /> PURGE ALL
            </button>
          )}
        </div>
      </div>

      {/* RLS Security Notice */}
      <div
        className="mb-5 px-4 py-3 text-xs font-mono flex items-center justify-between gap-2"
        style={{
          background: '#00d4ff08',
          border: '1px solid #00d4ff18',
          color: '#4a6080',
          clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
        }}
      >
        <span>
          <strong style={{ color: '#00d4ff' }}>[ RLS ENFORCED ]</strong> Records strictly isolated to authenticated user <span style={{ color: '#00ff9f' }}>{user?.email || 'authenticated'}</span> via PostgreSQL Row Level Security.
        </span>
        <span className="hidden sm:inline" style={{ color: '#00ff9f44' }}>auth.uid() = user_id</span>
      </div>

      {error && (
        <div
          className="mb-4 p-3 text-xs font-mono text-red-400 bg-red-950/20 border border-red-800/40"
          style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}
        >
          // ERROR: {error}
        </div>
      )}

      {/* Filters */}
      <Card className="mb-5">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#4a6080' }} />
            <input
              type="search"
              value={search}
              onChange={handleSearch}
              placeholder="// search scan content or findings…"
              className="w-full pl-9 pr-4 py-2.5 text-sm font-mono"
              style={{
                background: '#050810',
                border: '1px solid #00ff9f18',
                color: '#e2e8f0',
                outline: 'none',
                clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#00ff9f44'; e.currentTarget.style.boxShadow = '0 0 12px #00ff9f12' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#00ff9f18'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>

          {/* Type filter */}
          <div className="flex gap-1.5 flex-wrap">
            {TYPES.map(t => (
              <button
                key={t}
                onClick={() => handleTypeFilter(t)}
                className="px-3 py-1.5 text-xs font-mono tracking-widest transition-all"
                style={{
                  background: typeFilter === t ? '#00ff9f12' : '#050810',
                  color: typeFilter === t ? '#00ff9f' : '#4a6080',
                  border: typeFilter === t ? '1px solid #00ff9f44' : '1px solid #0f2040',
                  textShadow: typeFilter === t ? '0 0 8px #00ff9f' : 'none',
                  clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Level filter */}
          <div className="flex gap-1.5 flex-wrap">
            {LEVELS.map(l => {
              const c = LEVEL_COLORS[l] || '#00ff9f'
              const active = levelFilter === l
              return (
                <button
                  key={l}
                  onClick={() => handleLevelFilter(l)}
                  className="px-3 py-1.5 text-xs font-mono tracking-widest transition-all"
                  style={{
                    background: active ? `${c}12` : '#050810',
                    color: active ? c : '#4a6080',
                    border: active ? `1px solid ${c}44` : '1px solid #0f2040',
                    textShadow: active ? `0 0 8px ${c}88` : 'none',
                    clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
                  }}
                >
                  {l === 'ALL' ? 'ALL RISK' : l}
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Table */}
      {loading && history.length === 0 ? (
        <div className="p-12 text-center font-mono text-xs text-slate-500">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3" style={{ color: '#00ff9f' }} />
          // QUERYING SUPABASE POSTGRESQL CLUSTER...
        </div>
      ) : history.length === 0 ? (
        <EmptyState
          icon="📋"
          title="NO SCAN HISTORY"
          description="// execute a scan from Scam Scanner, Fake News, or URL Checker to populate your database"
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🔎" title="NO RESULTS MATCH" description="// try adjusting your search or filter criteria" />
      ) : (
        <>
          <div
            style={{
              border: '1px solid #00ff9f18',
              clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              className="grid gap-4 px-4 py-3 text-xs font-mono uppercase tracking-widest"
              style={{
                background: '#0d1424',
                color: '#4a6080',
                gridTemplateColumns: '36px 1fr 100px 100px 140px 40px',
                borderBottom: '1px solid #00ff9f12',
              }}
            >
              <span style={{ color: '#00ff9f44' }}>#</span>
              <span>Content / Summary</span>
              <span>Type</span>
              <span>Risk</span>
              <span>Timestamp</span>
              <span className="text-right">Action</span>
            </div>

            {/* Rows */}
            {paginated.map((scan, i) => (
              <div
                key={scan.id}
                onClick={() => setSelectedScan(scan)}
                className="grid gap-4 px-4 py-3 items-center transition-all cursor-pointer group"
                style={{
                  background: i % 2 === 0 ? '#090d1a' : '#050810',
                  borderTop: '1px solid #00ff9f08',
                  gridTemplateColumns: '36px 1fr 100px 100px 140px 40px',
                  color: '#e2e8f0',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#00ff9f08'; e.currentTarget.style.borderTopColor = '#00ff9f22' }}
                onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? '#090d1a' : '#050810'; e.currentTarget.style.borderTopColor = '#00ff9f08' }}
              >
                <span className="text-lg">{scanTypeIcon(scan.type)}</span>
                <span className="text-sm font-mono truncate group-hover:text-cyan-300 transition-colors" style={{ color: '#94a3b8' }}>
                  {truncate(scan.input || scan.result?.summary, 60)}
                </span>
                <span className="text-xs font-mono tracking-widest" style={{ color: '#4a6080' }}>
                  {scanTypeLabel(scan.type).toUpperCase()}
                </span>
                <span>
                  {scan.result?.level ? (
                    <RiskBadge level={scan.result.level} />
                  ) : (
                    <span className="text-xs font-mono" style={{ color: '#4a6080' }}>N/A</span>
                  )}
                </span>
                <span className="text-xs font-mono" style={{ color: '#4a6080' }}>
                  {formatDateTime(scan.timestamp)}
                </span>
                <div className="flex items-center justify-end">
                  <button
                    onClick={(e) => handleDelete(scan.id, e)}
                    className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                    title="Delete record"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-neon px-4 py-2 text-xs font-mono tracking-widest disabled:opacity-30"
                style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
              >
                ← PREV
              </button>
              <span className="text-xs font-mono" style={{ color: '#4a6080' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-neon px-4 py-2 text-xs font-mono tracking-widest disabled:opacity-30"
                style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
              >
                NEXT →
              </button>
            </div>
          )}
        </>
      )}

      {/* SCAN DETAILS & EVIDENCE MODAL */}
      {selectedScan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: '#050810DD', backdropFilter: 'blur(8px)' }}
          onClick={() => setSelectedScan(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 animate-slide-up relative"
            style={{
              background: 'linear-gradient(180deg, #090d1a 0%, #050810 100%)',
              border: '1px solid #00ff9f33',
              boxShadow: '0 0 30px #00ff9f15',
              clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{scanTypeIcon(selectedScan.type)}</span>
                  <h3 className="font-display font-bold text-base tracking-wider" style={{ color: '#00ff9f' }}>
                    {scanTypeLabel(selectedScan.type).toUpperCase()} VERIFICATION DETAILS
                  </h3>
                </div>
                <p className="font-mono text-xs text-slate-500">
                  ID: {selectedScan.id} · {formatDateTime(selectedScan.timestamp)}
                </p>
              </div>
              <button
                onClick={() => setSelectedScan(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Summary Box */}
            <div className="mb-4 p-3 bg-black/40 border border-slate-800 rounded">
              <p className="text-xs font-mono text-slate-400 mb-1">// SUBMITTED CONTENT / SUMMARY</p>
              <p className="text-sm font-mono text-slate-200">{selectedScan.input}</p>
            </div>

            {/* Risk rating banner */}
            <div className="flex items-center justify-between p-3 mb-4 rounded" style={{ background: '#00ff9f0a', border: '1px solid #00ff9f22' }}>
              <div>
                <p className="text-xs font-mono text-slate-400">RISK VERDICT</p>
                <p className="font-display font-bold text-lg" style={{ color: riskColor(selectedScan.result?.level || 'LOW') }}>
                  {selectedScan.result?.level || 'LOW'} RISK {selectedScan.result?.score != null && `(${selectedScan.result.score}/100)`}
                </p>
              </div>
              <RiskBadge level={selectedScan.result?.level || 'LOW'} />
            </div>

            {/* Findings List */}
            {selectedScan.findings?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-mono text-slate-400 mb-2">// SCAN FINDINGS ({selectedScan.findings.length})</p>
                <div className="flex flex-col gap-2">
                  {selectedScan.findings.map((f, idx) => (
                    <div key={idx} className="p-2.5 bg-black/30 border border-slate-800/80 rounded flex items-start gap-2">
                      <AlertTriangle size={14} className="mt-0.5 text-amber-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-mono font-bold text-slate-200">{f.title || f.phrase}</p>
                        <p className="text-xs font-mono text-slate-400">{f.description || f.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evidence Sources List */}
            {selectedScan.evidence?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-mono text-slate-400 mb-2">// EVIDENCE SOURCES & CITATIONS ({selectedScan.evidence.length})</p>
                <div className="flex flex-col gap-2">
                  {selectedScan.evidence.map((s, idx) => (
                    <div key={idx} className="p-2.5 bg-black/30 border border-slate-800/80 rounded flex items-center justify-between">
                      <div>
                        <p className="text-xs font-mono font-bold text-slate-200">{s.title || s.name}</p>
                        <p className="text-xs font-mono text-slate-400">{s.publisher || 'Verified Source'}</p>
                      </div>
                      {s.source_url && (
                        <a
                          href={s.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          View Source <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback Section */}
            <form onSubmit={handleFeedbackSubmit} className="pt-4 border-t border-slate-800">
              <p className="text-xs font-mono text-slate-400 mb-2">// SUBMIT OPERATOR FEEDBACK (feedback table)</p>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-slate-400">Rating:</span>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className="text-amber-400 hover:scale-110 transition-transform"
                  >
                    <Star size={16} fill={star <= rating ? '#fbbf24' : 'none'} />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={feedbackComment}
                  onChange={e => setFeedbackComment(e.target.value)}
                  placeholder="Optional operator notes or feedback..."
                  className="flex-1 px-3 py-2 text-xs font-mono bg-black/50 border border-slate-800 text-slate-200 rounded outline-none"
                />
                <button
                  type="submit"
                  disabled={feedbackSubmitting}
                  className="btn-neon px-3 py-2 text-xs font-mono whitespace-nowrap"
                >
                  {feedbackSubmitting ? 'SAVING...' : 'SAVE FEEDBACK'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
