import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, LogIn, LogOut, LayoutDashboard, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export function TrustLensLogo({ compact = false }) {
  return (
    <span className="inline-flex items-center gap-2.5 group">
      {/* Small holographic shield icon */}
      <motion.span
        whileHover={{ scale: 1.08, rotate: 3 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18 }}
        className="w-9 h-9 rounded-xl flex items-center justify-center relative overflow-hidden flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, rgba(111,120,255,0.28), rgba(0,229,255,0.2))',
          border: '1px solid rgba(196,178,255,0.32)',
          boxShadow: '0 0 18px rgba(111,120,255,0.35), inset 0 0 12px rgba(0,229,255,0.2)',
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
          <path
            d="M12 2.5L19.5 5.5V11.2C19.5 15.8 16.3 19.6 12 21.3C7.7 19.6 4.5 15.8 4.5 11.2V5.5L12 2.5Z"
            stroke="#00E5FF"
            strokeWidth="1.6"
            fill="rgba(111,120,255,0.22)"
          />
          <circle cx="12" cy="11.5" r="2.6" fill="#00E5FF" />
          <circle cx="12" cy="11.5" r="5" stroke="#A78BFA" strokeWidth="0.9" strokeDasharray="2 2" />
        </svg>
      </motion.span>
      <span className="flex flex-col leading-none">
        <span className={`font-display font-bold tracking-tight text-[#F4F2FF] ${compact ? 'text-base' : 'text-lg'}`}>
          TrustLens <span className="text-[#00E5FF]">AI</span>
        </span>
        {!compact && (
          <span className="font-mono text-[9px] tracking-[0.18em] text-[#A78BFA] uppercase mt-0.5">
            Cyber Intelligence
          </span>
        )}
      </span>
    </span>
  )
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navLinks = [
    { label: 'Home', href: '#hero' },
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Technology', href: '#technology' },
    { label: 'About', href: '#about' },
  ]

  const handleNavClick = (e, href) => {
    setOpen(false)
    if (location.pathname !== '/') {
      navigate('/' + href)
      return
    }
    e.preventDefault()
    const target = document.querySelector(href)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setOpen(false)
    navigate('/')
  }

  return (
    <header className="fixed top-3 left-0 right-0 z-50 px-3 sm:px-6 pointer-events-none">
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 rounded-2xl transition-all duration-300 pointer-events-auto"
        style={{
          background: scrolled ? 'rgba(13, 8, 48, 0.88)' : 'rgba(23, 17, 61, 0.56)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: scrolled
            ? '1px solid rgba(196, 178, 255, 0.24)'
            : '1px solid rgba(196, 178, 255, 0.15)',
          boxShadow: scrolled
            ? '0 14px 40px rgba(4, 2, 18, 0.65)'
            : '0 8px 30px rgba(7, 4, 28, 0.35)',
        }}
      >
        <div className="flex items-center justify-between h-16">
          {/* Left: Animated Logo */}
          <Link to="/" className="flex items-center" aria-label="TrustLens AI home">
            <TrustLensLogo compact={false} />
          </Link>

          {/* Centre: Section Links */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map(l => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => handleNavClick(e, l.href)}
                className="px-3.5 py-2 rounded-xl text-sm font-medium text-[rgba(236,232,255,0.78)] hover:text-[#F4F2FF] hover:bg-[#6F78FF]/15 transition-all"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Right: Auth Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="tl-btn-primary px-4 py-2 text-xs font-display tracking-wide"
                >
                  <LayoutDashboard size={14} /> Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="tl-btn-ghost px-3.5 py-2 text-xs"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-sm font-medium text-[rgba(236,232,255,0.82)] hover:text-[#00E5FF] hover:bg-[#6F78FF]/12 transition-all flex items-center gap-1.5"
                >
                  <LogIn size={15} /> Login
                </Link>
                <Link
                  to="/register"
                  className="tl-btn-primary px-4 py-2 text-xs font-display tracking-wide"
                >
                  Get Started <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2.5 rounded-xl text-[#F4F2FF] hover:bg-[#6F78FF]/20 transition-colors cursor-pointer"
            onClick={() => setOpen(v => !v)}
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={open}
          >
            {open ? <X size={20} className="text-[#00E5FF]" /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="lg:hidden overflow-hidden border-t border-[rgba(196,178,255,0.15)] pb-4 pt-2"
            >
              <div className="flex flex-col gap-1">
                {navLinks.map(l => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={(e) => handleNavClick(e, l.href)}
                    className="px-4 py-2.5 rounded-xl text-sm text-[rgba(236,232,255,0.82)] hover:text-[#F4F2FF] hover:bg-[#6F78FF]/15 transition-colors"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
              <div className="flex gap-2.5 mt-3 pt-3 border-t border-[rgba(196,178,255,0.12)]">
                {user ? (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setOpen(false)}
                      className="tl-btn-primary flex-1 py-2.5 text-xs"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="tl-btn-ghost flex-1 py-2.5 text-xs"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setOpen(false)}
                      className="tl-btn-ghost flex-1 py-2.5 text-xs"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setOpen(false)}
                      className="tl-btn-primary flex-1 py-2.5 text-xs"
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
