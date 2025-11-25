// src/services/RoomService.js
import { RoomRepository } from '../repositories/RoomRepository';
import { RoleRepository } from '../repositories/RoleRepository';
import { supabase } from '../lib/supabaseClient';

export const RoomService = {
  listMy: () => RoomRepository.listMy(),
  async get(roomId) {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_id', roomId)
        .single();
      
      if (error) throw error;
      
      return {
        id: data.room_id,
        name: data.name,
        ownerId: data.owner_id,
        current_video_id: data.current_video_id,
        is_playing: data.is_playing,
        has_password: !!data.password
      };
    } catch (error) {
      console.error('RoomService.get error:', error);
      throw error;
    }
  },
  listPublic: () => RoomRepository.listPublic(),
  updatePosition: (roomId, position) => RoomRepository.updatePosition(roomId, position),
  archive: (id) => RoomRepository.archive(id),
  setPrivate: (roomId, isPrivate) => RoomRepository.setPrivate(roomId, isPrivate),
  pushVideo: (roomId, videoId) => RoomRepository.pushVideo(roomId, videoId),

  // NOUVEAU : Met à jour l'état de lecture global de la salle
  async updatePlaybackState(roomId, { isPlaying, currentVideoId }) {
    const updates = {};
    if (isPlaying !== undefined) updates.is_playing = isPlaying;
    if (currentVideoId !== undefined) updates.current_video_id = currentVideoId;

    if (Object.keys(updates).length === 0) return;

    const { error } = await supabase
      .from('rooms')
      .update(updates)
      .eq('room_id', roomId);
    
    if (error) {
      console.error('RoomService.updatePlaybackState error:', error);
      throw error;
    }
    
    return true;
  },

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