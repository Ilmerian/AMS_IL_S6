// src/repositories/RoleRepository.js

import { supabase } from '../lib/supabaseClient';
import { Role } from '../models/Role';
import { cacheService } from '../services/CacheService';

/**
 * Gestion des rôles et des membres d'une salle
 */

export const RoleRepository = {
  async listForRoom(roomId) {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('room_id', roomId);
    if (error) throw error;
    return (data || []).map(Role.fromRow);
  },

  /**
   * NOUVEAU: Récupère la liste complète des membres avec leurs rôles et profils.
   */
  async listMembers(roomId) {
    const cacheKey = `room_members_${roomId}`;
    const CACHE_TTL = 30000;

    try {
      const cached = cacheService.getMemory(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }

      const currentUserId = (await supabase.auth.getUser()).data?.user?.id;
      const numRoomId = Number(roomId);

      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('room_id, owner_id')
        .eq('room_id', numRoomId)
        .single();

      if (roomError) throw roomError;

      const ownerId = roomData.owner_id;
      const membersMap = new Map();

      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select(`
          user_id,
          is_manager,
          users!inner(username, email, avatar_url)
        `)
        .eq('room_id', numRoomId);

      if (rolesError && rolesError.code !== 'PGRST116') {
        console.warn('Roles query error:', rolesError);
      }

      if (rolesData && Array.isArray(rolesData)) {
        rolesData.forEach(role => {
          const userId = role.user_id;
          const isOwner = userId === ownerId;
          const isCurrentUser = userId === currentUserId;

          membersMap.set(userId, {
            userId,
            name: role.users?.username || role.users?.email || userId.slice(0, 8),
            email: role.users?.email,
            avatar_url: role.users?.avatar_url,
            is_manager: role.is_manager || isOwner,
            isOwner,
            isCurrentUser
          });
        });
      }

      if (ownerId && !membersMap.has(ownerId)) {
        try {
          const { data: ownerProfile } = await supabase
            .from('users')
            .select('username, email, avatar_url')
            .eq('user_id', ownerId)
            .single();

          if (ownerProfile) {
            const isCurrentUser = ownerId === currentUserId;
            membersMap.set(ownerId, {
              userId: ownerId,
              name: ownerProfile.username || ownerProfile.email || ownerId.slice(0, 8),
              email: ownerProfile.email,
              avatar_url: ownerProfile.avatar_url,
              is_manager: true,
              isOwner: true,
              isCurrentUser
            });
          }
        } catch (err) {
          console.warn('Failed to fetch owner profile:', err);
        }
      }

      if (currentUserId && !membersMap.has(currentUserId)) {
        try {
          const { data: currentUserProfile } = await supabase
            .from('users')
            .select('username, email, avatar_url')
            .eq('user_id', currentUserId)
            .single()
            .catch(() => null);

          if (currentUserProfile) {
            const isOwner = currentUserId === ownerId;
            membersMap.set(currentUserId, {
              userId: currentUserId,
              name: currentUserProfile.username || currentUserProfile.email || currentUserId.slice(0, 8),
              email: currentUserProfile.email,
              avatar_url: currentUserProfile.avatar_url,
              is_manager: isOwner,
              isOwner,
              isCurrentUser: true
            });
          }
        } catch (err) {
          console.warn('Failed to fetch current user profile:', err);
        }
      }

      const result = Array.from(membersMap.values());

      cacheService.setMemory(cacheKey, {
        timestamp: Date.now(),
        data: result
      }, CACHE_TTL);

      return result;
    } catch (e) {
      console.error('listMembers failed:', e);
      const cached = cacheService.getMemory(cacheKey);
      return cached?.data || [];
    }
  },

  async addMember({ roomId, userId, isManager = false }) {
    const { data, error } = await supabase
      .from('roles')
      .upsert({ room_id: Number(roomId), user_id: userId, is_manager: !!isManager })
      .select()
      .single();
    if (error) throw error;
    return Role.fromRow(data);
  },

  // NOUVEAU: Promote (met is_manager à true)
  async promote({ roomId, userId }) {
    return this.addMember({ roomId, userId, isManager: true });
  },

  // NOUVEAU: Demote (met is_manager à false)
  async demote({ roomId, userId }) {
    return this.addMember({ roomId, userId, isManager: false });
  },


  async removeMember({ roomId, userId }) {
    const { error } = await supabase
      .from('roles')
      .delete()
      .match({ room_id: Number(roomId), user_id: userId });
    if (error) throw error;
    return true;
  },
};