import { useState, useEffect } from 'react'
import {
  Cpu, Zap, Sparkles, Globe, AlertTriangle, CheckCircle2,
  Clock, ArrowRight, RefreshCw, HelpCircle, Layers, ShieldAlert,
  ChevronDown, ChevronUp, Flame
} from 'lucide-react'
import { compareScamModels, getAIProviders, checkBackendHealth } from '../services/scamService.js'
import { SectionHeader, Card, RiskBadge, Spinner } from '../components/ResultComponents.jsx'
import { riskColor } from '../utils/helpers.js'
import { useToast } from '../hooks/useToast.jsx'

const SAMPLE_MESSAGES = [
  {
    label: 'Banking OTP Phishing',
    text: 'URGENT: Your HDFC netbanking access will be suspended within 2 hours due to pending KYC. Click http://hdfc-kyc-update.xyz to verify your PAN and enter the 6-digit OTP received.',
  },
  {
    label: 'Lottery Prize Extortion',
    text: 'Congratulations! You have been selected as the 1st prize winner of Rs 25,00,000 in KBC Lucky Draw 2026. Deposit processing fee of Rs 7,500 to account officer to release funds immediately.',
  },
  {
    label: 'Digital Arrest Impersonation',
    text: 'This is CBI Cyber Crime Bureau Delhi. An arrest warrant has been issued against your Aadhaar for illegal money laundering. You are under digital arrest. Transfer bail clearance bond now or police will arrive.',
  },
  {
    label: 'Multilingual (Hindi/English)',
    text: 'प्रिय ग्राहक, आपका बिजली बिल बकाया है। आज रात 9:30 बजे बिजली कनेक्शन काट दिया जाएगा। तुरंत 9876543210 पर संपर्क करें या ऐप डाउनलोड करें।',
  },
]

const PROVIDER_METAS = {
  groq: {
    name: 'Groq',
    icon: Zap,
    color: '#ff006e',
    badgeColor: '#ff006e22',
    accentText: 'Ultra-Fast Inference & Phrase Extraction',
  },
  gemini: {
    name: 'Google Gemini',
    icon: Sparkles,
    color: '#00d4ff',
    badgeColor: '#00d4ff22',
    accentText: 'Contextual Nuance & Social Engineering Detection',
  },
  mistral: {
    name: 'Mistral AI',
    icon: Globe,
    color: '#bf00ff',
    badgeColor: '#bf00ff22',
    accentText: 'Multilingual Reasoning & Independent Verification',
  },
}

export default function ModelComparison() {
  const [input, setInput] = useState('')
  const [selectedProviders, setSelectedProviders] = useState(['groq', 'gemini', 'mistral'])
  const [loading, setLoading] = useState(false)
  const [comparisonData, setComparisonData] = useState(null)
  const [error, setError] = useState('')
  const [backendStatus, setBackendStatus] = useState(null)
  const { addToast } = useToast()

  // Check backend health on mount
  useEffect(() => {
    async function loadHealth() {
      const health = await checkBackendHealth()
      setBackendStatus(health)
    }
    loadHealth()
  }, [])

  const toggleProvider = (p) => {
    if (selectedProviders.includes(p)) {
      if (selectedProviders.length === 1) {
        addToast('Select at least one provider for comparison.', 'info')
        return
      }
      setSelectedProviders(prev => prev.filter(x => x !== p))
    } else {
      setSelectedProviders(prev => [...prev, p])
    }
  }

  const handleCompare = async () => {
    setError('')
    if (input.trim().length < 5) {
      setError('// Minimum 5 characters required to analyze across models.')
      return
    }

    setLoading(true)
    setComparisonData(null)

    try {
      const data = await compareScamModels(input.trim(), selectedProviders)
      setComparisonData(data)
      addToast('Multi-model comparison completed.', 'success')
    } catch (err) {
      setError(err.message || 'Comparison failed. Is the Flask backend running on port 5000?')
      addToast('Comparison failed. Check backend connection.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const models = comparisonData?.models || {}
  const synthesis = comparisonData?.synthesis || {}
  const consensus = synthesis.consensus || {}
  const commonFindings = synthesis.common_findings || []
  const uniqueFindings = synthesis.unique_findings || {}
  const conflictingFindings = synthesis.conflicting_findings || []

  return (
    <div className="max-w-6xl mx-auto animate-slide-up pb-12">
      <SectionHeader
        title="AI MODEL COMPARISON"
        subtitle="// multi-provider ensemble evaluation: Groq vs Google Gemini vs Mistral AI"
      />

      {/* Backend & Provider Health Status Bar */}
      <div
        className="mb-6 p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono"
        style={{
          background: '#090d1a',
          border: '1px solid #00ff9f22',
          clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full scan-pulse"
            style={{
              background: backendStatus?.status === 'healthy' ? '#00ff9f' : '#ff006e',
              boxShadow: `0 0 6px ${backendStatus?.status === 'healthy' ? '#00ff9f' : '#ff006e'}`,
            }}
          />
          <span style={{ color: '#e2e8f0' }}>
            ENGINE STATUS:{' '}
            <strong style={{ color: backendStatus?.status === 'healthy' ? '#00ff9f' : '#ff006e' }}>
              {backendStatus?.status === 'healthy' ? 'ONLINE (PORT 5000)' : 'OFFLINE (LOCAL MODE)'}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-4 text-slate-400">
          <span>AI PROVIDERS:</span>
          {['groq', 'gemini', 'mistral'].map(p => {
            const isConf = backendStatus?.providers?.[p]?.configured
            const meta = PROVIDER_METAS[p]
            return (
              <span key={p} className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: isConf ? meta.color : '#4a6080' }}
                />
                <span style={{ color: isConf ? '#e2e8f0' : '#4a6080' }}>
                  {meta.name} ({isConf ? 'READY' : 'KEY NEEDED'})
                </span>
              </span>
            )
          })}
        </div>
      </div>

      {/* Input Section */}
      <Card className="mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label
              htmlFor="compare-input"
              className="flex items-center gap-2 text-xs font-mono tracking-widest"
              style={{ color: '#00d4ff', letterSpacing: '0.12em' }}
            >
              <Cpu size={15} /> SUSPICIOUS_MESSAGE.PAYLOAD
            </label>

            {/* Provider Selection Checkboxes */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400 mr-1">// TARGETS:</span>
              {['groq', 'gemini', 'mistral'].map(p => {
                const checked = selectedProviders.includes(p)
                const meta = PROVIDER_METAS[p]
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleProvider(p)}
                    className="px-2.5 py-1 text-xs font-mono flex items-center gap-1.5 transition-all"
                    style={{
                      background: checked ? `${meta.color}15` : '#050810',
                      border: `1px solid ${checked ? meta.color : '#4a608044'}`,
                      color: checked ? meta.color : '#64748b',
                      clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)',
                    }}
                  >
                    <meta.icon size={11} /> {meta.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="relative">
            <textarea
              id="compare-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Paste any suspicious message to execute parallel multi-model comparison across Groq, Gemini, and Mistral..."
              rows={5}
              className="w-full px-4 py-3 text-sm resize-none font-mono transition-all"
              style={{
                background: '#050810',
                border: error ? '1px solid #ff006e' : '1px solid #00d4ff22',
                color: '#e2e8f0',
                outline: 'none',
                boxShadow: 'inset 0 0 20px #00d4ff04',
                clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
                lineHeight: 1.6,
              }}
              onFocus={e => !error && (e.currentTarget.style.borderColor = '#00d4ff66')}
              onBlur={e => !error && (e.currentTarget.style.borderColor = '#00d4ff22')}
            />
          </div>

          {error && (
            <p className="text-xs font-mono" style={{ color: '#ff006e' }}>
              {error}
            </p>
          )}

          {/* Preset Sample Buttons */}
          <div>
            <p className="text-xs font-mono text-slate-500 mb-2">// QUICK SAMPLES:</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_MESSAGES.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInput(s.text)}
                  className="px-2.5 py-1 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
                  style={{ background: '#050810', border: '1px solid #00ff9f18' }}
                >
                  › {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-mono text-slate-500">
              {input.length} characters
            </span>
            <button
              onClick={handleCompare}
              disabled={loading || !input.trim()}
              className="btn-neon-solid px-6 py-2.5 font-display text-xs tracking-widest uppercase flex items-center gap-2 disabled:opacity-40"
              style={{
                clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
              }}
            >
              {loading ? (
                <>
                  <Spinner size={14} color="#050810" /> COMPARING MODELS...
                </>
              ) : (
                <>
                  <Cpu size={14} /> RUN MULTI-MODEL ANALYSIS
                </>
              )}
            </button>
          </div>
        </div>
      </Card>

      {/* Comparison Results */}
      {comparisonData && (
        <div className="flex flex-col gap-8 animate-slide-up">
          {/* Consensus HUD Bar */}
          <Card
            style={{
              background: 'linear-gradient(135deg, #091322 0%, #050810 100%)',
              border: '1px solid #00d4ff33',
            }}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 flex items-center justify-center"
                  style={{
                    background: '#00d4ff18',
                    border: '1px solid #00d4ff44',
                    clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
                  }}
                >
                  <Layers size={22} style={{ color: '#00d4ff' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-sm tracking-wider" style={{ color: '#00d4ff' }}>
                      ENSEMBLE CONSENSUS:
                    </span>
                    <span
                      className="px-2 py-0.5 text-xs font-mono font-bold"
                      style={{
                        background: consensus.agreement_level === 'Unanimous' ? '#00ff9f18' : '#ffb80018',
                        color: consensus.agreement_level === 'Unanimous' ? '#00ff9f' : '#ffb800',
                        border: `1px solid ${consensus.agreement_level === 'Unanimous' ? '#00ff9f44' : '#ffb80044'}`,
                      }}
                    >
                      {consensus.agreement_level} Agreement
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">
                    Category: <strong className="text-white">{consensus.consensus_category}</strong> | Evaluated: {consensus.successful_models} / {consensus.total_models_evaluated} models
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-xs font-mono text-slate-400 block">// SYNTHESIZED SCORE</span>
                  <span
                    className="font-display font-bold text-2xl"
                    style={{ color: riskColor(consensus.risk_level) }}
                  >
                    {consensus.synthesized_risk_score} / 100
                  </span>
                </div>
                <RiskBadge level={consensus.risk_level} />
              </div>
            </div>
          </Card>

          {/* Model Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {['groq', 'gemini', 'mistral'].map(p => {
              if (!selectedProviders.includes(p)) return null
              const meta = PROVIDER_METAS[p]
              const res = models[p]
              const isSuccess = res?.status === 'success'
              const data = res?.data || {}
              const isUnavailable = res?.status === 'unavailable'

              return (
                <div
                  key={p}
                  className="flex flex-col p-5 relative"
                  style={{
                    background: 'linear-gradient(180deg, #090d1a 0%, #050810 100%)',
                    border: `1px solid ${isSuccess ? `${meta.color}44` : '#ff006e22'}`,
                    boxShadow: isSuccess ? `0 0 20px ${meta.color}08` : 'none',
                    clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
                  }}
                >
                  {/* Model Header */}
                  <div className="flex items-center justify-between pb-3 mb-4" style={{ borderBottom: `1px solid ${meta.color}22` }}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 flex items-center justify-center"
                        style={{
                          background: `${meta.color}18`,
                          border: `1px solid ${meta.color}44`,
                        }}
                      >
                        <meta.icon size={14} style={{ color: meta.color }} />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-xs tracking-wider" style={{ color: meta.color }}>
                          {meta.name}
                        </h3>
                        <span className="font-mono text-xs text-slate-500 block">
                          {res?.model || 'configured_model'}
                        </span>
                      </div>
                    </div>

                    {res?.execution_time_ms && (
                      <span className="px-2 py-0.5 text-xs font-mono flex items-center gap-1 text-slate-400 bg-slate-900 border border-slate-800">
                        <Clock size={10} /> {res.execution_time_ms} ms
                      </span>
                    )}
                  </div>

                  {/* Unavailable / Error State */}
                  {isUnavailable && (
                    <div className="py-8 text-center flex flex-col items-center gap-2 font-mono text-xs text-slate-400">
                      <AlertTriangle size={24} style={{ color: '#ffb800' }} />
                      <p className="font-bold text-slate-300">PROVIDER UNCONFIGURED</p>
                      <p className="text-slate-500 text-xs px-2">
                        {p.toUpperCase()}_API_KEY is not set in <code className="text-emerald-400">backend/.env</code>.
                      </p>
                    </div>
                  )}

                  {res?.status === 'error' && (
                    <div className="py-8 text-center flex flex-col items-center gap-2 font-mono text-xs text-rose-400">
                      <AlertTriangle size={24} />
                      <p className="font-bold">INSPECTION FAILED</p>
                      <p className="text-slate-500 text-xs px-2">{res.error}</p>
                    </div>
                  )}

                  {/* Successful Analysis Card */}
                  {isSuccess && (
                    <div className="flex flex-col gap-4 flex-1">
                      {/* Score & Category */}
                      <div className="flex items-center justify-between p-3" style={{ background: '#050810', border: '1px solid #ffffff0a' }}>
                        <div>
                          <span className="text-xs font-mono text-slate-500 block">// CATEGORY</span>
                          <span className="font-semibold text-xs text-slate-200">
                            {data.scam_category || 'Unclassified'}
                          </span>
                        </div>
                        <RiskBadge level={data.risk_level || 'low'} />
                      </div>

                      {/* Summary */}
                      <div>
                        <span className="text-xs font-mono text-slate-500 block mb-1">// SUMMARY</span>
                        <p className="text-xs text-slate-300 leading-relaxed font-mono">
                          {data.summary}
                        </p>
                      </div>

                      {/* Indicators */}
                      <div>
                        <span className="text-xs font-mono text-slate-500 block mb-1.5">
                          // THREAT INDICATORS ({data.risk_indicators?.length || 0})
                        </span>
                        <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                          {(data.risk_indicators || []).map((ind, i) => (
                            <div
                              key={i}
                              className="p-2.5 text-xs font-mono"
                              style={{
                                background: '#ff006e08',
                                border: '1px solid #ff006e22',
                              }}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <strong style={{ color: '#ff006e' }}>{ind.title}</strong>
                                <span className="text-[10px] uppercase px-1 py-0.2 text-slate-400 border border-slate-700">
                                  {ind.severity}
                                </span>
                              </div>
                              {ind.phrase && (
                                <p className="text-slate-400 text-xs italic mb-1">
                                  "{ind.phrase}"
                                </p>
                              )}
                              <p className="text-slate-300 text-xs">{ind.explanation}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recommendations */}
                      {data.recommendations?.length > 0 && (
                        <div className="mt-auto pt-3 border-t border-slate-900">
                          <span className="text-xs font-mono text-slate-500 block mb-1">
                            // SAFETY ADVICE
                          </span>
                          <ul className="text-xs font-mono text-slate-400 space-y-1">
                            {data.recommendations.slice(0, 2).map((rec, rIdx) => (
                              <li key={rIdx} className="flex items-start gap-1.5">
                                <span style={{ color: meta.color }}>›</span>
                                <span>{rec}</span>
                              </li>
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

          {/* Comparative Findings HUD (Common, Unique, Conflicting) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Common Findings */}
            <Card>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-emerald-950">
                <CheckCircle2 size={16} style={{ color: '#00ff9f' }} />
                <h4 className="font-display font-bold text-xs tracking-wider" style={{ color: '#00ff9f' }}>
                  COMMON FINDINGS ({commonFindings.length})
                </h4>
              </div>
              {commonFindings.length === 0 ? (
                <p className="text-xs font-mono text-slate-500">// No overlapping flags identified across models.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {commonFindings.map((cf, idx) => (
                    <div key={idx} className="p-2.5 text-xs font-mono" style={{ background: '#00ff9f08', border: '1px solid #00ff9f22' }}>
                      <div className="flex items-center justify-between mb-1">
                        <strong className="text-emerald-400">{cf.title}</strong>
                        <span className="text-[10px] text-slate-400">
                          Agreed by: {cf.agreed_by?.join(', ')}
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs">{cf.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Unique Findings */}
            <Card>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-950">
                <Sparkles size={16} style={{ color: '#00d4ff' }} />
                <h4 className="font-display font-bold text-xs tracking-wider" style={{ color: '#00d4ff' }}>
                  UNIQUE INSIGHTS
                </h4>
              </div>
              {Object.keys(uniqueFindings).length === 0 || Object.values(uniqueFindings).every(arr => arr.length === 0) ? (
                <p className="text-xs font-mono text-slate-500">// No single-model unique findings detected.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                  {Object.entries(uniqueFindings).map(([provider, items]) => (
                    items.map((uf, i) => (
                      <div key={`${provider}-${i}`} className="p-2.5 text-xs font-mono" style={{ background: '#00d4ff08', border: '1px solid #00d4ff22' }}>
                        <div className="flex items-center justify-between mb-1">
                          <strong className="text-cyan-400">{uf.title}</strong>
                          <span className="text-[10px] uppercase font-bold text-cyan-300">
                            {provider}
                          </span>
                        </div>
                        <p className="text-slate-300 text-xs">{uf.explanation}</p>
                      </div>
                    ))
                  ))}
                </div>
              )}
            </Card>

            {/* Conflicting Findings */}
            <Card>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-rose-950">
                <AlertTriangle size={16} style={{ color: '#ff006e' }} />
                <h4 className="font-display font-bold text-xs tracking-wider" style={{ color: '#ff006e' }}>
                  CONFLICTING ASSESSMENTS ({conflictingFindings.length})
                </h4>
              </div>
              {conflictingFindings.length === 0 ? (
                <p className="text-xs font-mono text-slate-500">// Zero divergence detected. Models in consensus.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {conflictingFindings.map((cf, idx) => (
                    <div key={idx} className="p-2.5 text-xs font-mono" style={{ background: '#ff006e08', border: '1px solid #ff006e22' }}>
                      <strong className="text-rose-400 block mb-1 uppercase text-[11px]">
                        {cf.type.replace(/_/g, ' ')}
                      </strong>
                      <p className="text-slate-300 text-xs">{cf.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

