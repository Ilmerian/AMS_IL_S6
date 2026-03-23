// src/hooks/useRoom.js
import { useEffect, useState, useCallback, useRef } from 'react';
import { RoomService } from '../services/RoomService';

/**
 * Hook de gestion des informations d'une salle
 * @param {string} roomId
 */
export function useRoom(roomId) {
  const [room, setRoom] = useState(null);
  const [needPw, setNeedPw] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [reloadToken, setReloadToken] = useState(0);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    setRoom(null);
    setChecked(false);
    setNeedPw(false);
    setError('');
    setLoading(true);
  }, [roomId]);

  const load = useCallback(
    async ({ preserveChecked = true } = {}) => {
      if (!roomId) {
        setRoom(null);
        setNeedPw(false);
        setChecked(false);
        setError('Room not found');
        setLoading(false);
        return;
      }

      if (isLoadingRef.current) return;

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setError('Connexion perdue');
        setLoading(false);
        return;
      }

      isLoadingRef.current = true;
      setLoading(true);
      setError('');

      try {
        const r = await RoomService.get(roomId);
        setRoom(r);

        const hasPw = r?.hasPassword ?? !!r?.password;
        setNeedPw(!!hasPw);

        if (preserveChecked) {
          setChecked((prev) => prev || !hasPw);
        } else {
          setChecked(!hasPw);
        }
      } catch (err) {
        console.error('[useRoom] failed', err);
        setRoom(null);
        setError(err?.message || 'Failed to load room');
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    },
    [roomId]
  );

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  useEffect(() => {
    if (!roomId) return undefined;

    const handleOnline = () => {
      setError('');
      load();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        load();
      }
    };

    const handleWindowFocus = () => {
      load();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [roomId, load]);

  const verifyPassword = useCallback(
    async (password) => {
      setError('');

      try {
        const ok = await RoomService.join(roomId, password);
        if (ok) {
          setChecked(true);
          await load();
          return true;
        } else {
          setError('Invalid password');
          return false;
        }
      } catch (e) {
        setError(e?.message || 'Error');
        return false;
      }
    },
    [roomId, load]
  );

  const refresh = useCallback(() => {
    setReloadToken((x) => x + 1);
  }, []);

  return {
    room,
    needPw,
    checked,
    setChecked,
    error,
    setError,
    loading,
    refresh,
    verifyPassword,
  };
}