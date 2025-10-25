import { supabase } from '../lib/supabaseClient';
import { Role } from '../models/Role';

export const RoleRepository = {
  async listForRoom(roomId) {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('room_id', roomId);
    if (error) throw error;
    return data.map(Role.fromRow);
  },

  async addMember({ roomId, userId, isManager = false }) {
    const { data, error } = await supabase
      .from('roles')
      .upsert({ room_id: roomId, user_id: userId, is_manager: !!isManager })
      .select()
      .single();
    if (error) throw error;
    return Role.fromRow(data);
  },

  async removeMember({ roomId, userId }) {
    const { error } = await supabase
      .from('roles')
      .delete()
      .match({ room_id: roomId, user_id: userId });
    if (error) throw error;
    return true;
  },
};
