// src/models/ChatMessage.js

/**
 * Modèle représentant un message de chat
 */

export class ChatMessage {
  constructor({ id, userId, roomId, createdAt, content, username } = {}) {
    this.id = id;
    this.userId = userId;
    this.roomId = roomId;
    this.createdAt = createdAt ? new Date(createdAt) : null;
    this.content = content;
    this.username = username || null; // Nouveau champ
  }
  static fromRow(r) {
    if (!r) return null;
    return new ChatMessage({
      id: r.id,
      userId: r.user_id,
      roomId: r.room_id,
      createdAt: r.created_at,
      content: r.content,
      // Récupération du username depuis la jointure (si disponible)
      username: r.users?.username || null,
    });
  }
}
