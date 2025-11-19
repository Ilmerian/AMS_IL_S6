// src/hooks/useChat.js
import { useEffect, useRef, useState, useCallback } from 'react'
import { ChatService } from '../services/ChatService'
import { sanitizeText } from '../utils/validators'
import { useAuth } from '../context/auth'

// CONSTANTES POUR LA GESTION DE LA PAGINATION ET DES LIMITES
const PAGE_SIZE = 50 
// Nombre de messages (50) à charger par page (pour la pagination vers le haut)
const MAX_MESSAGES = 100 
// Nombre maximum de messages (100) à conserver dans l'état local (pour la fluidité)

export function useChat(roomId) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  // État pour savoir s'il y a plus d'historique à charger
  const [hasMore, setHasMore] = useState(false)
  const idsRef = useRef(new Set())
  // Ref pour stocker le timestamp (ou ID) du plus ancien message chargé
  const oldestMessageRef = useRef(null)

  // Fonction pour tronquer les messages
  const truncateMessages = (newMessages) => {
    // Si la longueur dépasse MAX_MESSAGES, tronquer par le haut (les plus anciens)
    if (newMessages.length > MAX_MESSAGES) {
      const excess = newMessages.length - MAX_MESSAGES
      const truncated = newMessages.slice(excess)
      
      // Mettre à jour oldestMessageRef avec l'ID du nouveau premier message
      oldestMessageRef.current = truncated[0]?.id || null

      // Mettre à jour idsRef pour ne contenir que les IDs des messages conservés
      idsRef.current = new Set(truncated.map(m => m.id))
      
      // Assurer qu'il y a un historique potentiel à charger
      setHasMore(true) 
      return truncated
    }
    return newMessages
  }

  // Fonction de chargement de l'historique (pour la pagination)
  const loadMore = useCallback(async () => {
    if (!roomId || !hasMore || !oldestMessageRef.current) return
    
    // On charge la page précédente en utilisant l'ID du message le plus ancien actuel
    const newMessages = await ChatService.listByRoom(roomId, {
      limit: PAGE_SIZE,
      before: oldestMessageRef.current, // Utilise l'ID pour la pagination
    })

    if (newMessages.length === 0) {
      setHasMore(false)
      return
    }

    // Mise à jour de l'ID le plus ancien
    oldestMessageRef.current = newMessages[0].id
    
    // Mettre à jour idsRef et fusionner
    setMessages(currentMessages => {
      // Filtrer les messages déjà présents pour éviter les doublons (bien que 'before' doive l'éviter)
      const uniqueNewMessages = newMessages.filter(m => !idsRef.current.has(m.id))
      
      uniqueNewMessages.forEach(m => idsRef.current.add(m.id))

      // Ajouter les nouveaux messages en tête (plus anciens)
      const mergedMessages = [...uniqueNewMessages, ...currentMessages]
      
      // La pagination est faite sans tronquer l'historique fraîchement chargé.
      // Si on veut vraiment ne jamais dépasser MAX_MESSAGES, on devrait le faire ici aussi,
      // mais pour l'instant, on laisse l'utilisateur charger un peu plus.
      return mergedMessages
    })
    
    // Si la page chargée est inférieure à PAGE_SIZE, il n'y a probablement plus rien
    if (newMessages.length < PAGE_SIZE) {
        setHasMore(false)
    }

  }, [roomId, hasMore])

  useEffect(() => {
    setMessages([])
    idsRef.current = new Set()

    if (!roomId) return

    let _cancelled = false
    let unsub = () => {}

    // On réinitialise à chaque changement de salon
    setMessages([])
    setHasMore(false)
    idsRef.current = new Set()
    oldestMessageRef.current = null


    ;(async () => {
      // Chargement initial: on charge plus que PAGE_SIZE pour avoir une marge de manœuvre
      // et pour pouvoir afficher le bandeau "Afficher plus" si l'historique est long.
      const initial = await ChatService.listByRoom(roomId, { limit: MAX_MESSAGES })
      
      // Vérifier s'il y a plus d'historique que ce qu'on a chargé
      if (initial.length === MAX_MESSAGES) {
          setHasMore(true)
          // Le plus ancien message chargé sera la référence pour la prochaine pagination
          oldestMessageRef.current = initial[initial.length - 1]?.id || null
      } else {
          setHasMore(false)
          oldestMessageRef.current = null
      }

      setMessages(initial)
      idsRef.current = new Set(initial.map(m => m.id))
      unsub = ChatService.subscribe(roomId, {
        onInsert: (msg) => {
          if (!msg?.id || idsRef.current.has(msg.id)) return
          idsRef.current.add(msg.id)

          setMessages(xs => {
            const updated = [...xs, msg]
            // TRONCATURE : Ne jamais garder plus de MAX_MESSAGES
            return truncateMessages(updated) 
          })
        },
        onDelete: (msg) => {
          if (!msg?.id) return
          idsRef.current.delete(msg.id)
          setMessages((xs) => xs.filter((m) => m.id !== msg.id))
        },
      })
    })()

    return () => {
      _cancelled = true
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

    setMessages(xs => {
        const updated = [...xs, tempMsg]
        // TRONCATURE : Appliquer la même règle lors de l'envoi
        return truncateMessages(updated)
    })

    try {
      const saved = await ChatService.send(roomId, clean)
      setMessages(xs => xs.map(m => (m.id === tempId ? saved : m)))

      // Mise à jour de idsRef pour le message optimiste -> réel
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

  // EXPORTER loadMore et hasMore en plus des autres parametres
  return { user, messages, send, remove, loadMore, hasMore }
}
