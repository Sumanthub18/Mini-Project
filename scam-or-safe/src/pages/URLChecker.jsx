import { useState } from 'react'
import { Link2, Trash2, RefreshCw, AlertCircle } from 'lucide-react'
import { analyzeUrl, isValidUrl } from '../services/urlService.js'
import { useScanHistory } from '../hooks/useScanHistory.jsx'
import { useToast } from '../hooks/useToast.jsx'
import {
  SectionHeader, Card, RiskGauge, DemoBanner,
  ResultSummary, WarningList, RecommendationList, Spinner
} from '../components/ResultComponents.jsx'

export default function URLChecker() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const { addScan } = useScanHistory()
  const { addToast } = useToast()

  const handleAnalyze = async () => {
    setError('')
    const url = input.trim()
    if (!url) { setError('Please enter a URL.'); return }
    if (!isValidUrl(url)) {
      setError('Please enter a valid URL starting with http:// or https://')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await analyzeUrl(url)
      setResult(res)
      addScan({ type: 'URL', input: url, result: res })
      addToast('URL analysis complete.', 'success')
    } catch (e) {
      setError(e.message || 'Analysis failed. Please try again.')
      addToast('Analysis failed.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAnalyze()
  }

  const handleClear = () => { setInput(''); setResult(null); setError('') }
  const handleAnalyzeAnother = () => { setResult(null); setError('') }

  const EXAMPLE_URLS = [
    'https://google.com',
    'https://paypa1.com/secure-login',
    'https://bit.ly/freephone123',
    'http://192.168.1.1/update-info',
  ]

  return (
    <div className="max-w-3xl mx-auto animate-slide-up">
      <SectionHeader
        title="URL Safety Checker"
        subtitle="Paste a suspicious link to check for phishing patterns and malicious indicators. We do not visit or fetch URLs."
      />

      {/* Important notice */}
      <div
        className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
        style={{ background: '#FBBF2411', border: '1px solid #FBBF2433', color: '#94A3B8' }}
      >
        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#FBBF24' }} />
        <span>
          <strong style={{ color: '#FBBF24' }}>Safety Notice:</strong> This tool analyses URL structure only.
          It does <strong>not</strong> visit, open, or fetch any links. Safe to use on suspicious URLs.
        </span>
      </div>

      {!result && (
        <Card>
          <label htmlFor="url-input" className="block text-sm font-medium mb-2" style={{ color: '#94A3B8' }}>
            URL to Check
          </label>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#22D3EE' }}>
                <Link2 size={16} />
              </span>
              <input
                id="url-input"
                type="url"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://example.com/suspicious-link"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-colors"
                style={{
                  background: '#121A2B',
                  border: error ? '1px solid #F87171' : '1px solid #1E2D45',
                  color: '#F8FAFC',
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                }}
                onFocus={e => !error && (e.currentTarget.style.borderColor = '#22D3EE44')}
                onBlur={e => !error && (e.currentTarget.style.borderColor = '#1E2D45')}
                disabled={loading}
                aria-describedby={error ? 'url-error' : 'url-hint'}
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading || !input.trim()}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#22D3EE,#818CF8)', color: '#0B1020' }}
              aria-busy={loading}
            >
              {loading ? <Spinner size={16} color="#0B1020" /> : <Link2 size={16} />}
              {loading ? 'Checking…' : 'Analyze'}
            </button>
          </div>

          <div className="flex justify-between mt-1.5">
            <span id="url-hint" className="text-xs" style={{ color: '#64748B' }}>Press Enter to analyze</span>
            <button
              onClick={handleClear}
              disabled={loading}
              className="flex items-center gap-1 text-xs disabled:opacity-50"
              style={{ color: '#64748B' }}
              onMouseEnter={e => e.currentTarget.style.color = '#F87171'}
              onMouseLeave={e => e.currentTarget.style.color = '#64748B'}
            >
              <Trash2 size={12} /> Clear
            </button>
          </div>
          {error && <p id="url-error" className="mt-2 text-xs" style={{ color: '#F87171' }} role="alert">{error}</p>}

          {/* Example URLs */}
          <div className="mt-5">
            <p className="text-xs font-medium mb-2" style={{ color: '#64748B' }}>Try an example:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_URLS.map(u => (
                <button
                  key={u}
                  onClick={() => { setInput(u); setError('') }}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: '#121A2B', border: '1px solid #1E2D45', color: '#94A3B8' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#22D3EE44'; e.currentTarget.style.color = '#22D3EE' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E2D45'; e.currentTarget.style.color = '#94A3B8' }}
                >
                  {u.length > 35 ? u.slice(0, 35) + '…' : u}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {loading && (
        <Card className="mt-6 flex flex-col items-center justify-center py-12 gap-4">
          <Spinner size={40} />
          <p className="text-sm font-medium" style={{ color: '#94A3B8' }}>Analyzing URL structure…</p>
          <p className="text-xs" style={{ color: '#475569' }}>Not visiting the link — structure analysis only</p>
        </Card>
      )}

      {result && !loading && (
        <div className="flex flex-col gap-5 animate-slide-up">
          <DemoBanner />

          <Card>
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <RiskGauge score={result.score} level={result.level} />
              <div className="flex-1 min-w-0">
                <h2 className="font-display font-bold text-xl mb-2" style={{ color: '#F8FAFC' }}>URL Analysis Complete</h2>
                {/* Analysed URL display */}
                <div className="mb-3 px-3 py-2 rounded-lg overflow-hidden" style={{ background: '#121A2B', border: '1px solid #1E2D45' }}>
                  <p className="text-xs font-medium mb-0.5" style={{ color: '#64748B' }}>Analysed URL</p>
                  <p className="text-xs font-mono break-all" style={{ color: '#22D3EE' }}>{result.url}</p>
                </div>
                <ResultSummary result={result} />
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-sm mb-3" style={{ color: '#F8FAFC' }}>
              {result.warnings.length > 0 ? '⚠️ Warning Signs Detected' : '✅ No Warning Signs Detected'}
            </h3>
            <WarningList warnings={result.warnings} />
          </Card>

          <Card>
            <h3 className="font-semibold text-sm mb-3" style={{ color: '#F8FAFC' }}>✅ Recommended Actions</h3>
            <RecommendationList recommendations={result.recommendations} />
          </Card>

          <button
            onClick={handleAnalyzeAnother}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all self-start"
            style={{ background: '#1E2D45', color: '#22D3EE', border: '1px solid #22D3EE33' }}
            onMouseEnter={e => e.currentTarget.style.background = '#22D3EE18'}
            onMouseLeave={e => e.currentTarget.style.background = '#1E2D45'}
          >
            <RefreshCw size={15} /> Check Another URL
          </button>
        </div>
      )}
    </div>
  )
}
