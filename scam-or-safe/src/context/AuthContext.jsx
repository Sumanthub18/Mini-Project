import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import { getProfile, updateProfile as updateProfileApi } from '../services/profileService.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [emailNeedsConfirmation, setEmailNeedsConfirmation] = useState(false)

  // Fetch or refresh profile row from public.profiles
  const refreshProfile = useCallback(async (userId, fallbackUser = null) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data } = await getProfile(userId)
    if (data) {
      setProfile(data)
    } else if (fallbackUser) {
      setProfile({
        id: userId,
        display_name:
          fallbackUser.user_metadata?.full_name ||
          fallbackUser.user_metadata?.name ||
          fallbackUser.email?.split('@')[0] ||
          'Agent',
      })
    }
  }, [])

  // Initialize auth session and listen to changes
  useEffect(() => {
    let mounted = true

    if (!isSupabaseConfigured) {
      // In unconfigured environments, check for an existing demo session or remain unauthenticated
      setLoading(false)
      return
    }

    async function initAuth() {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        if (error) throw error

        if (mounted) {
          setSession(initialSession)
          setUser(initialSession?.user ?? null)
          if (initialSession?.user) {
            await refreshProfile(initialSession.user.id, initialSession.user)
          }
        }
      } catch (err) {
        console.error('Error reading initial auth session:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initAuth()

    // Listen for auth state changes (SIGN_IN, SIGN_OUT, TOKEN_REFRESHED, USER_UPDATED)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return

      setSession(currentSession)
      setUser(currentSession?.user ?? null)

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (currentSession?.user) {
          await refreshProfile(currentSession.user.id, currentSession.user)
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setSession(null)
      }

      setLoading(false)
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [refreshProfile])

  // Email & password registration
  const signUp = async ({ email, password, fullName }) => {
    setEmailNeedsConfirmation(false)

    if (!isSupabaseConfigured) {
      // Demo fallback when env is not configured
      const demoUser = {
        id: 'demo-' + Date.now(),
        email,
        user_metadata: { full_name: fullName },
      }
      setUser(demoUser)
      setProfile({ id: demoUser.id, display_name: fullName })
      return { data: { user: demoUser }, error: null, isDemo: true }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      })

      if (error) throw error

      // Check if email confirmation is required (user exists but session is null)
      if (data.user && !data.session) {
        setEmailNeedsConfirmation(true)
      } else if (data.user) {
        setUser(data.user)
        setSession(data.session)
        await refreshProfile(data.user.id, data.user)
      }

      return { data, error: null }
    } catch (err) {
      return { data: null, error: err }
    }
  }

  // Email & password login
  const signIn = async ({ email, password }) => {
    if (!isSupabaseConfigured) {
      // Demo fallback
      const demoUser = {
        id: 'demo-user',
        email,
        user_metadata: { full_name: 'Demo Agent' },
      }
      setUser(demoUser)
      setProfile({ id: demoUser.id, display_name: 'Demo Agent' })
      return { data: { user: demoUser }, error: null, isDemo: true }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      setUser(data.user)
      setSession(data.session)
      await refreshProfile(data.user.id, data.user)

      return { data, error: null }
    } catch (err) {
      return { data: null, error: err }
    }
  }

  // Sign out
  const signOut = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut()
      } catch (err) {
        console.error('Error signing out:', err)
      }
    }
    setUser(null)
    setSession(null)
    setProfile(null)
    setEmailNeedsConfirmation(false)
  }

  // Update profile
  const updateDisplayName = async (displayName) => {
    if (!user) return { error: new Error('User not authenticated') }
    const { data, error } = await updateProfileApi(user.id, { displayName })
    if (!error) {
      setProfile(prev => ({ ...prev, display_name: displayName }))
    }
    return { data, error }
  }

  const value = {
    user,
    session,
    profile,
    loading,
    isConfigured: isSupabaseConfigured,
    emailNeedsConfirmation,
    signUp,
    signIn,
    signOut,
    updateDisplayName,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
