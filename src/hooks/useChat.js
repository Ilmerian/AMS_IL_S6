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
    if (!roomId) return
    let unsub = () => {}
    ;(async () => {
      const initial = await ChatService.listByRoom(roomId, { limit: 100 })
      setMessages(initial)
      idsRef.current = new Set(initial.map(m => m.id))
      unsub = ChatService.subscribe(roomId, (msg) => {
        if (!msg?.id || idsRef.current.has(msg.id)) return
        idsRef.current.add(msg.id)
        setMessages(xs => [...xs, msg])
      })
    })()
    return () => unsub()
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
    setMessages(xs => [...xs, tempMsg])

    try {
      const saved = await ChatService.send(roomId, clean)
      setMessages(xs => xs.map(m => (m.id === tempId ? saved : m)))
      idsRef.current.delete(tempId)
      idsRef.current.add(saved.id)
      return true
    } catch (err) {
      setMessages(xs => xs.map(m => (m.id === tempId ? { ...m, __error: true } : m)))
      console.error('send failed:', err?.message || err)
      return false
    }
  }

  return { user, messages, send }
}
