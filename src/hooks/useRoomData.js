import { useEffect, useState, useCallback, useRef } from 'react'
import { RoomService } from '../services/RoomService'
import { RoleService } from '../services/RoleService'
import { BanRepository } from '../repositories/BanRepository'
import { cacheService } from '../services/CacheService'

const CACHE_DURATION = 30000

export function useRoomData(roomId, user) {
  const [room, setRoom] = useState(null)
  const [members, setMembers] = useState([])
  const [userRole, setUserRole] = useState(null)
  const [isBanned, setIsBanned] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const loadingRef = useRef(false)

  const getMemberRole = useCallback((member) => {
    if (!member) return null;
    if (member.isOwner) return 'owner';
    if (member.is_manager) return 'manager';
    if (member.userId) return 'member';
    return null;
  }, []);

  const loadAll = useCallback(async () => {
    if (!roomId || loadingRef.current) return;

    const cacheKey = `room_data_${roomId}_${user?.id || 'guest'}`;
    
    const cached = cacheService.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30000) {
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

    try {
      const [roomData, bannedStatus] = await Promise.allSettled([
        RoomService.get(roomId),
        user ? BanRepository.isUserBanned(roomId, user.id) : Promise.resolve(false)
      ]);

      let finalRoom = null
      if (roomData.status === 'fulfilled') {
        finalRoom = roomData.value
      } else {
        console.error('[useRoomData] Room fetch failed:', roomData.reason)
        throw roomData.reason || new Error('Failed to load room')
      }

      const isBannedResult = bannedStatus.status === 'fulfilled' 
        ? bannedStatus.value 
        : false

      setRoom(finalRoom)
      setIsBanned(isBannedResult)

      let membersData = []
      let userRoleData = null

      if (!isBannedResult) {
        try {
          membersData = await cacheService.withDebounce(
            `members_${roomId}`,
            () => RoleService.listMembers(roomId),
            100
          )
          
          if (user) {
            const currentUserMember = membersData.find(m => m.userId === user.id)
            userRoleData = getMemberRole(currentUserMember)
            
            if (!userRoleData && finalRoom && finalRoom.ownerId === user.id) {
              userRoleData = 'owner';
            }
          }
        } catch (memberError) {
          console.warn('[useRoomData] Failed to load members:', memberError)
        }

        setMembers(membersData)
        setUserRole(userRoleData)
      }

      cacheService.cache.set(cacheKey, {
        timestamp: Date.now(),
        data: {
          roomData: finalRoom,
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
  }, [roomId, user, getMemberRole]);

  const refresh = useCallback(() => {
    const cacheKey = `room_data_${roomId}_${user?.id || 'guest'}`
    cacheService.memoryCache.delete(cacheKey)
    loadAll()
  }, [roomId, user, loadAll])

  useEffect(() => {
    if (!roomId || !user || isBanned) return

    let unsubFunctions = []

    try {
      const banUnsub = BanRepository.onBanChange(roomId, (payload) => {
        if (payload.new?.user_id === user.id || payload.old?.user_id === user.id) {
          const newBanned = payload.eventType === 'INSERT'
          setIsBanned(newBanned)
          
          const cacheKey = `room_data_${roomId}_${user.id}`
          cacheService.memoryCache.delete(cacheKey)
          
          if (newBanned) {
            setMembers([])
            setUserRole(null)
          } else {
            refresh()
          }
        }
      })
      unsubFunctions.push(banUnsub)
    } catch (e) {
      console.warn('Realtime subscription setup failed:', e)
    }

    return () => {
      unsubFunctions.forEach(unsub => unsub?.())
    }
  }, [roomId, user, isBanned, refresh])

  useEffect(() => {
    loadAll()

    return () => {
      const cacheKey = `room_data_${roomId}_${user?.id || 'guest'}`
      setTimeout(() => {
        cacheService.memoryCache.delete(cacheKey)
      }, CACHE_DURATION + 1000)
    }
  }, [loadAll, roomId, user])

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