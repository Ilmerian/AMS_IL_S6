// src/repositories/PlaylistRepository.js
import { supabase } from '../lib/supabaseClient';
import { Playlist } from '../models/Playlist';

/**
 * Gestion des playlists des salles
 */

function normalizeVideoIds(rawIds) {
  const uniq = [];
  const seen = new Set();
  for (const x of rawIds || []) {
    const n = Number(x);
    if (!Number.isFinite(n)) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    uniq.push(n);
  }
  return uniq;
}

export const PlaylistRepository = {
  async getByRoom(roomId) {
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('room_id', roomId)
      .order('playlist_id', { ascending: true });
    if (error) throw error;
    return (data || []).map((row) => {
      const pl = Playlist.fromRow(row);
      pl.videoIds = normalizeVideoIds(pl.videoIds);
      return pl;
    });
  },

  async getById(playlistId) {
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('playlist_id', playlistId)
      .single();
    if (error) throw error;
    const pl = Playlist.fromRow(data);
    pl.videoIds = normalizeVideoIds(pl.videoIds);
    return pl;
  },

  async create({ roomId, name }) {
    const { data, error } = await supabase
      .from('playlists')
      .insert({ room_id: roomId, name })
      .select()
      .single();
    if (error) throw error;
    return Playlist.fromRow(data);
  },

  async pushVideo({ playlistId, videoId }) {
    const { data, error } = await supabase
      .rpc('add_video_unique', {
        p_playlist_id: playlistId,
        p_video_id: Number(videoId),
      });
    if (error) throw error;

    if (!data) {
      const { data: row, error: e2 } = await supabase
        .from('playlists')
        .select('*')
        .eq('playlist_id', playlistId)
        .single();
      if (e2) throw e2;
      const pl = Playlist.fromRow(row);
      pl.videoIds = normalizeVideoIds(pl.videoIds);
      return pl;
    }

    const pl = Playlist.fromRow(data);
    pl.videoIds = normalizeVideoIds(pl.videoIds);
    return pl;
  },

  async pullVideo({ playlistId, videoId }) {
    const { data, error } = await supabase
      .rpc('remove_video', {
        p_playlist_id: playlistId,
        p_video_id: Number(videoId),
      });
    if (error) throw error;
    const pl = Playlist.fromRow(data);
    pl.videoIds = normalizeVideoIds(pl.videoIds);
    return pl;
  },

  async removeVideo({ playlistId, videoId }) {
    const { data: cur, error: e1 } = await supabase
      .from('playlists')
      .select('video_ids')
      .eq('playlist_id', playlistId)
      .single();
    if (e1) throw e1;

    const target = Number(videoId);
    const next = (cur?.video_ids || []).filter((id) => Number(id) !== target);

    const { data: upd, error: e2 } = await supabase
      .from('playlists')
      .update({ video_ids: next })
      .eq('playlist_id', playlistId)
      .select()
      .single();
    if (e2) throw e2;

    const pl = Playlist.fromRow(upd);
    pl.videoIds = normalizeVideoIds(pl.videoIds);
    return pl;
  },

  async updateOrder({ playlistId, videoIds }) {
    const normalizedIds = normalizeVideoIds(videoIds);

    const { data, error } = await supabase
      .from('playlists')
      .update({ video_ids: normalizedIds })
      .eq('playlist_id', playlistId)
      .select()
      .single();

    if (error) throw error;

    const pl = Playlist.fromRow(data);
    pl.videoIds = normalizeVideoIds(pl.videoIds);
    return pl;
  },
};
