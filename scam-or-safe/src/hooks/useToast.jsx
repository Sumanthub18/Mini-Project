import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null
  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none"
    >
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  )
}

const toastStyles = {
  info: { bg: '#1E2D45', border: '#22D3EE44', icon: '💡', accent: '#22D3EE' },
  success: { bg: '#162B1E', border: '#4ADE8044', icon: '✅', accent: '#4ADE80' },
  error: { bg: '#2B1616', border: '#F8717144', icon: '⚠️', accent: '#F87171' },
  warning: { bg: '#2B2216', border: '#FBBF2444', icon: '🔔', accent: '#FBBF24' },
}

function Toast({ toast, onRemove }) {
  const s = toastStyles[toast.type] || toastStyles.info
  return (
    <div
      className="toast-enter pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl min-w-[280px] max-w-[360px]"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
      role="alert"
    >
      <span className="text-lg leading-none mt-0.5">{s.icon}</span>
      <p className="flex-1 text-sm text-[#F8FAFC] leading-snug">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors text-lg leading-none ml-1"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
