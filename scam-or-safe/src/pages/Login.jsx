import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, LogIn, UserPlus, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../hooks/useToast.jsx'
import CyberBackgroundScene from '../components/CyberBackgroundScene.jsx'
import { TrustLensLogo } from '../components/Navbar.jsx'

function PasswordField({ id, label, value, onChange, error, autoComplete }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-mono text-[rgba(236,232,255,0.7)] mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder="••••••••"
          className="w-full px-4 py-3 pr-11 rounded-xl text-sm font-mono text-[#F4F2FF] placeholder-[rgba(236,232,255,0.35)] focus:outline-none transition-colors"
          style={{
            background: 'rgba(13, 8, 48, 0.72)',
            border: error ? '1px solid #FF5B78' : '1px solid rgba(196, 178, 255, 0.18)',
          }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(236,232,255,0.55)] hover:text-[#00E5FF] transition-colors"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs font-mono text-[#FF5B78]">{error}</p>}
    </div>
  )
}

function AuthLayout({ title, subtitle, isConfigured, children }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden" style={{ background: '#0D0830' }}>
      <CyberBackgroundScene mode="ambient" />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md relative z-10 tl-glass-strong rounded-3xl p-6 sm:p-8"
        style={{
          border: '1px solid rgba(196, 178, 255, 0.22)',
          boxShadow: '0 24px 64px rgba(5, 2, 20, 0.78), 0 0 40px rgba(111, 120, 255, 0.18)',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <Link to="/">
            <TrustLensLogo />
          </Link>
          <span
            className="text-[10px] font-mono px-2.5 py-1 rounded-full flex items-center gap-1"
            style={{
              background: isConfigured ? 'rgba(94,230,168,0.12)' : 'rgba(255,191,105,0.12)',
              border: `1px solid ${isConfigured ? 'rgba(94,230,168,0.3)' : 'rgba(255,191,105,0.3)'}`,
              color: isConfigured ? '#5EE6A8' : '#FFBF69',
            }}
          >
            <ShieldCheck className="w-3 h-3" />
            {isConfigured ? 'Supabase RLS' : 'Demo Auth'}
          </span>
        </div>

        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-[#F4F2FF]">{title}</h1>
          <p className="text-xs text-[rgba(236,232,255,0.64)] mt-1">{subtitle}</p>
        </div>

        {children}
      </motion.div>
    </div>
  )
}

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, isConfigured } = useAuth()
  const { toast, addToast } = useToast()

  const destination = location.state?.from?.pathname || '/dashboard'

  const notify = (msg, type = 'success') => {
    if (toast?.[type]) toast[type](msg)
    else if (addToast) addToast(msg, type)
  }

  const validate = () => {
    const e = {}
    if (!email.trim() || !email.includes('@')) e.email = 'Valid email address is required.'
    if (password.length < 6) e.password = 'Password must be at least 6 characters.'
    return e
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    setAuthError('')
    const e = validate()
    if (Object.keys(e).length) {
      setErrors(e)
      return
    }
    setErrors({})
    setLoading(true)

    const { error, isDemo } = await signIn({ email: email.trim(), password })
    setLoading(false)

    if (error) {
      const msg = error.message || 'Invalid credentials.'
      setAuthError(msg)
      notify(msg, 'error')
      return
    }

    notify(isDemo ? 'Signed in (local demo mode).' : 'Signed in via Supabase.', 'success')
    navigate(destination, { replace: true })
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to access TrustLens AI verification workspaces and scan history."
      isConfigured={isConfigured}
    >
      {authError && (
        <div
          className="mb-4 p-3 rounded-xl text-xs font-mono flex items-center gap-2"
          style={{
            background: 'rgba(255, 91, 120, 0.12)',
            border: '1px solid rgba(255, 91, 120, 0.35)',
            color: '#FF5B78',
          }}
        >
          <AlertCircle size={15} className="flex-shrink-0" />
          <span>{authError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div>
          <label htmlFor="login-email" className="block text-xs font-mono text-[rgba(236,232,255,0.7)] mb-1.5">
            Email Address
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="analyst@trustlens.ai"
            className="w-full px-4 py-3 rounded-xl text-sm font-mono text-[#F4F2FF] placeholder-[rgba(236,232,255,0.35)] focus:outline-none focus:border-[#00E5FF]/55 transition-colors"
            style={{
              background: 'rgba(13, 8, 48, 0.72)',
              border: errors.email ? '1px solid #FF5B78' : '1px solid rgba(196, 178, 255, 0.18)',
            }}
          />
          {errors.email && <p className="mt-1 text-xs font-mono text-[#FF5B78]">{errors.email}</p>}
        </div>

        <PasswordField
          id="login-password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          autoComplete="current-password"
        />

        <button
          type="submit"
          disabled={loading}
          className="tl-btn-primary w-full justify-center py-3 text-sm mt-2 disabled:opacity-50"
        >
          {loading ? (
            'Authenticating...'
          ) : (
            <>
              <LogIn size={15} /> Sign In to Workspace
            </>
          )}
        </button>

        <p className="text-center text-xs text-[rgba(236,232,255,0.62)] mt-2">
          New to TrustLens AI?{' '}
          <Link to="/register" className="font-semibold text-[#00E5FF] hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [authError, setAuthError] = useState('')
  const [successInfo, setSuccessInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { signUp, isConfigured } = useAuth()
  const { toast, addToast } = useToast()

  const notify = (msg, type = 'success') => {
    if (toast?.[type]) toast[type](msg)
    else if (addToast) addToast(msg, type)
  }

  const validate = () => {
    const e = {}
    if (name.trim().length < 2) e.name = 'Full name must be at least 2 characters.'
    if (!email.trim() || !email.includes('@')) e.email = 'Valid email address is required.'
    if (password.length < 6) e.password = 'Password must be at least 6 characters.'
    if (password !== confirm) e.confirm = 'Passwords do not match.'
    return e
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    setAuthError('')
    setSuccessInfo('')
    const e = validate()
    if (Object.keys(e).length) {
      setErrors(e)
      return
    }
    setErrors({})
    setLoading(true)

    const { data, error, isDemo } = await signUp({
      email: email.trim(),
      password,
      fullName: name.trim(),
    })
    setLoading(false)

    if (error) {
      const msg = error.message || 'Registration failed. Please try again.'
      setAuthError(msg)
      notify(msg, 'error')
      return
    }

    if (!isDemo && data?.user && !data?.session) {
      setSuccessInfo('Account created! Please check your email to confirm your address before signing in.')
      notify('Verification email sent.', 'info')
      return
    }

    notify('Account created successfully!', 'success')
    navigate('/dashboard')
  }

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join TrustLens AI to run scam, misinformation, URL, and multimodal safety checks."
      isConfigured={isConfigured}
    >
      {authError && (
        <div
          className="mb-4 p-3 rounded-xl text-xs font-mono flex items-center gap-2"
          style={{
            background: 'rgba(255, 91, 120, 0.12)',
            border: '1px solid rgba(255, 91, 120, 0.35)',
            color: '#FF5B78',
          }}
        >
          <AlertCircle size={15} className="flex-shrink-0" />
          <span>{authError}</span>
        </div>
      )}

      {successInfo ? (
        <div
          className="p-5 rounded-2xl text-center flex flex-col items-center gap-3 text-xs"
          style={{
            background: 'rgba(94, 230, 168, 0.08)',
            border: '1px solid rgba(94, 230, 168, 0.3)',
          }}
        >
          <CheckCircle2 size={34} className="text-[#5EE6A8]" />
          <p className="font-display font-bold text-sm text-[#5EE6A8]">Confirmation Email Sent</p>
          <p className="text-[rgba(236,232,255,0.75)]">{successInfo}</p>
          <Link to="/login" className="tl-btn-primary text-xs px-5 py-2.5 mt-1">
            Proceed to Sign In <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div>
            <label htmlFor="reg-name" className="block text-xs font-mono text-[rgba(236,232,255,0.7)] mb-1.5">
              Full Name
            </label>
            <input
              id="reg-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="Alex Mercer"
              className="w-full px-4 py-3 rounded-xl text-sm font-mono text-[#F4F2FF] placeholder-[rgba(236,232,255,0.35)] focus:outline-none focus:border-[#00E5FF]/55 transition-colors"
              style={{
                background: 'rgba(13, 8, 48, 0.72)',
                border: errors.name ? '1px solid #FF5B78' : '1px solid rgba(196, 178, 255, 0.18)',
              }}
            />
            {errors.name && <p className="mt-1 text-xs font-mono text-[#FF5B78]">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-xs font-mono text-[rgba(236,232,255,0.7)] mb-1.5">
              Email Address
            </label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="analyst@trustlens.ai"
              className="w-full px-4 py-3 rounded-xl text-sm font-mono text-[#F4F2FF] placeholder-[rgba(236,232,255,0.35)] focus:outline-none focus:border-[#00E5FF]/55 transition-colors"
              style={{
                background: 'rgba(13, 8, 48, 0.72)',
                border: errors.email ? '1px solid #FF5B78' : '1px solid rgba(196, 178, 255, 0.18)',
              }}
            />
            {errors.email && <p className="mt-1 text-xs font-mono text-[#FF5B78]">{errors.email}</p>}
          </div>

          <PasswordField
            id="reg-password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            autoComplete="new-password"
          />

          <PasswordField
            id="reg-confirm"
            label="Confirm Password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={errors.confirm}
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={loading}
            className="tl-btn-primary w-full justify-center py-3 text-sm mt-2 disabled:opacity-50"
          >
            {loading ? (
              'Creating Account...'
            ) : (
              <>
                <UserPlus size={15} /> Create Account
              </>
            )}
          </button>

          <p className="text-center text-xs text-[rgba(236,232,255,0.62)] mt-2">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-[#00E5FF] hover:underline">
              Sign In
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  )
}

export default Login
