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
  },
  realtime: {
    timeout: 60000,
    params: {
      eventsPerSecond: 10,
      apikey: key,
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'watch-with-me'
    }
  }
})