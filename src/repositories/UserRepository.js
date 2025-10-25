import { supabase } from '../lib/supabaseClient';
import { User } from '../models/User';

export const UserRepository = {
  async getById(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return User.fromRow(data);
  },

  async upsertProfile(partial) {
    const { data, error } = await supabase
      .from('users')
      .upsert(partial, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    return User.fromRow(data);
  },
};