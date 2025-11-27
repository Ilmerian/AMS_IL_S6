// src/repositories/RoomRepository.js
import { supabase } from '../lib/supabaseClient';
import { Room } from '../models/Room';

export const RoomRepository = {

  async listMy() {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    const user = data?.user;
    if (!user) return [];

    const { data: own, error: e1 } = await supabase
      .from('rooms')
      .select('*, users!fk_rooms_owner(username, avatar_url)')
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
        .select('*, users!fk_rooms_owner(username, avatar_url)')
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
    let queryBuilder = supabase
      .from('rooms')
      .select('*, users!fk_rooms_owner(username, avatar_url)')
      .eq('is_private', false)
      .order('created_at', { ascending: false });

    const { data, error } = await queryBuilder;
    if (error) throw error;
    
    const roomsData = data || [];

    return roomsData.map(r => {
      return {
          id: r.room_id,
          name: r.name,
          ownerId: r.owner_id,
          ownerName: r.users?.username || null,
          ownerAvatar: r.users?.avatar_url || null,
          hasPassword: !!r.password,
          password: null,
          videoHistory: [],
      };
    }).map(r => new Room(r)); 
  },

  async getById(roomId) {
    const { data, error } = await supabase
      .rpc('get_room_public', { p_room_id: Number(roomId) })
      .single();
    if (error) throw error;

    return {
      id: data.room_id,
      name: data.name,
      ownerId: data.owner_id,
      current_video_id: data.current_video_id,
      is_playing: data.is_playing,
      password: data.has_password ? '***' : null,
      videoHistory: [],
    };
  },

  async create({ name, password }) {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    const user = data?.user;

    const payload = {
      name,
      password: password || null,
      owner_id: user?.id || null,
    };

    const { data: row, error } = await supabase
      .from('rooms')
      .insert(payload)
      .select('*, users!fk_rooms_owner(username, avatar_url)')
      .single();
    if (error) throw error;

    return Room.fromRow(row);
  },

  async remove(roomId) {
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('room_id', roomId);
    if (error) throw error;
    return true;
  },

  async updatePosition(roomId, newPosition) {
    const { data, error } = await supabase
      .from('rooms')
      .update({ position: newPosition })
      .eq('room_id', roomId)
      .select()
      .single();

    if (error) throw error;
    return Room.fromRow(data);
  },

  async archive(roomId) {
    const { data, error } = await supabase
      .from('rooms')
      .update({ archived_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .select()
      .single();

    if (error) throw error;
    return Room.fromRow(data);
  },

  async setPrivate(roomId, isPrivate) {
    const { data, error } = await supabase
      .from('rooms')
      .update({ is_private: isPrivate })
      .eq('room_id', roomId)
      .select()
      .single();

    if (error) throw error;
    return Room.fromRow(data);
  },

  async pushVideo(roomId, videoId) {
    const { data, error } = await supabase
      .rpc('add_video_to_room', { p_room_id: roomId, p_video_id: videoId })
      .single();

    if (error) throw error;
    return Room.fromRow(data);
  },

  async getVideoHistoryForRoom(roomId) {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('room_id', roomId)
      .order('id', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getPlaylistVideos(roomId) {
    const { data: playlist, error: e1 } = await supabase
      .from("playlists")
      .select("*")
      .eq("room_id", roomId)
      .single();

    if (e1) throw e1;

    if (!playlist?.video_ids?.length) return [];

    const { data: videos, error: e2 } = await supabase
      .from("videos")
      .select("*")
      .in("id", playlist.video_ids);

    if (e2) throw e2;

    const ordered = playlist.video_ids
      .map(id => videos.find(v => v.id === id))
      .filter(Boolean);

    return ordered;
  }
};