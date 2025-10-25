import { RoleRepository } from '../repositories/RoleRepository'

export const RoleService = {
  listForRoom: (roomId) => RoleRepository.listForRoom(roomId),
  add: ({ roomId, userId, isManager = false }) =>
    RoleRepository.addMember({ roomId, userId, isManager }),
  remove: ({ roomId, userId }) => RoleRepository.removeMember({ roomId, userId }),
}
