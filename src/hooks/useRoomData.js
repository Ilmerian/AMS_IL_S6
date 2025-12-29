// src/hooks/useRoomData.js
import { useEffect, useState, useCallback, useRef } from 'react'
import { RoomService } from '../services/RoomService'
import { RoleService } from '../services/RoleService'
import { BanRepository } from '../repositories/BanRepository'
import { cacheService } from '../services/CacheService'

const CACHE_DURATION = 30000
const DEBOUNCE_DELAY = 500

/**
 * Hook de récupération des données d'une salle
 */

export function useRoomData(roomId, user) {
  const [room, setRoom] = useState(null)
  const [members, setMembers] = useState([])
  const [userRole, setUserRole] = useState(null)
  const [isBanned, setIsBanned] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadingRef = useRef(false)
  const requestTimeoutRef = useRef(null)

  const loadAll = useCallback(async () => {
    if (!roomId || loadingRef.current) return;

    const cacheKey = `room_data_${roomId}_${user?.id || 'guest'}`;

    try {
      const cached = cacheService.getMemory(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        const { roomData, membersData, userRoleData, bannedData } = cached.data;
        setRoom(roomData);
        setMembers(membersData || []);
        setUserRole(userRoleData);
        setIsBanned(bannedData || false);
        setLoading(false);
        return;
      }

      loadingRef.current = true;
      setLoading(true);
      setError('');

      const roomData = await RoomService.get(roomId);
      setRoom(roomData);

      let isBannedResult = false;
      if (user) {
        isBannedResult = await cacheService.withDebounce(
          `ban_check_${roomId}_${user.id}`,
          () => BanRepository.isUserBanned(roomId, user.id),
          DEBOUNCE_DELAY
        );
      }
      setIsBanned(isBannedResult);

      if (isBannedResult) {
        cacheService.setMemory(cacheKey, {
          timestamp: Date.now(),
          data: {
            roomData,
            membersData: [],
            userRoleData: null,
            bannedData: true
          }
        });
        return;
      }

      let membersData = [];
      let userRoleData = null;

      try {
        membersData = await cacheService.withDebounce(
          `members_${roomId}`,
          () => RoleService.listMembers(roomId),
          DEBOUNCE_DELAY
        );

        if (user) {
          if (roomData.ownerId === user.id) {
            userRoleData = 'owner';
          }
          else {
            const currentUserMember = membersData.find(m => m.userId === user.id);
            if (currentUserMember) {
              userRoleData = currentUserMember.isOwner ? 'owner' :
                currentUserMember.is_manager ? 'manager' : 'member';
            }
            else {
              userRoleData = null;
            }
          }
        }
      } catch (memberError) {
        console.warn('[useRoomData] Failed to load members:', memberError);
      }

      setMembers(membersData);
      setUserRole(userRoleData);

      cacheService.setMemory(cacheKey, {
        timestamp: Date.now(),
        data: {
          roomData,
          membersData,
          userRoleData,
          bannedData: isBannedResult
        }
      });

    } catch (err) {
      console.error('[useRoomData] Failed:', err);
      setError(err?.message || 'Failed to load room data');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [roomId, user]);

  useEffect(() => {
    if (!roomId) return;

    if (requestTimeoutRef.current) {
      clearTimeout(requestTimeoutRef.current);
    }

    requestTimeoutRef.current = setTimeout(() => {
      loadAll();
    }, 100);

    return () => {
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
    };
  }, [loadAll, roomId]);

  const refresh = useCallback(() => {
    const cacheKey = `room_data_${roomId}_${user?.id || 'guest'}`
    cacheService.invalidate(cacheKey)

    if (requestTimeoutRef.current) {
      clearTimeout(requestTimeoutRef.current);
    }

    requestTimeoutRef.current = setTimeout(() => {
      loadAll();
    }, 100);
  }, [roomId, user, loadAll])

  useEffect(() => {
    if (!roomId || !user || isBanned) return

    let unsubFunctions = []
    let mounted = true

    const setupSubscriptions = () => {
      try {
        const banUnsub = BanRepository.onBanChange(roomId, (payload) => {
          if (!mounted) return;

          if (payload.new?.user_id === user.id || payload.old?.user_id === user.id) {
            const newBanned = payload.eventType === 'INSERT'
            setIsBanned(newBanned)

            const cacheKey = `room_data_${roomId}_${user.id}`
            cacheService.invalidate(cacheKey)

            if (newBanned) {
              setMembers([])
              setUserRole(null)
            } else {
              if (requestTimeoutRef.current) {
                clearTimeout(requestTimeoutRef.current);
              }
              requestTimeoutRef.current = setTimeout(() => {
                refresh()
              }, 500);
            }
          }
        })
        unsubFunctions.push(banUnsub)
      } catch (e) {
        console.warn('Realtime subscription setup failed:', e)
      }
    }

    const subscriptionTimeout = setTimeout(setupSubscriptions, 1000);

    return () => {
      mounted = false
      clearTimeout(subscriptionTimeout)
      unsubFunctions.forEach(unsub => unsub?.())
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current)
      }
    }
  }, [roomId, user, isBanned, refresh])

  useEffect(() => {
    return () => {
      const cacheKey = `room_data_${roomId}_${user?.id || 'guest'}`
      setTimeout(() => {
        cacheService.invalidate(cacheKey)
      }, CACHE_DURATION + 1000)
    }
  }, [roomId, user])

  return {
    room,
    members,
    userRole,
    isBanned,
    loading,
    error,
    refresh,
    needPw: room?.hasPassword ?? !!room?.password,
    checked: !(room?.hasPassword ?? !!room?.password)
  }
}