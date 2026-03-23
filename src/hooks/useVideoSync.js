// src/hooks/useVideoSync.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { RoomService } from '../services/RoomService';
import { getYouTubeId } from '../utils/youtube';

export function useVideoSync({ roomId, user, userRole }) {
  const safeUser = user || { id: null };

  const [syncVideoId, setSyncVideoId] = useState(null);
  const [syncIsPlaying, setSyncIsPlaying] = useState(false);
  const [seekTimestamp, setSeekTimestamp] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(
    typeof navigator !== 'undefined' && navigator.onLine ? 'connecting' : 'offline'
  );
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
  const isSyncingRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);

  const applyRemoteState = useCallback((roomState, { force = false } = {}) => {
    if (!roomState) return;

    const nextVideoId = roomState.current_video_id ?? null;
    const nextIsPlaying = roomState.is_playing ?? false;

    const shouldUpdateVideo = force || nextVideoId !== stateRef.current.videoId;
    const shouldUpdatePlaying = force || nextIsPlaying !== stateRef.current.isPlaying;

    if (shouldUpdateVideo) {
      setSyncVideoId(nextVideoId);
      stateRef.current.videoId = nextVideoId;

      localProgressRef.current = 0;
      setSeekTimestamp(nextVideoId ? 0 : null);
    }

    if (shouldUpdatePlaying) {
      setSyncIsPlaying(!!nextIsPlaying);
      stateRef.current.isPlaying = !!nextIsPlaying;
    }
  }, []);

  const syncRoomState = useCallback(
    async ({ force = false, source = 'poll' } = {}) => {
      if (!roomId) return;
      if (isHydratingRef.current || isSyncingRef.current) return;

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setConnectionStatus('offline');
        return;
      }

      if (!force && stateRef.current.ignoreNextPoll) {
        stateRef.current.ignoreNextPoll = false;
        return;
      }

      isSyncingRef.current = true;

      try {
        const room = await RoomService.get(roomId);
        if (!room) return;

        const timeSinceLastAction = Date.now() - stateRef.current.lastLocalAction;
        const shouldSkipBecauseRecentLocalAction = !force && timeSinceLastAction < 2000;

        if (!shouldSkipBecauseRecentLocalAction) {
          applyRemoteState(room, { force });
        }

        setConnectionStatus(source === 'poll' && hasLoadedOnceRef.current ? 'polling' : 'connected');
        hasLoadedOnceRef.current = true;
      } catch (error) {
        console.warn(`[SYNC:${source}] Failed:`, error);
        setConnectionStatus('error');
      } finally {
        isSyncingRef.current = false;
      }
    },
    [roomId, applyRemoteState]
  );

  const loadInitialState = useCallback(async () => {
    if (!roomId) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setConnectionStatus('offline');
      return;
    }

    isHydratingRef.current = true;
    setConnectionStatus('connecting');

    try {
      const room = await RoomService.get(roomId);
      applyRemoteState(room, { force: true });
      setConnectionStatus('connected');
      setIsHydrated(true);
      hasLoadedOnceRef.current = true;
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

    const setupPolling = async () => {
      await loadInitialState();

      if (!isMounted) return;

      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }

      const interval = 5000;
      syncIntervalRef.current = setInterval(() => {
        syncRoomState({ source: 'poll' });
      }, interval);
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
  }, [roomId, loadInitialState, syncRoomState]);

  useEffect(() => {
    if (!roomId) return undefined;

    const handleOnline = () => {
      setConnectionStatus('connecting');
      syncRoomState({ force: true, source: 'online' });
    };

    const handleOffline = () => {
      setConnectionStatus('offline');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncRoomState({ force: true, source: 'visibility' });
      }
    };

    const handleWindowFocus = () => {
      syncRoomState({ force: true, source: 'focus' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [roomId, syncRoomState]);

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
        setConnectionStatus('connected');
      } catch (e) {
        console.error('[DB UPDATE] Failed:', e);
        setSyncIsPlaying(false);
        stateRef.current.isPlaying = false;
        setConnectionStatus('error');
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
      setConnectionStatus('connected');
    } catch (e) {
      console.error('[DB UPDATE] Failed:', e);
      setSyncIsPlaying(true);
      stateRef.current.isPlaying = true;
      setConnectionStatus('error');
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

        setConnectionStatus('connected');

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
        setConnectionStatus('error');
      }
    },
    [roomId, safeUser.id, canControl]
  );

  const updateLocalProgress = useCallback((seconds) => {
    localProgressRef.current = seconds;
  }, []);

  const forceResync = useCallback(() => {
    syncRoomState({ force: true, source: 'manual' });
  }, [syncRoomState]);

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
    forceResync,
    controlInfo: {
      canControl,
      isManager: userRole === 'manager',
      isOwner: userRole === 'owner',
    },
  };
}