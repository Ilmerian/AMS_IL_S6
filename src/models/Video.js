// src/models/Video.js
export class Video {
  constructor({ id, url, title } = {}) {
    this.id = id;
    this.url = url;
    this.title = title;
  }
  static fromRow(r) {
    if (!r) return null;
    return new Video({
      id: r.id,
      url: r.url,
      title: r.title,
    });
  }
}
