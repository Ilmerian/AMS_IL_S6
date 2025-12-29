// scr/config/env.js
/**
 * Variables d'environnement de l'application
 */
export const ENV = {
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    SUPABASE_ANON: import.meta.env.VITE_SUPABASE_ANON_KEY
};
