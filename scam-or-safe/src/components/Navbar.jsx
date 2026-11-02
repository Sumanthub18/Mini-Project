import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, Menu, X, LogIn, LogOut, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const links = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Scam Scanner', to: '/scan/scam' },
    { label: 'AI Comparison', to: '/scan/compare' },
    { label: 'Fake News', to: '/scan/news' },
    { label: 'URL Checker', to: '/scan/url' },
  ]

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 w-full" style={{ background: '#090d1aee', backdropFilter: 'blur(12px)', borderBottom: '1px solid #00ff9f22' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group" aria-label="Scam or Safe home">
          <div
            className="w-9 h-9 rounded flex items-center justify-center transition-transform group-hover:scale-105"
            style={{
              background: 'linear-gradient(135deg,#00ff9f22,#00d4ff22)',
              border: '1px solid #00ff9f44',
              boxShadow: '0 0 12px #00ff9f33',
            }}
          >
            <Shield size={18} style={{ color: '#00ff9f', filter: 'drop-shadow(0 0 4px #00ff9f)' }} />
          </div>
          <span className="font-display font-bold text-lg tracking-wider" style={{ color: '#00ff9f', textShadow: '0 0 8px #00ff9f66' }}>
            SCAM<span style={{ color: '#bf00ff', textShadow: '0 0 8px #bf00ff66' }}>OR</span>SAFE
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className="px-4 py-2 rounded text-xs font-mono tracking-wider transition-colors"
              style={{ color: '#94a3b8' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#00ff9f'; e.currentTarget.style.background = '#00ff9f0a' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent' }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="px-4 py-2 rounded text-xs font-mono tracking-wider flex items-center gap-2"
                style={{ color: '#00ff9f', border: '1px solid #00ff9f33', background: '#00ff9f08' }}
              >
                <LayoutDashboard size={14} /> DASHBOARD
              </Link>
              <button
                onClick={handleSignOut}
                className="px-3 py-2 rounded text-xs font-mono tracking-wider flex items-center gap-1.5 transition-colors"
                style={{ color: '#4a6080' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ff006e'; e.currentTarget.style.background = '#ff006e10' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#4a6080'; e.currentTarget.style.background = 'transparent' }}
              >
                <LogOut size={14} /> SIGN OUT
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 rounded text-xs font-mono tracking-wider transition-colors flex items-center gap-2"
                style={{ color: '#94a3b8' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#00ff9f' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8' }}
              >
                <LogIn size={15} /> SIGN IN
              </Link>
              <Link
                to="/register"
                className="btn-neon-solid px-4 py-2 text-xs font-mono tracking-wider"
                style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
              >
                GET STARTED
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded transition-colors"
          style={{ color: '#94a3b8' }}
          onClick={() => setOpen(v => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden px-4 pb-4 flex flex-col gap-1 animate-fade-in" style={{ borderTop: '1px solid #00ff9f15' }}>
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="px-4 py-3 rounded text-xs font-mono"
              style={{ color: '#94a3b8' }}
            >
              {l.label}
            </Link>
          ))}
          <div className="flex gap-3 mt-2">
            {user ? (
              <button
                onClick={() => { handleSignOut(); setOpen(false) }}
                className="flex-1 py-2.5 rounded text-xs font-mono text-center"
                style={{ background: '#ff006e12', color: '#ff006e', border: '1px solid #ff006e33' }}
              >
                Sign Out
              </button>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded text-xs font-mono text-center" style={{ background: '#050810', color: '#e2e8f0', border: '1px solid #00ff9f22' }}>Sign In</Link>
                <Link to="/register" onClick={() => setOpen(false)} className="btn-neon-solid flex-1 py-2.5 text-xs font-mono text-center">Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
