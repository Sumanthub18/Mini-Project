import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Bell, Eye, Shield, LogOut, KeyRound, Database } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { updatePassword } from '../services/profileService.js'
import { useToast } from '../hooks/useToast.jsx'
import { SectionHeader } from '../components/ResultComponents.jsx'

function Toggle({ checked, onChange, label, description, id }) {
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-4 py-3 cursor-pointer">
      <div>
        <p className="text-sm font-medium text-[#F4F2FF]">{label}</p>
        {description && <p className="text-xs text-[rgba(236,232,255,0.55)] mt-0.5">{description}</p>}
      </div>
      <div className="relative flex-shrink-0">
        <input id={id} type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
        <div
          className="w-11 h-6 rounded-full transition-all duration-200 flex items-center px-0.5"
          style={{
            background: checked ? 'rgba(0, 229, 255, 0.25)' : 'rgba(13, 8, 48, 0.8)',
            border: checked ? '1px solid #00E5FF' : '1px solid rgba(196, 178, 255, 0.22)',
          }}
        >
          <div
            className="w-5 h-5 rounded-full transition-transform duration-200"
            style={{
              background: checked ? '#00E5FF' : 'rgba(236, 232, 255, 0.5)',
              transform: checked ? 'translateX(20px)' : 'translateX(0)',
            }}
          />
        </div>
      </div>
    </label>
  )
}

function Section({ icon: Icon, title, color = '#00E5FF', children }) {
  return (
    <div className="tl-glass-card p-5 space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b" style={{ borderColor: 'rgba(196,178,255,0.12)' }}>
        <Icon size={16} style={{ color }} />
        <h3 className="font-display font-semibold text-sm text-[#F4F2FF]">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const { user, profile, updateDisplayName, signOut, isConfigured } = useAuth()
  const { toast, addToast } = useToast()
  const navigate = useNavigate()

  const notify = (msg, type = 'info') => {
    if (toast?.[type]) toast[type](msg)
    else if (addToast) addToast(msg, type)
  }

  const [displayName, setDisplayName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameSaving, setNameSaving] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordUpdating, setPasswordUpdating] = useState(false)

  const [prefs, setPrefs] = useState({
    notifications: true,
    emailAlerts: false,
    saveHistory: true,
    analytics: false,
  })

  useEffect(() => {
    setDisplayName(profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || '')
  }, [profile, user])

  const toggle = (key) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSaveName = async () => {
    if (!displayName.trim()) return
    setNameSaving(true)
    const { error } = await updateDisplayName(displayName.trim())
    setNameSaving(false)
    if (error) {
      notify(error.message || 'Could not update display name.', 'error')
    } else {
      setEditingName(false)
      notify('Display name updated.', 'success')
    }
  }

  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      notify('Password must be at least 6 characters.', 'error')
      return
    }
    setPasswordUpdating(true)
    const { error } = await updatePassword(newPassword)
    setPasswordUpdating(false)
    if (error) {
      notify(error.message || 'Failed to update password.', 'error')
    } else {
      setNewPassword('')
      setShowPasswordModal(false)
      notify('Password updated successfully.', 'success')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    notify('Signed out of TrustLens AI.', 'info')
    navigate('/login')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-8">
      <SectionHeader
        badge="ACCOUNT & PREFERENCES"
        title="Settings"
        subtitle="Manage your TrustLens AI analyst profile, authentication credentials, and notification preferences."
      />

      {/* Database Status Banner */}
      <div
        className="p-3.5 rounded-2xl flex items-center justify-between flex-wrap gap-2 text-xs font-mono"
        style={{
          background: isConfigured ? 'rgba(94,230,168,0.1)' : 'rgba(255,191,105,0.1)',
          border: `1px solid ${isConfigured ? 'rgba(94,230,168,0.32)' : 'rgba(255,191,105,0.32)'}`,
          color: isConfigured ? '#5EE6A8' : '#FFBF69',
        }}
      >
        <div className="flex items-center gap-2">
          <Database size={14} />
          <span>{isConfigured ? 'Supabase PostgreSQL Sync Active' : 'Local Demo Session Mode'}</span>
        </div>
        <span className="text-[rgba(236,232,255,0.68)]">
          {isConfigured
            ? 'Profile & scan history protected by Supabase RLS.'
            : 'Configure Supabase environment variables for cloud persistence.'}
        </span>
      </div>

      {/* Profile Section */}
      <Section icon={User} title="Analyst Profile" color="#00E5FF">
        <div className="flex items-center gap-4 flex-wrap">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-display font-bold text-lg text-[#00E5FF] flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(111,120,255,0.28), rgba(0,229,255,0.18))',
              border: '1px solid rgba(0,229,255,0.35)',
            }}
          >
            {(displayName || 'TL').slice(0, 2).toUpperCase()}
          </div>

          <div className="flex-1 min-w-[200px]">
            {editingName ? (
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs font-mono bg-[#0D0830] border border-[#00E5FF]/50 text-[#F4F2FF] outline-none flex-1"
                  placeholder="Enter display name"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={nameSaving}
                  className="tl-btn-primary text-xs py-2 px-4"
                >
                  {nameSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingName(false)}
                  className="tl-btn-ghost text-xs py-2 px-3"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <p className="font-semibold text-sm text-[#F4F2FF] flex items-center gap-2">
                  {displayName || 'Security Analyst'}
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className="text-xs font-mono text-[#00E5FF] hover:underline"
                  >
                    Edit
                  </button>
                </p>
                <p className="text-xs font-mono text-[rgba(236,232,255,0.68)] mt-0.5">
                  {user?.email || 'demo@trustlens.ai'}
                </p>
                <p className="text-[11px] font-mono text-[rgba(236,232,255,0.45)] mt-0.5 truncate">
                  User ID: {user?.id || 'local-session'}
                </p>
              </>
            )}
          </div>
        </div>
      </Section>

      {/* Authentication & Password */}
      <Section icon={Shield} title="Authentication & Session" color="#A78BFA">
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setShowPasswordModal((v) => !v)}
            className="flex items-center justify-between px-4 py-3 rounded-xl text-sm text-left transition-colors hover:border-[#00E5FF]/40"
            style={{
              background: 'rgba(13,8,48,0.62)',
              border: '1px solid rgba(196,178,255,0.16)',
              color: '#F4F2FF',
            }}
          >
            <div className="flex items-center gap-2.5">
              <KeyRound size={15} className="text-[#00E5FF]" />
              <span>Change Password</span>
            </div>
            <span className="text-xs font-mono text-[rgba(236,232,255,0.52)]">Supabase Auth</span>
          </button>

          {showPasswordModal && (
            <form
              onSubmit={handlePasswordUpdate}
              className="p-4 rounded-xl space-y-3"
              style={{ background: 'rgba(13,8,48,0.72)', border: '1px solid rgba(0,229,255,0.3)' }}
            >
              <p className="text-xs font-mono text-[#00E5FF]">Update Account Password</p>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-[#0D0830] border border-[rgba(196,178,255,0.2)] text-[#F4F2FF] outline-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="tl-btn-ghost text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordUpdating}
                  className="tl-btn-primary text-xs py-1.5 px-4"
                >
                  {passwordUpdating ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center justify-between px-4 py-3 rounded-xl text-sm text-left transition-colors hover:bg-[#FF5B78]/15"
            style={{
              background: 'rgba(255,91,120,0.08)',
              border: '1px solid rgba(255,91,120,0.28)',
              color: '#FF5B78',
            }}
          >
            <div className="flex items-center gap-2.5">
              <LogOut size={15} />
              <span>Sign Out of TrustLens AI</span>
            </div>
            <span className="text-xs font-mono opacity-80">End Session</span>
          </button>
        </div>
      </Section>

      {/* Notifications */}
      <Section icon={Bell} title="Notifications" color="#FFBF69">
        <div className="divide-y" style={{ borderColor: 'rgba(196,178,255,0.1)' }}>
          <Toggle
            id="notif-push"
            checked={prefs.notifications}
            onChange={() => toggle('notifications')}
            label="In-app scan alerts"
            description="Show instant notifications when threat scans complete"
          />
          <Toggle
            id="notif-email"
            checked={prefs.emailAlerts}
            onChange={() => {
              toggle('emailAlerts')
              notify('Email digest notifications are planned for a future release.', 'info')
            }}
            label="Email threat summaries"
            description="Receive alerts for critical-risk detections"
          />
        </div>
      </Section>

      {/* Privacy */}
      <Section icon={Eye} title="Privacy & Sync" color="#5EE6A8">
        <div className="divide-y" style={{ borderColor: 'rgba(196,178,255,0.1)' }}>
          <Toggle
            id="priv-history"
            checked={prefs.saveHistory}
            onChange={() => toggle('saveHistory')}
            label="Persist scan history to Supabase"
            description="Store verification results & findings in your authenticated database"
          />
          <Toggle
            id="priv-analytics"
            checked={prefs.analytics}
            onChange={() => toggle('analytics')}
            label="Anonymized community telemetry"
            description="Share redacted risk statistics when submitting reports"
          />
        </div>
      </Section>
    </div>
  )
}
