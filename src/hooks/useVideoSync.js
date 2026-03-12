// src/hooks/useVideoSync.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { RoomService } from '../services/RoomService';
import { getYouTubeId } from '../utils/youtube';

export function useVideoSync({ roomId, user, userRole }) {
  const safeUser = user || { id: null };

  const [syncVideoId, setSyncVideoId] = useState(null);
  const [syncIsPlaying, setSyncIsPlaying] = useState(false);
  const [seekTimestamp, setSeekTimestamp] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [isHydrated, setIsHydrated] = useState(false);

  const canControl = userRole === 'owner' || userRole === 'manager';

  const stateRef = useRef({
    videoId: null,
    isPlaying: false,
    lastLocalAction: 0,
    ignoreNextPoll: false,
  });

  const localProgressRef = useRef(0);
  const syncIntervalRef = useRef(null);
  const lastHistoryVideoRef = useRef(null);
  const isHydratingRef = useRef(false);

  const applyRemoteState = useCallback((roomState, { force = false } = {}) => {
    if (!roomState) return;

    const nextVideoId = roomState.current_video_id ?? null;
    const nextIsPlaying = roomState.is_playing ?? false;

    const shouldUpdateVideo = force || nextVideoId !== stateRef.current.videoId;
    const shouldUpdatePlaying = force || nextIsPlaying !== stateRef.current.isPlaying;

    if (shouldUpdateVideo) {
      setSyncVideoId(nextVideoId);
      stateRef.current.videoId = nextVideoId;

      // Avec l'état actuel du schéma, on ne connaît pas encore la vraie position
      // On repart donc à 0 uniquement si la vidéo change réellement
      localProgressRef.current = 0;
      setSeekTimestamp(nextVideoId ? 0 : null);
    }

    if (shouldUpdatePlaying) {
      setSyncIsPlaying(!!nextIsPlaying);
      stateRef.current.isPlaying = !!nextIsPlaying;
    }
  }, []);

  const loadInitialState = useCallback(async () => {
    if (!roomId) return;

    isHydratingRef.current = true;
    setConnectionStatus('connecting');

    try {
      const room = await RoomService.get(roomId);
      applyRemoteState(room, { force: true });
      setConnectionStatus('connected');
      setIsHydrated(true);
    } catch (error) {
      console.warn('[INIT SYNC] Failed to load room state:', error);
      setConnectionStatus('error');
    } finally {
      isHydratingRef.current = false;
    }
  }, [roomId, applyRemoteState]);

  useEffect(() => {
    if (!roomId) return undefined;

    let isMounted = true;

    const syncRoomState = async () => {
      if (!isMounted) return;
      if (isHydratingRef.current) return;

      if (stateRef.current.ignoreNextPoll) {
        stateRef.current.ignoreNextPoll = false;
        return;
      }

      try {
        const room = await RoomService.get(roomId);
        if (!room || !isMounted) return;

        const timeSinceLastAction = Date.now() - stateRef.current.lastLocalAction;
        if (timeSinceLastAction < 2000) return;

        applyRemoteState(room);
        setConnectionStatus('connected');
      } catch (error) {
        console.warn('[POLLING] Failed:', error);
        if (isMounted) setConnectionStatus('error');
      }
    };

    const setupPolling = async () => {
      await loadInitialState();

      if (!isMounted) return;

      const interval = 5000;
      syncIntervalRef.current = setInterval(syncRoomState, interval);
    };

    setupPolling();

    return () => {
      isMounted = false;
      setIsHydrated(false);

      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [roomId, loadInitialState, applyRemoteState]);

  const triggerPlay = useCallback(
    async (timestamp = null) => {
      if (!canControl) return;

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
          ...(syncVideoId && { currentVideoId: syncVideoId }),
        });
      } catch (e) {
        console.error('[DB UPDATE] Failed:', e);
        setSyncIsPlaying(false);
      }
    },
    [roomId, syncVideoId, canControl]
  );

  const triggerPause = useCallback(async () => {
    if (!canControl) return;

    setSyncIsPlaying(false);
    stateRef.current.isPlaying = false;
    stateRef.current.lastLocalAction = Date.now();
    stateRef.current.ignoreNextPoll = true;

    try {
      await RoomService.updatePlaybackState(roomId, { isPlaying: false });
    } catch (e) {
      console.error('[DB UPDATE] Failed:', e);
      setSyncIsPlaying(true);
    }
  }, [roomId, canControl]);

  const triggerSeek = useCallback((seconds) => {
    setSeekTimestamp(seconds);
    localProgressRef.current = seconds;
  }, []);

  const changeVideo = useCallback(
    async (urlOrId, title = null) => {
      if (!canControl) return;

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
          isPlaying: true,
        });

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
        } catch (e) {
          console.warn('[history] failed', e);
        }
      } catch (e) {
        console.error('[DB UPDATE] Failed:', e);
      }
    },
    [roomId, safeUser.id, canControl]
  );

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
    isHydrated,
    currentUser: safeUser,
    controlInfo: {
      canControl,
      isManager: userRole === 'manager',
      isOwner: userRole === 'owner',
    },
  };
}