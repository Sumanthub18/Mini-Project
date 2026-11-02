import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquareWarning, Trash2, RefreshCw, Cpu, Zap, Sparkles } from 'lucide-react'
import { analyzeScamMessage } from '../services/scamService.js'
import { useScanHistory } from '../hooks/useScanHistory.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../hooks/useToast.jsx'
import {
  SectionHeader, Card, RiskGauge, RiskBadge, DemoBanner,
  ResultSummary, WarningList, RecommendationList, Spinner
} from '../components/ResultComponents.jsx'

const MAX_CHARS = 2000
const PLACEHOLDER = `// Paste a suspicious message here...

EXAMPLES:
> "Congratulations! You've won a lottery prize. Click here to claim."
> "Your bank account has been suspended. Verify immediately."
> "Dear customer, your OTP is required to unlock your account."
> "Urgent: Government refund of ₹8,500 pending. Send details now."`

export default function ScamScanner() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const { user, session } = useAuth()
  const { addScan } = useScanHistory()
  const { addToast } = useToast()

  const handleAnalyze = async () => {
    setError('')
    if (input.trim().length < 10) {
      setError('// Minimum 10 characters required to initiate scan.')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await analyzeScamMessage(input.trim(), {
        provider: 'auto',
        authToken: session?.access_token,
        userId: user?.id,
      })
      setResult(res)
      addScan({ type: 'SCAM', input: input.trim(), result: res })
      addToast('Scam analysis complete.', 'success')
    } catch (e) {
      setError('// Analysis failed. Please try again.')
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

  const handleAnalyzeAnother = () => {
    setResult(null)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="max-w-3xl mx-auto animate-slide-up">
      <SectionHeader
        title="SCAM SCANNER"
        subtitle="// paste a suspicious message to check for scam indicators"
      />

      {!result && (
        <Card>
          {/* Input */}
          <div className="mb-5">
            <label
              htmlFor="scam-input"
              className="flex items-center gap-2 text-xs font-mono mb-3 tracking-widest"
              style={{ color: '#ff006e88', letterSpacing: '0.12em' }}
            >
              <span style={{ color: '#ff006e', textShadow: '0 0 8px #ff006e' }}>⬡</span>
              MESSAGE.INPUT
            </label>
            <div className="relative">
              <textarea
                id="scam-input"
                value={input}
                onChange={e => setInput(e.target.value.slice(0, MAX_CHARS))}
                placeholder={PLACEHOLDER}
                rows={10}
                className="w-full px-4 py-3 text-sm resize-none transition-all font-mono"
                style={{
                  background: '#050810',
                  border: error ? '1px solid #ff006e' : '1px solid #00ff9f18',
                  color: '#e2e8f0',
                  outline: 'none',
                  fontFamily: 'Share Tech Mono, monospace',
                  boxShadow: error ? '0 0 12px #ff006e22, inset 0 0 12px #ff006e08' : 'inset 0 0 20px #00ff9f04',
                  clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
                  lineHeight: 1.7,
                }}
                onFocus={e => {
                  if (!error) {
                    e.currentTarget.style.borderColor = '#00ff9f44'
                    e.currentTarget.style.boxShadow = '0 0 16px #00ff9f18, inset 0 0 16px #00ff9f08'
                  }
                }}
                onBlur={e => {
                  if (!error) {
                    e.currentTarget.style.borderColor = '#00ff9f18'
                    e.currentTarget.style.boxShadow = 'inset 0 0 20px #00ff9f04'
                  }
                }}
                aria-describedby={error ? 'scam-error' : 'scam-hint'}
                disabled={loading}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span id="scam-hint" className="text-xs font-mono" style={{ color: '#4a6080', letterSpacing: '0.04em' }}>
                // SMS · WhatsApp · Email · Job Offers
              </span>
              <span
                className="text-xs font-mono"
                style={{ color: input.length > MAX_CHARS * 0.9 ? '#ffb800' : '#4a6080' }}
              >
                {input.length}/{MAX_CHARS}
              </span>
            </div>
            {error && (
              <p id="scam-error" className="mt-2 text-xs font-mono" style={{ color: '#ff006e', textShadow: '0 0 8px #ff006e44' }} role="alert">
                {error}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleAnalyze}
              disabled={loading || !input.trim()}
              className="btn-neon-solid flex items-center gap-2 px-6 py-2.5 text-sm tracking-widest font-display"
              style={{ fontFamily: 'Orbitron, monospace', letterSpacing: '0.1em', fontSize: '0.7rem',
                clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
              aria-busy={loading}
            >
              {loading ? (
                <><Spinner size={15} color="#050810" /> SCANNING…</>
              ) : (
                <><MessageSquareWarning size={15} /> ANALYZE</>
              )}
            </button>
            <button
              onClick={handleClear}
              disabled={loading}
              className="btn-neon flex items-center gap-2 px-4 py-2.5 text-xs font-mono tracking-widest"
              style={{
                borderColor: '#ff006e44',
                color: '#ff006e88',
                textShadow: 'none',
                boxShadow: '0 0 12px #ff006e08',
                clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                letterSpacing: '0.1em',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#ff006e12'
                e.currentTarget.style.color = '#ff006e'
                e.currentTarget.style.textShadow = '0 0 8px #ff006e66'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#ff006e88'
                e.currentTarget.style.textShadow = 'none'
              }}
            >
              <Trash2 size={13} /> CLEAR
            </button>
          </div>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <Card className="mt-5 flex flex-col items-center justify-center py-14 gap-4">
          <div className="relative">
            <Spinner size={48} color="#00ff9f" />
            <div
              className="absolute inset-0 rounded-full scan-pulse"
              style={{ boxShadow: '0 0 20px #00ff9f44' }}
            />
          </div>
          <p className="font-display text-sm tracking-widest" style={{ color: '#00ff9f', textShadow: '0 0 12px #00ff9f', fontSize: '0.7rem', letterSpacing: '0.2em' }}>
            SCANNING…
          </p>
          <p className="text-xs font-mono" style={{ color: '#4a6080', letterSpacing: '0.08em' }}>// checking for scam indicators</p>
        </Card>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="flex flex-col gap-4 animate-slide-up">
          {/* AI Engine Status Banner */}
          <div
            className="flex items-center justify-between p-3.5 text-xs font-mono flex-wrap gap-2"
            style={{
              background: result.isRealAI ? '#00d4ff0a' : '#ffb8000a',
              border: `1px solid ${result.isRealAI ? '#00d4ff33' : '#ffb80033'}`,
              clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full scan-pulse"
                style={{
                  background: result.isRealAI ? '#00d4ff' : '#ffb800',
                  boxShadow: `0 0 6px ${result.isRealAI ? '#00d4ff' : '#ffb800'}`,
                }}
              />
              <span>
                <strong style={{ color: result.isRealAI ? '#00d4ff' : '#ffb800' }}>
                  {result.isRealAI ? `[ AI ENGINE: ${result.provider?.toUpperCase()} ]` : '[ RULE-BASED ENGINE ]'}
                </strong>
                {' '}— Model: <code className="text-white">{result.model}</code> ({result.executionTimeMs} ms)
                {result.category && ` | Category: ${result.category}`}
              </span>
            </div>

            <Link
              to="/scan/compare"
              className="flex items-center gap-1.5 px-3 py-1 font-mono text-xs transition-colors hover:text-white"
              style={{
                color: '#00d4ff',
                border: '1px solid #00d4ff44',
                background: '#00d4ff10',
              }}
            >
              <Cpu size={12} /> Compare Groq, Gemini & Mistral ›
            </Link>
          </div>

          <Card>
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <RiskGauge score={result.score} level={result.level} />
              <div className="flex-1">
                <h2 className="font-display font-bold text-lg mb-3 tracking-widest" style={{ color: '#e2e8f0', letterSpacing: '0.12em', fontSize: '0.9rem' }}>
                  // ANALYSIS COMPLETE
                </h2>
                <ResultSummary result={result} />
              </div>
            </div>
          </Card>

          {result.warnings.length > 0 && (
            <Card>
              <h3 className="font-display font-bold text-xs mb-3 tracking-widest" style={{ color: '#ff006e', textShadow: '0 0 8px #ff006e44', letterSpacing: '0.15em' }}>
                ⚠ WARNING SIGNS DETECTED
              </h3>
              <WarningList warnings={result.warnings} />
            </Card>
          )}

          <Card>
            <h3 className="font-display font-bold text-xs mb-3 tracking-widest" style={{ color: '#00ff9f', textShadow: '0 0 8px #00ff9f44', letterSpacing: '0.15em' }}>
              ✓ RECOMMENDED ACTIONS
            </h3>
            <RecommendationList recommendations={result.recommendations} />
          </Card>

          <button
            onClick={handleAnalyzeAnother}
            className="btn-neon flex items-center gap-2 px-5 py-2.5 text-xs font-mono tracking-widest self-start"
            style={{
              letterSpacing: '0.1em',
              clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
            }}
          >
            <RefreshCw size={13} /> SCAN ANOTHER
          </button>
        </div>
      )}
    </div>
  )
}
