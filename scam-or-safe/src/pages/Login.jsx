import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Shield, Eye, EyeOff, LogIn, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../hooks/useToast.jsx'

function AuthLayout({ children, title, subtitle, isConfigured }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#050810' }}>
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <Link to="/" className="group">
            <div
              className="w-14 h-14 flex items-center justify-center relative transition-transform group-hover:scale-105"
              style={{
                background: 'linear-gradient(135deg,#00ff9f18,#00d4ff18)',
                border: '1px solid #00ff9f44',
                boxShadow: '0 0 20px #00ff9f33',
                clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
              }}
            >
              <Shield size={28} style={{ color: '#00ff9f', filter: 'drop-shadow(0 0 6px #00ff9f)' }} />
            </div>
          </Link>
          <div className="text-center">
            <h1
              className="font-display font-bold text-2xl tracking-wider"
              style={{ color: '#00ff9f', textShadow: '0 0 12px #00ff9f66' }}
            >
              {title}
            </h1>
            <p className="text-xs font-mono mt-1 text-slate-400 tracking-wide">// {subtitle}</p>
          </div>
        </div>

        <div
          className="p-6 md:p-8"
          style={{
            background: 'linear-gradient(180deg, #090d1a 0%, #050810 100%)',
            border: '1px solid #00ff9f22',
            clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))',
            boxShadow: '0 0 30px #00ff9f08',
          }}
        >
          {/* Supabase backend status banner */}
          <div
            className="mb-6 px-3 py-2.5 text-xs font-mono flex items-start gap-2"
            style={{
              background: isConfigured ? '#00ff9f08' : '#00d4ff08',
              border: `1px solid ${isConfigured ? '#00ff9f22' : '#00d4ff22'}`,
              color: '#94a3b8',
              clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
            }}
          >
            {isConfigured ? (
              <>
                <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: '#00ff9f', boxShadow: '0 0 6px #00ff9f' }} />
                <span>
                  <strong style={{ color: '#00ff9f' }}>SUPABASE AUTH ONLINE</strong> — Real authentication, PostgreSQL session storage & RLS active.
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: '#00d4ff', boxShadow: '0 0 6px #00d4ff' }} />
                <span>
                  <strong style={{ color: '#00d4ff' }}>STANDALONE MODE</strong> — Supabase credentials not detected in <code style={{ color: '#00ff9f' }}>.env</code>. You can sign in immediately in sandbox mode or configure your Supabase URL & Key.
                </span>
              </>
            )}
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}

function PasswordField({ id, label, value, onChange, error, autoComplete }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-mono tracking-wider mb-1.5" style={{ color: '#94a3b8' }}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className="w-full px-4 py-3 pr-12 text-sm font-mono transition-all"
          style={{
            background: '#050810',
            border: error ? '1px solid #ff006e' : '1px solid #00ff9f22',
            color: '#e2e8f0',
            outline: 'none',
            clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
          }}
          onFocus={e => !error && (e.currentTarget.style.borderColor = '#00ff9f66')}
          onBlur={e => !error && (e.currentTarget.style.borderColor = '#00ff9f22')}
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 transition-colors"
          style={{ color: '#4a6080' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#00ff9f')}
          onMouseLeave={e => (e.currentTarget.style.color = '#4a6080')}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs font-mono" style={{ color: '#ff006e' }}>// {error}</p>}
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
  const { addToast } = useToast()

  const destination = location.state?.from?.pathname || '/dashboard'

  const validate = () => {
    const e = {}
    if (!email.trim() || !email.includes('@')) e.email = 'Valid email address required.'
    if (!password) e.password = 'Password is required.'
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

    const { data, error, isDemo } = await signIn({ email, password })
    setLoading(false)

    if (error) {
      const msg = error.message || 'Failed to authenticate. Please check your credentials.'
      setAuthError(msg)
      addToast(msg, 'error')
      return
    }

    addToast(isDemo ? 'Authenticated in sandbox mode.' : 'Signed in successfully via Supabase.', 'success')
    navigate(destination, { replace: true })
  }

  return (
    <AuthLayout title="SYSTEM ACCESS" subtitle="sign in to secure terminal" isConfigured={isConfigured}>
      {authError && (
        <div
          className="mb-4 p-3 text-xs font-mono flex items-center gap-2"
          style={{
            background: '#ff006e12',
            border: '1px solid #ff006e44',
            color: '#ff006e',
            clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
          }}
        >
          <AlertCircle size={15} className="flex-shrink-0" />
          <span>{authError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div>
          <label htmlFor="login-email" className="block text-xs font-mono tracking-wider mb-1.5" style={{ color: '#94a3b8' }}>
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="operator@threatnet.io"
            className="w-full px-4 py-3 text-sm font-mono transition-all"
            style={{
              background: '#050810',
              border: errors.email ? '1px solid #ff006e' : '1px solid #00ff9f22',
              color: '#e2e8f0',
              outline: 'none',
              clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
            }}
            onFocus={e => !errors.email && (e.currentTarget.style.borderColor = '#00ff9f66')}
            onBlur={e => !errors.email && (e.currentTarget.style.borderColor = '#00ff9f22')}
          />
          {errors.email && <p className="mt-1 text-xs font-mono" style={{ color: '#ff006e' }}>// {errors.email}</p>}
        </div>

        <PasswordField
          id="login-password"
          label="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          error={errors.password}
          autoComplete="current-password"
        />

        <button
          type="submit"
          disabled={loading}
          className="btn-neon-solid flex items-center justify-center gap-2 py-3 font-display text-xs tracking-widest uppercase transition-all disabled:opacity-50 mt-2"
          style={{
            fontFamily: 'Orbitron, monospace',
            letterSpacing: '0.15em',
            clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
          }}
        >
          {loading ? (
            'AUTHENTICATING...'
          ) : (
            <>
              <LogIn size={15} /> AUTHENTICATE
            </>
          )}
        </button>

        <p className="text-center text-xs font-mono mt-3" style={{ color: '#4a6080' }}>
          NO CREDENTIALS?{' '}
          <Link to="/register" className="font-semibold transition-colors" style={{ color: '#00ff9f' }}>
            [ REGISTER OPERATOR ]
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
  const { addToast } = useToast()

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
      addToast(msg, 'error')
      return
    }

    if (!isDemo && data?.user && !data?.session) {
      // Email confirmation is required by Supabase project settings
      setSuccessInfo('Registration initiated! A verification email has been dispatched. Please confirm your email to sign in.')
      addToast('Verification email sent.', 'info')
      return
    }

    addToast('Account created successfully!', 'success')
    navigate('/dashboard')
  }

  return (
    <AuthLayout title="CREATE IDENTITY" subtitle="register new operator profile" isConfigured={isConfigured}>
      {authError && (
        <div
          className="mb-4 p-3 text-xs font-mono flex items-center gap-2"
          style={{
            background: '#ff006e12',
            border: '1px solid #ff006e44',
            color: '#ff006e',
            clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
          }}
        >
          <AlertCircle size={15} className="flex-shrink-0" />
          <span>{authError}</span>
        </div>
      )}

      {successInfo ? (
        <div
          className="p-5 text-center flex flex-col items-center gap-3 font-mono text-xs"
          style={{
            background: '#00ff9f0a',
            border: '1px solid #00ff9f33',
            clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
          }}
        >
          <CheckCircle2 size={36} style={{ color: '#00ff9f', filter: 'drop-shadow(0 0 6px #00ff9f)' }} />
          <p className="font-display font-bold text-sm tracking-wider" style={{ color: '#00ff9f' }}>
            CONFIRMATION REQUIRED
          </p>
          <p style={{ color: '#94a3b8' }}>{successInfo}</p>
          <Link
            to="/login"
            className="btn-neon mt-2 px-4 py-2 text-xs flex items-center gap-2"
            style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}
          >
            PROCEED TO LOGIN <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div>
            <label htmlFor="reg-name" className="block text-xs font-mono tracking-wider mb-1.5" style={{ color: '#94a3b8' }}>
              Full Name / Call-sign
            </label>
            <input
              id="reg-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
              placeholder="Agent Zero"
              className="w-full px-4 py-3 text-sm font-mono transition-all"
              style={{
                background: '#050810',
                border: errors.name ? '1px solid #ff006e' : '1px solid #00ff9f22',
                color: '#e2e8f0',
                outline: 'none',
                clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
              }}
              onFocus={e => !errors.name && (e.currentTarget.style.borderColor = '#00ff9f66')}
              onBlur={e => !errors.name && (e.currentTarget.style.borderColor = '#00ff9f22')}
            />
            {errors.name && <p className="mt-1 text-xs font-mono" style={{ color: '#ff006e' }}>// {errors.name}</p>}
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-xs font-mono tracking-wider mb-1.5" style={{ color: '#94a3b8' }}>
              Email address
            </label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="operator@threatnet.io"
              className="w-full px-4 py-3 text-sm font-mono transition-all"
              style={{
                background: '#050810',
                border: errors.email ? '1px solid #ff006e' : '1px solid #00ff9f22',
                color: '#e2e8f0',
                outline: 'none',
                clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
              }}
              onFocus={e => !errors.email && (e.currentTarget.style.borderColor = '#00ff9f66')}
              onBlur={e => !errors.email && (e.currentTarget.style.borderColor = '#00ff9f22')}
            />
            {errors.email && <p className="mt-1 text-xs font-mono" style={{ color: '#ff006e' }}>// {errors.email}</p>}
          </div>

          <PasswordField
            id="reg-password"
            label="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            error={errors.password}
            autoComplete="new-password"
          />

          <PasswordField
            id="reg-confirm"
            label="Confirm Password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            error={errors.confirm}
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={loading}
            className="btn-neon-solid flex items-center justify-center gap-2 py-3 font-display text-xs tracking-widest uppercase transition-all disabled:opacity-50 mt-2"
            style={{
              fontFamily: 'Orbitron, monospace',
              letterSpacing: '0.15em',
              clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
            }}
          >
            {loading ? 'INITIALIZING PROFILE...' : 'REGISTER IDENTITY'}
          </button>

          <p className="text-center text-xs font-mono mt-3" style={{ color: '#4a6080' }}>
            EXISTING OPERATOR?{' '}
            <Link to="/login" className="font-semibold transition-colors" style={{ color: '#00ff9f' }}>
              [ SIGN IN ]
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  )
}

export default Login
