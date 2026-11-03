import { useState, useEffect } from 'react'
import {
  Link2, Trash2, RefreshCw, AlertCircle, Shield, ShieldAlert,
  ShieldCheck, Globe, Server, Clock, ExternalLink, Lock,
  AlertTriangle, CheckCircle2, Layers, Cpu, CornerDownRight, Check, KeyRound, Info
} from 'lucide-react'
import { analyzeUrl, isValidUrl, getUrlEngineHealth, EXAMPLE_URLS } from '../services/urlService.js'
import { useScanHistory } from '../hooks/useScanHistory.jsx'
import { useToast } from '../hooks/useToast.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { saveScan } from '../services/scanDatabaseService.js'
import {
  SectionHeader, Card, RiskGauge, DemoBanner,
  Spinner
} from '../components/ResultComponents.jsx'

export default function URLChecker() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [healthStatus, setHealthStatus] = useState(null)
  const [copied, setCopied] = useState(false)

  const { addScan } = useScanHistory()
  const { addToast } = useToast()
  const { user, session } = useAuth()

  // Load backend engine readiness on mount
  useEffect(() => {
    getUrlEngineHealth().then(data => {
      setHealthStatus(data)
    }).catch(() => {})
  }, [])

  const handleAnalyze = async (overrideUrl) => {
    setError('')
    const targetUrl = (overrideUrl || input).trim()
    if (!targetUrl) {
      setError('Please enter a URL to analyze.')
      return
    }
    if (!isValidUrl(targetUrl)) {
      setError('Please enter a valid URL (e.g., https://example.com/login).')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const res = await analyzeUrl(targetUrl, {
        checkRedirects: true,
        authToken: session?.access_token,
        userId: user?.id
      })

      setResult(res)

      // Add to local state history
      addScan({
        type: 'URL',
        input: targetUrl,
        result: res
      })

      // Persist to Supabase if user is logged in
      if (user?.id) {
        saveScan({
          userId: user.id,
          scanType: 'url',
          summary: res.summary,
          riskScore: res.score,
          riskLevel: res.level,
          findings: res.contributing_factors || [],
          evidenceSources: [
            {
              title: 'Local URL Safety Inspection',
              publisher: 'ScamOrSafe Local Engine',
              source_url: targetUrl,
              evidence_summary: res.summary
            }
          ]
        }).catch(err => console.warn('Supabase log error:', err))
      }

      addToast('URL security inspection complete.', 'success')
    } catch (e) {
      setError(e.message || 'Analysis failed. Please check backend connection.')
      addToast('URL analysis failed.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAnalyze()
  }

  const handleClear = () => {
    setInput('')
    setResult(null)
    setError('')
  }

  const handleAnalyzeAnother = () => {
    setResult(null)
    setError('')
  }

  const handleCopyUrl = (text) => {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    addToast('URL copied to clipboard', 'info')
  }

  return (
    <div className="max-w-4xl mx-auto animate-slide-up space-y-6">
      <SectionHeader
        title="Local URL Safety & Pattern Engine"
        subtitle="Inspect URLs for phishing, typosquatting, social engineering keywords, protocol vulnerabilities, and deceptive redirects using local structural heuristics and AI modeling."
      />

      {/* Safety Notice & No External APIs Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl text-xs"
          style={{ background: '#F59E0B15', border: '1px solid #F59E0B44', color: '#F1F5F9' }}
        >
          <ShieldAlert size={18} className="flex-shrink-0 mt-0.5 text-amber-400" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-300">SAFETY DIRECTIVE:</p>
            <p className="text-slate-300">
              Never visit suspicious links or enter sensitive personal or financial credentials. No tool can guarantee a URL is 100% safe.
            </p>
          </div>
        </div>

        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl text-xs"
          style={{ background: '#06B6D415', border: '1px solid #06B6D444', color: '#F1F5F9' }}
        >
          <Info size={18} className="flex-shrink-0 mt-0.5 text-cyan-400" />
          <div className="space-y-1">
            <p className="font-semibold text-cyan-300">DATABASE STATUS:</p>
            <p className="text-slate-300">
              Known malware and phishing blacklist database checks are <strong>unavailable</strong>. All inspections run locally with zero external API dependencies.
            </p>
          </div>
        </div>
      </div>

      {/* Local Engine Readiness Badges */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400 font-medium">Local Modules:</span>
        <span
          className="px-2.5 py-1 rounded-md flex items-center gap-1.5"
          style={{ background: '#10B98118', border: '1px solid #10B98144', color: '#34D399' }}
        >
          <ShieldCheck size={12} /> Heuristic Pattern Analyzer: Active
        </span>
        <span
          className="px-2.5 py-1 rounded-md flex items-center gap-1.5"
          style={{ background: '#10B98118', border: '1px solid #10B98144', color: '#34D399' }}
        >
          <Lock size={12} /> Protocol & Transport Check: Active
        </span>
        <span
          className="px-2.5 py-1 rounded-md flex items-center gap-1.5"
          style={{ background: '#06B6D418', border: '1px solid #06B6D444', color: '#22D3EE' }}
        >
          <Globe size={12} /> IANA RDAP Domain Age: Active
        </span>
        <span
          className="px-2.5 py-1 rounded-md flex items-center gap-1.5"
          style={{ background: '#8B5CF618', border: '1px solid #8B5CF644', color: '#A78BFA' }}
        >
          <Server size={12} /> SSRF Guard: Active
        </span>
        <span
          className="px-2.5 py-1 rounded-md flex items-center gap-1.5"
          style={{ background: '#64748B18', border: '1px solid #64748B33', color: '#94A3B8' }}
        >
          <KeyRound size={12} /> External Threat Feeds: Disabled
        </span>
      </div>

      {/* Input Box */}
      {!result && (
        <Card>
          <label htmlFor="url-input" className="block text-sm font-medium mb-2 text-slate-300">
            Submit Target URL to Inspect
          </label>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-cyan-400">
                <Link2 size={16} />
              </span>
              <input
                id="url-input"
                type="url"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://example.com/suspicious-link"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-colors text-slate-100"
                style={{
                  background: '#121A2B',
                  border: error ? '1px solid #F87171' : '1px solid #1E2D45',
                  outline: 'none',
                }}
                disabled={loading}
              />
            </div>
            <button
              onClick={() => handleAnalyze()}
              disabled={loading || !input.trim()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex-shrink-0 cursor-pointer text-slate-950 font-display"
              style={{ background: 'linear-gradient(135deg, #22D3EE, #818CF8)' }}
            >
              {loading ? <Spinner size={16} color="#0B1020" /> : <Link2 size={16} />}
              {loading ? 'Inspecting…' : 'Analyze URL'}
            </button>
          </div>

          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-slate-500">Supports banking links, shortened URLs, social forwards, and direct hostnames.</span>
            <button
              onClick={handleClear}
              disabled={loading || (!input && !result)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-rose-400 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Trash2 size={12} /> Clear
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-rose-400 font-medium" role="alert">{error}</p>}

          {/* Example URLs */}
          <div className="mt-5 pt-4 border-t border-slate-800">
            <p className="text-xs font-semibold text-slate-400 mb-2">Try test examples:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_URLS.map(u => (
                <button
                  key={u}
                  onClick={() => {
                    setInput(u)
                    handleAnalyze(u)
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 cursor-pointer"
                  style={{ background: '#121A2B', border: '1px solid #1E2D45' }}
                >
                  {u.length > 38 ? u.slice(0, 38) + '…' : u}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <Card className="flex flex-col items-center justify-center py-12 gap-4">
          <Spinner size={42} color="#22D3EE" />
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-slate-200">Executing Local URL Security Analysis…</p>
            <p className="text-xs text-slate-500">
              Protocol verification • Typosquatting heuristics • Keyword extraction • RDAP age • SSRF defense
            </p>
          </div>
        </Card>
      )}

      {/* Full Results Display */}
      {result && !loading && (
        <div className="flex flex-col gap-6 animate-slide-up">
          {result.isFallback && <DemoBanner text="Live backend offline. Demonstrating with local heuristics." />}

          {/* 1. Header Overview & Risk Gauge */}
          <Card>
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <RiskGauge score={result.score} level={result.level} />
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display font-bold text-xl text-slate-100 flex items-center gap-2">
                    {result.level === 'HIGH' && <ShieldAlert className="text-rose-400" size={22} />}
                    {result.level === 'MEDIUM' && <AlertTriangle className="text-amber-400" size={22} />}
                    {result.level === 'LOW' && <ShieldCheck className="text-emerald-400" size={22} />}
                    URL Security Evaluation
                  </h2>
                  {result.execution_time_ms && (
                    <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                      <Clock size={12} /> {result.execution_time_ms} ms
                    </span>
                  )}
                </div>

                {/* Analyzed URL Box with Copy */}
                <div className="px-3 py-2 rounded-lg flex items-center justify-between gap-2" style={{ background: '#121A2B', border: '1px solid #1E2D45' }}>
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Analyzed Target</p>
                    <p className="text-xs font-mono text-cyan-300 truncate">{result.url}</p>
                  </div>
                  <button
                    onClick={() => handleCopyUrl(result.url)}
                    className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors text-xs flex items-center gap-1 cursor-pointer flex-shrink-0"
                    title="Copy URL"
                  >
                    {copied ? <Check size={13} className="text-emerald-400" /> : <ExternalLink size={13} />}
                  </button>
                </div>

                {/* Summary / Clean Status Notice */}
                <div className="space-y-1">
                  <p className="text-sm text-slate-200 font-medium leading-relaxed">
                    {result.summary}
                  </p>
                  <p className="text-xs text-slate-500 italic">
                    {result.security_disclaimer}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* 2. Grid: Domain Intelligence & Local Protocol Inspection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Domain Intelligence Card */}
            <Card>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
                <Globe size={18} className="text-cyan-400" />
                <h3 className="font-semibold text-sm text-slate-100">Domain & Registration Intelligence</h3>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Hostname:</span>
                  <span className="font-mono text-slate-200">{result.domain_intelligence?.hostname || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Root Domain / TLD:</span>
                  <span className="font-mono text-slate-200">
                    {result.domain_intelligence?.root_domain} {result.domain_intelligence?.tld ? `(.${result.domain_intelligence.tld})` : ''}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Domain Age:</span>
                  <span className={`font-semibold ${result.domain_intelligence?.domain_age?.includes('NEWLY') ? 'text-rose-400' : 'text-slate-200'}`}>
                    {result.domain_intelligence?.domain_age || 'Not publicly disclosed'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Registrar:</span>
                  <span className="text-slate-200 truncate max-w-[200px]">{result.domain_intelligence?.registrar || 'Unavailable'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Type / Encoding:</span>
                  <span className="text-slate-200">
                    {result.domain_intelligence?.is_ip ? 'Direct IP Host' : result.domain_intelligence?.is_punycode ? 'Punycode / Homograph' : 'Standard FQDN'}
                  </span>
                </div>
                {result.domain_intelligence?.is_shortener && (
                  <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300">
                    Shortened URL service detected. Target masks the ultimate destination.
                  </div>
                )}
              </div>
            </Card>

            {/* Local Protocol & Keyword Inspection Card */}
            <Card>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
                <Lock size={18} className="text-indigo-400" />
                <h3 className="font-semibold text-sm text-slate-100">Protocol & Pattern Inspection</h3>
              </div>
              <div className="space-y-3 text-xs">
                {/* Transport Security */}
                <div className="p-3 rounded-lg" style={{ background: '#121A2B', border: '1px solid #1E2D45' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-200">Transport Security (Protocol):</span>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold"
                      style={{
                        background: result.domain_intelligence?.is_https ? '#10B98122' : '#EF444422',
                        color: result.domain_intelligence?.is_https ? '#34D399' : '#F87171',
                        border: `1px solid ${result.domain_intelligence?.is_https ? '#10B98144' : '#EF444444'}`
                      }}
                    >
                      {result.domain_intelligence?.is_https ? 'HTTPS ENCRYPTED' : 'PLAIN HTTP (INSECURE)'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    {result.domain_intelligence?.is_https
                      ? 'Connection uses TLS/SSL transport encryption.'
                      : 'Connection is unencrypted. Login credentials or data sent to this address can be intercepted.'}
                  </p>
                </div>

                {/* Keywords Analysis */}
                <div className="p-3 rounded-lg" style={{ background: '#121A2B', border: '1px solid #1E2D45' }}>
                  <span className="font-semibold text-slate-200 block mb-1">High-Risk Keywords:</span>
                  {result.domain_intelligence?.matched_keywords?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {result.domain_intelligence.matched_keywords.map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px] border border-rose-500/30">
                          {kw}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-[11px]">No high-risk credential or prize-claim keywords detected in URL path.</p>
                  )}
                </div>

                {/* External Feeds Notice */}
                <div className="p-2.5 rounded bg-slate-900/50 border border-slate-800 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">Database Notice: </span>
                  External malware/phishing feeds (Safe Browsing / VirusTotal) are unavailable. Results are based strictly on local structural modeling.
                </div>
              </div>
            </Card>
          </div>

          {/* 3. HTTP Redirect Tracing & SSRF Safety */}
          {result.redirect_analysis && (
            <Card>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-cyan-400" />
                  <h3 className="font-semibold text-sm text-slate-100">HTTP Redirect Hop Analysis & SSRF Defense</h3>
                </div>
                <span
                  className="px-2.5 py-0.5 rounded text-xs font-semibold"
                  style={{
                    background: result.redirect_analysis.ssrf_blocked ? '#EF444422' : '#10B98122',
                    color: result.redirect_analysis.ssrf_blocked ? '#F87171' : '#34D399',
                    border: `1px solid ${result.redirect_analysis.ssrf_blocked ? '#EF444444' : '#10B98144'}`
                  }}
                >
                  {result.redirect_analysis.ssrf_blocked ? 'SSRF BLOCKED' : 'SSRF VALIDATED SAFE'}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-slate-400">{result.redirect_analysis.summary}</p>

                {result.redirect_analysis.hops && result.redirect_analysis.hops.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {result.redirect_analysis.hops.map((h, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg flex items-start gap-2.5 font-mono text-[11px]"
                        style={{ background: '#121A2B', border: '1px solid #1E2D45' }}
                      >
                        <CornerDownRight size={14} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="font-bold text-slate-300">Hop #{h.hop} ({h.status_code || 'CONN'})</span>
                            {h.resolved_ip && <span className="text-slate-500">IP: {h.resolved_ip}</span>}
                          </div>
                          <p className="text-slate-400 truncate">{h.to_url || h.url || h.from_url}</p>
                          {h.blocked && <p className="text-rose-400 font-semibold mt-1">Blocked: {h.block_reason}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* 4. Concrete Suspicious Indicators */}
          <Card>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
              <AlertTriangle size={18} className="text-amber-400" />
              <h3 className="font-semibold text-sm text-slate-100">
                {result.warnings?.length > 0
                  ? `Security Findings & Indicators (${result.warnings.length})`
                  : 'Security Findings & Indicators'}
              </h3>
            </div>

            {result.warnings?.length > 0 ? (
              <div className="space-y-2">
                {result.warnings.map((w, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg flex items-start gap-3"
                    style={{ background: '#EF444411', border: '1px solid #EF444433' }}
                  >
                    <AlertCircle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-200 leading-relaxed">{w.reason || w}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                <CheckCircle2 size={16} /> No obvious suspicious indicators found. Note: Known malware/phishing database checks are unavailable.
              </div>
            )}
          </Card>

          {/* 5. AI Threat Explanation */}
          {result.ai_explanation && (
            <Card>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                <Cpu size={18} className="text-indigo-400" />
                <h3 className="font-semibold text-sm text-slate-100">AI Threat Intelligence Narrative</h3>
              </div>
              <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                {result.ai_explanation.threat_explanation && (
                  <div>
                    <h4 className="font-semibold text-slate-200 mb-1">Threat Analysis:</h4>
                    <p className="text-slate-300">{result.ai_explanation.threat_explanation}</p>
                  </div>
                )}
                {result.ai_explanation.domain_evaluation && (
                  <div>
                    <h4 className="font-semibold text-slate-200 mb-1">Domain Evaluation:</h4>
                    <p className="text-slate-300">{result.ai_explanation.domain_evaluation}</p>
                  </div>
                )}
                {result.ai_explanation.limitations && result.ai_explanation.limitations.length > 0 && (
                  <div className="pt-2 text-slate-500 text-[11px] italic">
                    Note: {result.ai_explanation.limitations.join(' ')}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* 6. Recommended Actions */}
          <Card>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <h3 className="font-semibold text-sm text-slate-100">Recommended Protective Measures</h3>
            </div>
            <ul className="space-y-2 text-xs">
              {(result.recommendations || []).map((rec, i) => (
                <li key={i} className="flex items-start gap-2.5 text-slate-300">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Re-analyze Action Button */}
          <div className="pt-2">
            <button
              onClick={handleAnalyzeAnother}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer text-cyan-300 hover:bg-cyan-500/10"
              style={{ background: '#1E2D45', border: '1px solid #22D3EE44' }}
            >
              <RefreshCw size={15} /> Inspect Another URL
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
