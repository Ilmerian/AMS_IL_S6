// src/repositories/RoleRepository.js

import { supabase } from '../lib/supabaseClient';
import { Role } from '../models/Role';
import { cacheService } from '../services/CacheService';

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
    
    try {
      const cached = cacheService.getMemory(cacheKey);
      if (cached && Date.now() - cached.timestamp < 15000) {
        return cached.data;
      }

      const currentUserId = (await supabase.auth.getUser()).data?.user?.id;
      const numRoomId = Number(roomId);
      
      const [roleResult, roomResult] = await Promise.all([
        supabase
          .from('roles')
          .select(`user_id, is_manager, users (username, email)`)
          .eq('room_id', numRoomId),
        supabase
          .from('rooms')
          .select('owner_id')
          .eq('room_id', numRoomId)
          .maybeSingle()
      ]);

      if (roleResult.error) throw roleResult.error;
      if (roomResult.error) throw roomResult.error;

      const ownerId = roomResult.data?.owner_id;
      const roleRows = roleResult.data || [];

      roleRows.forEach(row => {
        if (ownerId && row.user_id === ownerId) {
          row.__isOwner = true;
          row.is_manager = true;
        }
      });

      const membersMap = new Map();

      roleRows.forEach(row => {
        const userId = row.user_id;
        const userProfile = row.users;
        const isOwner = (ownerId && userId === ownerId) || row.__isOwner;

        membersMap.set(userId, {
          userId: userId,
          name: userProfile?.username || userProfile?.email || userId.slice(0, 8),
          is_manager: row.is_manager,
          isOwner: isOwner,
        });
      });

      if (ownerId && !membersMap.has(ownerId)) {
        try {
          const { data: ownerProfile, error: ownerError } = await supabase
            .from('users')
            .select('username, email')
            .eq('user_id', ownerId)
            .single();

          if (!ownerError && ownerProfile) {
            membersMap.set(ownerId, {
              userId: ownerId,
              name: ownerProfile.username || ownerProfile.email || ownerId.slice(0, 8),
              is_manager: true,
              isOwner: true,
            });
          }
        } catch (ownerError) {
          console.warn('Failed to fetch owner profile:', ownerError);
        }
      }

      if (currentUserId && !membersMap.has(currentUserId)) {
        try {
          const { data: currentUserProfile, error: currentUserError } = await supabase
            .from('users')
            .select('username, email')
            .eq('user_id', currentUserId)
            .single();

          if (!currentUserError && currentUserProfile) {
            const isCurrentUserOwner = ownerId && currentUserId === ownerId;
            membersMap.set(currentUserId, {
              userId: currentUserId,
              name: currentUserProfile.username || currentUserProfile.email || currentUserId.slice(0, 8),
              is_manager: isCurrentUserOwner,
              isOwner: isCurrentUserOwner,
            });
          }
        } catch (currentUserError) {
          console.warn('Failed to fetch current user profile:', currentUserError);
        }
      }

      const result = Array.from(membersMap.values());

      cacheService.setMemory(cacheKey, {
        timestamp: Date.now(),
        data: result
      }, 15000);

      return result;
    } catch (e) {
      console.error('listMembers failed:', e);
      return [];
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