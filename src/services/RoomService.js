// src/services/RoomService.js
import { RoomRepository } from '../repositories/RoomRepository';
import { RoleRepository } from '../repositories/RoleRepository';
import { supabase } from '../lib/supabaseClient';

export const RoomService = {
  listMy: () => RoomRepository.listMy(),
  get: (id) => RoomRepository.getById(id),
  listPublic: () => RoomRepository.listPublic(),
  updatePosition: (roomId, position) => RoomRepository.updatePosition(roomId, position),
  archive: (id) => RoomRepository.archive(id),
  setPrivate: (roomId, isPrivate) => RoomRepository.setPrivate(roomId, isPrivate),
  pushVideo: (roomId, videoId) => RoomRepository.pushVideo(roomId, videoId),


  async create({ name, password }) {
    const room = await RoomRepository.create({ name, password });
    try {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const user = data?.user;

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
  removeMember: (roomId, userId) =>
    RoleRepository.removeMember({ roomId, userId }),

  async join(roomId, password) {
    const { data, error } = await supabase.rpc('join_room', {
      p_room_id: Number(roomId),
      p_password: password || '',
    });
    if (error) throw error;
    return !!data;
  },

  async getPlaylist(roomId) {
    const res = await supabase
      .from("playlists")
      .select("*")
      .eq("room_id", roomId)
      .order("position", { ascending: true })

    if (res.error) throw res.error
    return res.data || []
  },

  async getVideoHistoryForRoom(roomId) {
    const { data, error } = await supabase
      .from("video_history")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading video history:", error);
      return [];
    }
    return data || [];
  }


};
