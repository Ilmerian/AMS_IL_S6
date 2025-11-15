// src/models/Role.js
export class Role {
  constructor({ userId, roomId, isManager } = {}) {
    this.userId = userId;
    this.roomId = roomId;
    this.isManager = !!isManager;
  }
  static fromRow(r) {
    if (!r) return null;
    return new Role({
      userId: r.user_id,
      roomId: r.room_id,
      isManager: r.is_manager,
    });
  }
}
