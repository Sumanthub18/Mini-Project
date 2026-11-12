import { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../hooks/useToast.jsx'
import { TrustLensLogo } from './Navbar.jsx'
import { SIDEBAR_NAV_ITEMS } from './Sidebar.jsx'

export default function MobileNav() {
  const [open, setOpen] = useState(false)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Analyst'

  const handleSignOut = async () => {
    setOpen(false)
    await signOut()
    toast.info('Signed out of TrustLens AI')
    navigate('/login')
  }

  return (
    <div className="md:hidden relative z-30">
      <header
        className="flex items-center justify-between px-4 h-14 border-b"
        style={{
          background: 'rgba(13, 8, 48, 0.88)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderColor: 'rgba(196, 178, 255, 0.16)',
        }}
      >
        <Link to="/" onClick={() => setOpen(false)}>
          <TrustLensLogo compact />
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="p-2 rounded-xl text-[rgba(236,232,255,0.82)] hover:text-[#F4F2FF] hover:bg-white/5 transition-colors"
          aria-label="Toggle workspace navigation"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-b"
            style={{
              background: 'rgba(16, 11, 53, 0.96)',
              backdropFilter: 'blur(20px)',
              borderColor: 'rgba(196, 178, 255, 0.16)',
            }}
          >
            <nav className="p-3 space-y-1 max-h-[75vh] overflow-y-auto">
              {SIDEBAR_NAV_ITEMS.map(({ to, icon: Icon, label, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-[#F4F2FF]'
                        : 'text-[rgba(236,232,255,0.72)] hover:text-[#F4F2FF] hover:bg-white/5'
                    }`
                  }
                  style={({ isActive }) =>
                    isActive
                      ? {
                          background: 'linear-gradient(135deg, rgba(111,120,255,0.24), rgba(0,229,255,0.12))',
                          border: '1px solid rgba(141,148,255,0.34)',
                        }
                      : undefined
                  }
                >
                  <Icon className="w-4 h-4 text-[#00E5FF]" />
                  <span className="flex-1">{label}</span>
                  {badge && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#00E5FF]/15 text-[#00E5FF]">
                      {badge}
                    </span>
                  )}
                </NavLink>
              ))}

              <div
                className="pt-2 mt-2 border-t flex items-center justify-between px-3 py-2"
                style={{ borderColor: 'rgba(196,178,255,0.14)' }}
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#F4F2FF] truncate">{displayName}</p>
                  <p className="text-[11px] font-mono text-[rgba(236,232,255,0.52)] truncate">
                    {user?.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#FF5B78] bg-[#FF5B78]/10 hover:bg-[#FF5B78]/20 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
