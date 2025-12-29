// src/services/RoleService.js

import { RoleRepository } from '../repositories/RoleRepository';
import { RealtimeService } from './RealtimeService'; // Ajout de l'import

/**
 * Service de gestion des rôles des utilisateurs
 */

export const RoleService = {
  listForRoom: (roomId) => RoleRepository.listForRoom(roomId),

  // NOUVEAU: Exposer listMembers
  listMembers: (roomId) => RoleRepository.listMembers(roomId),

  add: ({ roomId, userId, isManager = false }) =>
    RoleRepository.addMember({ roomId, userId, isManager }),

  // NOUVEAU : Actions de modération
  promote: (roomId, userId) => RoleRepository.promote({ roomId, userId }),
  demote: (roomId, userId) => RoleRepository.demote({ roomId, userId }),

  // Renommé: removeMember -> remove
  remove: (roomId, userId) =>
    RoleRepository.removeMember({ roomId, userId }),

  // NOUVEAU: Abonnement aux changements de rôles
  onRoleChange: (roomId, callback) => {
    // S'abonne aux insertions, mises à jour et suppressions sur la table 'roles'
    const unsubs = [
      RealtimeService.onInsert({ table: 'roles', cb: callback }),
      RealtimeService.onUpdate({ table: 'roles', cb: callback }),
      RealtimeService.onDelete({ table: 'roles', cb: callback }),
    ];
    return () => unsubs.forEach((off) => off?.());
  },
};