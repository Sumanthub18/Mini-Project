import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Image as ImageIcon,
  Smartphone,
  Mic,
  Video,
  Upload,
  Sparkles,
  QrCode,
  ExternalLink,
  Cpu,
  CheckCircle2,
  Info,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  Globe,
  RefreshCw,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useScanHistory } from '../hooks/useScanHistory.jsx'
import { useToast } from '../hooks/useToast.jsx'
import {
  getMultimodalHealth,
  analyzeMultimodalText,
  analyzeImageFile,
  analyzeAudioFile,
  analyzeVideoFile,
} from '../services/multimodalService.js'
import { MediaSketch } from '../components/CyberSketches.jsx'
import { RiskGauge, RiskBadge, SectionHeader } from '../components/ResultComponents.jsx'
import { riskColor, normalizeRiskLevel } from '../utils/helpers.js'

const MEDIA_CATEGORIES = [
  {
    id: 'text',
    sketch: 'text',
    label: 'Text',
    sub: 'SMS, WhatsApp, Email, UPI',
    icon: FileText,
    accept: '',
    hint: '',
  },
  {
    id: 'image',
    sketch: 'image',
    label: 'Images',
    sub: 'Photos, QR Slips, Posters',
    icon: ImageIcon,
    accept: 'image/jpeg,image/png,image/webp',
    hint: 'Supports JPG, PNG, WEBP (Max 15MB)',
  },
  {
    id: 'screenshot',
    sketch: 'screenshot',
    label: 'Screenshots',
    sub: 'Chat & Payment Captures',
    icon: Smartphone,
    accept: 'image/jpeg,image/png,image/webp',
    hint: 'Supports JPG, PNG, WEBP — extracts OCR & QR URLs',
  },
  {
    id: 'audio',
    sketch: 'audio',
    label: 'Audio',
    sub: 'Voice Notes & Call Audio',
    icon: Mic,
    accept: 'audio/mpeg,audio/wav,audio/m4a,audio/mp3,audio/*',
    hint: 'Supports MP3, WAV, M4A (English, Kannada, Hindi)',
  },
  {
    id: 'video',
    sketch: 'video',
    label: 'Video',
    sub: 'Reels, Ads & Clips',
    icon: Video,
    accept: 'video/mp4,video/*',
    hint: 'Supports MP4 (audio transcription + FFmpeg keyframes)',
  },
]

const SAMPLE_TEXTS = [
  {
    label: 'English UPI KYC Trap',
    lang: 'en',
    text: 'Dear customer, your bank account KYC is pending. Pay Rs 10 via bit.ly/kyc-pay or share OTP to prevent immediate suspension.',
  },
  {
    label: 'Kannada-English Mixed',
    lang: 'kn',
    text: 'Nimma SBI account block aagide! Urgent aagi ee link click maadi https://sbi-verify-now.xyz/kn mattu OTP share maadi.',
  },
  {
    label: 'Hindi-English Mixed',
    lang: 'hi',
    text: 'Aapka bijli connection aaj raat cut jayega. Turant 9876543210 par call karein ya APK install karke bill update karein.',
  },
]

const STEP_LABELS = {
  text: ['Detecting script & language...', 'Querying Gemini + Groq + Mistral + Rule Engine...'],
  image: ['Extracting OCR text & scanning for QR codes...', 'Running visual phishing & AI consensus checks...'],
  screenshot: ['Scanning screenshot OCR & QR payloads...', 'Synthesizing scam indicators & regional explanation...'],
  audio: ['Transcribing voice audio & detecting language...', 'Evaluating transcript for fraud cues...'],
  video: ['Extracting audio track & FFmpeg keyframes...', 'Analyzing transcript + frame OCR across AI consensus...'],
}

export default function MultimodalAnalyzer() {
  const navigate = useNavigate()
  const { user, session } = useAuth()
  const { addScan } = useScanHistory()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState('text')
  const [targetLanguage, setTargetLanguage] = useState('en')
  const [textContent, setTextContent] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [scanStep, setScanStep] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [health, setHealth] = useState(null)

  const fileInputRef = useRef(null)

  useEffect(() => {
    let active = true
    getMultimodalHealth()
      .then((h) => active && setHealth(h))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const handleTabChange = (id) => {
    setActiveTab(id)
    setError('')
    setResult(null)
    if (id === 'text' || ((id === 'image' || id === 'screenshot') !== (activeTab === 'image' || activeTab === 'screenshot'))) {
      handleRemoveFile()
    }
  }

  const handleFile = (file) => {
    if (!file) return
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl)
    setSelectedFile(file)
    setFilePreviewUrl(URL.createObjectURL(file))
    setError('')
  }

  const handleRemoveFile = () => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl)
    setSelectedFile(null)
    setFilePreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRunAnalysis = async () => {
    if (activeTab === 'text' && textContent.trim().length < 3) {
      setError('Please enter text content to analyze.')
      return
    }
    if (activeTab !== 'text' && !selectedFile) {
      setError(`Please select or drop a ${activeTab} file to analyze.`)
      return
    }

    setError('')
    setLoading(true)
    setResult(null)

    const steps = STEP_LABELS[activeTab] || STEP_LABELS.text
    setScanStep(steps[0])
    const stepTimer = setTimeout(() => setScanStep(steps[1]), 1400)

    try {
      const options = {
        targetLanguage,
        authToken: session?.access_token,
        userId: user?.id,
      }

      let res
      if (activeTab === 'text') {
        res = await analyzeMultimodalText(textContent.trim(), options)
      } else if (activeTab === 'image' || activeTab === 'screenshot') {
        res = await analyzeImageFile(selectedFile, options)
      } else if (activeTab === 'audio') {
        res = await analyzeAudioFile(selectedFile, options)
      } else {
        res = await analyzeVideoFile(selectedFile, options)
      }

      setResult(res)

      const score = Number(res?.risk_score ?? 0)
      const level = normalizeRiskLevel(res?.risk_level)

      await addScan({
        type: 'multimodal',
        target: activeTab === 'text' ? textContent.trim().slice(0, 120) : selectedFile?.name || activeTab,
        riskScore: score,
        riskLevel: level,
        summary: res?.summary || res?.localization?.localized_alert || 'Multimodal analysis complete',
        result: res,
      })

      toast.success('Multimodal analysis complete.')
    } catch (err) {
      const msg = err.message || 'Multimodal analysis failed. Verify backend and provider availability.'
      setError(msg)
      toast.error(msg)
    } finally {
      clearTimeout(stepTimer)
      setLoading(false)
      setScanStep('')
    }
  }

  const currentCategory = MEDIA_CATEGORIES.find((c) => c.id === activeTab) || MEDIA_CATEGORIES[0]

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <SectionHeader
        badge="MULTIMODAL THREAT INTELLIGENCE"
        title="Multimodal AI Analyzer"
        subtitle="Inspect text, images, screenshots, audio voice notes, and video clips with regional Kannada/Hindi/English intelligence and Gemini + Groq + Mistral consensus."
      />

      {/* Capability Status + Language Selector Bar */}
      <div className="tl-glass rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <span className="text-[rgba(236,232,255,0.6)]">Pipeline Capabilities:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#5EE6A8]/12 text-[#5EE6A8] border border-[#5EE6A8]/30">
            OCR &amp; QR: {health?.ocr_available === false ? 'Vision Fallback' : 'Active'}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#00E5FF]/12 text-[#00E5FF] border border-[#00E5FF]/30">
            FFmpeg Video: {health?.ffmpeg_available === false ? 'Audio/Basic' : 'Ready'}
          </span>
        </div>

        <label className="flex items-center gap-2 text-xs">
          <Globe className="w-4 h-4 text-[#00E5FF]" />
          <span className="text-[rgba(236,232,255,0.68)] font-mono">Explanation Language:</span>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-[#0D0830] border border-[rgba(196,178,255,0.2)] text-[#F4F2FF] font-mono text-xs focus:outline-none cursor-pointer"
          >
            <option value="en">English</option>
            <option value="kn">ಕನ್ನಡ (Kannada)</option>
            <option value="hi">हिंदी (Hindi)</option>
          </select>
        </label>
      </div>

      {/* 5 Unique Category Cards with Hand-Drawn Illustrations */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {MEDIA_CATEGORIES.map((cat) => {
          const active = activeTab === cat.id
          return (
            <motion.button
              key={cat.id}
              type="button"
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTabChange(cat.id)}
              className="tl-glass-card p-4 text-left flex flex-col justify-between gap-3 transition-all cursor-pointer"
              style={
                active
                  ? {
                      borderColor: 'rgba(0, 229, 255, 0.55)',
                      background: 'linear-gradient(145deg, rgba(111,120,255,0.24), rgba(0,229,255,0.1))',
                      boxShadow: '0 10px 28px rgba(0, 229, 255, 0.14)',
                    }
                  : undefined
              }
            >
              <div className="flex items-center justify-between">
                <MediaSketch type={cat.sketch} active={active} />
                {active && <span className="w-2 h-2 rounded-full bg-[#00E5FF]" />}
              </div>
              <div>
                <p className="font-display font-semibold text-sm text-[#F4F2FF]">{cat.label}</p>
                <p className="text-[11px] text-[rgba(236,232,255,0.58)] mt-0.5">{cat.sub}</p>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Input Workspace Card */}
      <div className="tl-glass-card p-5 sm:p-6 space-y-5">
        {activeTab === 'text' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="mm-text" className="text-xs font-mono text-[rgba(236,232,255,0.68)]">
                Message Content (English, Kannada, Hindi, or mixed-language)
              </label>
              <span className="text-[11px] font-mono text-[rgba(236,232,255,0.5)]">
                {textContent.length} chars
              </span>
            </div>
            <textarea
              id="mm-text"
              rows={5}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Paste SMS, WhatsApp message, email, UPI alert, or regional scam text..."
              className="w-full p-4 rounded-2xl text-sm text-[#F4F2FF] placeholder-[rgba(236,232,255,0.38)] resize-y focus:outline-none focus:border-[#00E5FF]/55"
              style={{
                background: 'rgba(13,8,48,0.68)',
                border: '1px solid rgba(196,178,255,0.16)',
              }}
            />
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t" style={{ borderColor: 'rgba(196,178,255,0.12)' }}>
              <span className="text-[11px] font-mono text-[rgba(236,232,255,0.5)]">Samples:</span>
              {SAMPLE_TEXTS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => {
                    setTextContent(s.text)
                    setTargetLanguage(s.lang)
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-[rgba(236,232,255,0.75)] hover:text-[#00E5FF] transition-colors"
                  style={{ background: 'rgba(13,8,48,0.55)', border: '1px solid rgba(196,178,255,0.14)' }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept={currentCategory.accept}
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="hidden"
            />

            {!selectedFile ? (
              <motion.div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(false)
                  handleFile(e.dataTransfer.files?.[0])
                }}
                whileHover={{ scale: 1.005 }}
                className="rounded-2xl p-8 sm:p-10 text-center cursor-pointer flex flex-col items-center gap-3 transition-all"
                style={{
                  background: dragging ? 'rgba(0,229,255,0.08)' : 'rgba(13,8,48,0.5)',
                  border: dragging
                    ? '1.5px dashed #00E5FF'
                    : '1.5px dashed rgba(196,178,255,0.26)',
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(111,120,255,0.24), rgba(0,229,255,0.16))',
                    border: '1px solid rgba(0,229,255,0.35)',
                  }}
                >
                  <Upload className="w-6 h-6 text-[#00E5FF]" />
                </div>
                <div>
                  <p className="font-display font-semibold text-sm text-[#F4F2FF]">
                    Drop your {currentCategory.label.toLowerCase()} file here or click to browse
                  </p>
                  <p className="text-xs font-mono text-[rgba(236,232,255,0.55)] mt-1">
                    {currentCategory.hint}
                  </p>
                </div>
              </motion.div>
            ) : (
              <div
                className="p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4"
                style={{ background: 'rgba(13,8,48,0.68)', border: '1px solid rgba(0,229,255,0.35)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/15 border border-[#00E5FF]/35 flex items-center justify-center text-[#00E5FF]">
                    <currentCategory.icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-[#F4F2FF] truncate">{selectedFile.name}</p>
                    <p className="text-[11px] font-mono text-[rgba(236,232,255,0.55)]">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || activeTab}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {(activeTab === 'image' || activeTab === 'screenshot') && filePreviewUrl && (
                    <img
                      src={filePreviewUrl}
                      alt="Uploaded preview"
                      className="h-16 w-20 object-cover rounded-xl border border-white/15"
                    />
                  )}
                  {activeTab === 'audio' && filePreviewUrl && (
                    <audio controls src={filePreviewUrl} className="h-8 max-w-[220px]" />
                  )}
                  {activeTab === 'video' && filePreviewUrl && (
                    <video src={filePreviewUrl} controls className="h-16 w-28 object-cover rounded-xl border border-white/15" />
                  )}
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-2 rounded-xl hover:bg-[#FF5B78]/15 text-[rgba(236,232,255,0.6)] hover:text-[#FF5B78] transition-colors"
                    title="Remove file"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            className="p-3 rounded-xl text-xs font-mono flex items-center gap-2 text-[#FF5B78]"
            style={{ background: 'rgba(255,91,120,0.1)', border: '1px solid rgba(255,91,120,0.32)' }}
          >
            <AlertTriangle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Run Audit Button & Processing Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t" style={{ borderColor: 'rgba(196,178,255,0.12)' }}>
          <div className="text-xs font-mono text-[rgba(236,232,255,0.58)] flex items-center gap-2">
            <ShieldCheck size={15} className="text-[#5EE6A8]" />
            <span>AI Consensus Engine (Gemini + Groq + Mistral + Rule Engine)</span>
          </div>

          <button
            type="button"
            onClick={handleRunAnalysis}
            disabled={loading}
            className="tl-btn-primary text-xs px-6 py-2.5 disabled:opacity-50"
          >
            <Sparkles size={14} />
            {loading ? 'Processing Media...' : 'Run Multimodal Audit'}
          </button>
        </div>

        <AnimatePresence>
          {loading && scanStep && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-3.5 rounded-xl flex items-center gap-3 text-xs font-mono text-[#00E5FF]"
              style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.25)' }}
            >
              <RefreshCw size={15} className="animate-spin flex-shrink-0" />
              <span>{scanStep}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results View */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Verdict + Language Detection */}
            <div className="tl-glass-card p-6 flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                <RiskGauge
                  score={result.risk_score || 0}
                  level={(result.risk_level || 'low').toUpperCase()}
                  size={150}
                />
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <RiskBadge level={(result.risk_level || 'low').toUpperCase()} />
                    <span className="text-xs font-mono text-[rgba(236,232,255,0.62)] uppercase">
                      Media: <strong className="text-[#F4F2FF]">{result.media_type}</strong>
                    </span>
                  </div>
                  <h3 className="font-display text-lg sm:text-xl font-bold text-[#F4F2FF]">
                    {result.localization?.localized_alert || 'Multimodal Assessment Complete'}
                  </h3>
                  <p className="text-xs sm:text-sm text-[rgba(236,232,255,0.82)] max-w-xl leading-relaxed">
                    {result.summary}
                  </p>
                </div>
              </div>

              <div
                className="p-3.5 rounded-2xl flex flex-col items-start lg:items-end gap-1 flex-shrink-0"
                style={{ background: 'rgba(13,8,48,0.65)', border: '1px solid rgba(196,178,255,0.16)' }}
              >
                <span className="text-[10px] font-mono uppercase tracking-wider text-[rgba(236,232,255,0.52)]">
                  Language Intelligence
                </span>
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#5EE6A8]">
                  <span className="w-2 h-2 rounded-full bg-[#5EE6A8]" />
                  {result.detected_language?.display_name || 'English'}
                </div>
                {result.detected_language?.is_mixed && (
                  <span className="text-[11px] font-mono text-[#FFBF69]">Mixed-language message detected</span>
                )}
              </div>
            </div>

            {/* QR Code Detection (Never Auto-Opened) */}
            {result.qr_codes_detected?.length > 0 && (
              <div className="tl-glass-card p-5 space-y-3" style={{ borderColor: 'rgba(255,191,105,0.35)' }}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-[#FFBF69]">
                    <QrCode size={18} />
                    <h4 className="font-display text-sm font-bold">QR Code Destination Extracted</h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#FFBF69]/12 text-[#FFBF69] border border-[#FFBF69]/30">
                    NEVER AUTO-OPENED
                  </span>
                </div>

                {result.qr_codes_detected.map((qr, qidx) => (
                  <div
                    key={qidx}
                    className="p-3.5 rounded-xl space-y-2"
                    style={{ background: 'rgba(13,8,48,0.68)', border: '1px solid rgba(196,178,255,0.14)' }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <code className="text-xs font-mono text-[#00E5FF] break-all">
                        {qr.raw_destination}
                      </code>
                      {qr.raw_destination?.startsWith('http') && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate('/scan/url', { state: { initialUrl: qr.raw_destination } })
                          }
                          className="tl-btn-ghost text-xs py-1.5 px-3 self-start sm:self-auto"
                        >
                          Check in URL Safety <ExternalLink size={13} />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-[rgba(236,232,255,0.58)]">
                      {qr.safety_disclaimer}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Consensus Breakdown */}
            {result.consensus && (
              <div className="tl-glass-card p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b" style={{ borderColor: 'rgba(196,178,255,0.14)' }}>
                  <div className="flex items-center gap-2">
                    <Cpu size={18} className="text-[#00E5FF]" />
                    <h4 className="font-display text-sm font-bold text-[#F4F2FF]">
                      AI Consensus Engine Breakdown
                    </h4>
                  </div>
                  <span className="px-3 py-1 rounded-full font-mono text-xs font-bold bg-[#00E5FF]/12 text-[#00E5FF] border border-[#00E5FF]/30">
                    {result.consensus.agreement_percentage}% Agreement ({result.consensus.consensus_status})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {Object.entries(result.consensus.model_votes || {}).map(([key, v]) => {
                    const col = riskColor(v.risk_level)
                    return (
                      <div
                        key={key}
                        className="p-3.5 rounded-xl space-y-2"
                        style={{ background: 'rgba(13,8,48,0.65)', border: '1px solid rgba(196,178,255,0.14)' }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] uppercase font-bold text-[rgba(236,232,255,0.72)]">
                            {key === 'gemini'
                              ? 'Google Gemini'
                              : key === 'groq'
                              ? 'Groq LLaMA'
                              : key === 'mistral'
                              ? 'Mistral AI'
                              : 'Rule Engine'}
                          </span>
                          <span className="font-mono text-xs font-bold" style={{ color: col }}>
                            {v.risk_score ?? 'N/A'}/100
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-[rgba(236,232,255,0.58)] truncate">
                          {v.status === 'unavailable' ? 'Provider Unavailable' : v.scam_category || 'Evaluated'}
                        </p>
                        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${v.risk_score || 0}%`, background: col }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <p className="font-mono text-xs font-semibold text-[#5EE6A8] flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> Points of Agreement
                    </p>
                    <ul className="space-y-1 text-xs text-[rgba(236,232,255,0.8)]">
                      {(result.consensus.agreements || []).map((ag, i) => (
                        <li key={i}>• {ag}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="font-mono text-xs font-semibold text-[#00E5FF] flex items-center gap-1.5">
                      <Info size={14} /> Disagreements &amp; Missing Evidence
                    </p>
                    <ul className="space-y-1 text-xs text-[rgba(236,232,255,0.72)]">
                      {(result.consensus.disagreements || []).map((dg, i) => (
                        <li key={`d-${i}`}>• {dg}</li>
                      ))}
                      {(result.consensus.missing_evidence || []).map((me, i) => (
                        <li key={`m-${i}`}>• {me}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {result.consensus.disclaimer && (
                  <p className="text-[11px] font-mono text-[rgba(236,232,255,0.52)] pt-1">
                    {result.consensus.disclaimer}
                  </p>
                )}
              </div>
            )}

            {/* Verbatim Extracted Content + Translated Text */}
            <div className="tl-glass-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-display text-sm font-semibold text-[#F4F2FF] flex items-center gap-2">
                  <FileText size={15} className="text-[#00E5FF]" />
                  Original Verbatim Content (OCR / Transcript)
                </h4>
                <span className="text-[10px] font-mono text-[rgba(236,232,255,0.52)]">
                  Preserved alongside translation
                </span>
              </div>
              <div
                className="p-4 rounded-xl font-mono text-xs text-[rgba(236,232,255,0.88)] whitespace-pre-wrap max-h-56 overflow-y-auto"
                style={{ background: 'rgba(13,8,48,0.68)', border: '1px solid rgba(196,178,255,0.14)' }}
              >
                {result.extracted_text || result.transcript || result.content || 'No text extracted from media.'}
              </div>
              {result.translated_text && (
                <div
                  className="p-4 rounded-xl font-mono text-xs text-[#00E5FF] whitespace-pre-wrap"
                  style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.22)' }}
                >
                  <span className="text-[10px] uppercase block mb-1 text-[rgba(236,232,255,0.6)]">
                    Translated Context:
                  </span>
                  {result.translated_text}
                </div>
              )}
            </div>

            {/* Video Deepfake Limitation Disclosure */}
            {result.media_type === 'video' && result.forensic_disclaimer && (
              <div
                className="p-4 rounded-2xl flex items-start gap-3 text-xs font-mono text-[#FFBF69]"
                style={{ background: 'rgba(255,191,105,0.09)', border: '1px solid rgba(255,191,105,0.32)' }}
              >
                <AlertOctagon size={18} className="flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="block mb-1">Video Analysis Limitation Disclosure</strong>
                  <p className="text-[rgba(236,232,255,0.82)]">{result.forensic_disclaimer}</p>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations?.length > 0 && (
              <div className="tl-glass-card p-5 space-y-3">
                <h4 className="font-display text-sm font-semibold text-[#5EE6A8] flex items-center gap-2">
                  <ShieldCheck size={17} /> Recommended Defense Measures ({targetLanguage.toUpperCase()})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.recommendations.map((rec, rIdx) => (
                    <div
                      key={rIdx}
                      className="p-3 rounded-xl flex items-start gap-2.5 text-xs text-[rgba(236,232,255,0.85)]"
                      style={{ background: 'rgba(13,8,48,0.6)', border: '1px solid rgba(196,178,255,0.12)' }}
                    >
                      <span className="w-5 h-5 rounded-full bg-[#5EE6A8]/15 text-[#5EE6A8] font-mono text-[11px] flex items-center justify-center flex-shrink-0">
                        {rIdx + 1}
                      </span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
