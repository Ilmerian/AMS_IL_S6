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
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  const stateRef = useRef({ 
    videoId: null, 
    isPlaying: false,
    lastDbUpdate: 0
  });
  
  const localProgressRef = useRef(0);
  const syncIntervalRef = useRef(null);
  const dbSyncRef = useRef(null);
  const isProduction = typeof window !== 'undefined' && 
    window.location.hostname !== 'localhost' && 
    window.location.hostname !== '127.0.0.1';

  // =========================================================================
  // 1. DATABASE SYNC (WebSocket)
  // =========================================================================
  useEffect(() => {
    if (!roomId || isProduction) {
      console.log(`[DB SYNC] Skipped in production`);
      return;
    }

    console.log(`[DB SYNC] Setting up WebSocket for room: ${roomId}`);

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

          if (now - stateRef.current.lastDbUpdate < 500) return;

          console.log(`[DB SYNC] Room updated via WebSocket:`, newData);

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

          stateRef.current.lastDbUpdate = now;
          setLastUpdate(now);
          setConnectionStatus('connected');
        }
      )
      .subscribe((status) => {
        console.log(`[DB SYNC] WebSocket status: ${status}`);
        setConnectionStatus(status === 'SUBSCRIBED' ? 'connected' : 'disconnected');
        
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.warn(`[DB SYNC] WebSocket failed, falling back to polling`);
        }
      });

    dbSyncRef.current = channel;

    return () => {
      console.log(`[DB SYNC] Cleaning up WebSocket for room: ${roomId}`);
      if (dbSyncRef.current) {
        supabase.removeChannel(dbSyncRef.current);
      }
    };
  }, [roomId, isProduction]);

  // =========================================================================
  // 2. POLLING SYNC
  // =========================================================================
  useEffect(() => {
    if (!roomId) return;

    let isMounted = true;

    const syncRoomState = async () => {
      if (!isMounted) return;

      try {
        const room = await RoomService.get(roomId);
        if (room && isMounted) {
          const now = Date.now();
          
          if (room.current_video_id !== stateRef.current.videoId && room.current_video_id !== undefined) {
            console.log(`[POLLING SYNC] Video changed to: ${room.current_video_id}`);
            setSyncVideoId(room.current_video_id);
            stateRef.current.videoId = room.current_video_id;
            localProgressRef.current = 0;
            setSeekTimestamp(0);
          }
          
          if (room.is_playing !== stateRef.current.isPlaying && room.is_playing !== undefined) {
            console.log(`[POLLING SYNC] Playback state: ${room.is_playing ? 'PLAY' : 'PAUSE'}`);
            setSyncIsPlaying(room.is_playing);
            stateRef.current.isPlaying = room.is_playing;
          }
          
          stateRef.current.lastDbUpdate = now;
          setLastUpdate(now);
          setConnectionStatus('polling');
        }
      } catch (error) {
        console.warn(`[POLLING SYNC] Failed:`, error);
        if (isMounted) {
          setConnectionStatus('error');
        }
      }
    };

    const setupPolling = () => {
      const interval = isProduction ? 1500 : 3000;
      syncRoomState();
      syncIntervalRef.current = setInterval(syncRoomState, interval);
      console.log(`[POLLING SYNC] Started with ${interval}ms interval`);
    };

    setupPolling();

    return () => {
      isMounted = false;
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        console.log(`[POLLING SYNC] Cleaned up`);
      }
    };
  }, [roomId, isProduction]);

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
        ...(syncVideoId && { currentVideoId: syncVideoId })
      });
      stateRef.current.lastDbUpdate = Date.now();
      console.log(`[DB UPDATE] Playback state updated to PLAY at position ${targetTimestamp}`);
    } catch (e) {
      console.error(`[DB UPDATE] Failed:`, e);
    }
  }, [roomId, syncVideoId, safeUser.id]);

  const triggerPause = useCallback(async () => {
    console.log(`👆 User ${safeUser.id} Triggered: PAUSE`);
    
    setSyncIsPlaying(false);
    stateRef.current.isPlaying = false;

    try {
      await RoomService.updatePlaybackState(roomId, { isPlaying: false });
      stateRef.current.lastDbUpdate = Date.now();
      console.log(`[DB UPDATE] Playback state updated to PAUSE`);
    } catch (e) {
      console.error(`[DB UPDATE] Failed:`, e);
    }
  }, [roomId, safeUser.id]);

  const triggerSeek = useCallback((seconds) => {
    console.log(`👆 User ${safeUser.id} Triggered: SEEK to ${seconds}`);
    
    setSeekTimestamp(seconds);
    localProgressRef.current = seconds;
  }, [safeUser.id]);

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
        isPlaying: true
      });
      stateRef.current.lastDbUpdate = Date.now();
      console.log(`[DB UPDATE] Video changed to: ${cleanId}`);
    } catch (e) {
      console.error(`[DB UPDATE] Failed:`, e);
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
    connectionStatus,
    currentUser: safeUser
  };
}