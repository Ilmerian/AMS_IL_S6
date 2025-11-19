// src/repositories/RoleRepository.js

import { supabase } from '../lib/supabaseClient';
import { Role } from '../models/Role';

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
      const currentUserId = (await supabase.auth.getUser()).data?.user?.id;
      const numRoomId = Number(roomId);
      
      // 1. Charger les rôles et les profils utilisateur
      const { data: roleRows, error: roleError } = await supabase
          .from('roles')
          .select(`
              user_id,
              is_manager,
              users (username, email)
          `)
          .eq('room_id', numRoomId);
      if (roleError) throw roleError;

      // 2. Charger le propriétaire de la salle
      const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('owner_id')
          .eq('room_id', numRoomId)
          .maybeSingle();
      if (roomError) throw roomError;
      
      const ownerId = roomData?.owner_id;
      const membersMap = new Map();

      // 3. Mapper les rôles/membres existants
      (roleRows || []).forEach(row => {
          const userId = row.user_id;
          const userProfile = row.users;
          const isOwner = userId === ownerId;

          membersMap.set(userId, {
              userId: userId,
              name: userProfile?.username || userProfile?.email || userId.slice(0, 8),
              is_manager: row.is_manager,
              isOwner: isOwner,
          });
      });

      // 4. Assurer que l'Owner est inclus
      if (ownerId && !membersMap.has(ownerId)) {
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
      }
      
      // 5. Assurer que l'utilisateur ACTUEL est inclus s'il n'est pas déjà là.
      if (currentUserId && !membersMap.has(currentUserId)) {
           const { data: currentUserProfile, error: currentUserError } = await supabase
              .from('users')
              .select('username, email')
              .eq('user_id', currentUserId)
              .single();

          if (!currentUserError && currentUserProfile) {
               membersMap.set(currentUserId, {
                  userId: currentUserId,
                  name: currentUserProfile.username || currentUserProfile.email || currentUserId.slice(0, 8),
                  is_manager: false, 
                  isOwner: false,
               });
          }
      }


      return Array.from(membersMap.values());
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