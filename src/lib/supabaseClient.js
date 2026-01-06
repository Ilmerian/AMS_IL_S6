// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const sanitizeEnv = (value, name) => {
  const cleaned = (value || '').trim();
  if (!cleaned) {
    throw new Error(`Missing Supabase env var: ${name}`);
  }
  return cleaned;
};

const url = sanitizeEnv(import.meta.env.VITE_SUPABASE_URL, 'VITE_SUPABASE_URL');
const key = sanitizeEnv(import.meta.env.VITE_SUPABASE_ANON_KEY, 'VITE_SUPABASE_ANON_KEY');

/**
 * Client Supabase de l'application
 */

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
