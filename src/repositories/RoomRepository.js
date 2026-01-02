// src/repositories/RoomRepository.js
import { supabase } from '../lib/supabaseClient';
import { Room } from '../models/Room';

/**
 * Accès et gestion des salles
 */

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
      .is('archived_at', null)
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
        .is('archived_at', null)
        .order('room_id', { ascending: false });
      if (e2) throw e2;
      member = memberRooms || [];
    }

    const byId = new Map();
    [...(own || []), ...member].forEach(r => byId.set(r.room_id, r));

    return Array.from(byId.values()).map(Room.fromRow);
  },

  async listPublic() {
    console.log('[RoomRepository] Loading public rooms...');

    const { data, error } = await supabase
      .from('rooms')
      .select('room_id, name, owner_id, password, is_private')
      .eq('is_private', false)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[RoomRepository] Error loading rooms:', error);
      throw error;
    }

    console.log('[RoomRepository] Found rooms:', data?.length || 0);
    const roomsData = data || [];

    const ownerIds = [...new Set(roomsData.map(r => r.owner_id).filter(Boolean))];
    console.log('[RoomRepository] Owner IDs to load:', ownerIds);

    let ownerProfiles = {};

    if (ownerIds.length > 0) {
      try {
        console.log('[RoomRepository] Starting profiles query...');

        const { data: profiles, error: profileError } = await supabase
          .rpc('get_users_by_ids', { user_ids: ownerIds });

        console.log('[RoomRepository] Profiles query completed:', {
          success: !profileError,
          error: profileError,
          profilesCount: profiles?.length || 0
        });

        if (profileError) {
          console.error('[RoomRepository] RPC error:', profileError);

          console.log('[RoomRepository] Trying fallback: loading profiles one by one');
          const fallbackProfiles = await this.loadProfilesOneByOne(ownerIds);
          ownerProfiles = fallbackProfiles;
        } else {
          console.log('[RoomRepository] Loaded profiles via RPC:', profiles);

          if (profiles) {
            profiles.forEach(p => {
              ownerProfiles[p.user_id] = {
                username: p.username,
                avatar_url: p.avatar_url
              };
            });
          }

          console.log('[RoomRepository] Owner profiles map:', ownerProfiles);
        }
      } catch (e) {
        console.warn('[RoomRepository] Failed to load owner profiles:', e);
      }
    } else {
      console.log('[RoomRepository] No owner IDs to load');
    }

    const result = roomsData.map(r => {
      const ownerInfo = ownerProfiles[r.owner_id];
      console.log(`[RoomRepository] Processing room ${r.room_id}, owner ${r.owner_id}:`, ownerInfo);

      const roomObj = new Room({
        id: r.room_id,
        name: r.name,
        ownerId: r.owner_id,
        ownerName: ownerInfo?.username || r.owner_id?.slice(0, 8) || "Creator unknown",
        ownerAvatar: ownerInfo?.avatar_url || null,
        hasPassword: !!r.password,
        password: null,
        videoHistory: [],
        isPrivate: r.is_private || false
      });

      return roomObj;
    });

    console.log('[RoomRepository] Returning rooms:', result.length);
    console.log('[RoomRepository] Sample room:', result[0]);
    return result;
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

    const cleanName = (name || '').trim();
    if (!cleanName) {
      const err = new Error('ROOM_NAME_REQUIRED');
      err.code = 'ROOM_NAME_REQUIRED';
      throw err;
    }

    const { data: existing, error: checkError } = await supabase
      .from('rooms')
      .select('room_id')
      .eq('name', cleanName)
      .is('archived_at', null)
      .limit(1);

    if (checkError) throw checkError;

    if ((existing || []).length > 0) {
      const err = new Error('ROOM_NAME_EXISTS');
      err.code = 'ROOM_NAME_EXISTS';
      throw err;
    }

    const payload = {
      name: cleanName,
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
      .from('video_history')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async addVideoHistory({ roomId, youtubeId, videoUrl, videoTitle, userId }) {
    const payload = {
      room_id: roomId,
      video_youtube_id: youtubeId,
      video_url: videoUrl || null,
      video_title: videoTitle || null,
      ...(userId ? { user_id: userId } : {}),
    }

    const { error } = await supabase
      .from('video_history')
      .insert(payload)

    if (error) throw error
    return true
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
  },

  async loadProfilesOneByOne(ownerIds) {
    const profilesMap = {};

    const limitedIds = ownerIds.slice(0, 5);

    for (const ownerId of limitedIds) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('user_id, username, avatar_url')
          .eq('user_id', ownerId)
          .maybeSingle();

        if (!error && data) {
          profilesMap[data.user_id] = {
            username: data.username,
            avatar_url: data.avatar_url
          };
        }
      } catch (e) {
        console.warn(`[RoomRepository] Failed to load profile for ${ownerId}:`, e);
      }
    }

    return profilesMap;
  },
  async unarchive(id) {
    const { error } = await supabase
      .from('rooms')
      .update({ archived_at: null })
      .eq('room_id', id)

    if (error) throw error
    return true
  },
  async listArchived() {
    const { data, error } = await supabase
      .from('rooms')
      .select('room_id, name, owner_id, password, is_private, archived_at, users!fk_rooms_owner(username, avatar_url)')
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false })

    if (error) throw error

    return (data || []).map(r => ({
      id: r.room_id,
      name: r.name,
      ownerId: r.owner_id,
      ownerName: r.users?.username,
      ownerAvatar: r.users?.avatar_url,
      hasPassword: !!r.password,
      isPrivate: !!r.is_private,
      archivedAt: r.archived_at,
    }))
  },

  async setRoomPin(roomId, pin) {
    const { error } = await supabase.rpc('set_room_pin', {
      p_room_id: Number(roomId),
      p_pin: String(pin || '')
    })
    if (error) throw error
    return true
  },

  async verifyRoomPin(roomId, pin) {
    const { data, error } = await supabase.rpc('verify_room_pin', {
      p_room_id: Number(roomId),
      p_pin: String(pin || '')
    })
    if (error) throw error
    return !!data
  },

  async disableRoomPin(roomId) {
    const { error } = await supabase.rpc('disable_room_pin', {
      p_room_id: Number(roomId)
    })
    if (error) throw error
    return true
  },

  async transferOwnership(roomId, newOwnerId) {
    const { data, error } = await supabase
      .from('rooms')
      .update({ owner_id: newOwnerId })
      .eq('room_id', roomId)
      .select()
      .single();

    if (error) throw error;
    return Room.fromRow(data);
  },
};