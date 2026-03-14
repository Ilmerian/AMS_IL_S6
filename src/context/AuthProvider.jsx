// src/context/AuthProvider.jsx
import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { AuthContext } from './auth'
import { AuthService } from '../services/AuthService'
import { UserRepository } from '../repositories/UserRepository'
import { cacheService } from '../services/CacheService'
import { logMetric } from "../utils/metrics";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const userIdRef = useRef(null)
  const lastMetricUserRef = useRef(null)
  const refreshInFlightRef = useRef(false)
  const fetchedProfileForRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    const uid = user?.id
    if (!uid) return
    if (lastMetricUserRef.current === uid) return
    lastMetricUserRef.current = uid
    logMetric("user_connected", uid)
  }, [user?.id])

  const fetchProfile = useCallback(async (uid, { force = false } = {}) => {
    if (!uid) {
      if (mountedRef.current) setProfile(null)
      fetchedProfileForRef.current = null
      return null
    }

    if (!force && fetchedProfileForRef.current === uid) {
      return profile
    }

    const cacheKey = `user_profile_${uid}`
    const cached = cacheService.getMemory(cacheKey)

    if (!force && cached && Date.now() - cached.timestamp < 60000) {
      console.log(`[AuthProvider] Profile cache HIT for ${uid}`)
      if (mountedRef.current) setProfile(cached.data)
      fetchedProfileForRef.current = uid
      return cached.data
    }

    try {
      console.log(`[AuthProvider] Profile cache MISS for ${uid}, fetching...`)
      const p = await UserRepository.getById(uid)
      if (mountedRef.current) setProfile(p)
      fetchedProfileForRef.current = uid
      return p
    } catch (e) {
      if (e?.name !== 'AbortError') {
        console.warn('[AuthProvider] fetchProfile failed:', e)
      }
      return null
    }
  }, [profile])

  const applySessionUser = useCallback(async (sessionUser, { ensureProfile = false } = {}) => {
    if (!sessionUser) {
      userIdRef.current = null
      fetchedProfileForRef.current = null
      if (mountedRef.current) {
        setUser(null)
        setProfile(null)
      }
      return
    }

    userIdRef.current = sessionUser.id
    if (mountedRef.current) setUser(sessionUser)

    if (ensureProfile) {
      try {
        await AuthService.ensureProfile()
      } catch (e) {
        if (e?.name !== 'AbortError') {
          console.warn('[AuthProvider] ensureProfile failed:', e)
        }
      }
    }

    await fetchProfile(sessionUser.id)
  }, [fetchProfile])

  const refreshSession = useCallback(async () => {
    if (refreshInFlightRef.current) return
    refreshInFlightRef.current = true

    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error

      const sessionUser = data?.session?.user || null
      await applySessionUser(sessionUser)
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.warn('[AuthProvider] refreshSession error:', error)
      }
    } finally {
      refreshInFlightRef.current = false
    }
  }, [applySessionUser])

  useEffect(() => {
    mountedRef.current = true

    const init = async () => {
      if (refreshInFlightRef.current) return
      refreshInFlightRef.current = true

      try {
        const { data: { session } } = await supabase.auth.getSession()
        await applySessionUser(session?.user || null, { ensureProfile: true })
      } catch (e) {
        if (e?.name !== 'AbortError') {
          console.error('Auth init error:', e)
        }
      } finally {
        refreshInFlightRef.current = false
        if (mountedRef.current) setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return

      try {
        if (event === 'SIGNED_OUT') {
          userIdRef.current = null
          fetchedProfileForRef.current = null
          setUser(null)
          setProfile(null)
          setLoading(false)

          cacheService.invalidate('room_data_')
          cacheService.invalidate('rooms_list_public_')
          return
        }

        if (session?.user) {
          await applySessionUser(session.user, { ensureProfile: false })
          if (mountedRef.current) setLoading(false)
        }
      } catch (e) {
        if (e?.name !== 'AbortError') {
          console.warn('[AuthProvider] onAuthStateChange failed:', e)
        }
      }
    })

    const handleFocus = () => {
      refreshSession()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSession()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [applySessionUser, refreshSession])

  const value = useMemo(() => ({ user, profile, loading }), [user, profile, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}