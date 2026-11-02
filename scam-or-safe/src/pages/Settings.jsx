import { useState, useEffect } from 'react'
import { User, Bell, Shield, Eye, Moon, LogOut, CheckCircle2, KeyRound } from 'lucide-react'
import { SectionHeader, Card } from '../components/ResultComponents.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { updatePassword } from '../services/profileService.js'
import { useToast } from '../hooks/useToast.jsx'
import { useNavigate } from 'react-router-dom'

function Toggle({ id, checked, onChange, label, description }) {
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-4 cursor-pointer py-3">
      <div>
        <p className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{label}</p>
        {description && (
          <p className="text-xs mt-0.5 font-mono" style={{ color: '#4a6080', letterSpacing: '0.04em' }}>{description}</p>
        )}
      </div>
      <div className="relative flex-shrink-0">
        <input id={id} type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
        <div
          className="w-12 h-6 transition-all"
          style={{
            background: checked ? 'linear-gradient(90deg, #00ff9f, #00d4ff)' : '#0f2040',
            border: checked ? '1px solid #00ff9f44' : '1px solid #0f2040',
            boxShadow: checked ? '0 0 12px #00ff9f44' : 'none',
            clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
          }}
        >
          <div
            className="absolute top-0.5 left-0.5 w-5 h-5 bg-white transition-transform"
            style={{
              transform: checked ? 'translateX(24px)' : 'translateX(0)',
              clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))',
              background: checked ? '#050810' : '#1a2540',
            }}
          />
        </div>
      </div>
    </label>
  )
}

function Section({ icon: Icon, title, color = '#00ff9f', children }) {
  return (
    <Card className="flex flex-col gap-4">
      <div
        className="flex items-center gap-3 pb-4"
        style={{ borderBottom: '1px solid #00ff9f12' }}
      >
        <div
          className="w-8 h-8 flex items-center justify-center"
          style={{
            background: `${color}12`,
            border: `1px solid ${color}33`,
            clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
          }}
        >
          <Icon size={15} style={{ color, filter: `drop-shadow(0 0 4px ${color})` }} />
        </div>
        <h2 className="font-display font-bold text-xs tracking-widest" style={{ color: '#e2e8f0', letterSpacing: '0.15em' }}>
          {title}
        </h2>
      </div>
      {children}
    </Card>
  )
}

export default function Settings() {
  const { user, profile, updateDisplayName, signOut, isConfigured } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameSaving, setNameSaving] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordUpdating, setPasswordUpdating] = useState(false)

  const [prefs, setPrefs] = useState({
    theme: 'dark',
    notifications: true,
    emailAlerts: false,
    saveHistory: true,
    analytics: false,
    publicProfile: false,
  })

  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name)
    } else if (user?.user_metadata?.full_name) {
      setDisplayName(user.user_metadata.full_name)
    }
  }, [profile, user])

  const toggle = (key) => setPrefs(p => ({ ...p, [key]: !p[key] }))

  const handleSaveName = async () => {
    if (!displayName.trim()) {
      addToast('Name cannot be empty.', 'error')
      return
    }
    setNameSaving(true)
    const { error } = await updateDisplayName(displayName.trim())
    setNameSaving(false)

    if (error) {
      addToast('Failed to update display name.', 'error')
    } else {
      setEditingName(false)
      addToast('Display name updated in Supabase profiles.', 'success')
    }
  }

  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      addToast('Password must be at least 6 characters.', 'error')
      return
    }
    setPasswordUpdating(true)
    const { error } = await updatePassword(newPassword)
    setPasswordUpdating(false)

    if (error) {
      addToast(error.message || 'Failed to update password.', 'error')
    } else {
      setShowPasswordModal(false)
      setNewPassword('')
      addToast('Password updated securely via Supabase Auth.', 'success')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    addToast('Signed out successfully.', 'info')
    navigate('/login')
  }

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      <SectionHeader title="SETTINGS" subtitle="// manage profile, credentials, and enclave preferences" />

      {/* Backend notice */}
      <div
        className="mb-6 px-4 py-3 text-xs flex items-center justify-between gap-2 font-mono"
        style={{
          background: isConfigured ? '#00ff9f08' : '#00d4ff08',
          border: `1px solid ${isConfigured ? '#00ff9f18' : '#00d4ff18'}`,
          color: '#94a3b8',
          clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
        }}
      >
        <span>
          <strong style={{ color: isConfigured ? '#00ff9f' : '#00d4ff' }}>
            {isConfigured ? '[ SUPABASE BACKEND LINKED ]' : '[ SANDBOX MODE ]'}
          </strong>{' '}
          {isConfigured ? 'Profile and scan history sync with PostgreSQL database.' : 'Add your credentials to .env to link Supabase.'}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {/* Profile */}
        <Section icon={User} title="OPERATOR PROFILE (profiles table)" color="#00d4ff">
          <div className="flex items-center gap-4 flex-wrap">
            <div
              className="w-14 h-14 flex items-center justify-center text-2xl flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg,#00ff9f18,#00d4ff18)',
                border: '1px solid #00ff9f33',
                clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                boxShadow: '0 0 16px #00ff9f18',
              }}
            >
              👤
            </div>
            <div className="flex-1 min-w-[200px]">
              {editingName ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="px-3 py-1.5 text-xs font-mono bg-black/50 border border-cyan-400 text-white rounded outline-none flex-1"
                    placeholder="Enter display name"
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={nameSaving}
                    className="btn-neon px-3 py-1.5 text-xs font-mono"
                  >
                    {nameSaving ? '...' : 'SAVE'}
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="px-2 py-1 text-xs font-mono text-slate-400 hover:text-white"
                  >
                    CANCEL
                  </button>
                </div>
              ) : (
                <>
                  <p className="font-medium text-sm text-slate-100 flex items-center gap-2">
                    {displayName || 'Operator'}
                    <button
                      onClick={() => setEditingName(true)}
                      className="text-xs font-mono text-cyan-400 hover:underline"
                    >
                      [EDIT]
                    </button>
                  </p>
                  <p className="text-xs font-mono mt-0.5 text-slate-400">{user?.email || 'demo@scamorsafe.app'}</p>
                  <p className="text-xs font-mono mt-0.5 text-slate-600 truncate">ID: {user?.id || 'sandbox-user'}</p>
                </>
              )}
            </div>
          </div>
        </Section>

        {/* Security / Password */}
        <Section icon={Shield} title="AUTHENTICATION & CREDENTIALS" color="#ff006e">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowPasswordModal(v => !v)}
              className="flex items-center justify-between px-4 py-3 text-sm text-left transition-all"
              style={{
                background: '#050810',
                border: '1px solid #0f2040',
                color: '#e2e8f0',
                clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#00ff9f33'; e.currentTarget.style.color = '#00ff9f' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#0f2040'; e.currentTarget.style.color = '#e2e8f0' }}
            >
              <div className="flex items-center gap-2">
                <KeyRound size={15} style={{ color: '#00ff9f' }} />
                <span>Change Password</span>
              </div>
              <span className="text-xs font-mono text-slate-500">Supabase Auth API</span>
            </button>

            {showPasswordModal && (
              <form onSubmit={handlePasswordUpdate} className="p-4 bg-black/40 border border-cyan-400/30 rounded flex flex-col gap-3">
                <p className="text-xs font-mono text-cyan-400">// UPDATE SUPABASE PASSWORD</p>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="px-3 py-2 text-xs font-mono bg-black border border-slate-700 text-white rounded outline-none"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-3 py-1.5 text-xs font-mono text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordUpdating}
                    className="btn-neon-solid px-4 py-1.5 text-xs font-mono"
                  >
                    {passwordUpdating ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            )}

            <button
              onClick={handleSignOut}
              className="flex items-center justify-between px-4 py-3 text-sm text-left transition-all"
              style={{
                background: '#ff006e08',
                border: '1px solid #ff006e33',
                color: '#ff006e',
                clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#ff006e18'; e.currentTarget.style.boxShadow = '0 0 12px #ff006e22' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ff006e08'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div className="flex items-center gap-2">
                <LogOut size={15} />
                <span>Sign Out of Platform</span>
              </div>
              <span className="text-xs font-mono" style={{ color: '#ff006e88' }}>End Session</span>
            </button>
          </div>
        </Section>

        {/* Notifications */}
        <Section icon={Bell} title="NOTIFICATIONS" color="#ffb800">
          <div className="flex flex-col" style={{ gap: 0 }}>
            <Toggle
              id="notif-push"
              checked={prefs.notifications}
              onChange={() => toggle('notifications')}
              label="In-app scan alerts"
              description="// toast notifications upon threat detection"
            />
            <div style={{ height: 1, background: '#00ff9f08' }} />
            <Toggle
              id="notif-email"
              checked={prefs.emailAlerts}
              onChange={() => { toggle('emailAlerts'); addToast('Email alerts scheduled for future release.', 'info') }}
              label="Email threat alerts"
              description="// dispatch summary email on high-risk detections"
            />
          </div>
        </Section>

        {/* Privacy */}
        <Section icon={Eye} title="PRIVACY & HISTORY SYNC" color="#00ff9f">
          <div className="flex flex-col" style={{ gap: 0 }}>
            <Toggle
              id="priv-history"
              checked={prefs.saveHistory}
              onChange={() => toggle('saveHistory')}
              label="Persist scan results to Supabase"
              description="// store threat metadata and citations in PostgreSQL"
            />
            <div style={{ height: 1, background: '#00ff9f08' }} />
            <Toggle
              id="priv-analytics"
              checked={prefs.analytics}
              onChange={() => toggle('analytics')}
              label="Share threat intelligence telemetry"
              description="// contribute anonymized threat indicators to community feeds"
            />
          </div>
        </Section>
      </div>
    </div>
  )
}
