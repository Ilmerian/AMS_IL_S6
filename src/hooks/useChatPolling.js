// src/hooks/useChatPolling.js
import { useEffect, useRef, useState } from 'react'
import { ChatService } from '../services/ChatService'
import { useAuth } from '../context/auth'

/**
 * Hook de chat basé sur le polling
 * @param {string} roomId
 */

export function useChatPolling(roomId) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef(null)
  const isProduction = typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'

  const loadMessages = async () => {
    if (!roomId) return

    try {
      const newMessages = await ChatService.listByRoom(roomId, { limit: 100 })
      setMessages(newMessages)
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isProduction || !roomId) return

    loadMessages()

    intervalRef.current = setInterval(loadMessages, 3000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [roomId, isProduction])

  const send = async (content) => {
    if (!user) return false

    try {
      await ChatService.send(roomId, content)
      setTimeout(loadMessages, 500)
      return true
    } catch (error) {
      console.error('Error sending message:', error)
      return false
    }
  }

  const remove = async (messageId) => {
    if (!user) return false

    try {
      await ChatService.remove(messageId)
      setTimeout(loadMessages, 500)
      return true
    } catch (error) {
      console.error('Error deleting message:', error)
      return false
    }
  }
  return {
    messages,
    send,
    remove,
    loading,
    isPolling: isProduction
  }
}