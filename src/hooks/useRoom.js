// src/hooks/useRoom.js
import { useEffect, useState, useCallback } from 'react'
import { RoomService } from '../services/RoomService'

export function useRoom(roomId) {
  const [room, setRoom] = useState(null)
  const [needPw, setNeedPw] = useState(false)
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)

  const forceReload = useCallback(() => {
    setReloadToken((x) => x + 1)
  }, [])

  useEffect(() => {
    if (!roomId) {
      setRoom(null)
      setNeedPw(false)
      setChecked(false)
      setError('')
      setLoading(false)
      return
    }

    let cancelled = false

    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const r = await RoomService.get(roomId)
        if (cancelled) return

        setRoom(r)
        
        const hasPw = r?.hasPassword ?? !!r?.password
        setNeedPw(!!hasPw)

        setChecked(true)
      } catch (err) {
        if (cancelled) return
        console.error('[useRoom] failed to load room', err)
        setRoom(null)
        setNeedPw(false)
        setChecked(false)
        setError(err?.message || 'Failed to load room')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [roomId, reloadToken])

  const verifyPassword = useCallback(async (password) => {
    setError('')
    try {
      const ok = await RoomService.join(roomId, password)
      if (ok) {
        setChecked(true)
        forceReload()
        return true
      } else {
        setError('Invalid password')
        return false
      }
    } catch (e) {
      setError(e?.message || 'Error')
      return false
    }
  }, [roomId, forceReload])

  return {
    room,
    needPw,
    checked,
    setChecked,
    error,
    setError,
    loading,
    refresh: forceReload,
    verifyPassword,
  }
}
