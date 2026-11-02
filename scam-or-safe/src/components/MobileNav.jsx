import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Shield, LayoutDashboard, MessageSquareWarning, Newspaper,
  Link2, History, Settings, X, Menu, LogOut, User
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../hooks/useToast.jsx'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: '#00ff9f' },
  { to: '/scan/scam', icon: MessageSquareWarning, label: 'Scam Scanner', color: '#ff006e' },
  { to: '/scan/news', icon: Newspaper, label: 'Fake News', color: '#bf00ff' },
  { to: '/scan/url', icon: Link2, label: 'URL Checker', color: '#00d4ff' },
  { to: '/history', icon: History, label: 'History', color: '#00ff9f' },
  { to: '/settings', icon: Settings, label: 'Settings', color: '#ffb800' },
]

export default function MobileNav() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const { addToast } = useToast()

  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Operator'

  const handleSignOut = async () => {
    setOpen(false)
    await signOut()
    addToast('Signed out of terminal.', 'info')
    navigate('/login')
  }

  return (
    <div className="md:hidden">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 h-14 sticky top-0 z-30"
        style={{
          background: '#090d1aEE',
          borderBottom: '1px solid #00ff9f15',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 2px 20px #00000060',
        }}
      >
        {/* Top edge accent */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: 1,
            background: 'linear-gradient(90deg, transparent, #00ff9f, transparent)',
          }}
        />

        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 flex items-center justify-center"
            style={{
              background: '#00ff9f12',
              border: '1px solid #00ff9f33',
              clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
              boxShadow: '0 0 8px #00ff9f22',
            }}
          >
            <Shield size={14} style={{ color: '#00ff9f', filter: 'drop-shadow(0 0 4px #00ff9f)' }} />
          </div>
          <span
            className="font-display font-bold text-sm tracking-widest flicker"
            style={{ color: '#00ff9f', textShadow: '0 0 8px #00ff9f88', letterSpacing: '0.15em', fontSize: '0.75rem' }}
          >
            SCAM<span style={{ color: '#bf00ff', textShadow: '0 0 8px #bf00ff88' }}>OR</span>SAFE
          </span>
        </div>

        <button
          onClick={() => setOpen(v => !v)}
          className="p-2 transition-all"
          style={{ color: open ? '#00ff9f' : '#4a6080' }}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open
            ? <X size={18} style={{ filter: 'drop-shadow(0 0 4px #00ff9f)' }} />
            : <Menu size={18} />
          }
        </button>
      </div>

      {/* Drawer */}
      {open && (
        <div
          className="fixed inset-0 z-20 animate-fade-in"
          style={{ background: '#050810CC', backdropFilter: 'blur(8px)' }}
          onClick={() => setOpen(false)}
        >
          <nav
            className="absolute left-0 top-14 bottom-0 flex flex-col justify-between p-3 overflow-y-auto"
            style={{
              width: 260,
              background: 'linear-gradient(180deg, #090d1a 0%, #050810 100%)',
              borderRight: '1px solid #00ff9f15',
              boxShadow: '4px 0 30px #00000080',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col gap-0.5">
              <p className="font-mono text-xs px-3 py-2 mb-1" style={{ color: '#00ff9f33', letterSpacing: '0.15em' }}>
                // MODULES
              </p>

              {NAV_ITEMS.map(({ to, icon: Icon, label, color }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all"
                  style={({ isActive }) => ({
                    background: isActive ? `${color}12` : 'transparent',
                    color: isActive ? color : '#4a6080',
                    borderLeft: isActive ? `2px solid ${color}` : '2px solid transparent',
                    borderRadius: isActive ? '0 8px 8px 0' : '8px',
                    textShadow: isActive ? `0 0 8px ${color}66` : 'none',
                  })}
                >
                  <Icon size={16} />
                  <span style={{ letterSpacing: '0.04em', fontSize: '0.8rem' }}>{label}</span>
                </NavLink>
              ))}
            </div>

            {/* Bottom User & Logout */}
            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
              {user && (
                <div className="px-3 py-2 rounded flex items-center gap-2" style={{ background: '#050810' }}>
                  <User size={14} style={{ color: '#00ff9f' }} />
                  <span className="text-xs font-mono text-slate-300 truncate">{displayName}</span>
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2.5 rounded text-xs font-mono w-full transition-colors"
                style={{ background: '#ff006e12', color: '#ff006e', border: '1px solid #ff006e22' }}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </nav>
        </div>
      )}
    </div>
  )
}
