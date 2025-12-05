// src/repositories/UserRepository.js
import { supabase } from '../lib/supabaseClient';
import { User } from '../models/User';
import { cacheService } from '../services/CacheService';

export const UserRepository = {
  async getById(userId) {
    const cacheKey = `user_profile_${userId}`;
    const cached = cacheService.getMemory(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 60000) {
      console.log(`[UserRepository] Cache HIT for user ${userId}`);
      return cached.data;
    }
    
    console.log(`[UserRepository] Cache MISS for user ${userId}`);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (error) throw error;
    
    const user = User.fromRow(data);
    cacheService.setMemory(cacheKey, {
      data: user,
      timestamp: Date.now()
    }, 60000);
    
    return user;
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