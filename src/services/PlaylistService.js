// src/services/PlaylistService.js
import { PlaylistRepository } from '../repositories/PlaylistRepository';
import { VideoRepository } from '../repositories/VideoRepository';

/**
 * Service de gestion des playlists
 */

export const PlaylistService = {
  listByRoom: (roomId) => PlaylistRepository.getByRoom(roomId),

  create: ({ roomId, name }) =>
    PlaylistRepository.create({ roomId, name }),

  async addVideoByUrl({ playlistId, url, title }) {
    const video = await VideoRepository.getOrCreate({
      url,
      title: title ?? '',
    });
    return PlaylistRepository.pushVideo({
      playlistId,
      videoId: video.id,
    });
  },

  async removeVideo({ playlistId, videoId }) {
    return PlaylistRepository.removeVideo({ playlistId, videoId });
  },

  async loadItems(playlistId) {
    const pl = await PlaylistRepository.getById(playlistId);
    const ids = pl?.videoIds || [];
    if (ids.length === 0) {
      return { playlist: pl, videos: [] };
    }
    const videos = await VideoRepository.listByIds(ids);
    return { playlist: pl, videos };
  },

  async reorderVideos({ playlistId, videoIds }) {
    return PlaylistRepository.updateOrder({
      playlistId,
      videoIds
    });
  },
};
