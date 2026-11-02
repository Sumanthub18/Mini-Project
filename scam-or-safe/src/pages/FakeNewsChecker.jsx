import { useState } from 'react'
import {
  Newspaper, Trash2, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  HelpCircle, ExternalLink, Copy, Check, ChevronDown, ChevronUp, Share2,
  Layers, Globe, Shield, Sparkles, Scale, Info, CheckCheck
} from 'lucide-react'
import { analyzeNews, EXAMPLE_CLAIMS } from '../services/newsService.js'
import { useScanHistory } from '../hooks/useScanHistory.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../hooks/useToast.jsx'
import {
  SectionHeader, Card, Spinner
} from '../components/ResultComponents.jsx'
import { verdictColor } from '../utils/helpers.js'

const MAX_CHARS = 5000

const INPUT_TYPES = [
  { id: 'headline', label: 'Headline / Claim' },
  { id: 'social_forward', label: 'WhatsApp / Viral Forward' },
  { id: 'article', label: 'Article Excerpt' },
  { id: 'health_claim', label: 'Health & Science' },
]

const LANGUAGES = [
  { id: 'auto', label: 'Auto Detect' },
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'Hindi (हिंदी)' },
  { id: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
]

const VERDICT_THEMES = {
  SUPPORTED: {
    icon: CheckCircle2,
    color: '#00ff9f',
    bg: '#00ff9f12',
    border: '#00ff9f44',
    label: 'SUPPORTED BY EVIDENCE',
    badge: 'VERIFIED TRUE',
  },
  CONTRADICTED: {
    icon: XCircle,
    color: '#ff006e',
    bg: '#ff006e12',
    border: '#ff006e44',
    label: 'CONTRADICTED / DEBUNKED',
    badge: 'FALSE / FABRICATED',
  },
  MIXED: {
    icon: Scale,
    color: '#ffb800',
    bg: '#ffb80012',
    border: '#ffb80044',
    label: 'MIXED / PARTIALLY TRUE',
    badge: 'MISLEADING CONTEXT',
  },
  UNVERIFIED: {
    icon: HelpCircle,
    color: '#00d4ff',
    bg: '#00d4ff12',
    border: '#00d4ff44',
    label: 'UNVERIFIED CLAIM',
    badge: 'UNVERIFIED',
  },
  'INSUFFICIENT EVIDENCE': {
    icon: AlertTriangle,
    color: '#94a3b8',
    bg: '#94a3b812',
    border: '#94a3b844',
    label: 'INSUFFICIENT EVIDENCE',
    badge: 'NO EVIDENCE',
  },
}

export default function FakeNewsChecker() {
  const [input, setInput] = useState('')
  const [inputType, setInputType] = useState('headline')
  const [language, setLanguage] = useState('auto')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [expandedClaim, setExpandedClaim] = useState(0)
  const [copied, setCopied] = useState(false)

  const { user, session } = useAuth()
  const { addScan } = useScanHistory()
  const { addToast } = useToast()

  const handleAnalyze = async () => {
    setError('')
    if (input.trim().length < 5) {
      setError('// Minimum 5 characters required to initiate fact-check verification.')
      return
    }
    setLoading(true)
    setResult(null)

    try {
      const res = await analyzeNews(input.trim(), {
        inputType,
        language,
        authToken: session?.access_token,
        userId: user?.id,
      })

      setResult(res)

      // Add to user history in Supabase
      const level =
        res.verdict === 'CONTRADICTED' ? 'HIGH' : res.verdict === 'MIXED' ? 'MEDIUM' : 'LOW'

      addScan({
        type: 'NEWS',
        input: input.trim(),
        result: {
          ...res,
          level,
          score: res.confidence,
          summary: res.summary,
          warnings: (res.claims || []).map(c => ({
            phrase: c.claim,
            title: `Claim Verdict: ${c.verdict}`,
            reason: c.explanation,
            severity: c.verdict === 'CONTRADICTED' ? 'high' : 'medium',
          })),
          sources: (res.evidenceSources || []).map(s => ({
            name: s.publisher || s.title,
            title: s.title,
            url: s.source_url,
            summary: s.evidence_summary,
            published_at: s.published_at,
          })),
        },
      })

      addToast('Fact-checking and claim verification complete.', 'success')
    } catch (e) {
      setError(e.message || 'Fact-check analysis failed. Please try again.')
      addToast('Analysis failed.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setInput('')
    setResult(null)
    setError('')
  }

  const handleCopySummary = () => {
    if (!result) return
    const textToCopy = `[FACT CHECK REPORT: ${result.verdict}]\n\nSummary: ${result.summary}\n\nConfidence: ${result.confidenceLabel?.toUpperCase()}\nVerified via Scam or Safe? AI Fact-Check Engine`
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    addToast('Summary copied to clipboard.', 'info')
    setTimeout(() => setCopied(false), 2500)
  }

  const theme = VERDICT_THEMES[result?.verdict] || VERDICT_THEMES['UNVERIFIED']
  const VerdictIcon = theme.icon

  return (
    <div className="max-w-4xl mx-auto animate-slide-up pb-12">
      <SectionHeader
        title="FAKE NEWS CHECKER"
        subtitle="// AI-assisted claim extraction, Google Fact Check Tools & live evidence evaluation"
      />

      {/* Input Form */}
      {!result && (
        <Card className="flex flex-col gap-5">
          {/* Controls: Input Type & Language */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-900">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">// CONTENT TYPE:</span>
              <div className="flex flex-wrap gap-1">
                {INPUT_TYPES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setInputType(t.id)}
                    className="px-2.5 py-1 text-xs font-mono transition-all"
                    style={{
                      background: inputType === t.id ? '#bf00ff18' : '#050810',
                      border: `1px solid ${inputType === t.id ? '#bf00ff' : '#1e293b'}`,
                      color: inputType === t.id ? '#bf00ff' : '#94a3b8',
                      clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Globe size={13} className="text-slate-400" />
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="bg-slate-950 text-xs font-mono px-2 py-1 text-slate-300 border border-slate-800 outline-none"
              >
                {LANGUAGES.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              id="news-input"
              value={input}
              onChange={e => setInput(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Paste news headline, viral WhatsApp forward, social media claim, or speech excerpt..."
              rows={6}
              className="w-full px-4 py-3 text-sm resize-none font-mono transition-all"
              style={{
                background: '#050810',
                border: error ? '1px solid #ff006e' : '1px solid #bf00ff22',
                color: '#e2e8f0',
                outline: 'none',
                boxShadow: 'inset 0 0 20px #bf00ff04',
                clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
                lineHeight: 1.6,
              }}
              onFocus={e => !error && (e.currentTarget.style.borderColor = '#bf00ff66')}
              onBlur={e => !error && (e.currentTarget.style.borderColor = '#bf00ff22')}
              disabled={loading}
            />
          </div>

          <div className="flex justify-between items-center text-xs font-mono text-slate-500">
            <span>{input.length} / {MAX_CHARS} characters</span>
            {error && <p className="text-xs font-mono text-rose-400">// {error}</p>}
          </div>

          {/* Example Claims */}
          <div>
            <p className="text-xs font-mono text-slate-500 mb-2">// QUICK VIRAL EXAMPLES:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_CLAIMS.map((ex, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInput(ex)}
                  className="px-2.5 py-1 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors text-left"
                  style={{ background: '#050810', border: '1px solid #bf00ff18' }}
                >
                  › {ex.length > 55 ? ex.slice(0, 55) + '...' : ex}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleClear}
              disabled={loading || !input}
              className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={13} /> CLEAR
            </button>

            <button
              onClick={handleAnalyze}
              disabled={loading || !input.trim()}
              className="btn-neon-solid px-6 py-2.5 font-display text-xs tracking-widest uppercase flex items-center gap-2 disabled:opacity-40"
              style={{
                clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
              }}
            >
              {loading ? (
                <>
                  <Spinner size={14} color="#050810" /> VERIFYING CLAIMS...
                </>
              ) : (
                <>
                  <Newspaper size={14} /> VERIFY CONTENT
                </>
              )}
            </button>
          </div>
        </Card>
      )}

      {/* Loading HUD Animation */}
      {loading && (
        <Card className="flex flex-col items-center justify-center py-16 gap-4 animate-slide-up">
          <div className="relative">
            <Spinner size={48} color="#bf00ff" />
            <div className="absolute inset-0 rounded-full scan-pulse" style={{ boxShadow: '0 0 20px #bf00ff44' }} />
          </div>
          <p className="font-display text-xs tracking-widest" style={{ color: '#bf00ff', letterSpacing: '0.2em' }}>
            SCANNING PUBLIC FACT-CHECK ARCHIVES & CITATIONS...
          </p>
          <p className="font-mono text-xs text-slate-500">
            // querying Google Fact Check Tools API, news archives & evidence evaluators
          </p>
        </Card>
      )}

      {/* Results View */}
      {result && !loading && (
        <div className="flex flex-col gap-6 animate-slide-up">
          {/* Active Providers & Engine Status Bar */}
          <div
            className="p-3 text-xs font-mono flex items-center justify-between flex-wrap gap-2"
            style={{
              background: '#090d1a',
              border: '1px solid #bf00ff33',
              clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full scan-pulse" style={{ background: '#bf00ff', boxShadow: '0 0 6px #bf00ff' }} />
              <span style={{ color: '#e2e8f0' }}>
                FACT-CHECK ENGINE:{' '}
                <strong style={{ color: '#bf00ff' }}>
                  {result.providersUsed?.join(' + ') || 'Groq + Fact-Check Tools'}
                </strong>
                {' '}({result.executionTimeMs} ms)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySummary}
                className="px-2.5 py-1 text-xs font-mono flex items-center gap-1.5 transition-colors text-slate-300 hover:text-white border border-slate-800"
              >
                {copied ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {copied ? 'COPIED' : 'COPY SUMMARY'}
              </button>
              <button
                onClick={() => setResult(null)}
                className="px-2.5 py-1 text-xs font-mono flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 border border-cyan-900 bg-cyan-950/20"
              >
                <RefreshCw size={12} /> SCAN ANOTHER
              </button>
            </div>
          </div>

          {/* Overall Verdict Hero Card */}
          <Card
            style={{
              background: `linear-gradient(135deg, ${theme.bg} 0%, #050810 100%)`,
              border: `1px solid ${theme.border}`,
            }}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-4 border-b border-slate-900">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${theme.color}18`,
                    border: `1px solid ${theme.border}`,
                    clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
                  }}
                >
                  <VerdictIcon size={28} style={{ color: theme.color, filter: `drop-shadow(0 0 6px ${theme.color})` }} />
                </div>
                <div>
                  <span className="text-xs font-mono text-slate-400 block">// OVERALL FACT-CHECK VERDICT</span>
                  <h2
                    className="font-display font-bold text-xl md:text-2xl tracking-wider"
                    style={{ color: theme.color, textShadow: `0 0 12px ${theme.color}44` }}
                  >
                    {theme.label}
                  </h2>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono text-slate-400 block">// EVIDENCE CONFIDENCE</span>
                <span className="font-display font-bold text-xl uppercase" style={{ color: theme.color }}>
                  {result.confidenceLabel || 'Medium'} ({result.confidence}%)
                </span>
              </div>
            </div>

            {/* Summary */}
            <div className="mt-4">
              <p className="text-sm font-mono text-slate-200 leading-relaxed">
                {result.summary}
              </p>
            </div>
          </Card>

          {/* Section: Extracted Verifiable Claims */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-xs tracking-widest text-slate-300 flex items-center gap-2">
                <Layers size={14} style={{ color: '#bf00ff' }} />
                EXTRACTED FACTUAL CLAIMS ({result.claims?.length || 0})
              </h3>
              <span className="text-xs font-mono text-slate-500">// Evaluated individually</span>
            </div>

            <div className="flex flex-col gap-3">
              {result.claims?.map((c, idx) => {
                const isExp = expandedClaim === idx
                const cTheme = VERDICT_THEMES[c.verdict] || VERDICT_THEMES['UNVERIFIED']
                const CIcon = cTheme.icon

                return (
                  <div
                    key={idx}
                    className="p-4 transition-all"
                    style={{
                      background: '#090d1a',
                      border: `1px solid ${isExp ? cTheme.color + '44' : '#1e293b'}`,
                      clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                    }}
                  >
                    {/* Claim Accordion Header */}
                    <div
                      className="flex items-start justify-between gap-3 cursor-pointer"
                      onClick={() => setExpandedClaim(isExp ? -1 : idx)}
                    >
                      <div className="flex items-start gap-3">
                        <CIcon size={18} className="mt-0.5 flex-shrink-0" style={{ color: cTheme.color }} />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase"
                              style={{
                                background: cTheme.color + '15',
                                color: cTheme.color,
                                border: `1px solid ${cTheme.color}33`,
                              }}
                            >
                              {c.verdict}
                            </span>
                            <span className="text-xs font-mono text-slate-500">
                              Subject: <strong className="text-slate-300">{c.subject}</strong>
                            </span>
                          </div>
                          <p className="font-mono text-sm text-slate-200 font-medium">
                            "{c.claim}"
                          </p>
                        </div>
                      </div>

                      <button type="button" className="text-slate-500 hover:text-slate-300 p-1">
                        {isExp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>

                    {/* Accordion Content */}
                    {isExp && (
                      <div className="mt-4 pt-4 border-t border-slate-900 flex flex-col gap-3 font-mono text-xs animate-slide-up">
                        <div>
                          <span className="text-slate-500 block mb-1">// EXPLANATION</span>
                          <p className="text-slate-300">{c.explanation}</p>
                        </div>

                        {/* Evidence Points */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                          {/* Supporting Points */}
                          <div className="p-3 bg-emerald-950/10 border border-emerald-900/30">
                            <strong className="text-emerald-400 block mb-1.5 flex items-center gap-1.5">
                              <CheckCircle2 size={12} /> SUPPORTING POINTS ({c.supporting_evidence?.length || 0})
                            </strong>
                            {c.supporting_evidence?.length === 0 ? (
                              <p className="text-slate-500 italic">No supporting evidence identified.</p>
                            ) : (
                              <ul className="space-y-1 text-slate-300">
                                {c.supporting_evidence.map((s, sIdx) => (
                                  <li key={sIdx}>• {s.title || s.summary}</li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* Contradicting Points */}
                          <div className="p-3 bg-rose-950/10 border border-rose-950/40">
                            <strong className="text-rose-400 block mb-1.5 flex items-center gap-1.5">
                              <XCircle size={12} /> CONTRADICTING POINTS ({c.contradicting_evidence?.length || 0})
                            </strong>
                            {c.contradicting_evidence?.length === 0 ? (
                              <p className="text-slate-500 italic">No refuting records found.</p>
                            ) : (
                              <ul className="space-y-1 text-slate-300">
                                {c.contradicting_evidence.map((d, dIdx) => (
                                  <li key={dIdx}>• {d.title || d.summary}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>

                        {/* Next steps */}
                        {c.recommended_next_steps?.length > 0 && (
                          <div className="mt-2 text-slate-400">
                            <span className="text-slate-500 block mb-1">// RECOMMENDED STEPS:</span>
                            <ul className="space-y-0.5">
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
          </div>

          {/* Section: Certified Fact-Check Articles */}
          {result.factCheckSources?.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-950">
                <Shield size={16} style={{ color: '#bf00ff' }} />
                <h3 className="font-display font-bold text-xs tracking-wider" style={{ color: '#bf00ff' }}>
                  GOOGLE FACT CHECK ARCHIVES ({result.factCheckSources.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.factCheckSources.map((fc, idx) => (
                  <div
                    key={idx}
                    className="p-3 font-mono text-xs flex flex-col justify-between"
                    style={{ background: '#050810', border: '1px solid #bf00ff22' }}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-slate-200">{fc.publisher}</span>
                        <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold text-rose-400 border border-rose-900 bg-rose-950/20">
                          {fc.publisher_rating}
                        </span>
                      </div>
                      <p className="text-slate-400 line-clamp-2 mb-2">{fc.title}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-slate-500">
                      <span>{fc.review_date ? new Date(fc.review_date).toLocaleDateString() : 'Fact Check'}</span>
                      <a
                        href={fc.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        Read Review <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Section: Live Search & External Citations */}
          {result.evidenceSources?.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-950">
                <Globe size={16} style={{ color: '#00d4ff' }} />
                <h3 className="font-display font-bold text-xs tracking-wider" style={{ color: '#00d4ff' }}>
                  VERIFIED CITATIONS & LIVE SOURCES ({result.evidenceSources.length})
                </h3>
              </div>

              <div className="flex flex-col gap-2">
                {result.evidenceSources.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3 font-mono text-xs flex flex-col gap-1"
                    style={{ background: '#050810', border: '1px solid #00d4ff18' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.2 text-[9px] uppercase border text-cyan-300 border-cyan-800 bg-cyan-950/20">
                          {s.authority?.category || 'News Source'}
                        </span>
                        <strong className="text-slate-200">{s.publisher || 'Reference'}</strong>
                      </div>
                      {s.source_url && (
                        <a
                          href={s.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                        >
                          View Source <ExternalLink size={10} />
                        </a>
                      )}
                    </div>

                    <p className="text-slate-300 font-medium">{s.title}</p>
                    {s.evidence_summary && (
                      <p className="text-slate-500 line-clamp-2">{s.evidence_summary}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Section: Limitations & Safety Advice */}
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Info size={15} style={{ color: '#ffb800' }} />
              <h4 className="font-display font-bold text-xs tracking-wider text-slate-300">
                METHODOLOGY & LIMITATIONS
              </h4>
            </div>
            <ul className="text-xs font-mono text-slate-400 space-y-1">
              {result.limitations?.map((lim, idx) => (
                <li key={idx}>• {lim}</li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  )
}
