// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('Missing Supabase Env vars')
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'watchwithme-auth-token',
    storage: window.localStorage,
    flowType: 'pkce'    
  },
  realtime: {
    timeout: 30000,
    params: {
      eventsPerSecond: 5,
      apikey: key,
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'watch-with-me'
    }
  }
})