// src/hooks/useChat.js
import { useEffect, useRef, useState, useCallback } from 'react'
import { ChatService } from '../services/ChatService'
import { sanitizeText } from '../utils/validators'
import { useAuth } from '../context/auth'

const PAGE_SIZE = 50
const MAX_MESSAGES = 100

/**
 * Hook de gestion du chat d'une salle
 * @param {string} roomId
 */

export function useChat(roomId) {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const idsRef = useRef(new Set())
  const oldestMessageRef = useRef(null)
  const subscriptionRef = useRef(null)

  const truncateMessages = (newMessages) => {
    if (newMessages.length > MAX_MESSAGES) {
      const excess = newMessages.length - MAX_MESSAGES
      const truncated = newMessages.slice(excess)
      oldestMessageRef.current = truncated[0]?.id || null
      idsRef.current = new Set(truncated.map(m => m.id))
      setHasMore(true)
      return truncated
    }
    return newMessages
  }

  const loadMore = useCallback(async () => {
    if (!roomId || !hasMore || !oldestMessageRef.current) return

    const newMessages = await ChatService.listByRoom(roomId, {
      limit: PAGE_SIZE,
      before: oldestMessageRef.current,
    })

    if (newMessages.length === 0) {
      setHasMore(false)
      return
    }

    oldestMessageRef.current = newMessages[0].id

    setMessages(currentMessages => {
      const uniqueNewMessages = newMessages.filter(m => !idsRef.current.has(m.id))
      uniqueNewMessages.forEach(m => idsRef.current.add(m.id))
      const mergedMessages = [...uniqueNewMessages, ...currentMessages]
      return mergedMessages
    })

    if (newMessages.length < PAGE_SIZE) {
      setHasMore(false)
    }
  }, [roomId, hasMore])

  useEffect(() => {
    if (!roomId) return

    const loadInitialMessages = async () => {
      setLoading(true)
      try {
        const initial = await ChatService.listByRoom(roomId, { limit: MAX_MESSAGES })

        if (initial.length === MAX_MESSAGES) {
          setHasMore(true)
          oldestMessageRef.current = initial[initial.length - 1]?.id || null
        } else {
          setHasMore(false)
          oldestMessageRef.current = null
        }

        const newMessages = initial.filter(m => !idsRef.current.has(m.id))
        if (newMessages.length > 0) {
          setMessages(prev => {
            const updated = [...prev, ...newMessages]
            return truncateMessages(updated)
          })
          newMessages.forEach(m => idsRef.current.add(m.id))
        }
      } catch (error) {
        console.error('Error loading initial messages:', error)
      } finally {
        setLoading(false)
      }
    }

    loadInitialMessages()
  }, [roomId])

  useEffect(() => {
    if (!roomId) return

    console.log('🔄 Setting up chat subscription for room:', roomId)

    subscriptionRef.current = ChatService.subscribe(roomId, {
      onInsert: (msg) => {
        if (!msg?.id || idsRef.current.has(msg.id)) return

        console.log('💬 New message received in hook:', msg)

        idsRef.current.add(msg.id)
        setMessages(xs => {
          const updated = [...xs, {
            ...msg,
            username: msg.username || profile?.username
          }]
          return truncateMessages(updated)
        })
      },
      onDelete: (msg) => {
        if (!msg?.id) return
        idsRef.current.delete(msg.id)
        setMessages((xs) => xs.filter((m) => m.id !== msg.id))
      },
    })

    return () => {
      console.log('🧹 Cleaning up chat subscription for room:', roomId)
      if (subscriptionRef.current) {
        try {
          subscriptionRef.current()
        } catch (e) {
          console.warn('[useChat] unsubscribe failed:', e?.message || e)
        }
      }
    }
  }, [roomId, profile])

  const send = async (raw) => {
    if (!user || !profile) return false

    const clean = sanitizeText(raw, { max: 800 })
    if (!clean) return false

    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const tempMsg = {
      id: tempId,
      userId: user.id,
      roomId,
      createdAt: new Date(),
      content: clean,
      __optimistic: true,
      username: profile.username
    }

    setMessages(xs => {
      const updated = [...xs, tempMsg]
      return truncateMessages(updated)
    })
    idsRef.current.add(tempId)

    try {
      const saved = await ChatService.send(roomId, clean)

      setMessages(xs => xs.map(m =>
        m.id === tempId ? { ...saved, username: profile.username } : m
      ))

      if (idsRef.current.has(tempId)) {
        idsRef.current.delete(tempId)
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

  return {
    user,
    messages,
    send,
    remove,
    loadMore,
    hasMore,
    loading
  }
}