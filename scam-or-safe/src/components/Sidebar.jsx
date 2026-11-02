import { NavLink, useNavigate } from 'react-router-dom'
import {
  Shield, LayoutDashboard, MessageSquareWarning, Newspaper,
  Link2, Cpu, History, Settings, LogOut, ChevronLeft, ChevronRight, User
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../hooks/useToast.jsx'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: '#00ff9f' },
  { to: '/scan/scam', icon: MessageSquareWarning, label: 'Scam Scanner', color: '#ff006e' },
  { to: '/scan/compare', icon: Cpu, label: 'AI Comparison', color: '#00d4ff' },
  { to: '/scan/news', icon: Newspaper, label: 'Fake News', color: '#bf00ff' },
  { to: '/scan/url', icon: Link2, label: 'URL Checker', color: '#00d4ff' },
  { to: '/history', icon: History, label: 'Scan History', color: '#00ff9f' },
  { to: '/settings', icon: Settings, label: 'Settings', color: '#ffb800' },
]

export default function Sidebar({ collapsed, setCollapsed }) {
  const navigate = useNavigate()
  const { user, profile, signOut, isConfigured } = useAuth()
  const { addToast } = useToast()

  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Operator'

  const handleSignOut = async () => {
    await signOut()
    addToast('Signed out of terminal.', 'info')
    navigate('/login')
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col h-screen sticky top-0 transition-all duration-300 flex-shrink-0 relative"
        style={{
          width: collapsed ? 68 : 240,
          background: 'linear-gradient(180deg, #090d1a 0%, #050810 100%)',
          borderRight: '1px solid #00ff9f22',
          boxShadow: '2px 0 20px #00ff9f08',
        }}
        aria-label="Sidebar navigation"
      >
        {/* Top accent line */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #00ff9f, transparent)' }} />

        {/* Logo */}
        <div
          className="flex items-center gap-3 px-4 h-16 flex-shrink-0 relative"
          style={{ borderBottom: '1px solid #00ff9f15' }}
        >
          {/* Glow dot */}
          <div
            className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0 relative"
            style={{
              background: 'linear-gradient(135deg,#00ff9f22,#00d4ff22)',
              border: '1px solid #00ff9f44',
              boxShadow: '0 0 12px #00ff9f33',
            }}
          >
            <Shield size={17} style={{ color: '#00ff9f', filter: 'drop-shadow(0 0 4px #00ff9f)' }} />
          </div>
          {!collapsed && (
            <div>
              <span
                className="font-display font-bold text-sm tracking-widest whitespace-nowrap block flicker"
                style={{ color: '#00ff9f', textShadow: '0 0 8px #00ff9f88, 0 0 20px #00ff9f44', letterSpacing: '0.15em' }}
              >
                SCAM<span style={{ color: '#bf00ff', textShadow: '0 0 8px #bf00ff88' }}>OR</span>SAFE
              </span>
              <span className="font-mono text-xs" style={{ color: '#00ff9f44', letterSpacing: '0.1em' }}>v2.0 // SUPABASE</span>
            </div>
          )}
        </div>

        {/* Status indicator */}
        {!collapsed && (
          <div className="mx-3 mt-3 mb-1 px-3 py-1.5 rounded flex items-center justify-between gap-2" style={{ background: '#00ff9f08', border: '1px solid #00ff9f15' }}>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full scan-pulse flex-shrink-0" style={{ background: isConfigured ? '#00ff9f' : '#00d4ff', boxShadow: `0 0 4px ${isConfigured ? '#00ff9f' : '#00d4ff'}` }} />
              <span className="font-mono text-xs" style={{ color: isConfigured ? '#00ff9f88' : '#00d4ff88', letterSpacing: '0.08em' }}>
                {isConfigured ? 'PGSQL ONLINE' : 'SANDBOX MODE'}
              </span>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
          {!collapsed && (
            <p className="font-mono text-xs px-3 py-2 mb-1" style={{ color: '#00ff9f33', letterSpacing: '0.15em' }}>
              // MODULES
            </p>
          )}

          {NAV_ITEMS.map(({ to, icon: Icon, label, color }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 group relative ${
                  isActive ? 'active-nav' : ''
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? `${color}12` : 'transparent',
                color: isActive ? color : '#4a6080',
                borderLeft: isActive ? `2px solid ${color}` : '2px solid transparent',
                boxShadow: isActive ? `inset 0 0 20px ${color}08` : 'none',
                borderRadius: isActive ? '0 8px 8px 0' : '8px',
                textShadow: isActive ? `0 0 8px ${color}66` : 'none',
              })}
              onMouseEnter={e => {
                if (!e.currentTarget.classList.contains('active-nav')) {
                  e.currentTarget.style.background = '#00ff9f08'
                  e.currentTarget.style.color = '#e2e8f0'
                }
              }}
              onMouseLeave={e => {
                const isActive = e.currentTarget.getAttribute('aria-current') === 'page'
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#4a6080'
                }
              }}
            >
              <Icon size={17} className="flex-shrink-0" />
              {!collapsed && <span className="truncate tracking-wide" style={{ fontSize: '0.8rem', letterSpacing: '0.04em' }}>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User badge and actions */}
        <div className="px-2 py-3 flex flex-col gap-1" style={{ borderTop: '1px solid #00ff9f15' }}>
          {!collapsed && user && (
            <div
              className="px-3 py-2 rounded mb-1 flex items-center gap-2.5"
              style={{ background: '#050810', border: '1px solid #00ff9f12' }}
            >
              <div
                className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: '#00ff9f18', color: '#00ff9f', border: '1px solid #00ff9f33' }}
              >
                <User size={13} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-mono truncate" style={{ color: '#e2e8f0' }}>{displayName}</p>
                <p className="text-xs font-mono text-slate-500 truncate" style={{ fontSize: '0.65rem' }}>{user.email || 'authenticated'}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleSignOut}
            title={collapsed ? 'Sign Out' : undefined}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all w-full rounded"
            style={{ color: '#4a6080' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#ff006e12'; e.currentTarget.style.color = '#ff006e'; e.currentTarget.style.textShadow = '0 0 8px #ff006e66' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4a6080'; e.currentTarget.style.textShadow = 'none' }}
          >
            <LogOut size={16} className="flex-shrink-0" />
            {!collapsed && <span style={{ letterSpacing: '0.04em', fontSize: '0.8rem' }}>Sign Out</span>}
          </button>

          <button
            onClick={() => setCollapsed(v => !v)}
            className="flex items-center justify-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all w-full"
            style={{ color: '#00ff9f44', marginTop: 2 }}
            onMouseEnter={e => { e.currentTarget.style.background = '#00ff9f08'; e.currentTarget.style.color = '#00ff9f' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#00ff9f44' }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <ChevronRight size={14} />
              : <><ChevronLeft size={14} /><span className="font-mono" style={{ letterSpacing: '0.08em', fontSize: '0.7rem' }}>COLLAPSE</span></>
            }
          </button>
        </div>

        {/* Bottom accent line */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #00ff9f, transparent)' }} />
      </aside>
    </>
  )
}
