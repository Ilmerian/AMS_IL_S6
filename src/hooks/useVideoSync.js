// src/hooks/useVideoSync.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { RoomService } from '../services/RoomService';
import { getYouTubeId } from '../utils/youtube';
import { RealtimeService } from '../services/RealtimeService';

export function useVideoSync({ roomId, user, userRole }) {
  const safeUser = user || { id: null };

  const [syncVideoId, setSyncVideoId] = useState(null);
  const [syncIsPlaying, setSyncIsPlaying] = useState(false);
  const [seekTimestamp, setSeekTimestamp] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  // --- NOUVELLE LOGIQUE DE PERMISSION ---
  // Seul l'owner ou un manager peut contrôler
  const canControl = userRole === 'owner' || userRole === 'manager';

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
  // 1. POLLING SYNC (inchangé, sauf connectionStatus)
  // =========================================================================
  useEffect(() => {
    if (!roomId) return undefined;
    let isMounted = true;

    const syncRoomState = async () => {
      if (stateRef.current.ignoreNextPoll) {
        stateRef.current.ignoreNextPoll = false;
        return;
      }

      try {
        const room = await RoomService.get(roomId);
        if (room && isMounted) {
          const timeSinceLastAction = Date.now() - stateRef.current.lastLocalAction;
          if (timeSinceLastAction < 2000) return;

          if (room.current_video_id !== stateRef.current.videoId && room.current_video_id !== undefined) {
            setSyncVideoId(room.current_video_id);
            stateRef.current.videoId = room.current_video_id;
            localProgressRef.current = 0;
            setSeekTimestamp(0);
          }

          if (room.is_playing !== stateRef.current.isPlaying && room.is_playing !== undefined && room.is_playing !== null) {
            setSyncIsPlaying(room.is_playing);
            stateRef.current.isPlaying = room.is_playing;
          }
          setConnectionStatus('connected');
        }
      } catch (error) {
        console.warn(`[POLLING] Failed:`, error);
        if (isMounted) setConnectionStatus('error');
      }
    };

    const setupPolling = () => {
      const interval = 5000;
      syncRoomState();
      syncIntervalRef.current = setInterval(syncRoomState, interval);
    };

    setupPolling();

    return () => {
      isMounted = false;
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [roomId]);

  // =========================================================================
  // 2. PUBLIC METHODS (Sécurisées par canControl)
  // =========================================================================

  const triggerPlay = useCallback(async (timestamp = null) => {
    if (!canControl) return; // SÉCURITÉ

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
    } catch (e) {
      console.error(`[DB UPDATE] Failed:`, e);
      setSyncIsPlaying(false); // Rollback local en cas d'erreur
    }
  }, [roomId, syncVideoId, canControl]);

  const triggerPause = useCallback(async () => {
    if (!canControl) return; // SÉCURITÉ

    setSyncIsPlaying(false);
    stateRef.current.isPlaying = false;
    stateRef.current.lastLocalAction = Date.now();
    stateRef.current.ignoreNextPoll = true;

    try {
      await RoomService.updatePlaybackState(roomId, { isPlaying: false });
    } catch (e) {
      console.error(`[DB UPDATE] Failed:`, e);
      setSyncIsPlaying(true);
    }
  }, [roomId, canControl]);

  const triggerSeek = useCallback((seconds) => {
    // Le seek local est autorisé pour le confort, mais ne synchro pas la DB si pas admin
    setSeekTimestamp(seconds);
    localProgressRef.current = seconds;
  }, []);

  const changeVideo = useCallback(async (urlOrId,title = null) => {
    if (!canControl) return; // SÉCURITÉ

    const cleanId = getYouTubeId(urlOrId) || urlOrId;
    if (!cleanId) return;

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
      
      // Ajout historique
      try {
        if (lastHistoryVideoRef.current !== cleanId) {
          lastHistoryVideoRef.current = cleanId;
          await RoomService.addVideoHistory({
            roomId: Number(roomId),
            youtubeId: cleanId,
            videoUrl: `https://www.youtube.com/watch?v=${cleanId}`,
            videoTitle: title,
            userId: safeUser.id || null,
          });
        }
      } catch (e) { console.warn('[history] failed', e); }

    } catch (e) {
      console.error(`[DB UPDATE] Failed:`, e);
    }
  }, [roomId, safeUser.id, canControl]);

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
    currentUser: safeUser,
    controlInfo: {
      canControl, // Sera false pour les membres normaux
      isManager: userRole === 'manager',
      isOwner: userRole === 'owner'
    }
  };
}