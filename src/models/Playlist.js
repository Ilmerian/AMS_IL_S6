// src/models/Playlist.js
export class Playlist {
  constructor({ id, name, roomId, videoIds } = {}) {
    this.id = id;
    this.name = name;
    this.roomId = roomId;
    this.videoIds = Array.isArray(videoIds) ? videoIds : [];
  }
  static fromRow(r) {
    if (!r) return null;
    return new Playlist({
      id: r.playlist_id,
      name: r.name,
      roomId: r.room_id,
      videoIds: r.video_ids || [],
    });
  }
}
