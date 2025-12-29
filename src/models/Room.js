// src/models/Room.js

/**
 * Modèle représentant une salle
 */

export class Room {
  constructor({
    id,
    name,
    password,
    videoHistory,
    ownerId,
    ownerName,
    ownerAvatar,
    isPrivate,
    position,
    createdAt,
    archivedAt,
    hasPassword
  } = {}) {
    this.id = id;
    this.name = name;
    this.password = password || null;
    this.videoHistory = Array.isArray(videoHistory) ? videoHistory : [];
    this.ownerId = ownerId;
    this.ownerName = ownerName || null;
    this.ownerAvatar = ownerAvatar || null;
    this.isPrivate = isPrivate ?? false;
    this.position = position ?? 0;
    this.createdAt = createdAt || null;
    this.archivedAt = archivedAt || null;
    this.hasPassword = hasPassword !== undefined ? hasPassword : !!this.password;
  }

  static fromRow(r) {
    if (!r) return null;
    return new Room({
      id: r.room_id,
      name: r.name,
      password: r.password,
      videoHistory: r.video_history,
      ownerId: r.owner_id,
      ownerName: r.users?.username || r.owner_name,
      ownerAvatar: r.users?.avatar_url || r.owner_avatar,
      isPrivate: r.is_private,
      position: r.position,
      createdAt: r.created_at,
      archivedAt: r.archived_at,
      hasPassword: r.hasPassword
    });
  }
}