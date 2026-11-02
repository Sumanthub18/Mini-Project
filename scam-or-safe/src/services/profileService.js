import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'

/**
 * Service module for user profile management.
 */

/**
 * Retrieves the profile row for the authenticated user.
 * @param {string} userId
 */
export async function getProfile(userId) {
  if (!isSupabaseConfigured || !userId) {
    return { data: { id: userId, display_name: 'Demo User' }, error: null }
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching profile:', error)
    return { data: null, error }
  }
}

/**
 * Updates display name or metadata on the authenticated user's profile.
 *
 * @param {string} userId
 * @param {object} updates
 * @param {string} [updates.displayName]
 */
export async function updateProfile(userId, { displayName }) {
  if (!isSupabaseConfigured || !userId) {
    return { data: { id: userId, display_name: displayName }, error: null }
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    // Also update Supabase Auth user metadata
    await supabase.auth.updateUser({
      data: { full_name: displayName },
    })

    return { data, error: null }
  } catch (error) {
    console.error('Error updating profile:', error)
    return { data: null, error }
  }
}

/**
 * Updates the current user's password securely via Supabase Auth.
 * Passwords are never stored in plain text or client storage.
 *
 * @param {string} newPassword
 */
export async function updatePassword(newPassword) {
  if (!isSupabaseConfigured) {
    return { error: new Error('Supabase is not configured.') }
  }

  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}
