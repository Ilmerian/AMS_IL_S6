export class Room {
  constructor({ id, name, password, videoHistory, ownerId } = {}) {
    this.id = id;
    this.name = name;
    this.password = password || null;
    this.videoHistory = Array.isArray(videoHistory) ? videoHistory : null;
    this.ownerId = ownerId;
  }
  static fromRow(r) {
    if (!r) return null;
    return new Room({
      id: r.room_id,
      name: r.name,
      password: r.password,
      videoHistory: r.video_history,
      ownerId: r.owner_id,
    });
  }
}
