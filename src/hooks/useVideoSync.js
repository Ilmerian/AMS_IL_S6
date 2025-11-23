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

  const stateRef = useRef({ 
    videoId: null, 
    isPlaying: false
  });
  
  const broadcastRef = useRef(null);
  const localProgressRef = useRef(0);

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
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [roomId]);

  // =========================================================================
  // 2. BROADCAST SYNCHRONIZATION
  // =========================================================================
  useEffect(() => {
    if (!roomId || !safeUser.id) return;

    const bc = RealtimeService.joinBroadcast(
      roomId,
      (payload) => {
        const type = payload.type;
        const senderId = payload.userId;
        
        if (!senderId || senderId === safeUser.id) return;

        console.log(`⚡ [Broadcast] ${type} from ${senderId}`);

        switch (type) {
          case 'VIDEO_CHANGE':
            setSyncVideoId(payload.videoId);
            stateRef.current.videoId = payload.videoId;
            localProgressRef.current = 0;
            setSeekTimestamp(0);
            setSyncIsPlaying(true);
            stateRef.current.isPlaying = true;
            break;

          case 'PLAY':
            setSyncIsPlaying(true);
            stateRef.current.isPlaying = true;
            if (payload.timestamp) {
              setSeekTimestamp(payload.timestamp);
            }
            break;

          case 'PAUSE':
            setSyncIsPlaying(false);
            stateRef.current.isPlaying = false;
            break;

          case 'SEEK':
            setSeekTimestamp(payload.timestamp);
            localProgressRef.current = payload.timestamp;
            break;
        }
      }
    );

    broadcastRef.current = bc;
    return () => bc.unsubscribe();
  }, [roomId, safeUser.id]);

  // =========================================================================
  // 3. PUBLIC METHODS
  // =========================================================================

  const triggerPlay = useCallback(async (timestamp = null) => {
    console.log("👆 User Triggered: PLAY");

    setSyncIsPlaying(true);
    stateRef.current.isPlaying = true;
    
    if (timestamp !== null) {
      setSeekTimestamp(timestamp);
      localProgressRef.current = timestamp;
    }

    broadcastRef.current?.send('PLAY', {
      timestamp: timestamp || localProgressRef.current,
      userId: safeUser.id
    });

    try {
      await RoomService.updatePlaybackState(roomId, { 
        isPlaying: true,
        ...(syncVideoId && { currentVideoId: syncVideoId })
      });
    } catch (e) {
      console.error('DB update failed:', e);
    }
  }, [roomId, safeUser.id, syncVideoId]);

  const triggerPause = useCallback(async () => {
    console.log("👆 User Triggered: PAUSE");
    
    setSyncIsPlaying(false);
    stateRef.current.isPlaying = false;

    broadcastRef.current?.send('PAUSE', {
      userId: safeUser.id,
      timestamp: localProgressRef.current
    });

    try {
      await RoomService.updatePlaybackState(roomId, { isPlaying: false });
    } catch (e) {
      console.error('DB update failed:', e);
    }
  }, [roomId, safeUser.id]);

  const triggerSeek = useCallback((seconds) => {
    console.log("👆 User Triggered: SEEK to", seconds);
    
    setSeekTimestamp(seconds);
    localProgressRef.current = seconds;

    broadcastRef.current?.send('SEEK', {
      timestamp: seconds,
      userId: safeUser.id
    });
  }, [safeUser.id]);

  const changeVideo = useCallback(async (urlOrId) => {
    const cleanId = getYouTubeId(urlOrId) || urlOrId;
    if (!cleanId) return;
    
    console.log("👆 User Changing video to:", cleanId);
    setTimeout(() => {
      setSyncVideoId(cleanId);
      stateRef.current.videoId = cleanId;
      localProgressRef.current = 0;
      setSeekTimestamp(0);
      setSyncIsPlaying(true);
      stateRef.current.isPlaying = true;

      broadcastRef.current?.send('VIDEO_CHANGE', {
        videoId: cleanId,
        timestamp: 0,
        userId: safeUser.id
      });

      try {
        RoomService.updatePlaybackState(roomId, { 
          currentVideoId: cleanId, 
          isPlaying: true 
        });
      } catch (e) {
        console.error('DB update failed:', e);
      }
    }, 500);
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
    updateLocalProgress
  };
}