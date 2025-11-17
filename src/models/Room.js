// src/models/Room.js
export class Room {
  constructor({
    id,
    name,
    password,
    videoHistory,
    ownerId,
    isPrivate,
    position,
    createdAt,
    archivedAt
  } = {}) {
    this.id = id;
    this.name = name;
    this.password = password || null;
    this.videoHistory = Array.isArray(videoHistory) ? videoHistory : [];
    this.ownerId = ownerId;
    this.isPrivate = isPrivate ?? false;
    this.position = position ?? 0;
    this.createdAt = createdAt || null;
    this.archivedAt = archivedAt || null;
  }

  static fromRow(r) {
    if (!r) return null;
    return new Room({
      id: r.room_id,
      name: r.name,
      password: r.password,
      videoHistory: r.video_history,
      ownerId: r.owner_id,
      isPrivate: r.is_private,
      position: r.position,
      createdAt: r.created_at,
      archivedAt: r.archived_at
    });
  }
}
