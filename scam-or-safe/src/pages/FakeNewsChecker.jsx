import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Newspaper,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Globe,
  FileText,
  ExternalLink,
  Copy,
  CheckCheck,
  Trash2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Shield,
  Info,
  Link2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useScanHistory } from '../hooks/useScanHistory.jsx'
import { useToast } from '../hooks/useToast.jsx'
import { EXAMPLE_CLAIMS, getNewsEngineHealth, analyzeNews } from '../services/newsService.js'
import { SectionHeader, Spinner } from '../components/ResultComponents.jsx'
import { copyToClipboard } from '../utils/helpers.js'

const VERDICT_THEMES = {
  SUPPORTED: {
    color: '#5EE6A8',
    bg: 'rgba(94, 230, 168, 0.1)',
    border: 'rgba(94, 230, 168, 0.35)',
    label: 'SUPPORTED BY CREDIBLE SOURCES',
    icon: CheckCircle2,
  },
  CONTRADICTED: {
    color: '#FF5B78',
    bg: 'rgba(255, 91, 120, 0.1)',
    border: 'rgba(255, 91, 120, 0.35)',
    label: 'CONTRADICTED / FALSE CLAIM',
    icon: XCircle,
  },
  MIXED: {
    color: '#FFBF69',
    bg: 'rgba(255, 191, 105, 0.1)',
    border: 'rgba(255, 191, 105, 0.35)',
    label: 'MIXED / MISLEADING CONTEXT',
    icon: AlertTriangle,
  },
  UNVERIFIED: {
    color: '#00E5FF',
    bg: 'rgba(0, 229, 255, 0.1)',
    border: 'rgba(0, 229, 255, 0.35)',
    label: 'UNVERIFIED CLAIM',
    icon: HelpCircle,
  },
  'INSUFFICIENT EVIDENCE': {
    color: '#A78BFA',
    bg: 'rgba(167, 139, 250, 0.1)',
    border: 'rgba(167, 139, 250, 0.35)',
    label: 'INSUFFICIENT EVIDENCE',
    icon: Info,
  },
}

const INPUT_MODES = [
  { id: 'claim', label: 'Headline / Claim', icon: MessageSquareClaimIcon },
  { id: 'article', label: 'Article / Long Excerpt', icon: FileText },
]

function MessageSquareClaimIcon(props) {
  return <Newspaper {...props} />
}

const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'kn', label: 'Kannada' },
  { id: 'hi', label: 'Hindi' },
]

const MAX_CHARS = 5000

export default function FakeNewsChecker() {
  const { user, session } = useAuth()
  const { addScan } = useScanHistory()
  const { toast } = useToast()

  const [inputMode, setInputMode] = useState('claim')
  const [language, setLanguage] = useState('en')
  const [input, setInput] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [expandedClaim, setExpandedClaim] = useState(0)
  const [engineReady, setEngineReady] = useState(null)

  useEffect(() => {
    let active = true
    getNewsEngineHealth()
      .then((h) => active && setEngineReady(Boolean(h)))
      .catch(() => active && setEngineReady(false))
    return () => {
      active = false
    }
  }, [])

  const handleAnalyze = async () => {
    const trimmed = input.trim()
    if (!trimmed) {
      setError('Enter a headline, viral claim, or article excerpt to fact-check.')
      return
    }
    setError('')
    setLoading(true)
    setResult(null)
    setExpandedClaim(0)

    try {
      const payloadText = sourceUrl.trim()
        ? `${trimmed}\n\n[Source URL provided by user: ${sourceUrl.trim()}]`
        : trimmed

      const res = await analyzeNews(payloadText, {
        inputType: inputMode,
        language,
        authToken: session?.access_token,
        userId: user?.id,
      })

      setResult(res)
      const mappedRisk =
        res.verdict === 'CONTRADICTED'
          ? 'high'
          : res.verdict === 'MIXED' || res.verdict === 'UNVERIFIED'
          ? 'medium'
          : 'low'
      const mappedScore =
        res.verdict === 'CONTRADICTED'
          ? 85
          : res.verdict === 'MIXED'
          ? 55
          : res.verdict === 'UNVERIFIED' || res.verdict === 'INSUFFICIENT EVIDENCE'
          ? 40
          : 15

      await addScan({
        type: 'news',
        target: trimmed.slice(0, 120),
        riskScore: mappedScore,
        riskLevel: mappedRisk,
        verdict: res.verdict,
        summary: res.summary,
        result: res,
      })
      toast.success('Fact-check analysis completed.')
    } catch (err) {
      const msg = err.message || 'Fact-check service could not complete this verification.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleCopySummary = async () => {
    if (!result) return
    await copyToClipboard(
      `TrustLens AI Fact-Check\nVerdict: ${result.verdict}\nConfidence: ${result.confidenceLabel} (${result.confidence}%)\nSummary: ${result.summary}`
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const theme = VERDICT_THEMES[result?.verdict] || VERDICT_THEMES.UNVERIFIED
  const VerdictIcon = theme.icon

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SectionHeader
        badge="MISINFORMATION & CLAIM VERIFICATION"
        title="Editorial Fact-Check Studio"
        subtitle="Separate verified claims from viral rumors by cross-referencing published fact-check archives, live search citations, and evidence reasoning."
      />

      {/* Input Workspace */}
      {!result && (
        <div className="tl-glass-card p-5 sm:p-6 space-y-5">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {INPUT_MODES.map((m) => {
                const Icon = m.icon
                const active = inputMode === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setInputMode(m.id)}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all"
                    style={
                      active
                        ? {
                            background: 'linear-gradient(135deg, rgba(167,139,250,0.34), rgba(0,229,255,0.16))',
                            border: '1px solid rgba(167,139,250,0.5)',
                            color: '#F4F2FF',
                          }
                        : {
                            background: 'rgba(13,8,48,0.55)',
                            border: '1px solid rgba(196,178,255,0.14)',
                            color: 'rgba(236,232,255,0.68)',
                          }
                    }
                  >
                    <Icon className="w-3.5 h-3.5 text-[#A78BFA]" />
                    {m.label}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-3">
              {engineReady !== null && (
                <span className="text-[11px] font-mono flex items-center gap-1.5 text-[rgba(236,232,255,0.65)]">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: engineReady ? '#5EE6A8' : '#FFBF69' }}
                  />
                  {engineReady ? 'Fact Engine Ready' : 'Limited Archive Mode'}
                </span>
              )}

              <label
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs"
                style={{
                  background: 'rgba(13,8,48,0.6)',
                  border: '1px solid rgba(196,178,255,0.16)',
                }}
              >
                <Globe className="w-3.5 h-3.5 text-[#00E5FF]" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-transparent text-[#F4F2FF] font-mono text-xs focus:outline-none cursor-pointer"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id} className="bg-[#17113D]">
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Main Claim Input */}
          <div className="space-y-3">
            <textarea
              id="news-input"
              rows={6}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Paste a news headline, viral forward, policy rumor, health claim, or article excerpt..."
              disabled={loading}
              className="w-full p-4 rounded-2xl text-sm text-[#F4F2FF] placeholder-[rgba(236,232,255,0.4)] resize-none focus:outline-none focus:border-[#A78BFA]/60 transition-colors"
              style={{
                background: 'rgba(13,8,48,0.68)',
                border: error ? '1px solid #FF5B78' : '1px solid rgba(196,178,255,0.16)',
                lineHeight: 1.65,
              }}
            />

            {/* Optional article / source reference */}
            <div className="relative">
              <Link2 className="w-4 h-4 text-[rgba(236,232,255,0.42)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="Optional: Paste original source article URL for context reference..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-mono text-[#F4F2FF] placeholder-[rgba(236,232,255,0.38)] focus:outline-none focus:border-[#00E5FF]/50"
                style={{
                  background: 'rgba(13,8,48,0.55)',
                  border: '1px solid rgba(196,178,255,0.14)',
                }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] font-mono text-[rgba(236,232,255,0.5)]">
              <span>{input.length} / {MAX_CHARS} characters</span>
              {error && <span className="text-[#FF5B78]">{error}</span>}
            </div>
          </div>

          {/* Example viral claims */}
          <div className="space-y-2">
            <p className="text-[11px] font-mono uppercase tracking-wider text-[rgba(236,232,255,0.52)]">
              Quick Sample Claims
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_CLAIMS.map((ex, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInput(ex)
                    setError('')
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs text-left text-[rgba(236,232,255,0.75)] hover:text-[#F4F2FF] transition-colors"
                  style={{
                    background: 'rgba(13,8,48,0.55)',
                    border: '1px solid rgba(196,178,255,0.14)',
                  }}
                >
                  {ex.length > 64 ? `${ex.slice(0, 64)}...` : ex}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'rgba(196,178,255,0.12)' }}>
            <button
              type="button"
              onClick={() => {
                setInput('')
                setSourceUrl('')
                setError('')
              }}
              disabled={loading || (!input && !sourceUrl)}
              className="tl-btn-ghost text-xs py-2.5 px-4 disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || !input.trim()}
              className="tl-btn-primary text-xs py-2.5 px-5 disabled:opacity-40"
            >
              {loading ? (
                <>
                  <Spinner size={14} color="#F4F2FF" /> Verifying Claims...
                </>
              ) : (
                <>
                  <Newspaper className="w-3.5 h-3.5" /> Verify Claim
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="tl-glass-card p-12 flex flex-col items-center justify-center text-center gap-4">
          <Spinner size={44} color="#A78BFA" />
          <div>
            <p className="font-display font-semibold text-base text-[#F4F2FF]">
              Checking Published Fact-Check Archives &amp; Citations
            </p>
            <p className="text-xs font-mono text-[rgba(236,232,255,0.58)] mt-1">
              Distinguishing verified third-party fact-checks from AI evidence analysis...
            </p>
          </div>
        </div>
      )}

      {/* Results View */}
      {result && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Engine status & actions */}
          <div className="tl-glass rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-mono flex items-center gap-2 text-[rgba(236,232,255,0.78)]">
              <span className="w-2 h-2 rounded-full bg-[#A78BFA]" />
              <span>
                Providers:{' '}
                <strong className="text-[#F4F2FF]">
                  {result.providersUsed?.join(' + ') || 'Fact-Check Engine'}
                </strong>{' '}
                ({result.executionTimeMs || 0} ms)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleCopySummary} className="tl-btn-ghost text-xs py-1.5 px-3">
                {copied ? <CheckCheck className="w-3.5 h-3.5 text-[#5EE6A8]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Summary'}
              </button>
              <button type="button" onClick={() => setResult(null)} className="tl-btn-ghost text-xs py-1.5 px-3">
                <RefreshCw className="w-3.5 h-3.5" /> Verify Another
              </button>
            </div>
          </div>

          {/* Editorial Verdict Card */}
          <div
            className="tl-glass-card p-6 space-y-4"
            style={{
              background: `linear-gradient(135deg, ${theme.bg}, rgba(23,17,61,0.85))`,
              borderColor: theme.border,
            }}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'rgba(196,178,255,0.14)' }}>
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: theme.bg, border: `1px solid ${theme.border}` }}
                >
                  <VerdictIcon className="w-6 h-6" style={{ color: theme.color }} />
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[rgba(236,232,255,0.58)]">
                    Overall Fact-Check Verdict
                  </span>
                  <h2 className="font-display text-xl sm:text-2xl font-bold mt-0.5" style={{ color: theme.color }}>
                    {theme.label}
                  </h2>
                </div>
              </div>

              <div className="md:text-right">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[rgba(236,232,255,0.58)] block">
                  Evidence Confidence
                </span>
                <span className="font-display text-xl font-bold" style={{ color: theme.color }}>
                  {result.confidenceLabel || 'Medium'} ({result.confidence ?? 0}%)
                </span>
              </div>
            </div>

            <p className="text-sm text-[rgba(236,232,255,0.9)] leading-relaxed">
              {result.summary}
            </p>
          </div>

          {/* 1. Published Fact-Checker Archives (Strictly separated from AI) */}
          <div className="tl-glass-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-[#F4F2FF] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#00E5FF]" />
                Published Fact-Checker Reviews ({result.factCheckSources?.length || 0})
              </h3>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/25">
                Independent Archives
              </span>
            </div>

            {!result.factCheckSources?.length ? (
              <p className="text-xs text-[rgba(236,232,255,0.62)] py-2">
                No exact matching article found in Google Fact Check Tools archives for this phrasing.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.factCheckSources.map((fc, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl flex flex-col justify-between gap-2"
                    style={{
                      background: 'rgba(13,8,48,0.62)',
                      border: '1px solid rgba(196,178,255,0.14)',
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-[#F4F2FF]">{fc.publisher}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase text-[#FFBF69] bg-[#FFBF69]/10 border border-[#FFBF69]/30">
                          {fc.publisher_rating}
                        </span>
                      </div>
                      <p className="text-xs text-[rgba(236,232,255,0.75)] line-clamp-2">{fc.title}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t text-[11px] font-mono text-[rgba(236,232,255,0.52)]" style={{ borderColor: 'rgba(196,178,255,0.1)' }}>
                      <span>{fc.review_date ? new Date(fc.review_date).toLocaleDateString() : 'Date unavailable'}</span>
                      {fc.source_url && (
                        <a
                          href={fc.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#00E5FF] hover:underline flex items-center gap-1"
                        >
                          Read Review <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Extracted Claims & TrustLens AI Evidence Analysis */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-[#F4F2FF]">
                TrustLens AI Claim Breakdown ({result.claims?.length || 0})
              </h3>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#A78BFA]/10 text-[#A78BFA] border border-[#A78BFA]/25">
                AI + Evidence Assessment
              </span>
            </div>

            {(result.claims || []).map((c, idx) => {
              const isExp = expandedClaim === idx
              const cTheme = VERDICT_THEMES[c.verdict] || VERDICT_THEMES.UNVERIFIED
              const CIcon = cTheme.icon
              return (
                <div
                  key={idx}
                  className="tl-glass-card p-4 transition-all"
                  style={{ borderColor: isExp ? cTheme.border : undefined }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedClaim(isExp ? -1 : idx)}
                    className="w-full flex items-start justify-between gap-3 text-left"
                  >
                    <div className="flex items-start gap-3">
                      <CIcon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: cTheme.color }} />
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase"
                            style={{ background: cTheme.bg, color: cTheme.color, border: `1px solid ${cTheme.border}` }}
                          >
                            {c.verdict}
                          </span>
                          {c.subject && (
                            <span className="text-xs font-mono text-[rgba(236,232,255,0.58)]">
                              Topic: <strong className="text-[#F4F2FF]">{c.subject}</strong>
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#F4F2FF] font-medium">&ldquo;{c.claim}&rdquo;</p>
                      </div>
                    </div>
                    {isExp ? (
                      <ChevronUp className="w-4 h-4 text-[rgba(236,232,255,0.6)] flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[rgba(236,232,255,0.6)] flex-shrink-0" />
                    )}
                  </button>

                  {isExp && (
                    <div className="mt-4 pt-4 border-t space-y-3 text-xs" style={{ borderColor: 'rgba(196,178,255,0.12)' }}>
                      <p className="text-[rgba(236,232,255,0.84)] leading-relaxed">{c.explanation}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div
                          className="p-3 rounded-xl"
                          style={{ background: 'rgba(94,230,168,0.07)', border: '1px solid rgba(94,230,168,0.24)' }}
                        >
                          <p className="font-mono font-semibold text-[#5EE6A8] mb-1.5 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Supporting Evidence ({c.supporting_evidence?.length || 0})
                          </p>
                          {!c.supporting_evidence?.length ? (
                            <p className="text-[rgba(236,232,255,0.55)] italic">No supporting evidence returned.</p>
                          ) : (
                            <ul className="space-y-1 text-[rgba(236,232,255,0.82)]">
                              {c.supporting_evidence.map((s, sIdx) => (
                                <li key={sIdx}>• {s.title || s.summary}</li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div
                          className="p-3 rounded-xl"
                          style={{ background: 'rgba(255,91,120,0.07)', border: '1px solid rgba(255,91,120,0.24)' }}
                        >
                          <p className="font-mono font-semibold text-[#FF5B78] mb-1.5 flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" /> Contradicting Evidence ({c.contradicting_evidence?.length || 0})
                          </p>
                          {!c.contradicting_evidence?.length ? (
                            <p className="text-[rgba(236,232,255,0.55)] italic">No refuting evidence returned.</p>
                          ) : (
                            <ul className="space-y-1 text-[rgba(236,232,255,0.82)]">
                              {c.contradicting_evidence.map((d, dIdx) => (
                                <li key={dIdx}>• {d.title || d.summary}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      {c.recommended_next_steps?.length > 0 && (
                        <div className="pt-1">
                          <span className="font-mono text-[rgba(236,232,255,0.55)] block mb-1">Recommended Next Steps:</span>
                          <ul className="space-y-0.5 text-[rgba(236,232,255,0.82)]">
                            {c.recommended_next_steps.map((rec, rIdx) => (
                              <li key={rIdx}>› {rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 3. Live Evidence Citations */}
          {result.evidenceSources?.length > 0 && (
            <div className="tl-glass-card p-5 space-y-3">
              <h3 className="font-display text-sm font-semibold text-[#F4F2FF] flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#00E5FF]" />
                External Evidence &amp; News Citations ({result.evidenceSources.length})
              </h3>
              <div className="space-y-2.5">
                {result.evidenceSources.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl flex flex-col gap-1 text-xs"
                    style={{ background: 'rgba(13,8,48,0.6)', border: '1px solid rgba(196,178,255,0.12)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/25">
                          {s.authority?.category || 'Source'}
                        </span>
                        <strong className="text-[#F4F2FF]">{s.publisher || 'Reference'}</strong>
                      </div>
                      {s.source_url && (
                        <a
                          href={s.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#00E5FF] hover:underline flex items-center gap-1 font-mono"
                        >
                          View Source <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-[rgba(236,232,255,0.88)] font-medium">{s.title}</p>
                    {s.evidence_summary && (
                      <p className="text-[rgba(236,232,255,0.62)]">{s.evidence_summary}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Methodology & Limitations */}
          {result.limitations?.length > 0 && (
            <div className="tl-glass-card p-5 space-y-2">
              <h4 className="font-display text-xs font-semibold uppercase tracking-wider text-[#FFBF69] flex items-center gap-2">
                <Info className="w-4 h-4" /> Methodology &amp; Limitations
              </h4>
              <ul className="text-xs text-[rgba(236,232,255,0.72)] space-y-1">
                {result.limitations.map((lim, idx) => (
                  <li key={idx}>• {lim}</li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
