// src/hooks/useVideoSync.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { RoomService } from '../services/RoomService';
import { getYouTubeId } from '../utils/youtube';

export function useVideoSync({ roomId, user }) {
  const safeUser = user || { id: null };
  
  const [syncVideoId, setSyncVideoId] = useState(null);
  const [syncIsPlaying, setSyncIsPlaying] = useState(false);
  const [seekTimestamp, setSeekTimestamp] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  const stateRef = useRef({ 
    videoId: null, 
    isPlaying: false,
    lastLocalAction: 0,
    ignoreNextPoll: false
  });
  
  const localProgressRef = useRef(0);
  const syncIntervalRef = useRef(null);
  const lastHistoryVideoRef = useRef(null);

  // =========================================================================
  // 1. POLLING SYNC
  // =========================================================================
  useEffect(() => {
    if (!roomId) return;

    let isMounted = true;

    const syncRoomState = async () => {
      if (!isMounted || stateRef.current.ignoreNextPoll) {
        stateRef.current.ignoreNextPoll = false;
        return;
      }

      try {
        const room = await RoomService.get(roomId);
        if (room && isMounted) {
          const timeSinceLastAction = Date.now() - stateRef.current.lastLocalAction;
          if (timeSinceLastAction < 2000) {
            console.log(`[POLLING] Skipping - recent local action`);
            return;
          }

          if (room.current_video_id !== stateRef.current.videoId && room.current_video_id !== undefined) {
            console.log(`[POLLING] Video changed to: ${room.current_video_id}`);
            setSyncVideoId(room.current_video_id);
            stateRef.current.videoId = room.current_video_id;
            localProgressRef.current = 0;
            setSeekTimestamp(0);
          }
          
          if (room.is_playing !== stateRef.current.isPlaying && room.is_playing !== undefined) {
            console.log(`[POLLING] Playback state: ${room.is_playing ? 'PLAY' : 'PAUSE'}`);
            setSyncIsPlaying(room.is_playing);
            stateRef.current.isPlaying = room.is_playing;
          }
          
          setConnectionStatus('polling');
        }
      } catch (error) {
        console.warn(`[POLLING] Failed:`, error);
        if (isMounted) {
          setConnectionStatus('error');
        }
      }
    };

    const setupPolling = () => {
      const interval = 5000;
      
      syncRoomState();
      syncIntervalRef.current = setInterval(syncRoomState, interval);
      
      console.log(`[POLLING] Started with ${interval}ms interval`);
    };

    setupPolling();

    return () => {
      isMounted = false;
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        console.log(`[POLLING] Cleaned up`);
      }
    };
  }, [roomId]);

  // =========================================================================
  // 2. PUBLIC METHODS
  // =========================================================================

  const triggerPlay = useCallback(async (timestamp = null) => {
    console.log(`👆 User ${safeUser.id} Triggered: PLAY`);

    setSyncIsPlaying(true);
    stateRef.current.isPlaying = true;
    stateRef.current.lastLocalAction = Date.now();
    stateRef.current.ignoreNextPoll = true;
    
    if (timestamp !== null) {
      setSeekTimestamp(timestamp);
      localProgressRef.current = timestamp;
    }

    try {
      await RoomService.updatePlaybackState(roomId, { 
        isPlaying: true,
        ...(syncVideoId && { currentVideoId: syncVideoId })
      });
      console.log(`[DB UPDATE] Playback state updated to PLAY`);
    } catch (e) {
      console.error(`[DB UPDATE] Failed:`, e);
      setSyncIsPlaying(false);
      stateRef.current.isPlaying = false;
    }
  }, [roomId, syncVideoId, safeUser.id]);

  const triggerPause = useCallback(async () => {
    console.log(`👆 User ${safeUser.id} Triggered: PAUSE`);
    
    setSyncIsPlaying(false);
    stateRef.current.isPlaying = false;
    stateRef.current.lastLocalAction = Date.now();
    stateRef.current.ignoreNextPoll = true;

    try {
      await RoomService.updatePlaybackState(roomId, { isPlaying: false });
      console.log(`[DB UPDATE] Playback state updated to PAUSE`);
    } catch (e) {
      console.error(`[DB UPDATE] Failed:`, e);
      setSyncIsPlaying(true);
      stateRef.current.isPlaying = true;
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
    stateRef.current.lastLocalAction = Date.now();
    stateRef.current.ignoreNextPoll = true;

    try {
      await RoomService.updatePlaybackState(roomId, { 
        currentVideoId: cleanId, 
        isPlaying: true
      });
      console.log(`[DB UPDATE] Video changed to: ${cleanId}`);
      try {
        if (lastHistoryVideoRef.current === cleanId) {
          console.log('[video_history] skip duplicate:', cleanId)
        } else {
          lastHistoryVideoRef.current = cleanId

          console.log('[video_history] inserting:', { roomId, cleanId, userId: safeUser.id })

          await RoomService.addVideoHistory({
            roomId: Number(roomId),
            youtubeId: cleanId,
            videoUrl: `https://www.youtube.com/watch?v=${cleanId}`,
            videoTitle: null,
            userId: safeUser.id || null,
          })

          console.log('[video_history] insert OK:', cleanId)
        }
      } catch (e) {
        console.warn('[video_history] insert FAILED:', e)
      }
    } catch (e) {
      console.error(`[DB UPDATE] Failed:`, e);
      setSyncVideoId(null);
      stateRef.current.videoId = null;
      setSyncIsPlaying(false);
      stateRef.current.isPlaying = false;
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