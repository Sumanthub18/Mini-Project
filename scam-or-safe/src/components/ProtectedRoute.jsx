import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Shield } from 'lucide-react'

/**
 * Route protection wrapper for authenticated areas (Dashboard, History, Settings, Scanners).
 * Preserves the attempted destination so users are redirected back upon login.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: '#050810' }}
      >
        <div
          className="w-16 h-16 flex items-center justify-center mb-4 relative scan-pulse"
          style={{
            background: '#00ff9f12',
            border: '1px solid #00ff9f44',
            boxShadow: '0 0 24px #00ff9f33',
            clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
          }}
        >
          <Shield size={32} style={{ color: '#00ff9f', filter: 'drop-shadow(0 0 8px #00ff9f)' }} />
        </div>
        <p className="font-display text-sm tracking-widest uppercase mb-1" style={{ color: '#00ff9f', textShadow: '0 0 10px #00ff9f' }}>
          VERIFYING ACCESS CREDENTIALS
        </p>
        <p className="font-mono text-xs text-slate-500">// connecting to secure enclave...</p>
      </div>
    )
  }

  if (!user) {
    // Redirect to /login but preserve the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
