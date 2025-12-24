// src/context/AuthProvider.jsx
import { useEffect, useMemo, useState, useCallback } from 'react'
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

  useEffect(() => {
    if (user) {
      logMetric("user_connected", user.id);
    }
  }, [user]);

  // Charge le profil utilisateur depuis la DB
  const fetchProfile = useCallback(async (uid) => {
    if (!uid) {
      setProfile(null);
      return;
    }

    const cacheKey = `user_profile_${uid}`;
    const cached = cacheService.getMemory(cacheKey);

    if (cached && Date.now() - cached.timestamp < 60000) {
      console.log(`[AuthProvider] Profile cache HIT for ${uid}`);
      setProfile(cached.data);
      return;
    }

    try {
      console.log(`[AuthProvider] Profile cache MISS for ${uid}, fetching...`);
      const p = await UserRepository.getById(uid);
      setProfile(p);
    } catch (e) {
      console.warn('[AuthProvider] fetchProfile failed:', e);
    }
  }, []);

  // Fonction pour rafraîchir la session quand l'utilisateur revient sur l'onglet
  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error || !data.session) {
        // Si la session est morte, on nettoie
        setUser(null)
        setProfile(null)
      } else {
        // Si l'utilisateur a changé (rare) ou si on veut être sûr d'avoir les dernières infos
        if (data.session.user.id !== user?.id) {
          setUser(data.session.user)
          fetchProfile(data.session.user.id)
        }
      }
    } catch (error) {
      console.warn('[AuthProvider] refreshSession error:', error)
    }
  }, [user, fetchProfile])

  useEffect(() => {
    let mounted = true

    // 1. Initialisation
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          if (mounted) setUser(session.user)
          try {
            await AuthService.ensureProfile()
          } catch (e) {
            console.warn('[AuthProvider] ensureProfile failed:', e)
          }
          if (mounted) await fetchProfile(session.user.id)
        }
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.error('Auth init error:', e)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    // 2. Écoute des changements d'auth (Login, Logout, Auto-refresh token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setLoading(false)
        if (cacheService) {
          cacheService.invalidate(`room_data_`);
          cacheService.invalidate(`rooms_list_public_`);
        }
      } else if (session?.user) {
        setUser(session.user)
        // On ne recharge le profil que s'il n'est pas déjà chargé ou si c'est un nouvel user
        if (!profile || profile.id !== session.user.id) {
          await fetchProfile(session.user.id)
        }
        setLoading(false)
      }
    })

    // 3. REVALIDATION AUTO AU RETOUR SUR L'ONGLET
    const handleFocus = () => {
      refreshSession()
    }
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refreshSession()
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchProfile, refreshSession])

  const value = useMemo(() => ({ user, profile, loading }), [user, profile, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}