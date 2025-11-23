// src/hooks/useRoom.js
import { useEffect, useState, useCallback } from 'react'
import { RoomService } from '../services/RoomService'

export function useRoom(roomId) {
  const [room, setRoom] = useState(null)
  const [needPw, setNeedPw] = useState(false)
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  
  // Token interne pour forcer le refresh
  const [reloadToken, setReloadToken] = useState(0)

  const load = useCallback(async () => {
    if (!roomId) return
    setLoading(true)
    setError('')
    try {
      const r = await RoomService.get(roomId)
      setRoom(r)
      const hasPw = r?.hasPassword ?? !!r?.password
      setNeedPw(!!hasPw)
      setChecked(true) 
    } catch (err) {
      console.error('[useRoom] failed', err)
      setRoom(null)
      setError(err?.message || 'Failed to load room')
    } finally {
      setLoading(false)
    }
  }, [roomId])

  // 1. Chargement initial et rechargement manuel
  useEffect(() => {
    load()
  }, [load, reloadToken])

  const verifyPassword = useCallback(async (password) => {
    setError('')
    try {
      const ok = await RoomService.join(roomId, password)
      if (ok) {
        setChecked(true)
        setReloadToken(prev => prev + 1)
        return true
      } else {
        setError('Invalid password')
        return false
      }
    } catch (e) {
      setError(e?.message || 'Error')
      return false
    }
  }, [roomId])

  const refresh = useCallback(() => {
    setReloadToken(x => x + 1)
  }, [])

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
  }
}