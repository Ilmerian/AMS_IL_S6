// src/context/AuthProvider.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { AuthContext } from './auth'
import { AuthService } from '../services/AuthService'
import { UserRepository } from '../repositories/UserRepository'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const clearAllCachedProfiles = () => {
    try {
      const prefix = 'profile_cache_v1:'
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i)
        if (k && k.startsWith(prefix)) localStorage.removeItem(k)
      }
    } catch (e) {
      console.warn('[AuthProvider] clearAllCachedProfiles failed:', e?.message || e)
    }
  }  
  const CACHE_VERSION = 'v2';
  const cacheKey = (uid) => `profile_cache_${CACHE_VERSION}:${uid}`;
  const loadProfile = async (uid) => {
    if (!uid) { setProfile(null); return null }
    
    try {
      const cached = localStorage.getItem(cacheKey(uid));
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setProfile(data);
        } else {
          localStorage.removeItem(cacheKey(uid));
        }
      }
    } catch (e) {
      console.warn('[AuthProvider] cache read failed:', e?.message || e);
    }
    try {
     const p = await UserRepository.getById(uid)
      setProfile(p)
      try { localStorage.setItem(cacheKey(uid), JSON.stringify({ data: p, timestamp: Date.now() })) } catch (e) {
        console.warn('[AuthProvider] loadProfile cache write failed:', e?.message || e)
      }
      return p
    } catch (e) {
      console.warn('[AuthProvider] loadProfile failed:', e?.message || e)
     return null
    }
  }

  const clearProfile = (uid) => {
    setProfile(null)
    try { if (uid) localStorage.removeItem(cacheKey(uid)) } catch (e) {
      console.warn('[AuthProvider] clearProfile cache remove failed:', e?.message || e)
    }
  }

  const hardSignOut = async () => {
    try {
      supabase.getChannels().forEach((ch) => supabase.removeChannel(ch))
    } catch (e) {
      console.warn('[AuthProvider] removeChannel failed:', e?.message || e)
    }
    const uid = user?.id
    setUser(null)
    clearProfile(uid)
    clearAllCachedProfiles()
  }
  useEffect(() => {
    let active = true
    let channel = null

    ;(async () => {
      try {
        try {
          const url = new URL(window.location.href)
          const hasCode = url.searchParams.get('code')
          const linkType = url.searchParams.get('type')
          const hasError =
            url.searchParams.get('error') ||
            url.searchParams.get('error_description')

          if (hasError) {
            console.error('[Auth] magic link error:', hasError)
          } else if (hasCode) {
            await supabase.auth.exchangeCodeForSession(window.location.href)
            if (linkType === 'recovery') {
              window.location.replace('/update-password')
              return
            }
            window.location.replace('/')
            return
           }
        } catch (e) {
          console.error('[Auth] exchangeCodeForSession failed:', e?.message || e)
        }

        const { data: sessData, error: sessErr } = await supabase.auth.getSession()
        if (sessErr) throw sessErr

        const session = sessData?.session ?? null
        if (!session) {
          if (!active) return
          setUser(null)
          clearProfile(null)
          setLoading(false)
          return
        }

        const { data, error } = await supabase.auth.getUser()
        if (error) {
          if (error.status === 401 || error.status === 403) {
            await hardSignOut()
          }
          throw error
        }

        if (!active) return
        setUser(data?.user ?? null)
        setLoading(false)

        if (data?.user) {
          try {
            await AuthService.ensureProfile()
          } catch (e) {
            await hardSignOut()
            console.error('[AuthProvider] ensureProfile failed:', e?.message || e)
          }
          const uid = data.user.id
          await loadProfile(uid)
          try {
            if (channel) supabase.removeChannel(channel)
            channel = supabase
              .channel(`users:me:${uid}`)
              .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'users',
                filter: `user_id=eq.${uid}`
              }, async () => { await loadProfile(uid) })
              .subscribe()
          } catch (e) {
            console.warn('[AuthProvider] realtime subscribe failed:', e?.message || e)
          }          
        }
      } catch (e) {
        if (!active) return
        setUser(null)
        clearProfile(null)
        setLoading(false)
        console.error('[AuthProvider] init error:', e?.message || e)
      }
    })()

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        await hardSignOut()
        return
      }

      setUser(session?.user ?? null)
      if (session?.user) {
        try { await AuthService.ensureProfile() }
        catch (e) {
          await hardSignOut()
          console.error('[AuthProvider] ensureProfile failed:', e?.message || e)
          return
        }
        await loadProfile(session.user.id)
      } else {
        clearProfile(null)
        clearAllCachedProfiles()
      }
    })

    return () => { 
      active = false;
      sub?.subscription?.unsubscribe?.() 
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  const value = useMemo(() => ({ user, profile, loading }), [user, profile, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
