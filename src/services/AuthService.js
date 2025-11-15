// src/services/AuthService.js
import { supabase } from '../lib/supabaseClient'
import { UserRepository } from '../repositories/UserRepository'

export const AuthService = {
  async signIn(email, opts = {}) {
    return AuthService.signInMagicLink(email, opts)
  },

  async signInMagicLink(email, opts = {}) {
    const { redirectTo, shouldCreateUser = shouldCreateUser ?? true } = opts
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser,
      },
    })
    if (error) throw error
    return data
  },

  async signUp(payload, opts = {}) {
    const { email, password, metadata } = payload || {}
    const { redirectTo } = opts
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { ...metadata },
      },
    })
    if (error) throw error
    return data
  },

  async signInWithPassword(payload) {
    const { email, password } = payload || {}
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  async signInWithProvider(provider, opts = {}) {
    const { redirectTo, scopes } = opts
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        scopes,
      },
    })
    if (error) throw error
    return data
  },

  async verifyOtp(payload) {
    const { email, token, type = 'magiclink' } = payload || {}
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type })
    if (error) throw error
    return data
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data?.session ?? null
  },

  async getUser() {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    return data?.user ?? null
  },

  async getAccessToken() {
    const session = await AuthService.getSession()
    return session?.access_token ?? null
  },

  async refreshSession() {
    const { data, error } = await supabase.auth.refreshSession()
    if (error) throw error
    return data?.session ?? null
  },

  onAuthChange(callback) {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      callback?.(event, session)
    })
    return () => sub.subscription?.unsubscribe?.()
  },

  async requireAuth() {
    const user = await AuthService.getUser()
    if (!user) {
      const err = new Error('Unauthorized')
      err.code = 401
      throw err
    }
    return user
  },

  async ensureProfile() {
    const user = await AuthService.getUser()
    if (!user) return null

    try {
      const profile = await UserRepository.getById(user.id)
      if (profile) return profile
    } catch (e) {
      const status = e?.status ?? e?.code
      const msg = e?.message || ''
      if (
        status === 403 ||
        status === '42501' ||
        msg.includes('permission denied for table users')
      ) {
        console.warn('[AuthService.ensureProfile] RLS denied on users, skip upsert')
        return null
      }
      console.error('[AuthService.ensureProfile] getById failed:', e?.message || e)
    }

    const username =
      user.user_metadata?.username ||
      user.email?.split('@')[0] ||
      `user_${(user.id || '').slice(0, 8)}`
    const avatar_url = user.user_metadata?.avatar_url || null

    try {
      const created = await UserRepository.upsertProfile({
        user_id: user.id,
        username,
        email: user.email,
        avatar_url,
        first_name: user.user_metadata?.first_name || null,
        last_name: user.user_metadata?.last_name || null,
      })
      return created
    } catch (e) {
      console.error('[AuthService.ensureProfile] upsert failed:', e?.message || e)
      return null
    }
  },

  async resetPasswordForEmail(email, opts = {}) {
    const redirectTo =
      opts.redirectTo || `${window.location.origin}/update-password`
    const { data, error } = await supabase.auth.resetPasswordForEmail(
      String(email || '').trim(),
      { redirectTo }
    )
    if (error) throw error
    return data
  },

  async updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    return data?.user ?? null
  },

  async updateEmail(newEmail) {
    const { data, error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) throw error
    return data?.user ?? null
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return true
  },

  async signOutAll() {
    const { error } = await supabase.auth.signOut({ scope: 'global' })
    if (error) throw error
    return true
  },
}
