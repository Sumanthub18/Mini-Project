import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Cpu,
  Zap,
  Sparkles,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react'
import { compareScamModels, checkBackendHealth } from '../services/scamService.js'
import { SectionHeader, RiskBadge, Spinner } from '../components/ResultComponents.jsx'
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
    label: 'Multilingual (Hindi)',
    text: 'प्रिय ग्राहक, आपका बिजली बिल बकाया है। आज रात 9:30 बजे बिजली कनेक्शन काट दिया जाएगा। तुरंत 9876543210 पर संपर्क करें या ऐप डाउनलोड करें।',
  },
]

const PROVIDER_METAS = {
  groq: {
    name: 'Groq LLaMA',
    icon: Zap,
    color: '#00E5FF',
  },
  gemini: {
    name: 'Google Gemini',
    icon: Sparkles,
    color: '#6F78FF',
  },
  mistral: {
    name: 'Mistral AI',
    icon: Globe,
    color: '#A78BFA',
  },
}

export default function ModelComparison() {
  const [input, setInput] = useState('')
  const [selectedProviders, setSelectedProviders] = useState(['groq', 'gemini', 'mistral'])
  const [loading, setLoading] = useState(false)
  const [comparisonData, setComparisonData] = useState(null)
  const [error, setError] = useState('')
  const [backendStatus, setBackendStatus] = useState(null)
  const { toast, addToast } = useToast()

  const notify = (msg, type = 'info') => {
    if (toast?.[type]) toast[type](msg)
    else if (addToast) addToast(msg, type)
  }

  useEffect(() => {
    checkBackendHealth().then(setBackendStatus).catch(() => {})
  }, [])

  const toggleProvider = (p) => {
    if (selectedProviders.includes(p)) {
      if (selectedProviders.length === 1) {
        notify('Select at least one provider for comparison.', 'info')
        return
      }
      setSelectedProviders((prev) => prev.filter((x) => x !== p))
    } else {
      setSelectedProviders((prev) => [...prev, p])
    }
  }

  const handleCompare = async () => {
    setError('')
    if (input.trim().length < 5) {
      setError('Minimum 5 characters required to compare across models.')
      return
    }

    setLoading(true)
    setComparisonData(null)

    try {
      const data = await compareScamModels(input.trim(), selectedProviders)
      setComparisonData(data)
      notify('Multi-model comparison completed.', 'success')
    } catch (err) {
      setError(err.message || 'Comparison failed. Verify backend connection.')
      notify('Comparison failed. Check backend connection.', 'error')
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
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      <SectionHeader
        badge="ENSEMBLE INTELLIGENCE"
        title="AI Model Comparison"
        subtitle="Evaluate the same suspicious payload side-by-side across Groq, Google Gemini, and Mistral AI to inspect agreements and disagreements."
      />

      {/* Provider Health Status Bar */}
      <div className="tl-glass rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: backendStatus?.status === 'healthy' ? '#5EE6A8' : '#FFBF69' }}
          />
          <span className="text-[rgba(236,232,255,0.75)]">
            Engine:{' '}
            <strong className="text-[#F4F2FF]">
              {backendStatus?.status === 'healthy' ? 'Online' : 'Offline / Limited'}
            </strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {['groq', 'gemini', 'mistral'].map((p) => {
            const isConf = backendStatus?.providers?.[p]?.configured
            const meta = PROVIDER_METAS[p]
            return (
              <span key={p} className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: isConf ? meta.color : 'rgba(236,232,255,0.35)' }}
                />
                <span style={{ color: isConf ? '#F4F2FF' : 'rgba(236,232,255,0.45)' }}>
                  {meta.name} ({isConf ? 'Ready' : 'Key Missing'})
                </span>
              </span>
            )
          })}
        </div>
      </div>

      {/* Input Section */}
      <div className="tl-glass-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label htmlFor="compare-input" className="text-xs font-mono text-[#00E5FF] flex items-center gap-2">
            <Cpu size={15} /> Suspicious Message Payload
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {['groq', 'gemini', 'mistral'].map((p) => {
              const checked = selectedProviders.includes(p)
              const meta = PROVIDER_METAS[p]
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggleProvider(p)}
                  className="px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all"
                  style={{
                    background: checked ? `${meta.color}1C` : 'rgba(13,8,48,0.55)',
                    border: `1px solid ${checked ? meta.color : 'rgba(196,178,255,0.16)'}`,
                    color: checked ? '#F4F2FF' : 'rgba(236,232,255,0.52)',
                  }}
                >
                  <meta.icon size={12} style={{ color: checked ? meta.color : undefined }} /> {meta.name}
                </button>
              )
            })}
          </div>
        </div>

        <textarea
          id="compare-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste a suspicious SMS, WhatsApp forward, UPI demand, or email to compare across models..."
          rows={5}
          className="w-full p-4 rounded-2xl text-sm font-mono text-[#F4F2FF] placeholder-[rgba(236,232,255,0.38)] resize-none focus:outline-none focus:border-[#00E5FF]/55"
          style={{
            background: 'rgba(13,8,48,0.68)',
            border: error ? '1px solid #FF5B78' : '1px solid rgba(196,178,255,0.16)',
          }}
        />

        {error && <p className="text-xs font-mono text-[#FF5B78]">{error}</p>}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t" style={{ borderColor: 'rgba(196,178,255,0.12)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-[rgba(236,232,255,0.5)]">Samples:</span>
            {SAMPLE_MESSAGES.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setInput(s.text)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-[rgba(236,232,255,0.75)] hover:text-[#00E5FF] transition-colors"
                style={{ background: 'rgba(13,8,48,0.55)', border: '1px solid rgba(196,178,255,0.14)' }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCompare}
            disabled={loading || !input.trim()}
            className="tl-btn-primary text-xs px-6 py-2.5 disabled:opacity-40"
          >
            {loading ? (
              <>
                <Spinner size={14} color="#F4F2FF" /> Comparing...
              </>
            ) : (
              <>
                <Cpu size={14} /> Run Comparison
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {comparisonData && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Consensus Bar */}
          <div className="tl-glass-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(0,229,255,0.14)', border: '1px solid rgba(0,229,255,0.35)' }}
              >
                <Layers size={20} className="text-[#00E5FF]" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display font-bold text-sm text-[#F4F2FF]">
                    Ensemble Consensus
                  </span>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold"
                    style={{
                      background:
                        consensus.agreement_level === 'Unanimous'
                          ? 'rgba(94,230,168,0.15)'
                          : 'rgba(255,191,105,0.15)',
                      color: consensus.agreement_level === 'Unanimous' ? '#5EE6A8' : '#FFBF69',
                      border: `1px solid ${
                        consensus.agreement_level === 'Unanimous'
                          ? 'rgba(94,230,168,0.35)'
                          : 'rgba(255,191,105,0.35)'
                      }`,
                    }}
                  >
                    {consensus.agreement_level} Agreement
                  </span>
                </div>
                <p className="text-xs font-mono text-[rgba(236,232,255,0.68)] mt-1">
                  Category: <strong className="text-[#F4F2FF]">{consensus.consensus_category}</strong> •{' '}
                  {consensus.successful_models} / {consensus.total_models_evaluated} models responded
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="md:text-right">
                <span className="text-[11px] font-mono text-[rgba(236,232,255,0.55)] block">
                  Synthesized Assessment
                </span>
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

          {/* Model Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {['groq', 'gemini', 'mistral'].map((p) => {
              if (!selectedProviders.includes(p)) return null
              const meta = PROVIDER_METAS[p]
              const res = models[p]
              const isSuccess = res?.status === 'success'
              const data = res?.data || {}

              return (
                <div
                  key={p}
                  className="tl-glass-card p-5 flex flex-col gap-4"
                  style={{ borderColor: isSuccess ? `${meta.color}44` : 'rgba(255,91,120,0.25)' }}
                >
                  <div
                    className="flex items-center justify-between pb-3 border-b"
                    style={{ borderColor: 'rgba(196,178,255,0.12)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: `${meta.color}1C`, border: `1px solid ${meta.color}44` }}
                      >
                        <meta.icon size={15} style={{ color: meta.color }} />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-xs text-[#F4F2FF]">{meta.name}</h3>
                        <span className="font-mono text-[10px] text-[rgba(236,232,255,0.52)]">
                          {res?.model || 'Configured model'}
                        </span>
                      </div>
                    </div>
                    {res?.execution_time_ms && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[rgba(236,232,255,0.68)] bg-white/5 flex items-center gap-1">
                        <Clock size={10} /> {res.execution_time_ms} ms
                      </span>
                    )}
                  </div>

                  {res?.status === 'unavailable' && (
                    <div className="py-8 text-center space-y-2 text-xs font-mono text-[rgba(236,232,255,0.68)]">
                      <AlertTriangle size={22} className="mx-auto text-[#FFBF69]" />
                      <p className="font-bold text-[#F4F2FF]">Provider Unconfigured</p>
                      <p>{p.toUpperCase()}_API_KEY is not configured in backend environment.</p>
                    </div>
                  )}

                  {res?.status === 'error' && (
                    <div className="py-8 text-center space-y-2 text-xs font-mono text-[#FF5B78]">
                      <AlertTriangle size={22} className="mx-auto" />
                      <p className="font-bold">Evaluation Failed</p>
                      <p className="text-[rgba(236,232,255,0.62)]">{res.error}</p>
                    </div>
                  )}

                  {isSuccess && (
                    <div className="flex flex-col gap-3 flex-1 text-xs">
                      <div
                        className="p-3 rounded-xl flex items-center justify-between"
                        style={{ background: 'rgba(13,8,48,0.65)', border: '1px solid rgba(196,178,255,0.12)' }}
                      >
                        <div>
                          <span className="text-[10px] font-mono text-[rgba(236,232,255,0.52)] block">Category</span>
                          <span className="font-semibold text-[#F4F2FF]">{data.scam_category || 'Unclassified'}</span>
                        </div>
                        <RiskBadge level={data.risk_level || 'low'} />
                      </div>

                      <p className="text-[rgba(236,232,255,0.82)] leading-relaxed">{data.summary}</p>

                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {(data.risk_indicators || []).map((ind, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-xl"
                            style={{ background: 'rgba(255,91,120,0.08)', border: '1px solid rgba(255,91,120,0.22)' }}
                          >
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <strong className="text-[#FF5B78]">{ind.title}</strong>
                              <span className="text-[10px] font-mono uppercase text-[rgba(236,232,255,0.6)]">
                                {ind.severity}
                              </span>
                            </div>
                            <p className="text-[rgba(236,232,255,0.78)]">{ind.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Common / Unique / Conflicting */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="tl-glass-card p-5 space-y-3">
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#5EE6A8] flex items-center gap-2">
                <CheckCircle2 size={15} /> Common Findings ({commonFindings.length})
              </h4>
              {commonFindings.length === 0 ? (
                <p className="text-xs text-[rgba(236,232,255,0.55)]">No overlapping flags identified.</p>
              ) : (
                <div className="space-y-2">
                  {commonFindings.map((cf, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl text-xs"
                      style={{ background: 'rgba(94,230,168,0.08)', border: '1px solid rgba(94,230,168,0.24)' }}
                    >
                      <strong className="text-[#5EE6A8] block">{cf.title}</strong>
                      <p className="text-[rgba(236,232,255,0.78)] mt-0.5">{cf.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="tl-glass-card p-5 space-y-3">
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#00E5FF] flex items-center gap-2">
                <Sparkles size={15} /> Unique Insights
              </h4>
              {Object.keys(uniqueFindings).length === 0 ||
              Object.values(uniqueFindings).every((arr) => arr.length === 0) ? (
                <p className="text-xs text-[rgba(236,232,255,0.55)]">No single-model unique insights.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {Object.entries(uniqueFindings).map(([provider, items]) =>
                    items.map((uf, i) => (
                      <div
                        key={`${provider}-${i}`}
                        className="p-2.5 rounded-xl text-xs"
                        style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.24)' }}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <strong className="text-[#00E5FF]">{uf.title}</strong>
                          <span className="text-[10px] font-mono uppercase text-[#A78BFA]">{provider}</span>
                        </div>
                        <p className="text-[rgba(236,232,255,0.78)]">{uf.explanation}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="tl-glass-card p-5 space-y-3">
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#FF5B78] flex items-center gap-2">
                <AlertTriangle size={15} /> Conflicting Assessments ({conflictingFindings.length})
              </h4>
              {conflictingFindings.length === 0 ? (
                <p className="text-xs text-[rgba(236,232,255,0.55)]">Models are in consensus.</p>
              ) : (
                <div className="space-y-2">
                  {conflictingFindings.map((cf, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl text-xs"
                      style={{ background: 'rgba(255,91,120,0.08)', border: '1px solid rgba(255,91,120,0.24)' }}
                    >
                      <strong className="text-[#FF5B78] uppercase text-[11px] block">
                        {cf.type?.replace(/_/g, ' ')}
                      </strong>
                      <p className="text-[rgba(236,232,255,0.78)] mt-0.5">{cf.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
