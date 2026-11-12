import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquareWarning,
  ShieldAlert,
  Sparkles,
  Trash2,
  UploadCloud,
  Image as ImageIcon,
  Globe,
  Cpu,
  AlertTriangle,
  Copy,
  CheckCheck,
  RefreshCw,
  Info,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useScanHistory } from '../hooks/useScanHistory.jsx'
import { useToast } from '../hooks/useToast.jsx'
import { analyzeScamMessage } from '../services/scamService.js'
import { analyzeImageFile } from '../services/multimodalService.js'
import {
  RiskGauge,
  RiskBadge,
  ResultSummary,
  WarningList,
  RecommendationList,
  SectionHeader,
} from '../components/ResultComponents.jsx'
import { copyToClipboard, riskColor, normalizeRiskLevel } from '../utils/helpers.js'

const MESSAGE_TYPES = [
  { id: 'sms', label: 'SMS' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'email', label: 'Email' },
  { id: 'banking_upi', label: 'Banking / UPI' },
  { id: 'job_offer', label: 'Job Offer' },
  { id: 'social', label: 'Social Media' },
]

const LANGUAGES = [
  { id: 'auto', label: 'Auto Detect' },
  { id: 'en', label: 'English' },
  { id: 'kn', label: 'Kannada' },
  { id: 'hi', label: 'Hindi' },
]

const SAMPLE_SCAMS = [
  {
    type: 'banking_upi',
    label: 'Fake KYC / UPI Suspend',
    text: 'URGENT: Your SBI YONO account & UPI ID will be blocked today. Complete KYC immediately at https://sbi-kyc-verify-now.xyz/login or share OTP to avoid suspension.',
  },
  {
    type: 'job_offer',
    label: 'Task / Job Advance Fee',
    text: 'Congratulations! You are selected for remote part-time YouTube liking work earning Rs. 4,500/day. Pay Rs. 999 refundable security deposit via UPI to activate your task portal.',
  },
  {
    type: 'whatsapp',
    label: 'Legitimate Bank Alert',
    text: 'Dear Customer, Rs. 1,250.00 debited from A/c XX4821 on 12-Nov via UPI. If not done by you, call our official helpline 1800-11-2211 listed on bank website.',
  },
]

function highlightSuspiciousPhrases(text, keywords = []) {
  if (!text) return null
  const terms = Array.from(
    new Set(
      [
        ...(Array.isArray(keywords) ? keywords : []),
        'otp',
        'upi',
        'kyc',
        'urgent',
        'blocked',
        'suspended',
        'verify',
        'click here',
        'fee',
        'deposit',
      ]
        .filter((t) => typeof t === 'string' && t.trim().length >= 3)
        .map((t) => t.trim())
    )
  )
  if (!terms.length) return text

  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, idx) => {
    const isMatch = terms.some((t) => t.toLowerCase() === part.toLowerCase())
    if (!isMatch) return <span key={idx}>{part}</span>
    return (
      <mark
        key={idx}
        className="px-1 py-0.5 rounded font-semibold"
        style={{
          background: 'rgba(255, 91, 120, 0.22)',
          color: '#FFBF69',
          border: '1px solid rgba(255, 91, 120, 0.35)',
        }}
      >
        {part}
      </mark>
    )
  })
}

export default function ScamScanner() {
  const { user, session } = useAuth()
  const { addScan } = useScanHistory()
  const { toast } = useToast()

  const [messageType, setMessageType] = useState('sms')
  const [language, setLanguage] = useState('auto')
  const [provider, setProvider] = useState('auto')
  const [input, setInput] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef(null)

  const handleSelectImage = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a JPG, PNG, or WEBP screenshot.')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError('')
  }

  const clearImage = () => {
    setImageFile(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleAnalyze = async () => {
    if (!input.trim() && !imageFile) {
      setError('Paste a suspicious message or upload a screenshot to inspect.')
      return
    }

    setError('')
    setLoading(true)
    setResult(null)

    try {
      const authOpts = {
        authToken: session?.access_token,
        userId: user?.id,
      }

      if (imageFile) {
        const res = await analyzeImageFile(imageFile, {
          targetLanguage: language === 'auto' ? 'en' : language,
          contextNote: `[${messageType}] ${input.trim()}`,
          ...authOpts,
        })

        const score = Number(res?.risk_score ?? res?.riskScore ?? 0)
        const level = normalizeRiskLevel(res?.risk_level || res?.riskLevel || (score >= 65 ? 'high' : score >= 35 ? 'medium' : 'low'))
        const normalized = {
          mode: 'image',
          riskScore: score,
          riskLevel: level,
          summary: res?.final_assessment || res?.summary || 'Screenshot inspection completed.',
          explanation: res?.explanation || res?.final_assessment || '',
          indicators: res?.detected_indicators || res?.warnings || [],
          recommendations: res?.recommended_actions || res?.recommendations || [],
          keywords: res?.detected_indicators || [],
          extractedText: res?.extracted_text || res?.original_text || '',
          qrUrls: res?.qr_urls || [],
          providerUsed: res?.provider_used || 'Multimodal Vision + Rule Engine',
          submittedText: input.trim() || `[Image] ${imageFile.name}`,
        }
        setResult(normalized)
        await addScan({
          type: 'scam',
          target: imageFile.name,
          riskScore: score,
          riskLevel: level,
          summary: normalized.summary,
          result: normalized,
        })
        toast.success('Screenshot threat inspection complete.')
      } else {
        const contextualPrefix =
          language !== 'auto'
            ? `[Channel: ${messageType} | Preferred Explanation Language: ${language}]\n`
            : `[Channel: ${messageType}]\n`

        const res = await analyzeScamMessage(`${contextualPrefix}${input.trim()}`, {
          provider,
          authToken: session?.access_token,
          userId: user?.id,
        })

        const score = Number(res?.riskScore ?? res?.risk_score ?? 0)
        const level = normalizeRiskLevel(res?.riskLevel || res?.risk_level)
        const normalized = {
          mode: 'text',
          riskScore: score,
          riskLevel: level,
          summary: res?.summary || res?.verdict || 'Message inspection completed.',
          explanation: res?.explanation || res?.aiExplanation || res?.summary || '',
          indicators: res?.warnings || res?.indicators || res?.redFlags || [],
          recommendations: res?.recommendations || res?.nextSteps || [],
          keywords: res?.keywords || res?.detectedKeywords || [],
          providerUsed: res?.providerUsed || res?.provider || provider,
          aiAssessment: res?.aiAnalysis || null,
          submittedText: input.trim(),
        }
        setResult(normalized)
        await addScan({
          type: 'scam',
          target: input.trim().slice(0, 120),
          riskScore: score,
          riskLevel: level,
          summary: normalized.summary,
          result: normalized,
        })
        toast.success('Scam & phishing analysis complete.')
      }
    } catch (err) {
      const msg = err.message || 'Scam analysis failed. Please check backend connectivity.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!result) return
    const text = `TrustLens AI Scam Assessment\nRisk: ${result.riskLevel?.toUpperCase()} (${result.riskScore}/100)\nSummary: ${result.summary}`
    await copyToClipboard(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SectionHeader
        badge="SCAM & SOCIAL ENGINEERING"
        title="Scam Detection Workspace"
        subtitle="Inspect SMS, WhatsApp messages, emails, banking/UPI alerts, job offers, or upload a screenshot for AI + heuristic verification."
      />

      {/* Input Card */}
      <div className="tl-glass-card p-5 sm:p-6 space-y-5">
        {/* Controls bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {MESSAGE_TYPES.map((t) => {
              const active = messageType === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMessageType(t.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                  style={
                    active
                      ? {
                          background: 'linear-gradient(135deg, rgba(111,120,255,0.34), rgba(0,229,255,0.16))',
                          border: '1px solid rgba(0,229,255,0.45)',
                          color: '#F4F2FF',
                        }
                      : {
                          background: 'rgba(13,8,48,0.55)',
                          border: '1px solid rgba(196,178,255,0.14)',
                          color: 'rgba(236,232,255,0.68)',
                        }
                  }
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

            <label
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs"
              style={{
                background: 'rgba(13,8,48,0.6)',
                border: '1px solid rgba(196,178,255,0.16)',
              }}
            >
              <Cpu className="w-3.5 h-3.5 text-[#A78BFA]" />
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="bg-transparent text-[#F4F2FF] font-mono text-xs focus:outline-none cursor-pointer"
              >
                <option value="auto" className="bg-[#17113D]">Auto AI</option>
                <option value="gemini" className="bg-[#17113D]">Gemini</option>
                <option value="groq" className="bg-[#17113D]">Groq</option>
                <option value="mistral" className="bg-[#17113D]">Mistral</option>
              </select>
            </label>
          </div>
        </div>

        {/* Message Textarea + Optional Screenshot Drag-and-Drop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-2">
            <label htmlFor="scam-message-input" className="text-xs font-mono text-[rgba(236,232,255,0.65)] block">
              Suspicious Message or Email Content
            </label>
            <textarea
              id="scam-message-input"
              rows={6}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 4000))}
              placeholder="Paste the SMS, WhatsApp forward, UPI request, OTP alert, or job offer here..."
              className="w-full p-4 rounded-2xl text-sm text-[#F4F2FF] placeholder-[rgba(236,232,255,0.38)] resize-none focus:outline-none focus:border-[#00E5FF]/55 transition-colors"
              style={{
                background: 'rgba(13,8,48,0.68)',
                border: error ? '1px solid #FF5B78' : '1px solid rgba(196,178,255,0.16)',
              }}
            />
            <div className="flex items-center justify-between text-[11px] font-mono text-[rgba(236,232,255,0.5)]">
              <span>{input.length} / 4000 characters</span>
              {error && <span className="text-[#FF5B78]">{error}</span>}
            </div>
          </div>

          {/* Drag & Drop Image Upload */}
          <div className="lg:col-span-4 flex flex-col">
            <span className="text-xs font-mono text-[rgba(236,232,255,0.65)] mb-2">
              Optional Screenshot Upload
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleSelectImage(e.target.files?.[0])}
            />
            {imageFile ? (
              <div
                className="flex-1 rounded-2xl p-3 flex flex-col justify-between relative overflow-hidden"
                style={{
                  background: 'rgba(13,8,48,0.68)',
                  border: '1px solid rgba(0,229,255,0.35)',
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono text-[#00E5FF] truncate flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    {imageFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={clearImage}
                    className="p-1 rounded-lg hover:bg-white/10 text-[rgba(236,232,255,0.7)] hover:text-[#FF5B78]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Uploaded screenshot preview"
                    className="w-full h-32 object-cover rounded-xl border border-white/10"
                  />
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(false)
                  handleSelectImage(e.dataTransfer.files?.[0])
                }}
                className="flex-1 min-h-[156px] rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer"
                style={{
                  background: dragging ? 'rgba(0,229,255,0.08)' : 'rgba(13,8,48,0.48)',
                  border: dragging
                    ? '1.5px dashed #00E5FF'
                    : '1.5px dashed rgba(196,178,255,0.26)',
                }}
              >
                <UploadCloud className="w-7 h-7 text-[#00E5FF]" />
                <p className="text-xs font-medium text-[#F4F2FF]">Drop screenshot here</p>
                <p className="text-[11px] text-[rgba(236,232,255,0.52)]">
                  JPG, PNG, WEBP — extracts OCR &amp; QR URLs safely
                </p>
              </button>
            )}
          </div>
        </div>

        {/* Sample examples + Action buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t" style={{ borderColor: 'rgba(196,178,255,0.12)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-[rgba(236,232,255,0.5)]">Examples:</span>
            {SAMPLE_SCAMS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  setMessageType(s.type)
                  setInput(s.text)
                  setError('')
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-[rgba(236,232,255,0.75)] hover:text-[#00E5FF] transition-colors"
                style={{
                  background: 'rgba(13,8,48,0.55)',
                  border: '1px solid rgba(196,178,255,0.14)',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setInput('')
                clearImage()
                setResult(null)
                setError('')
              }}
              disabled={loading || (!input && !imageFile)}
              className="tl-btn-ghost text-xs py-2.5 px-4 disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || (!input.trim() && !imageFile)}
              className="tl-btn-primary text-xs py-2.5 px-5 disabled:opacity-40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loading ? 'Analyzing...' : 'Analyze Threat'}
            </button>
          </div>
        </div>
      </div>

      {/* Animated Radar Scan State */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="tl-glass-card p-10 flex flex-col items-center justify-center text-center space-y-4"
          >
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[#00E5FF]/30 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-dashed border-[#6F78FF] animate-[spin_6s_linear_infinite]" />
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle, rgba(0,229,255,0.28), rgba(111,120,255,0.18))',
                  border: '1px solid rgba(0,229,255,0.45)',
                }}
              >
                <MessageSquareWarning className="w-6 h-6 text-[#00E5FF]" />
              </div>
            </div>
            <div>
              <p className="font-display font-semibold text-base text-[#F4F2FF]">
                Scanning Social Engineering &amp; Threat Patterns
              </p>
              <p className="text-xs font-mono text-[rgba(236,232,255,0.6)] mt-1">
                Evaluating urgency cues, payment traps, impersonation indicators &amp; AI context...
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
          {/* Provider bar + actions */}
          <div className="tl-glass rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-[#00E5FF]" />
              <span className="text-[rgba(236,232,255,0.75)]">
                Engine: <strong className="text-[#F4F2FF]">{result.providerUsed}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleCopy} className="tl-btn-ghost text-xs py-1.5 px-3">
                {copied ? <CheckCheck className="w-3.5 h-3.5 text-[#5EE6A8]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Summary'}
              </button>
              <button type="button" onClick={() => setResult(null)} className="tl-btn-ghost text-xs py-1.5 px-3">
                <RefreshCw className="w-3.5 h-3.5" /> New Check
              </button>
            </div>
          </div>

          {/* Score + Summary Card */}
          <div className="tl-glass-card p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-4 flex flex-col items-center">
              <RiskGauge score={result.riskScore} level={result.riskLevel} size={156} />
              <div className="mt-3">
                <RiskBadge level={result.riskLevel} />
              </div>
              <p className="mt-2.5 text-[11px] text-center text-[rgba(236,232,255,0.56)] flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-[#8D94FF] flex-shrink-0" />
                Assessment score, not a validated statistical probability.
              </p>
            </div>

            <div className="md:col-span-8 space-y-4">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-[#00E5FF]">
                  Assessment Summary
                </p>
                <h2
                  className="font-display text-xl font-bold mt-1"
                  style={{ color: riskColor(result.riskLevel) }}
                >
                  {result.riskLevel === 'high'
                    ? 'High Scam Indicators Detected'
                    : result.riskLevel === 'medium'
                    ? 'Suspicious Signals Found — Verify Carefully'
                    : 'Low Immediate Threat Signals Observed'}
                </h2>
              </div>

              <ResultSummary summary={result.summary} />

              {result.explanation && result.explanation !== result.summary && (
                <div
                  className="p-3.5 rounded-xl text-xs leading-relaxed text-[rgba(236,232,255,0.82)]"
                  style={{
                    background: 'rgba(13,8,48,0.55)',
                    border: '1px solid rgba(196,178,255,0.12)',
                  }}
                >
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#A78BFA] block mb-1">
                    AI Reasoning
                  </span>
                  {result.explanation}
                </div>
              )}
            </div>
          </div>

          {/* Suspicious Phrase Highlighting */}
          {result.submittedText && (
            <div className="tl-glass-card p-5 space-y-2.5">
              <h3 className="font-display text-sm font-semibold text-[#F4F2FF] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#FFBF69]" />
                Submitted Content &amp; Highlighted Triggers
              </h3>
              <div
                className="p-4 rounded-xl text-xs sm:text-sm leading-relaxed text-[rgba(236,232,255,0.86)] font-mono whitespace-pre-wrap"
                style={{
                  background: 'rgba(13,8,48,0.65)',
                  border: '1px solid rgba(196,178,255,0.14)',
                }}
              >
                {highlightSuspiciousPhrases(result.submittedText, result.keywords)}
              </div>
              {result.extractedText && (
                <div className="pt-2">
                  <p className="text-[11px] font-mono text-[#00E5FF] mb-1">OCR Extracted Text from Image:</p>
                  <p className="text-xs font-mono text-[rgba(236,232,255,0.78)] p-3 rounded-xl bg-[#0D0830]/60 border border-white/10 whitespace-pre-wrap">
                    {result.extractedText}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Indicators + Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="tl-glass-card p-5">
              <h3 className="font-display text-sm font-semibold text-[#F4F2FF] flex items-center gap-2 mb-3">
                <ShieldAlert className="w-4 h-4 text-[#FF5B78]" />
                Detected Indicators
              </h3>
              <WarningList warnings={result.indicators} />
            </div>

            <div className="tl-glass-card p-5">
              <h3 className="font-display text-sm font-semibold text-[#F4F2FF] mb-3">
                Recommended Protective Actions
              </h3>
              <RecommendationList items={result.recommendations} />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
