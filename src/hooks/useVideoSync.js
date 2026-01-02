// src/hooks/useVideoSync.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { RoomService } from '../services/RoomService';
import { getYouTubeId } from '../utils/youtube';
import { RealtimeService } from '../services/RealtimeService';

/**
 * Hook de synchronisation de la lecture vidéo dans une salle
 */

export function useVideoSync({ roomId, user, userRole }) {
  const safeUser = user || { id: null };

  const [syncVideoId, setSyncVideoId] = useState(null);
  const [syncIsPlaying, setSyncIsPlaying] = useState(false);
  const [seekTimestamp, setSeekTimestamp] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [leaderId, setLeaderId] = useState(null);
  const [leaderName, setLeaderName] = useState(null);

  const stateRef = useRef({
    videoId: null,
    isPlaying: false,
    lastLocalAction: 0,
    ignoreNextPoll: false
  });
  const presenceMetaRef = useRef(null);
  const wasLeaderRef = useRef(false);

  const localProgressRef = useRef(0);
  const syncIntervalRef = useRef(null);
  const lastHistoryVideoRef = useRef(null);
  const presenceUnsubRef = useRef(null);

  const isPrivileged = userRole === 'owner' || userRole === 'manager';
  const isLeader = leaderId === safeUser.id;
  const canControl = isPrivileged || isLeader || (!leaderId && !!safeUser.id);

  const ensureLeadership = useCallback(async () => {
    if (isPrivileged) return true;
    if (leaderId && leaderId !== safeUser.id) return false;
    if (isLeader) return true;
    await RealtimeService.updatePresence(roomId, { ...(presenceMetaRef.current || {}), is_leader: true });
    wasLeaderRef.current = true;
    setLeaderId(safeUser.id);
    setLeaderName((presenceMetaRef.current || {}).username);
    return true;
  }, [isPrivileged, leaderId, isLeader, roomId, safeUser.id]);

  const takeLeadership = useCallback(async () => {
    if (!roomId || !safeUser.id) return;
    const baseMeta = presenceMetaRef.current || {};
    wasLeaderRef.current = true;
    setLeaderId(safeUser.id);
    setLeaderName(baseMeta.username);
    await RealtimeService.updatePresence(roomId, { ...baseMeta, is_leader: true });
  }, [roomId, safeUser.id]);

  const releaseLeadership = useCallback(async () => {
    if (!roomId || !safeUser.id) return;
    const baseMeta = presenceMetaRef.current || {};
    wasLeaderRef.current = false;
    setLeaderId(null);
    setLeaderName(null);
    await RealtimeService.updatePresence(roomId, { ...baseMeta, is_leader: false });
  }, [roomId, safeUser.id]);

  // =========================================================================
  // 1. POLLING SYNC
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

          setConnectionStatus('polling');
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
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [roomId]);

  // =========================================================================
  // 1bis. PRESENCE & CONTRÔLE LECTURE
  // =========================================================================
  useEffect(() => {
    if (!roomId || !safeUser.id) return;

    const metadata = {
      user_id: safeUser.id,
      username: safeUser.user_metadata?.username || safeUser.email?.split('@')[0] || 'Visiteur',
      avatar_url: safeUser.avatar_url || safeUser.user_metadata?.avatar_url,
      joined_at: Date.now(),
      is_leader: false,
    };
    presenceMetaRef.current = metadata;

    const unsubscribePresence = RealtimeService.joinPresence(roomId, metadata);

    const offSync = RealtimeService.subscribePresence(roomId, ({ users }) => {
      setConnectionStatus('connected');
      const leader = users.find(u => u?.is_leader);
      setLeaderId(leader?.user_id || null);
      setLeaderName(leader?.username || null);

      if (!leader && isPrivileged && safeUser.id) {
        takeLeadership();
        return;
      }

      if (leader?.user_id !== safeUser.id && wasLeaderRef.current) {
        wasLeaderRef.current = false;
        RealtimeService.updatePresence(roomId, { ...metadata, is_leader: false });
      }
    });

    presenceUnsubRef.current = () => {
      offSync?.();
      unsubscribePresence?.();
    };

    return () => {
      offSync?.();
      unsubscribePresence?.();
      presenceUnsubRef.current = null;
    };
  }, [roomId, safeUser.id, safeUser.user_metadata, safeUser.email, safeUser.avatar_url, isPrivileged, takeLeadership]);

  useEffect(() => {
    return () => {
      presenceUnsubRef.current?.();
    };
  }, []);

  // =========================================================================
  // 2. PUBLIC METHODS
  // =========================================================================

  const triggerPlay = useCallback(async (timestamp = null) => {
    const allowed = await ensureLeadership();
    if (!allowed) {
      console.warn('[useVideoSync] triggerPlay ignored: no control');
      return;
    }
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
    const allowed = await ensureLeadership();
    if (!allowed) {
      console.warn('[useVideoSync] triggerPause ignored: no control');
      return;
    }
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
  }, [roomId, safeUser.id, canControl, ensureLeadership]);

  const triggerSeek = useCallback((seconds) => {
    console.log(`👆 User ${safeUser.id} Triggered: SEEK to ${seconds}`);

    setSeekTimestamp(seconds);
    localProgressRef.current = seconds;
  }, [safeUser.id]);

  const changeVideo = useCallback(async (urlOrId) => {
    const cleanId = getYouTubeId(urlOrId) || urlOrId;
    if (!cleanId) return;

    const allowed = await ensureLeadership();
    if (!allowed) {
      console.warn('[useVideoSync] changeVideo ignored: no control');
      return;
    }

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
  }, [roomId, safeUser.id, canControl, ensureLeadership]);

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
      canControl,
      isLeader,
      currentLeader: leaderName,
      takeLeadership,
      releaseLeadership,
      requirePin: null,
    }
  };
}
