import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Image as ImageIcon, Mic, Video, Sparkles,
  QrCode, ExternalLink, AlertTriangle, ShieldCheck,
  RefreshCw, CheckCircle2, Globe, Cpu, ChevronRight,
  Upload, X, Info, AlertOctagon
} from 'lucide-react'
import {
  analyzeMultimodalText,
  analyzeImageFile,
  analyzeAudioFile,
  analyzeVideoFile
} from '../services/multimodalService.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../hooks/useToast.jsx'
import { useScanHistory } from '../hooks/useScanHistory.jsx'
import {
  SectionHeader, Card, RiskGauge, RiskBadge, Spinner
} from '../components/ResultComponents.jsx'
import { riskColor } from '../utils/helpers.js'

const SAMPLE_TEXTS = [
  {
    label: 'Banking Phishing (SBI KYC)',
    lang: 'en',
    text: 'URGENT: Your SBI netbanking account is suspended due to expired KYC. Click http://sbi-kyc-update.xyz to verify your PAN & Aadhaar immediately to avoid permanent closure.'
  },
  {
    label: 'Kannada Bank Alert (ಕನ್ನಡ)',
    lang: 'kn',
    text: 'ಗ್ರಾಹಕರ ಗಮನಕ್ಕೆ: ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆ ತಾತ್ಕಾಲಿಕವಾಗಿ ನಿರ್ಬಂಧಿಸಲಾಗಿದೆ. ತಕ್ಷಣ ಈ ಕೆಳಗಿನ ಲಿಂಕ್ ತೆರೆದು OTP ನಮೂದಿಸಿ: http://karnataka-bank-verify.online'
  },
  {
    label: 'Hindi Electricity Threat (हिंदी)',
    lang: 'hi',
    text: 'प्रिय ग्राहक, आपका पिछला बिजली बिल अपडेट नहीं हुआ है। आज रात 9:30 बजे बिजली काट दी जाएगी। तुरंत हमारे अधिकारी से 9876543210 पर संपर्क करें या बिल भरें।'
  },
  {
    label: 'Job Offer Scam (Telegram)',
    lang: 'en',
    text: 'Congratulations! Selected for Part-Time YouTube Video Review Job. Earn ₹3,500 - ₹8,000 daily from home. Join official Telegram channel t.me/fast_earning_india to register. Initial deposit ₹500 required.'
  }
]

export default function MultimodalAnalyzer() {
  const navigate = useNavigate()
  const { user, session } = useAuth()
  const { addToast } = useToast()
  const { addScan } = useScanHistory()

  const [activeTab, setActiveTab] = useState('text') // 'text' | 'image' | 'audio' | 'video'
  const [targetLanguage, setTargetLanguage] = useState('en') // 'en' | 'kn' | 'hi'

  // Input states
  const [textContent, setTextContent] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState(null)

  // Execution states
  const [loading, setLoading] = useState(false)
  const [scanStep, setScanStep] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const fileInputRef = useRef(null)

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setSelectedFile(null)
    setFilePreviewUrl(null)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type against active tab
    if (activeTab === 'image' && !file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPG, PNG, or WEBP).')
      return
    }
    if (activeTab === 'audio' && !file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|ogg)$/i)) {
      setError('Please upload an audio file (MP3, WAV, or M4A).')
      return
    }
    if (activeTab === 'video' && !file.type.startsWith('video/') && !file.name.match(/\.(mp4|mov|avi)$/i)) {
      setError('Please upload a video file (MP4 format).')
      return
    }

    setError('')
    setSelectedFile(file)
    setFilePreviewUrl(URL.createObjectURL(file))
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl)
    setFilePreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRunAnalysis = async () => {
    setError('')
    setResult(null)

    if (activeTab === 'text' && !textContent.trim()) {
      setError('Please enter or paste suspicious text to analyze.')
      return
    }
    if (activeTab !== 'text' && !selectedFile) {
      setError(`Please upload a ${activeTab} file to proceed.`)
      return
    }

    setLoading(true)
    setScanStep('Initializing Multimodal Engine & Language Parsers...')

    try {
      const options = {
        targetLanguage,
        authToken: session?.access_token,
        userId: user?.id
      }

      let res
      if (activeTab === 'text') {
        setScanStep('Running Cross-Model Consensus (Gemini, Groq, Mistral, Rule Engine)...')
        res = await analyzeMultimodalText(textContent, options)
      } else if (activeTab === 'image') {
        setScanStep('Extracting OCR Text & Checking for QR Codes...')
        res = await analyzeImageFile(selectedFile, options)
      } else if (activeTab === 'audio') {
        setScanStep('Transcribing Speech via Groq Whisper & Detecting Language...')
        res = await analyzeAudioFile(selectedFile, options)
      } else if (activeTab === 'video') {
        setScanStep('Sampling Video Keyframes & Transcribing Spoken Audio...')
        res = await analyzeVideoFile(selectedFile, options)
      }

      setScanStep('Synthesizing Regional Consensus Verdict...')
      setResult(res)

      // Add to local history hook
      if (res) {
        addScan({
          type: 'multimodal',
          target: activeTab === 'text' ? textContent.slice(0, 80) : (selectedFile?.name || activeTab),
          riskScore: res.risk_score || 0,
          riskLevel: (res.risk_level || 'low').toUpperCase(),
          summary: res.summary || 'Multimodal analysis completed.'
        })
      }

      addToast('Multimodal AI analysis complete.', 'success')
    } catch (err) {
      setError(err.message || 'Analysis failed. Please check your network or try again.')
      addToast(err.message || 'Analysis encountered an error', 'error')
    } finally {
      setLoading(false)
      setScanStep('')
    }
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SectionHeader
          title="Multimodal AI Analyzer"
          subtitle="Unified cross-modal threat inspection for Text, Screenshots, Audio Voice, and Video with Regional Intelligence & Multi-Model Consensus."
          icon={Sparkles}
          badge="DAY 6 // UNIFIED AI"
        />

        {/* Regional Language Selector */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/80">
          <Globe size={15} className="text-emerald-400" />
          <span className="font-mono text-xs text-slate-400">Target Language:</span>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="bg-transparent font-mono text-xs text-emerald-400 focus:outline-none cursor-pointer"
          >
            <option value="en" className="bg-slate-900 text-slate-200">English (en)</option>
            <option value="kn" className="bg-slate-900 text-slate-200">ಕನ್ನಡ (Kannada)</option>
            <option value="hi" className="bg-slate-900 text-slate-200">हिंदी (Hindi)</option>
          </select>
        </div>
      </div>

      {/* Media Type Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-xl border border-slate-800 bg-slate-950/60 backdrop-blur-md">
        {[
          { id: 'text', label: 'Text Messages', icon: FileText, desc: 'SMS, WhatsApp, Email, UPI' },
          { id: 'image', label: 'Images & QR Codes', icon: ImageIcon, desc: 'Screenshots, Slips, QR' },
          { id: 'audio', label: 'Voice Audio', icon: Mic, desc: 'Voicemail, Phone Fraud' },
          { id: 'video', label: 'Video Analysis', icon: Video, desc: 'Ad Video, Keyframes' },
        ].map(({ id, label, icon: Icon, desc }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={`flex-1 min-w-[140px] px-4 py-3 rounded-lg text-left transition-all flex items-center gap-3 ${
                isActive
                  ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/5'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-emerald-400' : 'text-slate-500'} />
              <div>
                <div className="font-display text-xs font-bold tracking-wider">{label}</div>
                <div className="font-mono text-[10px] text-slate-500 hidden sm:block">{desc}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Input Section */}
      <Card>
        {activeTab === 'text' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs tracking-wider text-slate-400">
                // ENTER OR PASTE SUSPICIOUS TEXT CONTENT
              </label>
              <span className="font-mono text-[11px] text-slate-500">
                {textContent.length} characters
              </span>
            </div>

            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Paste suspicious SMS message, WhatsApp forward, fake job offer, lottery notification, or UPI payment message here..."
              rows={5}
              className="w-full px-4 py-3 rounded-lg font-mono text-xs bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all resize-y"
            />

            {/* Quick Sample Prompts */}
            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <span className="font-mono text-[11px] text-slate-500 block">
                Load Sample Scam Scenarios:
              </span>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_TEXTS.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTextContent(s.text)
                      setTargetLanguage(s.lang)
                    }}
                    className="px-2.5 py-1 rounded text-[11px] font-mono border border-slate-800 bg-slate-900/40 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab !== 'text' && (
          <div className="space-y-4">
            <label className="font-mono text-xs tracking-wider text-slate-400 block">
              // UPLOAD {activeTab.toUpperCase()} FILE FOR THREAT EXTRACTION
            </label>

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl p-8 text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-900/30 flex flex-col items-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                  <Upload size={22} />
                </div>
                <div>
                  <p className="font-mono text-sm text-slate-200">
                    Click to browse or drag and drop your {activeTab} file
                  </p>
                  <p className="font-mono text-xs text-slate-500 mt-1">
                    {activeTab === 'image' && 'Supports JPG, PNG, WEBP (Max 15MB)'}
                    {activeTab === 'audio' && 'Supports MP3, WAV, M4A voice files (Max 25MB)'}
                    {activeTab === 'video' && 'Supports MP4 container format (Max 40MB)'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    {activeTab === 'image' && <ImageIcon size={20} />}
                    {activeTab === 'audio' && <Mic size={20} />}
                    {activeTab === 'video' && <Video size={20} />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-slate-200 truncate">{selectedFile.name}</p>
                    <p className="font-mono text-[10px] text-slate-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'container'}
                    </p>
                  </div>
                </div>

                {/* Previews */}
                <div className="flex items-center gap-3">
                  {activeTab === 'image' && filePreviewUrl && (
                    <img src={filePreviewUrl} alt="Preview" className="h-16 w-16 object-cover rounded border border-slate-700" />
                  )}
                  {activeTab === 'audio' && filePreviewUrl && (
                    <audio controls src={filePreviewUrl} className="h-8 max-w-[200px]" />
                  )}
                  {activeTab === 'video' && filePreviewUrl && (
                    <video src={filePreviewUrl} className="h-16 w-24 object-cover rounded border border-slate-700" />
                  )}

                  <button
                    onClick={handleRemoveFile}
                    className="p-1.5 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Remove file"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept={
                activeTab === 'image'
                  ? 'image/jpeg,image/png,image/webp'
                  : activeTab === 'audio'
                  ? 'audio/mpeg,audio/wav,audio/m4a,audio/mp3'
                  : 'video/mp4'
              }
              className="hidden"
            />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-xs flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <div className="font-mono text-[11px] text-slate-500 flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Multi-Model AI Consensus Engine (Gemini + Groq + Mistral)</span>
          </div>

          <button
            onClick={handleRunAnalysis}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-mono text-xs font-bold tracking-wider bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Spinner size="sm" />
                <span>ANALYZING THREAT...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>RUN MULTIMODAL AUDIT</span>
              </>
            )}
          </button>
        </div>

        {/* Live Loading Step Indicator */}
        {loading && scanStep && (
          <div className="mt-4 p-3 rounded-lg bg-slate-900 border border-emerald-500/20 font-mono text-xs text-emerald-400 flex items-center gap-3 animate-pulse">
            <RefreshCw size={14} className="animate-spin" />
            <span>{scanStep}</span>
          </div>
        )}
      </Card>

      {/* Analysis Results View */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          {/* Executive Verdict Banner */}
          <Card>
            <div className="flex flex-col lg:flex-row items-center gap-6 justify-between">
              <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                <RiskGauge
                  score={result.risk_score || 0}
                  level={(result.risk_level || 'low').toUpperCase()}
                />
                <div className="space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <RiskBadge level={(result.risk_level || 'low').toUpperCase()} />
                    <span className="font-mono text-xs text-slate-400">
                      MEDIA TYPE: <strong className="text-slate-200 uppercase">{result.media_type}</strong>
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-slate-100">
                    {result.localization?.localized_alert || 'Threat Assessment Completed'}
                  </h3>
                  <p className="font-mono text-xs text-slate-300 max-w-xl">
                    {result.summary}
                  </p>
                </div>
              </div>

              {/* Language Tag */}
              <div className="flex flex-col items-end gap-1.5 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="font-mono text-[10px] text-slate-500 uppercase">Language Intelligence</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-mono text-xs text-emerald-300 font-bold">
                    {result.detected_language?.display_name || 'English'}
                  </span>
                </div>
                {result.detected_language?.is_mixed && (
                  <span className="font-mono text-[10px] text-amber-400">
                    Code-mixed dialect detected
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* QR Code Inspection Module (If Detected) */}
          {result.qr_codes_detected && result.qr_codes_detected.length > 0 && (
            <Card>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400">
                    <QrCode size={18} />
                    <span className="font-display text-sm font-bold tracking-wider">
                      QR CODE DETECTED IN MEDIA
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    NEVER AUTO-OPENED
                  </span>
                </div>

                {result.qr_codes_detected.map((qr, qidx) => (
                  <div key={qidx} className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="font-mono text-xs text-slate-300 break-all">
                        <span className="text-slate-500">Destination: </span>
                        <code className="text-emerald-400 bg-slate-900 px-2 py-0.5 rounded">
                          {qr.raw_destination}
                        </code>
                      </div>
                      {qr.raw_destination?.startsWith('http') && (
                        <button
                          onClick={() => navigate('/scan/url', { state: { initialUrl: qr.raw_destination } })}
                          className="px-3 py-1.5 rounded text-xs font-mono bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                        >
                          <span>Analyze in URL Checker</span>
                          <ExternalLink size={13} />
                        </button>
                      )}
                    </div>
                    <p className="font-mono text-[11px] text-slate-500">
                      🛡️ {qr.safety_disclaimer}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Multi-Model AI Consensus Engine Breakdown */}
          {result.consensus && (
            <Card>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Cpu size={18} className="text-cyan-400" />
                    <span className="font-display text-sm font-bold text-slate-100">
                      Multi-Model Consensus Breakdown
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">Agreement Metric:</span>
                    <span className="px-2.5 py-0.5 rounded font-mono text-xs font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      {result.consensus.agreement_percentage}% ({result.consensus.consensus_status})
                    </span>
                  </div>
                </div>

                {/* Individual Model Votes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {Object.entries(result.consensus.model_votes || {}).map(([key, v]) => (
                    <div key={key} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] text-slate-400 uppercase font-bold">
                          {key === 'gemini' ? 'Google Gemini' : key === 'groq' ? 'Groq LLaMA' : key === 'mistral' ? 'Mistral AI' : 'Rule Engine'}
                        </span>
                        <span
                          className="font-mono text-xs font-bold"
                          style={{ color: riskColor((v.risk_level || 'low').toUpperCase()) }}
                        >
                          {v.risk_score}/100
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-slate-500 truncate">
                        {v.scam_category || 'Evaluated'}
                      </p>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${v.risk_score || 0}%`,
                            background: riskColor((v.risk_level || 'low').toUpperCase())
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Consensus Agreements & Discrepancies */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <span className="font-mono text-xs text-slate-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-400" /> Points of Agreement:
                    </span>
                    <ul className="space-y-1 font-mono text-xs text-slate-300">
                      {(result.consensus.agreements || []).map((ag, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-400">•</span>
                          <span>{ag}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <span className="font-mono text-xs text-slate-400 font-bold flex items-center gap-1.5">
                      <Info size={14} className="text-cyan-400" /> Epistemic & Evidence Limitations:
                    </span>
                    <ul className="space-y-1 font-mono text-xs text-slate-400">
                      {(result.consensus.missing_evidence || []).map((me, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-cyan-400">•</span>
                          <span>{me}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-slate-900/40 border border-slate-800 text-[10px] font-mono text-slate-500">
                  ⚖️ {result.consensus.disclaimer}
                </div>
              </div>
            </Card>
          )}

          {/* Extracted Content & Original Verbatim Text */}
          <Card>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-300 flex items-center gap-2">
                  <FileText size={15} className="text-emerald-400" />
                  VERBATIM EXTRACTED CONTENT (OCR / TRANSCRIPT)
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  Preserved verbatim
                </span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap max-h-60 overflow-y-auto">
                {result.extracted_text || result.transcript || result.content || 'No text extracted.'}
              </div>
            </div>
          </Card>

          {/* Video Deepfake Disclaimer (If Video Analyzed) */}
          {result.media_type === 'video' && result.forensic_disclaimer && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300 font-mono text-xs">
              <AlertOctagon size={20} className="flex-shrink-0 text-amber-400 mt-0.5" />
              <div>
                <strong className="block text-amber-200 font-bold mb-1">
                  FORENSIC DEEPFAKE ANALYSIS LIMITATION DISCLOSURE:
                </strong>
                <p className="text-slate-300 leading-relaxed">
                  {result.forensic_disclaimer}
                </p>
              </div>
            </div>
          )}

          {/* Localized Actionable Safety Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <Card>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <ShieldCheck size={18} />
                  <span className="font-display text-sm font-bold">
                    RECOMMENDED DEFENSE MEASURES ({targetLanguage.toUpperCase()})
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.recommendations.map((rec, rIdx) => (
                    <div key={rIdx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        {rIdx + 1}
                      </span>
                      <p className="font-mono text-xs text-slate-200 leading-relaxed">
                        {rec}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
