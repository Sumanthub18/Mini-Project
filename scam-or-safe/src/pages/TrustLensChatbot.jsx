import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Paperclip,
  Trash2,
  Bot,
  User,
  ShieldAlert,
  Sparkles,
  Globe,
  Cpu,
  Plus,
  RefreshCw,
  X,
  PhoneCall,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../hooks/useToast.jsx'
import {
  sendChatMessage,
  uploadChatAttachment,
  listConversations,
  getConversationMessages,
  deleteConversation,
} from '../services/chatService.js'
import { SectionHeader, Spinner } from '../components/ResultComponents.jsx'

const QUICK_ACTIONS = [
  { label: 'Is this UPI request a scam?', prompt: 'Is this UPI collect request for receiving money a scam?' },
  { label: 'Shared OTP Emergency', prompt: 'I accidentally shared my OTP / clicked a link. What should I do right now?' },
  { label: 'Kannada Safety Tips', prompt: 'Explain how to spot fake job offers in Kannada.' },
  { label: 'Hindi Banking Fraud', prompt: 'Bank KYC block hone ka message aaya hai, kaise check karun?' },
]

export default function TrustLensChatbot() {
  const { user, session } = useAuth()
  const { toast } = useToast()

  const [conversations, setConversations] = useState([])
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hello! I am the TrustLens AI Cyber Safety Assistant. Paste a suspicious message, upload a screenshot, or describe a digital safety concern — I will guide you step-by-step without ever asking for your passwords, OTPs, or PINs.',
    },
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [modelChoice, setModelChoice] = useState('auto')
  const [chatLanguage, setChatLanguage] = useState('en')
  const [attachedFile, setAttachedFile] = useState(null)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [sending, setSending] = useState(false)

  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)

  const authOpts = {
    authToken: session?.access_token,
    userId: user?.id,
  }

  useEffect(() => {
    let active = true
    listConversations(authOpts)
      .then((res) => {
        if (active && Array.isArray(res?.conversations)) {
          setConversations(res.conversations)
        } else if (active && Array.isArray(res)) {
          setConversations(res)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [user?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const handleSelectConversation = async (convId) => {
    setCurrentConversationId(convId)
    try {
      const res = await getConversationMessages(convId, authOpts)
      const msgs = Array.isArray(res?.messages) ? res.messages : Array.isArray(res) ? res : []
      if (msgs.length) setMessages(msgs)
    } catch {
      toast.error('Could not load conversation history.')
    }
  }

  const handleStartNewChat = () => {
    setCurrentConversationId(null)
    setAttachedFile(null)
    setMessages([
      {
        role: 'assistant',
        content:
          'Started a new cyber incident chat. Share the suspicious message, link, or screenshot you want to inspect.',
      },
    ])
  }

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation()
    try {
      await deleteConversation(convId, authOpts)
      setConversations((prev) => prev.filter((c) => c.id !== convId))
      if (currentConversationId === convId) handleStartNewChat()
      toast.info('Conversation deleted.')
    } catch {
      toast.error('Failed to delete conversation.')
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAttachment(true)
    try {
      const res = await uploadChatAttachment(file, authOpts)
      if (!res?.ok) {
        toast.error(res?.error || 'Could not process attachment.')
      } else {
        setAttachedFile({ ...res, name: res.filename || file.name })
        toast.success(`Attached ${file.name}`)
      }
    } catch (err) {
      toast.error(err.message || 'Attachment upload failed.')
    } finally {
      setUploadingAttachment(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSendMessage = async (overridePrompt) => {
    const text = (typeof overridePrompt === 'string' ? overridePrompt : inputMessage).trim()
    if (!text && !attachedFile) return
    if (sending) return

    const userMsg = {
      role: 'user',
      content: text || `Analyze attached image: ${attachedFile?.name || 'screenshot'}`,
      attachment_name: attachedFile?.name,
    }
    setMessages((prev) => [...prev, userMsg])
    if (typeof overridePrompt !== 'string') setInputMessage('')
    setSending(true)

    try {
      const res = await sendChatMessage(userMsg.content, {
        conversationId: currentConversationId,
        model: modelChoice,
        language: chatLanguage,
        attachmentContext: attachedFile,
        ...authOpts,
      })

      if (res?.conversation_id) {
        setCurrentConversationId(res.conversation_id)
        listConversations(authOpts)
          .then((listRes) => {
            if (Array.isArray(listRes?.conversations)) setConversations(listRes.conversations)
          })
          .catch(() => {})
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res?.reply || res?.assistant_message?.content || res?.error || 'No response received.',
          model_used: res?.provider_used || res?.model_used,
          is_emergency: res?.is_emergency,
          guardrail_triggered: res?.guardrail_triggered,
        },
      ])
      setAttachedFile(null)
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err.message || 'Could not reach TrustLens Assistant backend.',
          is_emergency: false,
        },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Holographic Header + Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center relative flex-shrink-0"
            style={{
              background: 'radial-gradient(circle, rgba(0,229,255,0.32), rgba(111,120,255,0.22))',
              border: '1px solid rgba(0,229,255,0.45)',
              boxShadow: '0 0 24px rgba(0,229,255,0.28)',
            }}
          >
            <Bot className="w-6 h-6 text-[#00E5FF]" />
          </div>
          <div>
            <SectionHeader
              badge="AI CYBER SAFETY ASSISTANT"
              title="TrustLens AI Copilot"
              subtitle="Ask about scams, evaluate screenshots safely, or get cyber emergency help in English, Kannada, or Hindi."
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(23,17,61,0.75)', border: '1px solid rgba(196,178,255,0.18)' }}
          >
            <Cpu size={14} className="text-[#00E5FF]" />
            <select
              value={modelChoice}
              onChange={(e) => setModelChoice(e.target.value)}
              className="bg-transparent font-mono text-xs text-[#F4F2FF] focus:outline-none cursor-pointer"
            >
              <option value="auto" className="bg-[#17113D]">Auto Route (Consensus)</option>
              <option value="gemini" className="bg-[#17113D]">Google Gemini</option>
              <option value="groq" className="bg-[#17113D]">Groq LLaMA</option>
              <option value="mistral" className="bg-[#17113D]">Mistral AI</option>
            </select>
          </div>

          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(23,17,61,0.75)', border: '1px solid rgba(196,178,255,0.18)' }}
          >
            <Globe size={14} className="text-[#5EE6A8]" />
            <select
              value={chatLanguage}
              onChange={(e) => setChatLanguage(e.target.value)}
              className="bg-transparent font-mono text-xs text-[#F4F2FF] focus:outline-none cursor-pointer"
            >
              <option value="en" className="bg-[#17113D]">English</option>
              <option value="kn" className="bg-[#17113D]">ಕನ್ನಡ (Kannada)</option>
              <option value="hi" className="bg-[#17113D]">हिंदी (Hindi)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Glass Chat Shell */}
      <div
        className="grid grid-cols-1 lg:grid-cols-4 rounded-3xl overflow-hidden tl-glass-card"
        style={{ height: 'min(74vh, 690px)' }}
      >
        {/* Conversation History Sidebar */}
        <div
          className="hidden lg:flex flex-col border-r p-4 space-y-4"
          style={{ borderColor: 'rgba(196,178,255,0.14)', background: 'rgba(13,8,48,0.58)' }}
        >
          <button
            type="button"
            onClick={handleStartNewChat}
            className="tl-btn-primary w-full justify-center text-xs py-2.5"
          >
            <Plus size={15} /> New Incident Chat
          </button>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            <span className="font-mono text-[10px] text-[rgba(236,232,255,0.5)] uppercase tracking-widest block px-2 mb-1">
              Recent Conversations
            </span>
            {conversations.length === 0 ? (
              <p className="font-mono text-xs text-[rgba(236,232,255,0.48)] px-2 py-4">
                No past incident chats yet.
              </p>
            ) : (
              conversations.map((c) => {
                const isSelected = c.id === currentConversationId
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectConversation(c.id)}
                    className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'text-[#00E5FF]'
                        : 'text-[rgba(236,232,255,0.68)] hover:text-[#F4F2FF] hover:bg-white/[0.04]'
                    }`}
                    style={
                      isSelected
                        ? {
                            background: 'rgba(111,120,255,0.2)',
                            border: '1px solid rgba(0,229,255,0.34)',
                          }
                        : undefined
                    }
                  >
                    <span className="font-mono text-xs truncate max-w-[170px]">
                      {c.title || 'Incident Chat'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(e, c.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-[#FF5B78] transition-opacity"
                      title="Delete conversation"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Helpline 1930 Emergency Banner */}
          <div
            className="p-3.5 rounded-2xl space-y-1"
            style={{ background: 'rgba(255,91,120,0.1)', border: '1px solid rgba(255,91,120,0.32)' }}
          >
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#FF5B78]">
              <PhoneCall size={13} />
              <span>Cyber Helpline 1930</span>
            </div>
            <p className="text-[11px] text-[rgba(236,232,255,0.72)] leading-relaxed">
              For active financial fraud in India, call 1930 or report at cybercrime.gov.in immediately.
            </p>
          </div>
        </div>

        {/* Chat Feed + Input */}
        <div className="lg:col-span-3 flex flex-col h-full min-h-0">
          {/* Quick Action Chips */}
          <div
            className="px-4 py-3 border-b flex items-center gap-2 overflow-x-auto flex-shrink-0"
            style={{ borderColor: 'rgba(196,178,255,0.12)', background: 'rgba(13,8,48,0.42)' }}
          >
            {QUICK_ACTIONS.map((action, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(action.prompt)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-mono text-[rgba(236,232,255,0.78)] hover:text-[#00E5FF] transition-colors flex-shrink-0"
                style={{
                  background: 'rgba(111,120,255,0.12)',
                  border: '1px solid rgba(196,178,255,0.18)',
                }}
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((m, idx) => {
                const isUser = m.role === 'user'
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={
                        isUser
                          ? {
                              background: 'rgba(111,120,255,0.28)',
                              border: '1px solid rgba(141,148,255,0.45)',
                              color: '#F4F2FF',
                            }
                          : {
                              background: 'rgba(0,229,255,0.18)',
                              border: '1px solid rgba(0,229,255,0.4)',
                              color: '#00E5FF',
                            }
                      }
                    >
                      {isUser ? <User size={15} /> : <Bot size={15} />}
                    </div>

                    <div className={`space-y-1.5 ${isUser ? 'items-end' : ''}`}>
                      <div
                        className="p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap"
                        style={
                          isUser
                            ? {
                                background: 'linear-gradient(135deg, rgba(111,120,255,0.34), rgba(141,148,255,0.2))',
                                border: '1px solid rgba(141,148,255,0.36)',
                                color: '#F4F2FF',
                              }
                            : m.is_emergency
                            ? {
                                background: 'rgba(255,91,120,0.14)',
                                border: '1px solid rgba(255,91,120,0.42)',
                                color: '#F4F2FF',
                              }
                            : m.guardrail_triggered
                            ? {
                                background: 'rgba(255,191,105,0.12)',
                                border: '1px solid rgba(255,191,105,0.4)',
                                color: '#F4F2FF',
                              }
                            : {
                                background: 'rgba(13,8,48,0.68)',
                                border: '1px solid rgba(196,178,255,0.16)',
                                color: 'rgba(236,232,255,0.9)',
                              }
                        }
                      >
                        {m.attachment_name && (
                          <div className="mb-2 px-2.5 py-1 rounded-lg bg-[#00E5FF]/10 border border-[#00E5FF]/25 text-[11px] font-mono text-[#00E5FF] flex items-center gap-1.5">
                            <Paperclip size={12} />
                            <span>Attached: {m.attachment_name}</span>
                          </div>
                        )}
                        {m.content}
                      </div>

                      {!isUser && m.model_used && (
                        <div className="flex items-center gap-1.5 px-1 font-mono text-[10px] text-[#A78BFA]">
                          <Sparkles size={11} className="text-[#00E5FF]" />
                          <span>Powered by {m.model_used}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {sending && (
              <div className="flex items-center gap-3 text-[#00E5FF] font-mono text-xs p-2">
                <Spinner size={18} color="#00E5FF" />
                <span>TrustLens Assistant is analyzing threat context...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Pending attachment bar */}
          {attachedFile && (
            <div
              className="px-4 py-2 border-t flex items-center justify-between text-xs font-mono text-[#00E5FF]"
              style={{ borderColor: 'rgba(196,178,255,0.14)', background: 'rgba(0,229,255,0.08)' }}
            >
              <span className="truncate flex items-center gap-2">
                <Paperclip size={13} /> {attachedFile.name} (OCR / Threat Analysis Attached)
              </span>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="p-1 hover:text-[#FF5B78]"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Input Bar */}
          <div
            className="p-4 border-t flex-shrink-0"
            style={{ borderColor: 'rgba(196,178,255,0.14)', background: 'rgba(13,8,48,0.68)' }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAttachment}
                title="Attach screenshot or message image"
                className="p-2.5 rounded-xl text-[rgba(236,232,255,0.7)] hover:text-[#00E5FF] hover:bg-white/5 transition-colors"
                style={{ border: '1px solid rgba(196,178,255,0.18)' }}
              >
                {uploadingAttachment ? <RefreshCw size={16} className="animate-spin" /> : <Paperclip size={16} />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask TrustLens a question, describe an incident, or paste suspicious text..."
                className="flex-1 px-4 py-2.5 rounded-xl text-xs sm:text-sm text-[#F4F2FF] placeholder-[rgba(236,232,255,0.42)] focus:outline-none focus:border-[#00E5FF]/55"
                style={{
                  background: 'rgba(23,17,61,0.75)',
                  border: '1px solid rgba(196,178,255,0.18)',
                }}
              />
              <button
                type="submit"
                disabled={sending || (!inputMessage.trim() && !attachedFile)}
                className="tl-btn-primary text-xs px-5 py-2.5 disabled:opacity-40"
              >
                <span>Send</span>
                <Send size={13} />
              </button>
            </form>
            <p className="mt-2 text-center font-mono text-[10px] text-[rgba(236,232,255,0.5)]">
              Protected by credential guardrails — TrustLens AI will never ask for OTPs, passwords, or UPI PINs.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
