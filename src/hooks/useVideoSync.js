// src/hooks/useVideoSync.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { RealtimeService } from '../services/RealtimeService';
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
    isPlaying: false,
    lastSeek: 0
  });
  
  const broadcastRef = useRef(null);
  const localProgressRef = useRef(0);
  const lastBroadcastRef = useRef(0);

  // =========================================================================
  // 1. SYNC FROM DATABASE
  // =========================================================================
  useEffect(() => {
    if (!roomId) return;

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

          if (now - lastUpdate < 500) return;

          console.log(`[DB SYNC] Room updated:`, newData);

          if (newData.current_video_id !== stateRef.current.videoId) {
            console.log(`[DB] Video changed to: ${newData.current_video_id}`);
            setSyncVideoId(newData.current_video_id);
            stateRef.current.videoId = newData.current_video_id;
            localProgressRef.current = 0;
            setSeekTimestamp(0);
          }

          if (newData.is_playing !== stateRef.current.isPlaying) {
            console.log(`[DB] Playback state: ${newData.is_playing ? 'PLAY' : 'PAUSE'}`);
            setSyncIsPlaying(newData.is_playing);
            stateRef.current.isPlaying = newData.is_playing;
          }

          setLastUpdate(now);
        }
      )
      .subscribe();

    return () => {
      console.log(`[DB SYNC] Cleaning up for room: ${roomId}`);
      supabase.removeChannel(channel);
    };
  }, [roomId, lastUpdate]);

  // =========================================================================
  // 2. BROADCAST SYNCHRONIZATION
  // =========================================================================
  useEffect(() => {
    if (!roomId || !safeUser.id) return;

    console.log(`[BROADCAST] Setting up for room: ${roomId}, user: ${safeUser.id}`);

    const bc = RealtimeService.joinBroadcast(
      roomId,
      (payload) => {
        const type = payload.type;
        const senderId = payload.userId;
        
        if (!senderId || senderId === safeUser.id) return;

        console.log(`⚡ [Broadcast] ${type} from ${senderId}`, payload);

        const now = Date.now();
        if (now - lastBroadcastRef.current < 300) return;
        lastBroadcastRef.current = now;

        switch (type) {
          case 'VIDEO_CHANGE':
            if (payload.videoId !== stateRef.current.videoId) {
              setSyncVideoId(payload.videoId);
              stateRef.current.videoId = payload.videoId;
              localProgressRef.current = 0;
              setSeekTimestamp(0);
              setSyncIsPlaying(true);
              stateRef.current.isPlaying = true;
              setLastUpdate(now);
            }
            break;

          case 'PLAY':
            if (!stateRef.current.isPlaying) {
              setSyncIsPlaying(true);
              stateRef.current.isPlaying = true;
              if (payload.timestamp && Math.abs(payload.timestamp - localProgressRef.current) > 2) {
                setSeekTimestamp(payload.timestamp);
              }
              setLastUpdate(now);
            }
            break;

          case 'PAUSE':
            if (stateRef.current.isPlaying) {
              setSyncIsPlaying(false);
              stateRef.current.isPlaying = false;
              setLastUpdate(now);
            }
            break;

          case 'SEEK':
            if (Math.abs(payload.timestamp - localProgressRef.current) > 2) {
              setSeekTimestamp(payload.timestamp);
              localProgressRef.current = payload.timestamp;
              setLastUpdate(now);
            }
            break;
        }
      },
      () => {
        console.log(`[BROADCAST] Successfully subscribed to room: ${roomId}`);
      }
    );

    broadcastRef.current = bc;
    
    return () => {
      console.log(`[BROADCAST] Cleaning up for room: ${roomId}`);
      bc?.unsubscribe();
    };
  }, [roomId, safeUser.id]);

  // =========================================================================
  // 3. PERIODIC SYNC
  // =========================================================================
  useEffect(() => {
    if (!roomId) return;

    const interval = setInterval(async () => {
      try {
        const room = await RoomService.get(roomId);
        if (room) {
          const now = Date.now();
          if (now - lastUpdate > 8000) {
            console.log(`[PERIODIC SYNC] Syncing room state`);
            
            if (room.current_video_id !== stateRef.current.videoId) {
              setSyncVideoId(room.current_video_id);
              stateRef.current.videoId = room.current_video_id;
            }
            
            if (room.is_playing !== stateRef.current.isPlaying) {
              setSyncIsPlaying(room.is_playing);
              stateRef.current.isPlaying = room.is_playing;
            }
            
            setLastUpdate(now);
          }
        }
      } catch (error) {
        console.warn('[PERIODIC SYNC] Failed to sync room state:', error);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [roomId, lastUpdate]);

  // =========================================================================
  // 4. PUBLIC METHODS
  // =========================================================================

  const broadcastAction = useCallback((type, data) => {
    const now = Date.now();
    if (now - lastBroadcastRef.current < 300) return;
    
    lastBroadcastRef.current = now;
    
    if (broadcastRef.current) {
      console.log(`[BROADCAST SEND] ${type}`, data);
      broadcastRef.current.send(type, {
        ...data,
        userId: safeUser.id,
        timestamp: Date.now()
      });
    }
  }, [safeUser.id]);

  const triggerPlay = useCallback(async (timestamp = null) => {
    console.log("👆 User Triggered: PLAY");

    const targetTimestamp = timestamp !== null ? timestamp : localProgressRef.current;
    
    setSyncIsPlaying(true);
    stateRef.current.isPlaying = true;
    
    if (timestamp !== null) {
      setSeekTimestamp(timestamp);
      localProgressRef.current = timestamp;
    }

    // Broadcast
    broadcastAction('PLAY', {
      timestamp: targetTimestamp
    });

    // Database update
    try {
      await RoomService.updatePlaybackState(roomId, { 
        isPlaying: true,
        ...(syncVideoId && { currentVideoId: syncVideoId })
      });
      setLastUpdate(Date.now());
    } catch (e) {
      console.error('DB update failed:', e);
    }
  }, [roomId, safeUser.id, syncVideoId, broadcastAction]);

  const triggerPause = useCallback(async () => {
    console.log("👆 User Triggered: PAUSE");
    
    setSyncIsPlaying(false);
    stateRef.current.isPlaying = false;

    // Broadcast
    broadcastAction('PAUSE', {
      timestamp: localProgressRef.current
    });

    // Database update
    try {
      await RoomService.updatePlaybackState(roomId, { isPlaying: false });
      setLastUpdate(Date.now());
    } catch (e) {
      console.error('DB update failed:', e);
    }
  }, [roomId, safeUser.id, broadcastAction]);

  const triggerSeek = useCallback((seconds) => {
    console.log("👆 User Triggered: SEEK to", seconds);
    
    setSeekTimestamp(seconds);
    localProgressRef.current = seconds;

    // Broadcast
    broadcastAction('SEEK', {
      timestamp: seconds
    });
  }, [broadcastAction]);

  const changeVideo = useCallback(async (urlOrId) => {
    const cleanId = getYouTubeId(urlOrId) || urlOrId;
    if (!cleanId) return;
    
    console.log("👆 User Changing video to:", cleanId);
    
    setSyncVideoId(cleanId);
    stateRef.current.videoId = cleanId;
    localProgressRef.current = 0;
    setSeekTimestamp(0);
    setSyncIsPlaying(true);
    stateRef.current.isPlaying = true;

    // Broadcast
    broadcastAction('VIDEO_CHANGE', {
      videoId: cleanId,
      timestamp: 0
    });

    // Database update
    try {
      await RoomService.updatePlaybackState(roomId, { 
        currentVideoId: cleanId, 
        isPlaying: true 
      });
      setLastUpdate(Date.now());
    } catch (e) {
      console.error('DB update failed:', e);
    }
  }, [roomId, safeUser.id, broadcastAction]);

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
    updateLocalProgress
  };
}