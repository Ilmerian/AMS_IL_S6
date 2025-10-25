// src/services/RoomService.js
import { RoomRepository } from '../repositories/RoomRepository';
import { RoleRepository } from '../repositories/RoleRepository';
import { supabase } from '../lib/supabaseClient'

export const RoomService = {
  listMy: () => RoomRepository.listMy(),
  get: (id) => RoomRepository.getById(id),
  listPublic: () => RoomRepository.listPublic(),

  async create({ name, password }) {
    const room = await RoomRepository.create({ name, password });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await RoleRepository.addMember({
          roomId: room.id,
          userId: user.id,
          isManager: true,
        });
      }
    } catch (e) {
      console.warn('[RoomService.create] add owner as member failed:', e?.message || e);
    }
    return room;
  },

  remove: (id) => RoomRepository.remove(id),
  listMembers: (roomId) => RoleRepository.listForRoom(roomId),
  addMember: (roomId, userId, isManager = false) =>
    RoleRepository.addMember({ roomId, userId, isManager }),
  removeMember: (roomId, userId) => RoleRepository.removeMember({ roomId, userId }),

  async join(roomId, password) {
    const { data, error } = await supabase.rpc('join_room', {
      p_room_id: Number(roomId),
      p_password: password || ''
    })
    if (error) throw error
    return !!data
  },
};
