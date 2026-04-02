// src/services/RoomService.js
import { RoomRepository } from '../repositories/RoomRepository';
import { RoleRepository } from '../repositories/RoleRepository';
import { VideoRepository } from '../repositories/VideoRepository';
import { PlaylistRepository } from '../repositories/PlaylistRepository';
import { supabase } from '../lib/supabaseClient';

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
      if (!data) throw new Error('Room not found');

      return {
        id: data.room_id,
        name: data.name,
        ownerId: data.owner_id,
        current_video_id: data.current_video_id,
        is_playing: data.is_playing,
        hasPassword: !!data.password,
        password: null,
        parental_pin_enabled: data.parental_pin_enabled ?? false,
        archivedAt: data.archived_at,
      };
    } catch (error) {
      console.error('RoomService.get error:', error);
      throw error;
    }
  },

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

  async listRegies() {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("is_regie", true)
      .is("archived_at", null)

    if (error) throw error

    return data.map(r => ({
      id: r.room_id,
      name: r.name,
      ownerId: r.owner_id
    }))
  },

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

  // --- CORRECTION 1 : L'Owner est TOUJOURS considéré comme Manager ---
  async isManager(roomId) {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user
    if (!user) return false

    // 1. On vérifie en priorité si l'utilisateur est le propriétaire
    const { data: roomData } = await supabase
      .from("rooms")
      .select("owner_id")
      .eq("room_id", roomId)
      .single()

    if (roomData?.owner_id === user.id) return true;

    // 2. Sinon, on vérifie dans la table des rôles
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
  addMember: (roomId, userId, isManager = false) => RoleRepository.addMember({ roomId, userId, isManager }),
  removeMember: (roomId, userId) => RoleRepository.removeMember({ roomId, userId }),

  async join(roomId, password) {
    const { data, error } = await supabase.rpc('join_room', { p_room_id: Number(roomId), p_password: password || '' });
    if (error) throw error;
    return !!data;
  },

  async getPlaylist(roomId) {
    return PlaylistRepository.getByRoom(roomId);
  },

  async updatePlaybackState(roomId, { isPlaying, currentVideoId }) {
    const updates = {};
    if (isPlaying !== undefined) updates.is_playing = isPlaying;
    if (currentVideoId !== undefined) updates.current_video_id = currentVideoId;

    if (Object.keys(updates).length === 0) return;
    const { error } = await supabase.from('rooms').update(updates).eq('room_id', roomId);
    if (error) throw error;
    return true;
  },

  async getVideoHistoryForRoom(roomId) {
    try {
      return await RoomRepository.getVideoHistoryForRoom(roomId)
    } catch (e) {
      return []
    }
  },

  async transferOwnership(roomId, newOwnerId) {
    const { data: userData } = await supabase.auth.getUser();
    const oldOwnerId = userData?.user?.id;

    try {
      const { data: existingRole } = await supabase
        .from('roles')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', newOwnerId)
        .maybeSingle();

      if (existingRole) {
        await supabase.from('roles').update({ is_manager: true }).eq('id', existingRole.id);
      } else {
        await RoleRepository.addMember({ roomId, userId: newOwnerId, isManager: true });
      }

      if (oldOwnerId && oldOwnerId !== newOwnerId) {
        await supabase
          .from('roles')
          .update({ is_manager: false })
          .eq('room_id', roomId)
          .eq('user_id', oldOwnerId);
      }
    } catch (e) {
      console.error('[RoomService.transferOwnership] Erreur modification rôles:', e);
    }

    const updated = await RoomRepository.transferOwnership(roomId, newOwnerId);

    return updated;
  },
};