import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Link2,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Globe,
  Server,
  Clock,
  ArrowRight,
  Copy,
  CheckCheck,
  Trash2,
  Search,
  Lock,
  Unlock,
  Info,
  Activity,
  Cpu,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useScanHistory } from '../hooks/useScanHistory.jsx'
import { useToast } from '../hooks/useToast.jsx'
import {
  EXAMPLE_URLS,
  isValidUrl,
  getUrlEngineHealth,
  analyzeUrl,
} from '../services/urlService.js'
import { saveScan } from '../services/scanDatabaseService.js'
import { RiskGauge, RiskBadge, SectionHeader } from '../components/ResultComponents.jsx'
import { copyToClipboard, riskColor, normalizeRiskLevel } from '../utils/helpers.js'

export default function URLChecker() {
  const location = useLocation()
  const { user, session } = useAuth()
  const { addScan } = useScanHistory()
  const { toast } = useToast()

  const [urlInput, setUrlInput] = useState(() => location.state?.initialUrl || '')
  const [checkRedirects, setCheckRedirects] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [healthStatus, setHealthStatus] = useState(null)

  useEffect(() => {
    let active = true
    getUrlEngineHealth()
      .then((h) => active && setHealthStatus(h))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const handleAnalyze = async (targetOverride) => {
    const raw = (typeof targetOverride === 'string' ? targetOverride : urlInput).trim()
    if (!raw) {
      setError('Enter a URL or domain to inspect safely.')
      return
    }
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    if (!isValidUrl(candidate)) {
      setError('Please enter a valid http:// or https:// URL.')
      return
    }

    setError('')
    setLoading(true)
    setResult(null)

    try {
      const res = await analyzeUrl(candidate, {
        checkRedirects,
        authToken: session?.access_token,
        userId: user?.id,
      })
      const normalized = {
        ...res,
        url: res.normalized_url || candidate,
      }
      setResult(normalized)

      const score = Number(normalized.score ?? 0)
      const level = normalizeRiskLevel(normalized.level)

      if (user?.id) {
        await saveScan(user.id, {
          scanType: 'url',
          target: normalized.url,
          riskScore: score,
          riskLevel: level,
          summary: normalized.summary,
          rawResult: normalized,
        }).catch(() => {})
      }

      await addScan({
        type: 'url',
        target: normalized.url,
        riskScore: score,
        riskLevel: level,
        summary: normalized.summary,
        result: normalized,
      })

      toast.success('URL safety inspection completed.')
    } catch (err) {
      const msg = err.message || 'URL inspection failed. Verify backend connection.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyUrl = async (text) => {
    await copyToClipboard(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const gs = result?.threat_intelligence?.google_safe_browsing
  const vt = result?.threat_intelligence?.virustotal
  const di = result?.domain_intelligence

  const gsConfigured = Boolean(gs?.configured) && gs?.status !== 'unavailable' && gs?.status !== 'offline'
  const vtConfigured = Boolean(vt?.configured) && vt?.status !== 'unavailable' && vt?.status !== 'offline'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SectionHeader
        badge="URL SAFETY & DOMAIN INTELLIGENCE"
        title="Safe Link Inspector"
        subtitle="Inspect suspicious links without opening them directly. Combines RDAP domain intelligence, lookalike heuristics, redirect SSRF defense, Google Safe Browsing, and VirusTotal."
      />

      {/* Engine Readiness Pills */}
      {healthStatus && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <span
            className="px-3 py-1 rounded-full flex items-center gap-1.5"
            style={{
              background: healthStatus.providers?.google_safe_browsing?.configured
                ? 'rgba(94,230,168,0.12)'
                : 'rgba(196,178,255,0.08)',
              border: `1px solid ${
                healthStatus.providers?.google_safe_browsing?.configured
                  ? 'rgba(94,230,168,0.34)'
                  : 'rgba(196,178,255,0.18)'
              }`,
              color: healthStatus.providers?.google_safe_browsing?.configured ? '#5EE6A8' : 'rgba(236,232,255,0.68)',
            }}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Google Safe Browsing:{' '}
            {healthStatus.providers?.google_safe_browsing?.configured ? 'Active' : 'Unconfigured'}
          </span>

          <span
            className="px-3 py-1 rounded-full flex items-center gap-1.5"
            style={{
              background: healthStatus.providers?.virustotal?.configured
                ? 'rgba(0,229,255,0.12)'
                : 'rgba(196,178,255,0.08)',
              border: `1px solid ${
                healthStatus.providers?.virustotal?.configured
                  ? 'rgba(0,229,255,0.34)'
                  : 'rgba(196,178,255,0.18)'
              }`,
              color: healthStatus.providers?.virustotal?.configured ? '#00E5FF' : 'rgba(236,232,255,0.68)',
            }}
          >
            <Server className="w-3.5 h-3.5" />
            VirusTotal: {healthStatus.providers?.virustotal?.configured ? 'Active' : 'Optional'}
          </span>

          <span
            className="px-3 py-1 rounded-full flex items-center gap-1.5"
            style={{
              background: 'rgba(111,120,255,0.14)',
              border: '1px solid rgba(111,120,255,0.32)',
              color: '#A78BFA',
            }}
          >
            <Globe className="w-3.5 h-3.5" />
            Authoritative RDAP + WHOIS: Active
          </span>
        </div>
      )}

      {/* URL Input Console */}
      <div className="tl-glass-card p-5 sm:p-6 space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleAnalyze()
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Link2 className="w-4 h-4 text-[#00E5FF] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value)
                setError('')
              }}
              placeholder="Paste URL safely without visiting (e.g. https://paypa1-verify.xyz/login)"
              disabled={loading}
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-mono text-[#F4F2FF] placeholder-[rgba(236,232,255,0.38)] focus:outline-none focus:border-[#00E5FF]/55 transition-colors"
              style={{
                background: 'rgba(13,8,48,0.72)',
                border: error ? '1px solid #FF5B78' : '1px solid rgba(196,178,255,0.18)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !urlInput.trim()}
            className="tl-btn-primary px-6 py-3 text-xs whitespace-nowrap disabled:opacity-40"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Inspecting...' : 'Inspect Link'}
          </button>
        </form>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <label className="inline-flex items-center gap-2 text-[rgba(236,232,255,0.75)] cursor-pointer">
            <input
              type="checkbox"
              checked={checkRedirects}
              onChange={(e) => setCheckRedirects(e.target.checked)}
              className="accent-[#00E5FF]"
            />
            <span>Trace HTTP redirect chain safely (with private-IP SSRF blocking)</span>
          </label>
          {error && <span className="font-mono text-[#FF5B78]">{error}</span>}
        </div>

        {/* Examples */}
        <div className="pt-3 border-t flex flex-wrap items-center gap-2" style={{ borderColor: 'rgba(196,178,255,0.12)' }}>
          <span className="text-[11px] font-mono text-[rgba(236,232,255,0.5)]">Sample URLs:</span>
          {EXAMPLE_URLS.map((ex, i) => {
            const label = typeof ex === 'string' ? ex : ex.label || ex.url
            const value = typeof ex === 'string' ? ex : ex.url
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setUrlInput(value)
                  setError('')
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-[rgba(236,232,255,0.74)] hover:text-[#00E5FF] transition-colors"
                style={{
                  background: 'rgba(13,8,48,0.55)',
                  border: '1px solid rgba(196,178,255,0.14)',
                }}
              >
                {label}
              </button>
            )
          })}
          {urlInput && (
            <button
              type="button"
              onClick={() => {
                setUrlInput('')
                setResult(null)
                setError('')
              }}
              className="ml-auto text-[11px] font-mono text-[rgba(236,232,255,0.55)] hover:text-[#FF5B78] flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Animated Scanning Beam State */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="tl-glass-card p-10 relative overflow-hidden flex flex-col items-center justify-center text-center gap-4"
          >
            <motion.div
              aria-hidden="true"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-0 left-0 h-0.5 w-1/2"
              style={{ background: 'linear-gradient(90deg, transparent, #00E5FF, #6F78FF, transparent)' }}
            />
            <Activity className="w-10 h-10 text-[#00E5FF] animate-pulse" />
            <div>
              <p className="font-display font-semibold text-base text-[#F4F2FF]">
                Running Multi-Layer URL Inspection
              </p>
              <p className="text-xs font-mono text-[rgba(236,232,255,0.58)] mt-1">
                Querying authoritative RDAP records, lookalike heuristics, Safe Browsing &amp; VirusTotal...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results View */}
      {result && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Risk Score + Target Summary */}
          <div className="tl-glass-card p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-4 flex flex-col items-center">
              <RiskGauge score={result.score ?? 0} level={normalizeRiskLevel(result.level)} size={156} />
              <div className="mt-3">
                <RiskBadge level={normalizeRiskLevel(result.level)} />
              </div>
              {result.execution_time_ms && (
                <p className="mt-2 text-[11px] font-mono text-[rgba(236,232,255,0.55)] flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {result.execution_time_ms} ms
                </p>
              )}
            </div>

            <div className="md:col-span-8 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {result.level === 'HIGH' && <ShieldAlert className="text-[#FF5B78]" size={20} />}
                  {result.level === 'MEDIUM' && <AlertTriangle className="text-[#FFBF69]" size={20} />}
                  {result.level === 'LOW' && <ShieldCheck className="text-[#5EE6A8]" size={20} />}
                  <h2
                    className="font-display text-lg sm:text-xl font-bold"
                    style={{ color: riskColor(normalizeRiskLevel(result.level)) }}
                  >
                    {result.level} RISK ASSESSMENT
                  </h2>
                </div>
              </div>

              <div
                className="px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-2"
                style={{ background: 'rgba(13,8,48,0.68)', border: '1px solid rgba(196,178,255,0.16)' }}
              >
                <p className="text-xs font-mono text-[#00E5FF] truncate">{result.url}</p>
                <button
                  type="button"
                  onClick={() => handleCopyUrl(result.url)}
                  className="text-xs font-mono text-[rgba(236,232,255,0.65)] hover:text-[#F4F2FF] flex items-center gap-1 flex-shrink-0"
                >
                  {copied ? <CheckCheck className="w-3.5 h-3.5 text-[#5EE6A8]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <p className="text-sm text-[rgba(236,232,255,0.88)] leading-relaxed">{result.summary}</p>

              <p className="text-[11px] text-[rgba(236,232,255,0.58)] flex items-start gap-1.5 italic">
                <Info className="w-3.5 h-3.5 text-[#FFBF69] flex-shrink-0 mt-0.5" />
                <span>
                  {result.security_disclaimer ||
                    'Safety note: Absence of a blacklist match does not prove a URL is 100% safe. Treat risk scores as technical assessments, not validated probabilities.'}
                </span>
              </p>
            </div>
          </div>

          {/* Domain & RDAP Intelligence + Threat Intel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Domain & RDAP Intelligence */}
            <div className="tl-glass-card p-5 space-y-3">
              <h3 className="font-display text-sm font-semibold text-[#F4F2FF] flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#00E5FF]" />
                Domain &amp; RDAP Intelligence
              </h3>

              <div className="divide-y text-xs" style={{ borderColor: 'rgba(196,178,255,0.1)' }}>
                <div className="py-2 flex items-center justify-between gap-2">
                  <span className="text-[rgba(236,232,255,0.6)]">Hostname</span>
                  <span className="font-mono text-[#F4F2FF] truncate max-w-[60%]">{di?.hostname || 'N/A'}</span>
                </div>

                <div className="py-2 flex items-center justify-between gap-2">
                  <span className="text-[rgba(236,232,255,0.6)]">Transport Protocol</span>
                  <span
                    className="font-mono font-semibold flex items-center gap-1"
                    style={{ color: di?.is_https ? '#5EE6A8' : '#FF5B78' }}
                  >
                    {di?.is_https ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    {di?.is_https ? 'HTTPS Encrypted' : 'Plain HTTP (Unencrypted)'}
                  </span>
                </div>

                <div className="py-2 flex items-center justify-between gap-2">
                  <span className="text-[rgba(236,232,255,0.6)]">Root Domain &amp; TLD</span>
                  <span className="font-mono text-[#F4F2FF]">
                    {di?.root_domain || '—'} {di?.tld ? `(.${di.tld})` : ''}
                  </span>
                </div>

                <div className="py-2 flex items-center justify-between gap-2">
                  <span className="text-[rgba(236,232,255,0.6)]">Domain Age</span>
                  <span
                    className="font-mono font-semibold text-right"
                    style={{
                      color: di?.domain_age?.includes('NEWLY') ? '#FF5B78' : '#F4F2FF',
                    }}
                  >
                    {di?.domain_age || 'Not publicly disclosed'}
                  </span>
                </div>

                {di?.registration_date && (
                  <div className="py-2 flex items-center justify-between gap-2">
                    <span className="text-[rgba(236,232,255,0.6)]">Registration Date</span>
                    <span className="font-mono text-[#00E5FF]">
                      {String(di.registration_date).slice(0, 10)}
                    </span>
                  </div>
                )}

                <div className="py-2 flex items-center justify-between gap-2">
                  <span className="text-[rgba(236,232,255,0.6)]">Registrar</span>
                  <span
                    title={di?.registrar || 'Unavailable'}
                    className="font-mono text-[#F4F2FF] truncate max-w-[60%] text-right"
                  >
                    {di?.registrar || 'Unavailable'}
                  </span>
                </div>

                <div className="py-2 flex items-center justify-between gap-2">
                  <span className="text-[rgba(236,232,255,0.6)]">Host Structure</span>
                  <span className="font-mono text-[#A78BFA]">
                    {di?.is_ip
                      ? 'Direct IP Host'
                      : di?.is_punycode
                      ? 'Punycode / Homograph'
                      : 'Standard FQDN'}
                  </span>
                </div>
              </div>

              {di?.matched_keywords?.length > 0 && (
                <div className="pt-2">
                  <p className="text-[11px] font-mono text-[#FFBF69] mb-1.5">Suspicious Keywords in URL:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {di.matched_keywords.map((k, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#FF5B78]/12 text-[#FF5B78] border border-[#FF5B78]/30"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {di?.is_shortener && (
                <div className="p-2.5 rounded-xl text-xs font-mono text-[#FFBF69] bg-[#FFBF69]/10 border border-[#FFBF69]/30">
                  Shortened URL detected — true destination is masked until traced.
                </div>
              )}
            </div>

            {/* External Threat Intelligence Cards */}
            <div className="tl-glass-card p-5 space-y-4">
              <h3 className="font-display text-sm font-semibold text-[#F4F2FF] flex items-center gap-2">
                <Server className="w-4 h-4 text-[#A78BFA]" />
                External Threat Intelligence
              </h3>

              {/* Google Safe Browsing */}
              <div
                className="p-4 rounded-xl space-y-2"
                style={{ background: 'rgba(13,8,48,0.6)', border: '1px solid rgba(196,178,255,0.14)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#F4F2FF]">Google Safe Browsing</span>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                    style={{
                      background: gs?.match_found
                        ? 'rgba(255,91,120,0.16)'
                        : gsConfigured
                        ? 'rgba(94,230,168,0.14)'
                        : 'rgba(255,191,105,0.14)',
                      color: gs?.match_found ? '#FF5B78' : gsConfigured ? '#5EE6A8' : '#FFBF69',
                      border: `1px solid ${
                        gs?.match_found
                          ? 'rgba(255,91,120,0.35)'
                          : gsConfigured
                          ? 'rgba(94,230,168,0.32)'
                          : 'rgba(255,191,105,0.32)'
                      }`,
                    }}
                  >
                    {gs?.match_found
                      ? 'THREAT MATCH'
                      : gsConfigured
                      ? 'NO MATCH FOUND'
                      : 'UNAVAILABLE / NOT CONFIGURED'}
                  </span>
                </div>
                <p className="text-xs text-[rgba(236,232,255,0.75)]">
                  {gs?.summary || 'Safe Browsing check status recorded.'}
                </p>
                {gs?.disclaimer && (
                  <p className="text-[11px] text-[rgba(236,232,255,0.52)] italic">{gs.disclaimer}</p>
                )}
              </div>

              {/* VirusTotal */}
              <div
                className="p-4 rounded-xl space-y-2"
                style={{ background: 'rgba(13,8,48,0.6)', border: '1px solid rgba(196,178,255,0.14)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#F4F2FF]">VirusTotal Multi-Vendor</span>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                    style={{
                      background: vt?.is_flagged
                        ? 'rgba(255,91,120,0.16)'
                        : vtConfigured
                        ? 'rgba(0,229,255,0.14)'
                        : 'rgba(255,191,105,0.14)',
                      color: vt?.is_flagged ? '#FF5B78' : vtConfigured ? '#00E5FF' : '#FFBF69',
                      border: `1px solid ${
                        vt?.is_flagged
                          ? 'rgba(255,91,120,0.35)'
                          : vtConfigured
                          ? 'rgba(0,229,255,0.32)'
                          : 'rgba(255,191,105,0.32)'
                      }`,
                    }}
                  >
                    {vt?.detection_ratio
                      ? `${vt.detection_ratio} Engines Flagged`
                      : vt?.status === 'not_found'
                      ? 'NOT IN INDEX'
                      : vtConfigured
                      ? 'NO FLAGS OBSERVED'
                      : 'UNAVAILABLE / OPTIONAL'}
                  </span>
                </div>
                <p className="text-xs text-[rgba(236,232,255,0.75)]">
                  {vt?.summary || 'Multi-vendor URL reputation analysis.'}
                </p>
              </div>
            </div>
          </div>

          {/* Redirect & SSRF Trace */}
          {result.redirect_analysis && (
            <div className="tl-glass-card p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-display text-sm font-semibold text-[#F4F2FF] flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-[#00E5FF]" />
                  Redirect Path &amp; SSRF Protection
                </h3>
                <span
                  className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold"
                  style={{
                    background: result.redirect_analysis.ssrf_blocked
                      ? 'rgba(255,91,120,0.16)'
                      : 'rgba(94,230,168,0.14)',
                    color: result.redirect_analysis.ssrf_blocked ? '#FF5B78' : '#5EE6A8',
                    border: `1px solid ${
                      result.redirect_analysis.ssrf_blocked
                        ? 'rgba(255,91,120,0.35)'
                        : 'rgba(94,230,168,0.32)'
                    }`,
                  }}
                >
                  {result.redirect_analysis.ssrf_blocked ? 'SSRF BLOCKED' : 'SSRF VALIDATED SAFE'}
                </span>
              </div>
              <p className="text-xs text-[rgba(236,232,255,0.75)]">{result.redirect_analysis.summary}</p>
              {result.redirect_analysis.hops?.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {result.redirect_analysis.hops.map((h, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg text-[11px] font-mono flex items-center justify-between gap-2"
                      style={{ background: 'rgba(13,8,48,0.6)', border: '1px solid rgba(196,178,255,0.1)' }}
                    >
                      <span className="text-[#00E5FF] truncate">{h.url || h}</span>
                      {h.status_code && <span className="text-[#A78BFA]">HTTP {h.status_code}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Findings + AI Explanation + Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="tl-glass-card p-5 space-y-3">
              <h3 className="font-display text-sm font-semibold text-[#F4F2FF]">
                {result.warnings?.length > 0
                  ? `Security Findings & Indicators (${result.warnings.length})`
                  : 'Security Findings'}
              </h3>
              {result.warnings?.length > 0 ? (
                <ul className="space-y-2 text-xs text-[rgba(236,232,255,0.82)]">
                  {result.warnings.map((w, idx) => (
                    <li
                      key={idx}
                      className="p-2.5 rounded-xl flex items-start gap-2"
                      style={{ background: 'rgba(255,91,120,0.08)', border: '1px solid rgba(255,91,120,0.2)' }}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-[#FFBF69] flex-shrink-0 mt-0.5" />
                      <span>{w.reason || w.detail || w}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[rgba(236,232,255,0.62)]">
                  No major heuristic phishing flags triggered in URL structure.
                </p>
              )}
            </div>

            <div className="tl-glass-card p-5 space-y-3">
              <h3 className="font-display text-sm font-semibold text-[#F4F2FF]">
                Recommended Next Steps
              </h3>
              <ul className="space-y-2 text-xs text-[rgba(236,232,255,0.82)]">
                {(result.recommendations || []).map((rec, i) => (
                  <li
                    key={i}
                    className="p-2.5 rounded-xl flex items-start gap-2"
                    style={{ background: 'rgba(13,8,48,0.55)', border: '1px solid rgba(196,178,255,0.12)' }}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#5EE6A8] flex-shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {result.ai_explanation && (
            <div className="tl-glass-card p-5 space-y-3">
              <h3 className="font-display text-sm font-semibold text-[#F4F2FF] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#A78BFA]" />
                AI Domain &amp; Threat Interpretation
              </h3>
              {result.ai_explanation.threat_explanation && (
                <p className="text-xs text-[rgba(236,232,255,0.84)] leading-relaxed">
                  {result.ai_explanation.threat_explanation}
                </p>
              )}
              {result.ai_explanation.domain_evaluation && (
                <p className="text-xs text-[rgba(236,232,255,0.75)] leading-relaxed">
                  {result.ai_explanation.domain_evaluation}
                </p>
              )}
              {result.ai_explanation.limitations?.length > 0 && (
                <p className="text-[11px] font-mono text-[rgba(236,232,255,0.52)]">
                  Limitations: {result.ai_explanation.limitations.join(' ')}
                </p>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
