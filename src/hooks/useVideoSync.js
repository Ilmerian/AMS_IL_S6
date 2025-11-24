// src/hooks/useVideoSync.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { RoomService } from '../services/RoomService';
import { getYouTubeId } from '../utils/youtube';

export function useVideoSync({ roomId, user }) {
  const safeUser = user || { id: null };
  
  const [syncVideoId, setSyncVideoId] = useState(null);
  const [syncIsPlaying, setSyncIsPlaying] = useState(false);
  const [seekTimestamp, setSeekTimestamp] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const stateRef = useRef({ 
    videoId: null, 
    isPlaying: false
  });
  
  const localProgressRef = useRef(0);
  const syncIntervalRef = useRef(null);
  const isProduction = typeof window !== 'undefined' && 
    window.location.hostname !== 'localhost' && 
    window.location.hostname !== '127.0.0.1';

  // =========================================================================
  // 1. DATABASE SYNC
  // =========================================================================
  useEffect(() => {
    if (!roomId) return;

    console.log(`[DB SYNC] Setting up for room: ${roomId}, user: ${safeUser.id}`);

    const channel = supabase
      .channel(`room_sync_db:${roomId}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'rooms', 
          filter: `room_id=eq.${roomId}` 
        },
        (payload) => {
          const newData = payload.new;
          const now = Date.now();

          if (now - lastUpdate < 1000) return;

          console.log(`[DB SYNC] Room updated by user ${safeUser.id}:`, newData);

          if (newData.last_updated_by === safeUser.id) {
            console.log(`[DB SYNC] Ignoring self-update from user ${safeUser.id}`);
            return;
          }

          if (newData.current_video_id !== stateRef.current.videoId) {
            console.log(`[DB SYNC] Video changed to: ${newData.current_video_id}`);
            setSyncVideoId(newData.current_video_id);
            stateRef.current.videoId = newData.current_video_id;
            localProgressRef.current = 0;
            setSeekTimestamp(0);
          }

          if (newData.is_playing !== stateRef.current.isPlaying) {
            console.log(`[DB SYNC] Playback state: ${newData.is_playing ? 'PLAY' : 'PAUSE'}`);
            setSyncIsPlaying(newData.is_playing);
            stateRef.current.isPlaying = newData.is_playing;
          }

          setLastUpdate(now);
        }
      )
      .subscribe((status) => {
        console.log(`[DB SYNC] Status: ${status} for room ${roomId}, user ${safeUser.id}`);
      });

    return () => {
      console.log(`[DB SYNC] Cleaning up for room: ${roomId}, user: ${safeUser.id}`);
      supabase.removeChannel(channel);
    };
  }, [roomId, lastUpdate, safeUser.id]);

  // =========================================================================
  // 2. POLLING SYNC
  // =========================================================================
  useEffect(() => {
    if (!roomId) return;

    const syncRoomState = async () => {
      try {
        const room = await RoomService.get(roomId);
        if (room) {
          const now = Date.now();
          
          if (room.current_video_id !== stateRef.current.videoId) {
            console.log(`[POLLING SYNC] Video changed to: ${room.current_video_id} for user ${safeUser.id}`);
            setSyncVideoId(room.current_video_id);
            stateRef.current.videoId = room.current_video_id;
            localProgressRef.current = 0;
            setSeekTimestamp(0);
          }
          
          if (room.is_playing !== stateRef.current.isPlaying) {
            console.log(`[POLLING SYNC] Playback state: ${room.is_playing ? 'PLAY' : 'PAUSE'} for user ${safeUser.id}`);
            setSyncIsPlaying(room.is_playing);
            stateRef.current.isPlaying = room.is_playing;
          }
          
          setLastUpdate(now);
        }
      } catch (error) {
        console.warn(`[POLLING SYNC] Failed to sync room state for user ${safeUser.id}:`, error);
      }
    };

    const interval = isProduction ? 2000 : 5000;
    
    syncRoomState();
    syncIntervalRef.current = setInterval(syncRoomState, interval);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [roomId, isProduction, safeUser.id]);

  // =========================================================================
  // 3. PUBLIC METHODS
  // =========================================================================

  const triggerPlay = useCallback(async (timestamp = null) => {
    console.log(`👆 User ${safeUser.id} Triggered: PLAY`);

    const targetTimestamp = timestamp !== null ? timestamp : localProgressRef.current;
    
    setSyncIsPlaying(true);
    stateRef.current.isPlaying = true;
    
    if (timestamp !== null) {
      setSeekTimestamp(timestamp);
      localProgressRef.current = timestamp;
    }

    try {
      await RoomService.updatePlaybackState(roomId, { 
        isPlaying: true,
        ...(syncVideoId && { currentVideoId: syncVideoId }),
        last_updated_by: safeUser.id,
        last_playback_position: targetTimestamp
      });
      setLastUpdate(Date.now());
      console.log(`[DB UPDATE] Playback state updated to PLAY at position ${targetTimestamp} by user ${safeUser.id}`);
    } catch (e) {
      console.error(`[DB UPDATE] Failed for user ${safeUser.id}:`, e);
    }
  }, [roomId, syncVideoId, safeUser.id]);

  const triggerPause = useCallback(async () => {
    console.log(`👆 User ${safeUser.id} Triggered: PAUSE`);
    
    setSyncIsPlaying(false);
    stateRef.current.isPlaying = false;

    try {
      await RoomService.updatePlaybackState(roomId, { 
        isPlaying: false,
        last_updated_by: safeUser.id,
        last_playback_position: localProgressRef.current
      });
      setLastUpdate(Date.now());
      console.log(`[DB UPDATE] Playback state updated to PAUSE by user ${safeUser.id}`);
    } catch (e) {
      console.error(`[DB UPDATE] Failed for user ${safeUser.id}:`, e);
    }
  }, [roomId, safeUser.id]);

  const triggerSeek = useCallback((seconds) => {
    console.log(`👆 User ${safeUser.id} Triggered: SEEK to ${seconds}`);
    
    setSeekTimestamp(seconds);
    localProgressRef.current = seconds;

    const debouncedSeekUpdate = () => {
      RoomService.updatePlaybackState(roomId, {
        last_playback_position: seconds,
        last_updated_by: safeUser.id
      }).catch(e => console.warn('Seek position update failed:', e));
    };
    
    clearTimeout(window.seekTimeout);
    window.seekTimeout = setTimeout(debouncedSeekUpdate, 2000);
  }, [roomId, safeUser.id]);

  const changeVideo = useCallback(async (urlOrId) => {
    const cleanId = getYouTubeId(urlOrId) || urlOrId;
    if (!cleanId) return;
    
    console.log(`👆 User ${safeUser.id} Changing video to: ${cleanId}`);
    
    setSyncVideoId(cleanId);
    stateRef.current.videoId = cleanId;
    localProgressRef.current = 0;
    setSeekTimestamp(0);
    setSyncIsPlaying(true);
    stateRef.current.isPlaying = true;

    try {
      await RoomService.updatePlaybackState(roomId, { 
        currentVideoId: cleanId, 
        isPlaying: true,
        last_updated_by: safeUser.id,
        last_playback_position: 0
      });
      setLastUpdate(Date.now());
      console.log(`[DB UPDATE] Video changed to: ${cleanId} by user ${safeUser.id}`);
    } catch (e) {
      console.error(`[DB UPDATE] Failed for user ${safeUser.id}:`, e);
    }
  }, [roomId, safeUser.id]);

  const updateLocalProgress = useCallback((seconds) => {
    localProgressRef.current = seconds;
  }, []);

  return {
    syncVideoId,
    syncIsPlaying,
    seekTimestamp,
    triggerPlay,
    triggerPause,
    triggerSeek,
    changeVideo,
    updateLocalProgress,
    currentUser: safeUser
  };
}