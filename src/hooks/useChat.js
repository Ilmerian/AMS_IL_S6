// src/hooks/useChat.js
import { useEffect, useRef, useState } from 'react'
import { ChatService } from '../services/ChatService'
import { sanitizeText } from '../utils/validators'
import { useAuth } from '../context/auth'

export function useChat(roomId) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const idsRef = useRef(new Set())

  useEffect(() => {
    setMessages([])
    idsRef.current = new Set()

    if (!roomId) return

    let cancelled = false
    let unsub = () => {}

    ;(async () => {
      try {
        const initial = await ChatService.listByRoom(roomId, { limit: 100 })
        if (cancelled) return
        setMessages(initial)
        idsRef.current = new Set(initial.map((m) => m.id))
      } catch (err) {
        console.error('[useChat] listByRoom failed:', err?.message || err)
      }

      if (cancelled) return

      unsub = ChatService.subscribe(roomId, {
        onInsert: (msg) => {
          if (!msg?.id || idsRef.current.has(msg.id)) return
          idsRef.current.add(msg.id)
          setMessages((xs) => [...xs, msg])
        },
        onDelete: (msg) => {
          if (!msg?.id) return
          idsRef.current.delete(msg.id)
          setMessages((xs) => xs.filter((m) => m.id !== msg.id))
        },
      })
    })()

    return () => {
      cancelled = true
      try {
        unsub?.()
      } catch (e) {
        console.warn('[useChat] unsubscribe failed:', e?.message || e)
      }
    }
  }, [roomId])

  const send = async (raw) => {
    if (!user) return
    const clean = sanitizeText(raw, { max: 800 })
    if (!clean) return

    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const tempMsg = {
      id: tempId,
      userId: user.id,
      roomId,
      createdAt: new Date(),
      content: clean,
      __optimistic: true,
    }
    idsRef.current.add(tempId)
    setMessages((xs) => [...xs, tempMsg])

    try {
      const saved = await ChatService.send(roomId, clean)
      setMessages((xs) => xs.map((m) => (m.id === tempId ? saved : m)))
      idsRef.current.delete(tempId)
      if (saved?.id) {
        idsRef.current.add(saved.id)
      }
      return true
    } catch (err) {
      setMessages((xs) =>
        xs.map((m) => (m.id === tempId ? { ...m, __error: true } : m)),
      )
      console.error('send failed:', err?.message || err)
      return false
    }
  }

  const remove = async (messageId) => {
    if (!user) return false
    try {
      await ChatService.remove(messageId)
      idsRef.current.delete(messageId)
      setMessages((xs) => xs.filter((m) => m.id !== messageId))
      return true
    } catch (err) {
      console.error('delete failed:', err?.message || err)
      return false
    }
  }

  return { user, messages, send, remove }
}
