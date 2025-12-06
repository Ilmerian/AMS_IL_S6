// src/services/AuthService.js
import { supabase } from '../lib/supabaseClient'
import { UserRepository } from '../repositories/UserRepository'
import { cacheService } from './CacheService';

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

  async signInWithPassword({ email, password, remember = false }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        persistSession: remember,
        ...(remember && { 
          data: { persistent_session: true }
        })
      }
    })
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
    const cacheKey = 'auth_current_user';
    const cached = cacheService.getMemory(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 30000) {
      console.log('[AuthService] User cache HIT');
      return cached.data;
    }
    
    console.log('[AuthService] User cache MISS, fetching...');
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    
    const user = data?.user ?? null;
    
    if (user) {
      cacheService.setMemory(cacheKey, {
        data: user,
        timestamp: Date.now()
      }, 30000);
    }
    
    return user;
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

    let profileExists = false;
    try {
      const profile = await UserRepository.getById(user.id)
      if (profile) {
        profileExists = true;
        return profile;
      }
    } catch (e) {
      const msg = e?.message || '';
      if (
        (e.code !== '404' && e.code !== 404) && // Si ce n'est PAS un 404, on loggue l'erreur
        !msg.includes('NetworkError') &&
        !msg.includes('502')
      ) {
        console.error('[AuthService.ensureProfile] getById failed unexpectedly:', e?.message || e);
      }
    }

    if (profileExists) return;

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
    localStorage.removeItem('supabase.auth.token')
    localStorage.removeItem('watchwithme-auth-token')
  },

  async signOutAll() {
    const { error } = await supabase.auth.signOut({ scope: 'global' })
    if (error) throw error
    
    localStorage.removeItem('supabase.auth.token')
    localStorage.removeItem('watchwithme-auth-token')
  },
}
