import { RoleService } from './RoleService'
import { RoomService } from './RoomService'
import { supabase } from '../lib/supabaseClient'

export const AccessService = {
  async isOwner(roomId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const room = await RoomService.get(roomId)
    return room?.ownerId === user.id
  },

  async isManager(roomId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const roles = await RoleService.listForRoom(roomId)
    return !!roles.find(r => r.userId === user.id && r.isManager)
  },

  async isMember(roomId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const roles = await RoleService.listForRoom(roomId)
    if (await AccessService.isOwner(roomId)) return true
    return !!roles.find(r => r.userId === user.id)
  },
}
