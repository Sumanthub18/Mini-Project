import { useState, useRef, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Send, Paperclip, Sparkles, Maximize2, Globe, Cpu, AlertTriangle, Loader2, Shield,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../hooks/useToast.jsx'
import { sendChatMessage, uploadChatAttachment } from '../services/chatService.js'

const SUGGESTED_QUESTIONS = [
  'Is this UPI payment request a scam?',
  'How do I verify a suspicious link safely?',
  'Check if a viral WhatsApp claim is fake news',
  'What should I do if I shared my OTP?',
]

export default function FloatingAssistant() {
  const { pathname } = useLocation()
  const { user, session } = useAuth()
  const { toast } = useToast()

  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [language, setLanguage] = useState('en')
  const [model, setModel] = useState('auto')
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am the TrustLens AI Cyber Safety Assistant. Paste a suspicious message, URL, or question below — I can explain scam tactics in English, Kannada, or Hindi without exposing you to unsafe links.',
    },
  ])
  const [attachment, setAttachment] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const fileRef = useRef(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, open, sending])

  // Hide widget on full-screen chatbot route to avoid duplicate UI
  if (pathname === '/chat') return null

  const authOpts = {
    authToken: session?.access_token,
    userId: user?.id,
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadChatAttachment(file, authOpts)
      if (!res?.ok) {
        toast.error(res?.error || 'Could not process attachment')
      } else {
        setAttachment(res)
        toast.success(`Attached: ${file.name}`)
      }
    } catch (err) {
      toast.error(err.message || 'Attachment upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSend = async (customPrompt) => {
    const text = (typeof customPrompt === 'string' ? customPrompt : input).trim()
    if (!text && !attachment) return
    if (sending) return

    const promptToSend = text || `Analyze attached file: ${attachment?.filename || 'media'}`
    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: promptToSend,
      attachmentName: attachment?.filename,
    }
    setMessages((prev) => [...prev, userMsg])
    if (typeof customPrompt !== 'string') setInput('')
    setSending(true)

    try {
      const res = await sendChatMessage(promptToSend, {
        conversationId,
        model,
        language,
        attachmentContext: attachment,
        ...authOpts,
      })

      if (res?.conversation_id) setConversationId(res.conversation_id)

      const replyText =
        res?.reply ||
        res?.assistant_message?.content ||
        res?.error ||
        'I could not complete that check right now. Please try again or use the dedicated scanner.'

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: replyText,
          provider: res?.provider_used || res?.provider,
        },
      ])
      setAttachment(null)
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          isError: true,
          content: err.message || 'Assistant temporarily unavailable. Check backend connection.',
        },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.94 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="mb-3 w-[calc(100vw-2.5rem)] sm:w-[390px] rounded-2xl overflow-hidden flex flex-col tl-glass-strong shadow-2xl"
            style={{
              maxHeight: 'min(74vh, 560px)',
              border: '1px solid rgba(196,178,255,0.22)',
              boxShadow: '0 24px 64px rgba(6,3,22,0.75), 0 0 36px rgba(111,120,255,0.22)',
            }}
          >
            {/* Header */}
            <div
              className="px-4 py-3 flex items-center justify-between border-b"
              style={{
                borderColor: 'rgba(196,178,255,0.14)',
                background: 'linear-gradient(135deg, rgba(111,120,255,0.2), rgba(0,229,255,0.08))',
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'radial-gradient(circle, rgba(0,229,255,0.35), rgba(111,120,255,0.25))',
                    border: '1px solid rgba(0,229,255,0.45)',
                    boxShadow: '0 0 16px rgba(0,229,255,0.35)',
                  }}
                >
                  <Shield className="w-4 h-4 text-[#00E5FF]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-display font-semibold text-[#F4F2FF] truncate">
                    TrustLens AI Assistant
                  </p>
                  <p className="text-[10px] font-mono text-[#00E5FF] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5EE6A8]" /> Cyber Safety Copilot
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  to="/chat"
                  onClick={() => setOpen(false)}
                  title="Open full workspace"
                  className="p-1.5 rounded-lg text-[rgba(236,232,255,0.7)] hover:text-[#00E5FF] hover:bg-white/5 transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close AI Assistant"
                  className="p-1.5 rounded-lg text-[rgba(236,232,255,0.7)] hover:text-[#F4F2FF] hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Provider & Language controls */}
            <div
              className="px-3.5 py-2 flex items-center gap-2 border-b text-[11px]"
              style={{ borderColor: 'rgba(196,178,255,0.1)', background: 'rgba(16,11,53,0.6)' }}
            >
              <label className="flex items-center gap-1 text-[rgba(236,232,255,0.72)]">
                <Cpu className="w-3 h-3 text-[#8D94FF]" />
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="bg-transparent text-[#F4F2FF] font-mono focus:outline-none cursor-pointer"
                >
                  <option value="auto" className="bg-[#17113D]">Auto</option>
                  <option value="gemini" className="bg-[#17113D]">Gemini</option>
                  <option value="groq" className="bg-[#17113D]">Groq</option>
                  <option value="mistral" className="bg-[#17113D]">Mistral</option>
                </select>
              </label>
              <span className="text-[rgba(196,178,255,0.25)]">|</span>
              <label className="flex items-center gap-1 text-[rgba(236,232,255,0.72)]">
                <Globe className="w-3 h-3 text-[#00E5FF]" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-transparent text-[#F4F2FF] font-mono focus:outline-none cursor-pointer"
                >
                  <option value="en" className="bg-[#17113D]">English</option>
                  <option value="kn" className="bg-[#17113D]">Kannada</option>
                  <option value="hi" className="bg-[#17113D]">Hindi</option>
                </select>
              </label>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user' ? 'text-[#F4F2FF]' : 'text-[rgba(236,232,255,0.88)]'
                    }`}
                    style={
                      m.role === 'user'
                        ? {
                            background: 'linear-gradient(135deg, rgba(111,120,255,0.38), rgba(141,148,255,0.22))',
                            border: '1px solid rgba(141,148,255,0.38)',
                          }
                        : m.isError
                        ? {
                            background: 'rgba(255,91,120,0.12)',
                            border: '1px solid rgba(255,91,120,0.32)',
                          }
                        : {
                            background: 'rgba(23,17,61,0.8)',
                            border: '1px solid rgba(196,178,255,0.16)',
                          }
                    }
                  >
                    {m.attachmentName && (
                      <div className="mb-1 text-[10px] font-mono text-[#00E5FF]">
                        Attachment: {m.attachmentName}
                      </div>
                    )}
                    {m.content}
                    {m.provider && (
                      <div className="mt-1.5 text-[10px] font-mono text-[#A78BFA]">
                        via {m.provider}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex justify-start">
                  <div
                    className="rounded-2xl px-3.5 py-2.5 text-xs flex items-center gap-2 text-[#00E5FF]"
                    style={{
                      background: 'rgba(23,17,61,0.8)',
                      border: '1px solid rgba(0,229,255,0.22)',
                    }}
                  >
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="font-mono">Analyzing safely...</span>
                  </div>
                </div>
              )}

              {messages.length <= 2 && (
                <div className="pt-1 space-y-1.5">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[rgba(236,232,255,0.5)]">
                    Suggested questions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleSend(q)}
                        className="text-left text-[11px] px-2.5 py-1.5 rounded-lg transition-colors hover:border-[#00E5FF]/40 hover:text-[#F4F2FF]"
                        style={{
                          background: 'rgba(111,120,255,0.12)',
                          border: '1px solid rgba(196,178,255,0.18)',
                          color: 'rgba(236,232,255,0.8)',
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Attachment badge + safety note */}
            {attachment && (
              <div
                className="px-3.5 py-1.5 text-[11px] font-mono flex items-center justify-between border-t"
                style={{
                  borderColor: 'rgba(196,178,255,0.12)',
                  background: 'rgba(0,229,255,0.08)',
                  color: '#00E5FF',
                }}
              >
                <span className="truncate">Ready: {attachment.filename}</span>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="text-xs hover:text-[#FF5B78] ml-2"
                >
                  Remove
                </button>
              </div>
            )}

            <div
              className="px-3 py-1.5 text-[10px] flex items-center gap-1.5 border-t"
              style={{
                borderColor: 'rgba(196,178,255,0.1)',
                color: 'rgba(236,232,255,0.52)',
                background: 'rgba(13,8,48,0.55)',
              }}
            >
              <AlertTriangle className="w-3 h-3 text-[#FFBF69] flex-shrink-0" />
              <span>Never share OTPs, PINs, or private passwords in chat.</span>
            </div>

            {/* Input bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="p-2.5 flex items-center gap-2 border-t"
              style={{ borderColor: 'rgba(196,178,255,0.14)', background: 'rgba(16,11,53,0.9)' }}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*,audio/*,video/*"
                onChange={handleUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || sending}
                title="Attach image, audio, or video"
                className="p-2 rounded-xl text-[rgba(236,232,255,0.72)] hover:text-[#00E5FF] hover:bg-white/5 transition-colors disabled:opacity-40"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about a scam, claim, or URL..."
                className="flex-1 bg-transparent text-xs text-[#F4F2FF] placeholder-[rgba(236,232,255,0.42)] focus:outline-none"
              />
              <button
                type="submit"
                disabled={sending || (!input.trim() && !attachment)}
                className="p-2 rounded-xl text-white transition-all disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #6F78FF, #00E5FF)',
                }}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating circular AI core launcher */}
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        aria-label={open ? 'Close AI Cyber Safety Assistant' : 'Open AI Cyber Safety Assistant'}
        className="relative w-14 h-14 rounded-full flex items-center justify-center group"
        style={{
          background: 'linear-gradient(135deg, rgba(111,120,255,0.92), rgba(0,229,255,0.85))',
          border: '1px solid rgba(196,178,255,0.45)',
          boxShadow: '0 10px 32px rgba(111,120,255,0.45), 0 0 24px rgba(0,229,255,0.35)',
        }}
      >
        {/* Outer rotating orbit ring */}
        <span
          aria-hidden="true"
          className="absolute -inset-1 rounded-full border border-dashed border-[#00E5FF]/50 animate-[spin_12s_linear_infinite] pointer-events-none"
        />
        {open ? (
          <X className="w-6 h-6 text-[#0D0830]" />
        ) : (
          <div className="relative flex items-center justify-center">
            <Shield className="w-6 h-6 text-[#0D0830]" />
            <Sparkles className="w-3 h-3 text-white absolute -top-1 -right-1.5" />
          </div>
        )}
      </motion.button>
    </div>
  )
}

