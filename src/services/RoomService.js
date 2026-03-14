// src/services/RoomService.js
import { RoomRepository } from '../repositories/RoomRepository';
import { RoleRepository } from '../repositories/RoleRepository';
import { VideoRepository } from '../repositories/VideoRepository'
import { PlaylistRepository } from '../repositories/PlaylistRepository'
import { supabase } from '../lib/supabaseClient';

/**
 * Service de gestion des salles
 */

export const RoomService = {
  listMy: () => RoomRepository.listMy(),

  async get(roomId) {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('room_id, name, owner_id, current_video_id, is_playing, password, archived_at, parental_pin_enabled')
        .eq('room_id', roomId)
        .single();

      if (error) throw error;

      if (!data) {
        throw new Error('Room not found');
      }

      return {
        id: data.room_id,
        name: data.name,
        ownerId: data.owner_id,
        current_video_id: data.current_video_id,
        is_playing: data.is_playing,
        hasPassword: !!data.password,
        // Do not expose password/hash to the client
        password: null,
        parental_pin_enabled: data.parental_pin_enabled ?? false,
        archivedAt: data.archived_at,
      };
    } catch (error) {
      console.error('RoomService.get error:', error);
      throw error;
    }
  },

  // ... (le reste du fichier ne change pas)
  listPublic: (query = '') => RoomRepository.listPublic(query),
  updatePosition: (roomId, position) => RoomRepository.updatePosition(roomId, position),
  archive: (id) => RoomRepository.archive(id),
  unarchive: (id) => RoomRepository.unarchive(id),
  listArchived: () => RoomRepository.listArchived(),
  addVideoHistory: (args) => RoomRepository.addVideoHistory(args),
  setRoomPin: (roomId, pin) => RoomRepository.setRoomPin(roomId, pin),
  verifyRoomPin: (roomId, pin) => RoomRepository.verifyRoomPin(roomId, pin),
  disableRoomPin: (roomId) => RoomRepository.disableRoomPin(roomId),
  setPrivate: (roomId, isPrivate) => RoomRepository.setPrivate(roomId, isPrivate),
  pushVideo: (roomId, videoId) => RoomRepository.pushVideo(roomId, videoId),

  //
  async listRegies() {

    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("is_regie", true)
      .is("archived_at", null)

    if (error) {
      console.error("RoomService.listRegies error:", error)
      throw error
    }

    return data.map(r => ({
      id: r.room_id,
      name: r.name,
      ownerId: r.owner_id
    }))
  },

  // ... (Assurez-vous de garder le reste de vos fonctions comme create, join, etc.)
  //
  async create({ name, password, is_regie}) {
    const room = await RoomRepository.create({ name, password, is_regie});
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

  //
  async isManager(roomId) {

    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user

    if (!user) return false

    const { data } = await supabase
      .from("roles")
      .select("is_manager")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single()

    return data?.is_manager === true
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
    // Use PlaylistRepository to respect schema (video_ids array, no position column)
    return PlaylistRepository.getByRoom(roomId);
  },

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

  async getVideoHistoryForRoom(roomId) {
    try {
      return await RoomRepository.getVideoHistoryForRoom(roomId)
    } catch (e) {
      console.error('RoomService.getVideoHistoryForRoom error:', e)
      return []
    }
  },

  async transferOwnership(roomId, newOwnerId) {
    const updated = await RoomRepository.transferOwnership(roomId, newOwnerId);
    try {
      // Ensure the new owner has a role entry (manager privileges at minimum)
      await RoleRepository.addMember({
        roomId,
        userId: newOwnerId,
        isManager: true,
      });
    } catch (e) {
      console.warn('[RoomService.transferOwnership] addMember failed:', e);
    }
    return updated;
  },
};