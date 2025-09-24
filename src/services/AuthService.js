import { supabase } from '../lib/supabaseClient';
export const AuthService={signOut:()=>supabase.auth.signOut(),async signIn(email){const {error}=await supabase.auth.signInWithOtp({email});if(error) throw error;}};
