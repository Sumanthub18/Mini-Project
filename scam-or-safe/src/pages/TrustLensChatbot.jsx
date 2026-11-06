import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, Send, Paperclip, AlertTriangle, ShieldCheck,
  PhoneCall, Globe, Trash2, Plus, RefreshCw, X,
  Cpu, Sparkles, AlertOctagon, User, ArrowUpRight
} from 'lucide-react'
import {
  sendChatMessage,
  uploadChatAttachment,
  listConversations,
  getConversationMessages,
  deleteConversation
} from '../services/chatService.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../hooks/useToast.jsx'
import { SectionHeader, Spinner } from '../components/ResultComponents.jsx'

const QUICK_ACTIONS = [
  {
    label: '🚨 I shared my OTP / UPI PIN',
    prompt: 'Help! I accidentally entered my UPI PIN / shared an OTP with someone suspicious. What should I do immediately to prevent financial loss?'
  },
  {
    label: '💸 Money deducted from bank account',
    prompt: 'Money was unauthorizedly deducted from my bank account via UPI. How do I initiate a freeze and register an emergency cybercrime report?'
  },
  {
    label: '📦 Fake courier / delivery SMS',
    prompt: 'I received an SMS claiming my package delivery is held due to address issue with a link. How do I verify if it is legitimate?'
  },
  {
    label: '🔍 Review my recent scans for threats',
    prompt: 'Can you review my recent threat scans and summarize the most dangerous patterns I should watch out for?'
  }
]

export default function TrustLensChatbot() {
  const { user, session } = useAuth()
  const { addToast } = useToast()

  // Chat parameters
  const [conversations, setConversations] = useState([])
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        '👋 Welcome to **TrustLens AI Cyber Safety Assistant**.\n\n' +
        'I am your dedicated 24/7 incident response and threat intelligence advisor. ' +
        'I can assist you with emergency scam defense, credential compromise recovery, ' +
        'analyzing suspicious screenshots, and verifying fraud patterns.\n\n' +
        '> 💡 **Safety Notice**: Antigravity/TrustLens will **NEVER** ask for your passwords, OTPs, or UPI PINs.',
      model_used: 'TrustLens Intelligence Core'
    }
  ])

  const [inputMessage, setInputMessage] = useState('')
  const [modelChoice, setModelChoice] = useState('auto')
  const [chatLanguage, setChatLanguage] = useState('en')

  // Attachment state
  const [attachedFile, setAttachedFile] = useState(null)
  const [attachmentContext, setAttachmentContext] = useState(null)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)

  // Loading states
  const [sending, setSending] = useState(false)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, sending])

  // Load conversations on mount
  useEffect(() => {
    if (user?.id) {
      loadConversationsList()
    }
  }, [user?.id])

  const loadConversationsList = async () => {
    try {
      const convs = await listConversations({
        authToken: session?.access_token,
        userId: user?.id
      })
      setConversations(convs)
    } catch (e) {
      // Offline fallback
    }
  }

  const handleSelectConversation = async (convId) => {
    if (convId === currentConversationId) return
    setCurrentConversationId(convId)
    try {
      const msgs = await getConversationMessages(convId, {
        authToken: session?.access_token,
        userId: user?.id
      })
      if (msgs && msgs.length > 0) {
        setMessages(msgs)
      }
    } catch (e) {
      addToast('Failed to load conversation history', 'error')
    }
  }

  const handleStartNewChat = () => {
    setCurrentConversationId(null)
    setMessages([
      {
        role: 'assistant',
        content:
          '👋 Started a new session with **TrustLens AI Assistant**.\n\n' +
          'How can I help protect you today? You can ask cybersecurity questions, paste suspicious messages, or report potential fraud.',
        model_used: 'TrustLens Intelligence Core'
      }
    ])
    setAttachedFile(null)
    setAttachmentContext(null)
  }

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation()
    const confirmed = window.confirm('Delete this conversation history?')
    if (!confirmed) return

    try {
      await deleteConversation(convId, {
        authToken: session?.access_token,
        userId: user?.id
      })
      setConversations((prev) => prev.filter((c) => c.id !== convId))
      if (currentConversationId === convId) {
        handleStartNewChat()
      }
      addToast('Conversation deleted.', 'info')
    } catch (e) {
      addToast('Failed to delete conversation', 'error')
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAttachment(true)
    try {
      const uploadRes = await uploadChatAttachment(file, {
        authToken: session?.access_token,
        userId: user?.id
      })
      setAttachedFile(file)
      setAttachmentContext(uploadRes.attachment_context)
      addToast(`Attached & scanned ${file.name}`, 'success')
    } catch (err) {
      addToast(err.message || 'Attachment scan failed', 'error')
    } finally {
      setUploadingAttachment(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveAttachment = () => {
    setAttachedFile(null)
    setAttachmentContext(null)
  }

  const handleSendMessage = async (textToSend) => {
    const content = (textToSend || inputMessage).trim()
    if (!content && !attachmentContext) return

    const userMsg = {
      role: 'user',
      content: content || 'Please inspect the attached screenshot for fraud markers.',
      attachment_name: attachedFile?.name
    }

    setMessages((prev) => [...prev, userMsg])
    setInputMessage('')
    setSending(true)

    try {
      const replyData = await sendChatMessage(content, {
        conversationId: currentConversationId,
        model: modelChoice,
        language: chatLanguage,
        attachmentContext: attachmentContext,
        authToken: session?.access_token,
        userId: user?.id
      })

      if (replyData.conversation_id && !currentConversationId) {
        setCurrentConversationId(replyData.conversation_id)
        loadConversationsList()
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: replyData.reply,
          model_used: replyData.model_used,
          is_emergency: replyData.is_emergency,
          guardrail_triggered: replyData.guardrail_triggered
        }
      ])

      // Clear attachment after sending
      setAttachedFile(null)
      setAttachmentContext(null)
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ ' + (err.message || 'Unable to connect to safety engine. Please verify your connection or try again.'),
          model_used: 'Offline Fallback'
        }
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SectionHeader
          title="TrustLens Assistant"
          subtitle="AI-powered cyber incident guidance, emergency financial fraud triage, and multi-model defense advisor."
          icon={Bot}
          badge="DAY 6 // AI CHATBOT"
        />

        {/* Model & Language Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Model selector */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/80 shadow-sm"
          >
            <Cpu size={14} className="text-cyan-400" />
            <select
              value={modelChoice}
              onChange={(e) => setModelChoice(e.target.value)}
              className="bg-transparent font-mono text-xs text-cyan-400 focus:outline-none cursor-pointer"
            >
              <option value="auto" className="bg-slate-900 text-slate-200">Auto Route (Consensus)</option>
              <option value="gemini" className="bg-slate-900 text-slate-200">Google Gemini</option>
              <option value="groq" className="bg-slate-900 text-slate-200">Groq LLaMA 3.3</option>
              <option value="mistral" className="bg-slate-900 text-slate-200">Mistral AI</option>
            </select>
          </motion.div>

          {/* Language selector */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/80 shadow-sm"
          >
            <Globe size={14} className="text-emerald-400" />
            <select
              value={chatLanguage}
              onChange={(e) => setChatLanguage(e.target.value)}
              className="bg-transparent font-mono text-xs text-emerald-400 focus:outline-none cursor-pointer"
            >
              <option value="en" className="bg-slate-900 text-slate-200">English</option>
              <option value="kn" className="bg-slate-900 text-slate-200">ಕನ್ನಡ (Kannada)</option>
              <option value="hi" className="bg-slate-900 text-slate-200">हिंदी (Hindi)</option>
            </select>
          </motion.div>
        </div>
      </div>

      {/* Main Chat Interface Layout */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[720px] rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-2xl backdrop-blur-md"
      >
        {/* Sidebar: Conversation History */}
        <div className="hidden lg:flex flex-col border-r border-slate-800/80 bg-slate-950 p-4 space-y-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartNewChat}
            className="w-full py-2.5 px-3 rounded-lg font-mono text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            <span>NEW INCIDENT CHAT</span>
          </motion.button>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest block px-2 mb-1">
              Recent Conversations
            </span>
            {conversations.length === 0 ? (
              <p className="font-mono text-xs text-slate-600 px-2 py-4">No past incident chats recorded.</p>
            ) : (
              conversations.map((c) => {
                const isSelected = c.id === currentConversationId
                return (
                  <motion.div
                    key={c.id}
                    whileHover={{ x: 2 }}
                    onClick={() => handleSelectConversation(c.id)}
                    className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800/80 text-emerald-300 border border-emerald-500/30'
                        : 'hover:bg-slate-900/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-mono text-xs truncate max-w-[180px]">
                      {c.title || 'Incident Chat'}
                    </span>
                    <button
                      onClick={(e) => handleDeleteConversation(e, c.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 text-slate-500 transition-opacity cursor-pointer"
                      title="Delete conversation"
                    >
                      <Trash2 size={13} />
                    </button>
                  </motion.div>
                )
              })
            )}
          </div>

          {/* Cyber Emergency Banner in Sidebar */}
          <motion.div
            animate={{
              boxShadow: [
                '0 0 10px rgba(244, 63, 94, 0.05)',
                '0 0 20px rgba(244, 63, 94, 0.15)',
                '0 0 10px rgba(244, 63, 94, 0.05)'
              ]
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 space-y-1 text-rose-300"
          >
            <div className="flex items-center gap-1.5 font-bold font-mono text-xs text-rose-400">
              <PhoneCall size={13} />
              <span>Helpline 1930</span>
            </div>
            <p className="font-mono text-[10px] text-slate-400">
              In case of active financial fraud, dial 1930 immediately to freeze transactions.
            </p>
          </motion.div>
        </div>

        {/* Chat Main Area */}
        <div className="lg:col-span-3 flex flex-col h-full bg-slate-900/20">
          {/* Quick Action Incident Chips */}
          <div className="p-3 border-b border-slate-800/60 bg-slate-950/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {QUICK_ACTIONS.map((action, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSendMessage(action.prompt)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-mono border border-slate-800 hover:border-emerald-500/40 bg-slate-900/40 text-slate-300 hover:text-emerald-300 transition-all flex-shrink-0 cursor-pointer"
              >
                {action.label}
              </motion.button>
            ))}
          </div>

          {/* Messages Feed with Framer Motion AnimatePresence */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((m, idx) => {
                const isUser = m.role === 'user'
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                    className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${
                        isUser
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                      }`}
                    >
                      {isUser ? <User size={15} /> : <Bot size={15} />}
                    </div>

                    {/* Bubble */}
                    <div className={`space-y-1.5 ${isUser ? 'items-end' : ''}`}>
                      <div
                        className={`p-4 rounded-2xl text-xs font-mono leading-relaxed shadow-lg ${
                          isUser
                            ? 'bg-emerald-600/15 border border-emerald-500/40 text-emerald-100 rounded-tr-none'
                            : m.is_emergency
                            ? 'bg-rose-950/40 border border-rose-500/50 text-slate-100 rounded-tl-none shadow-rose-900/20'
                            : m.guardrail_triggered
                            ? 'bg-amber-950/40 border border-amber-500/50 text-amber-100 rounded-tl-none'
                            : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none'
                        }`}
                      >
                        {/* Attached Screenshot indicator */}
                        {m.attachment_name && (
                          <div className="mb-2 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-700 text-[10px] text-cyan-300 flex items-center gap-1.5">
                            <Paperclip size={12} />
                            <span>Attached: {m.attachment_name}</span>
                          </div>
                        )}

                        {/* Formatted Text */}
                        <div className="whitespace-pre-wrap space-y-2">
                          {m.content}
                        </div>
                      </div>

                      {/* Metadata Footer */}
                      {!isUser && m.model_used && (
                        <div className="flex items-center gap-2 px-1 font-mono text-[10px] text-slate-500">
                          <Sparkles size={11} className="text-cyan-400" />
                          <span>Powered by {m.model_used}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {sending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 text-cyan-400 font-mono text-xs p-2"
              >
                <Spinner size="sm" />
                <span className="animate-pulse">TrustLens Assistant is analyzing threat context...</span>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Attached File Preview Bar (If Pending) */}
          <AnimatePresence>
            {attachedFile && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-cyan-300"
              >
                <div className="flex items-center gap-2 truncate">
                  <Paperclip size={14} />
                  <span className="truncate">{attachedFile.name} (OCR / Threat Analysis Attached)</span>
                </div>
                <button
                  onClick={handleRemoveAttachment}
                  className="p-1 hover:text-rose-400 text-slate-500 transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Box Bar */}
          <div className="p-4 border-t border-slate-800 bg-slate-950">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex items-center gap-2"
            >
              {/* Attachment Button */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAttachment}
                title="Attach screenshot or message image"
                className="p-2.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 text-slate-400 hover:text-emerald-400 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {uploadingAttachment ? <RefreshCw size={17} className="animate-spin" /> : <Paperclip size={17} />}
              </motion.button>

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
                placeholder="Ask TrustLens a question, report fraud, or paste suspicious text..."
                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />

              <motion.button
                type="submit"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                disabled={sending || (!inputMessage.trim() && !attachedFile)}
                className="px-5 py-2.5 rounded-lg font-mono text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>SEND</span>
                <Send size={13} />
              </motion.button>
            </form>

            <div className="mt-2 text-center">
              <span className="font-mono text-[10px] text-slate-500">
                🔒 Protected by strict credential guardrails. TrustLens will NEVER ask for passwords, OTPs, or UPI PINs.
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
