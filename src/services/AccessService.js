// src/services/AccessService.js
import { RoleService } from './RoleService'
import { RoomService } from './RoomService'
import { supabase } from '../lib/supabaseClient'

/**
 * Vérification des droits d'accès aux salles
 */

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data?.user?.id ?? null
}

export const AccessService = {
  async isOwner(roomId) {
    const userId = await getCurrentUserId()
    if (!userId) return false
    const room = await RoomService.get(roomId)
    return room?.ownerId === userId
  },

  async isManager(roomId) {
    const userId = await getCurrentUserId()
    if (!userId) return false
    const roles = await RoleService.listForRoom(roomId)
    return !!roles.find((r) => r.userId === userId && r.isManager)
  },

  async isMember(roomId) {
    const userId = await getCurrentUserId()
    if (!userId) return false

    const roles = await RoleService.listForRoom(roomId)
    if (roles.find((r) => r.userId === userId)) {
      return true
    }

    try {
      const room = await RoomService.get(roomId)
      if (room?.ownerId === userId) return true
    } catch (e) {
      console.warn('[AccessService.isMember] RoomService.get failed:', e?.message || e)
    }

    return false
  },
}
