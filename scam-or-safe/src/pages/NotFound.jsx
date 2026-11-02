import { Link } from 'react-router-dom'
import { Shield, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ background: '#0B1020' }}>
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6" style={{ background: '#182338', border: '1px solid #1E2D45' }}>
        <Shield size={36} style={{ color: '#22D3EE' }} />
      </div>
      <h1 className="font-display font-bold text-6xl mb-3" style={{ color: '#22D3EE' }}>404</h1>
      <h2 className="font-display font-bold text-2xl mb-3" style={{ color: '#F8FAFC' }}>Page Not Found</h2>
      <p className="text-sm max-w-sm mb-8" style={{ color: '#94A3B8' }}>
        The page you're looking for doesn't exist, or has been moved.
      </p>
      <div className="flex gap-4">
        <Link
          to="/"
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
          style={{ background: 'linear-gradient(135deg,#22D3EE,#818CF8)', color: '#0B1020' }}
        >
          <Home size={16} /> Go Home
        </Link>
        <Link
          to="/dashboard"
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
          style={{ background: '#182338', border: '1px solid #1E2D45', color: '#F8FAFC' }}
        >
          Dashboard
        </Link>
      </div>
    </div>
  )
}
