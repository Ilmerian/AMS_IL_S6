// src/repositories/RoomRepository.js
import { supabase } from '../lib/supabaseClient';
import { Room } from '../models/Room';

export const RoomRepository = {
  async listMy() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: own, error: e1 } = await supabase
      .from('rooms')
      .select('*')
      .eq('owner_id', user.id)
      .order('room_id', { ascending: false });
    if (e1) throw e1;

    const { data: roleRows, error: eRoles } = await supabase
      .from('roles')
      .select('room_id')
      .eq('user_id', user.id);
    if (eRoles) throw eRoles;

    const memberIds = Array.from(new Set((roleRows || []).map(r => r.room_id)));
    let member = [];
    if (memberIds.length > 0) {
      const { data: memberRooms, error: e2 } = await supabase
        .from('rooms')
        .select('*')
        .in('room_id', memberIds)
        .order('room_id', { ascending: false });
      if (e2) throw e2;
      member = memberRooms || [];
    }

    const byId = new Map();
    [...(own || []), ...member].forEach(r => byId.set(r.room_id, r));
    return Array.from(byId.values()).map(Room.fromRow);
  },

  async listPublic() {
    const { data, error } = await supabase.rpc('list_public_rooms');
    if (error) throw error;
    return (data || []).map(r => ({
      id: r.room_id,
      name: r.name,
      ownerId: r.owner_id,
      password: null,
      videoHistory: null,
    }));
  },  

  async getById(roomId) {
    const { data, error } = await supabase
      .rpc('get_room_public', { p_room_id: roomId })
      .single();
    if (error) throw error;
    return {
      id: data.room_id,
      name: data.name,
      ownerId: data.owner_id,
      password: data.has_password ? '***' : null,
      videoHistory: null,
    };
  },

  async create({ name, password }) {
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { name, password: password || null, owner_id: user?.id };
    const { data, error } = await supabase
      .from('rooms')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return Room.fromRow(data);
  },

  async remove(roomId) {
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('room_id', roomId);
    if (error) throw error;
    return true;
  },
};
