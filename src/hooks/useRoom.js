// src/hooks/useRoom.js
import { useEffect, useState, useCallback } from 'react'
import { RoomService } from '../services/RoomService'

export function useRoom(roomId) {
  const [room, setRoom] = useState(null)
  const [needPw, setNeedPw] = useState(false)
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!roomId) return
    ;(async () => {
      try {
        const r = await RoomService.get(roomId)
        setRoom(r)
        setNeedPw(!!r?.password)
      } catch (e) {
        setError(e?.message || 'Error')
      }
    })()
  }, [roomId])

  const verifyPassword = useCallback(async (password) => {
    setError('')
    try {
      const ok = await RoomService.join(roomId, password)
      if (ok) {
        setChecked(true)
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

  return { room, needPw, checked, setChecked, error, setError, verifyPassword }
}
