// src/repositories/PlaybackRepository.js
import { supabase } from '../lib/supabaseClient';

/**
 * Gestion de l'état de lecture vidéo d'une salle
 */

function handleRLSError(error) {
  if (error.code === '42501') {
    console.warn('RLS policy violation:', error.message);
    return null;
  }
  throw error;
}

export const PlaybackRepository = {
  async getCurrentPlayback(roomId) {
    const { data, error } = await supabase
      .from('room_playback')
      .select('*')
      .eq('room_id', roomId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async setCurrentPlayback(roomId, playlistId, videoId) {
    try {
      const { data, error } = await supabase
        .from('room_playback')
        .upsert({
          room_id: roomId,
          playlist_id: playlistId,
          video_id: videoId,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) return handleRLSError(error);
      return data;
    } catch (error) {
      return handleRLSError(error);
    }
  },

  async clearCurrentPlayback(roomId) {
    const { error } = await supabase
      .from('room_playback')
      .delete()
      .eq('room_id', roomId);

    if (error) throw error;
    return true;
  },

  onPlaybackChange(roomId, callback) {
    const channel = supabase
      .channel(`room:${roomId}:playback`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_playback',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => callback(payload)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }
};