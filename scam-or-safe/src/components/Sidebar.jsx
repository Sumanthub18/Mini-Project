import { NavLink, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  MessageSquareWarning,
  Newspaper,
  Link2,
  Sparkles,
  Bot,
  Cpu,
  Users,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../hooks/useToast.jsx'
import { TrustLensLogo } from './Navbar.jsx'

export const SIDEBAR_NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview', badge: null },
  { to: '/scan/scam', icon: MessageSquareWarning, label: 'Scam Detection', badge: null },
  { to: '/scan/news', icon: Newspaper, label: 'Fake News', badge: null },
  { to: '/scan/url', icon: Link2, label: 'URL Safety', badge: null },
  { to: '/scan/multimodal', icon: Sparkles, label: 'Multimodal Analyzer', badge: 'AI' },
  { to: '/chat', icon: Bot, label: 'AI Assistant', badge: null },
  { to: '/scan/compare', icon: Cpu, label: 'AI Comparison', badge: null },
  { to: '/community', icon: Users, label: 'Community Intelligence', badge: null },
  { to: '/history', icon: History, label: 'Scan History', badge: null },
  { to: '/settings', icon: Settings, label: 'Settings', badge: null },
]

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Security Analyst'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'TL'

  const handleSignOut = async () => {
    await signOut()
    toast.info('Signed out of TrustLens AI')
    navigate('/login')
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 262 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="hidden md:flex flex-col flex-shrink-0 border-r select-none relative z-20 min-h-screen sticky top-0 max-h-screen"
      style={{
        background: 'rgba(13, 8, 48, 0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'rgba(196, 178, 255, 0.14)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 h-16 border-b flex-shrink-0"
        style={{ borderColor: 'rgba(196, 178, 255, 0.12)' }}
      >
        <Link to="/" className="flex items-center min-w-0 overflow-hidden">
          {collapsed ? (
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(111,120,255,0.28), rgba(0,229,255,0.2))',
                border: '1px solid rgba(196,178,255,0.32)',
              }}
            >
              <ShieldCheck className="w-5 h-5 text-[#00E5FF]" />
            </span>
          ) : (
            <TrustLensLogo compact />
          )}
        </Link>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {SIDEBAR_NAV_ITEMS.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'text-[#F4F2FF]'
                  : 'text-[rgba(236,232,255,0.68)] hover:text-[#F4F2FF] hover:bg-white/[0.04]'
              }`
            }
            style={({ isActive }) =>
              isActive
                ? {
                    background: 'linear-gradient(135deg, rgba(111,120,255,0.24), rgba(0,229,255,0.1))',
                    border: '1px solid rgba(141,148,255,0.34)',
                    boxShadow: '0 6px 20px rgba(111,120,255,0.18)',
                  }
                : { border: '1px solid transparent' }
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className="w-4 h-4 flex-shrink-0 transition-colors"
                  style={{ color: isActive ? '#00E5FF' : 'rgba(196,178,255,0.72)' }}
                />
                {!collapsed && <span className="truncate flex-1">{label}</span>}
                {!collapsed && badge && (
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold"
                    style={{
                      background: 'rgba(0,229,255,0.14)',
                      color: '#00E5FF',
                      border: '1px solid rgba(0,229,255,0.3)',
                    }}
                  >
                    {badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom user profile & sign out */}
      <div
        className="p-3 border-t space-y-2 flex-shrink-0"
        style={{ borderColor: 'rgba(196, 178, 255, 0.12)' }}
      >
        <div
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl ${
            collapsed ? 'justify-center' : ''
          }`}
          style={{
            background: 'rgba(23,17,61,0.72)',
            border: '1px solid rgba(196,178,255,0.12)',
          }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-bold flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(111,120,255,0.35), rgba(0,229,255,0.22))',
              border: '1px solid rgba(0,229,255,0.35)',
              color: '#00E5FF',
            }}
          >
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[#F4F2FF] truncate">{displayName}</p>
              <p className="text-[10px] font-mono text-[rgba(236,232,255,0.52)] truncate">
                {user?.email || 'Authenticated'}
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          title={collapsed ? 'Sign Out' : undefined}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-[rgba(236,232,255,0.68)] hover:text-[#FF5B78] hover:bg-[#FF5B78]/10 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-full flex items-center justify-center py-1.5 rounded-xl text-[rgba(236,232,255,0.5)] hover:text-[#F4F2FF] hover:bg-white/[0.04] transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.aside>
  )
}
