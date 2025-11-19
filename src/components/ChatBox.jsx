// src/components/ChatBox.jsx
import { useEffect, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/auth'
import { useChat } from '../hooks/useChat'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
// Icône pour "Afficher plus"
import ExpandLessIcon from '@mui/icons-material/ExpandLess'

// NOUVEAU: Accepte la prop isBanned
export default function ChatBox({ roomId, isBanned }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { messages, send, remove, loadMore, hasMore } = useChat(roomId)
  const [text, setText] = useState('')
  const listRef = useRef(null)

  //  ÉTAT : Pour suivre si l'utilisateur est ancré en bas
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [prevScrollHeight, setPrevScrollHeight] = useState(0)

  //  UTILITAIRE : Pour effectuer le défilement
  const scrollToBottom = (behavior) => {
    const list = listRef.current
    if (list) {
      list.scrollTo({
        top: list.scrollHeight,
        behavior: behavior,
      })
    }
  }

  // GÈRE LE DÉFILEMENT INITIAL (changement de salon) ET L'ARRIVÉE DE NOUVEAUX MESSAGES
  useEffect(() => {
    const list = listRef.current
    if (!list) return

    const currentScrollHeight = list.scrollHeight

    // 1. DÉFILEMENT À L'OUVERTURE (Changement de `roomId`)
    if (list.scrollTop === 0 && currentScrollHeight > list.clientHeight) {
      // Si on est au tout début d'un nouveau salon, défilement direct
      if (messages.length > 0) {
        queueMicrotask(() => scrollToBottom('instant'))
      }
      setIsAtBottom(true)
      setPrevScrollHeight(currentScrollHeight)
      return
    }

    // 2. NOUVEAUX MESSAGES (Défilement seulement si l'utilisateur est déjà en bas)
    if (isAtBottom) {
      // Défilement doux pour les nouveaux messages
      queueMicrotask(() => {
        scrollToBottom('smooth')
        setPrevScrollHeight(currentScrollHeight)
      })
    }
    
    // 3. CHARGEMENT D'HISTORIQUE (Pagination): Position inchangée
    if (currentScrollHeight > prevScrollHeight && !isAtBottom) {
        const offset = currentScrollHeight - prevScrollHeight
        list.scrollTop += offset
    }

    setPrevScrollHeight(currentScrollHeight)

  }, [messages, roomId, isAtBottom])

  // GÈRE LE DÉFILEMENT LORS DE L'ENVOI D'UN MESSAGE PAR L'UTILISATEUR
  const onSubmit = async (e) => {
    e?.preventDefault()
    if (!user) return
    if (!text.trim()) return

    const ok = await send(text)
    if (ok) setText('')

    // DÉFILEMENT DOUX POUR LE MESSAGE DE L'UTILISATEUR (Consigne)
    queueMicrotask(() => {
      scrollToBottom('smooth')
      setIsAtBottom(true) // L'utilisateur est maintenant ancré en bas
    })
  }

  // GÈRE LE SUIVI DE LA POSITION DE DÉFILEMENT DE L'UTILISATEUR
  const handleScroll = () => {
    const list = listRef.current
    if (list) {
      // On utilise une petite marge (ex: 10px) pour la tolérance
      const tolerance = 10
      const newIsAtBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - tolerance
      
      // Mettre à jour l'état uniquement si la valeur change
      if (newIsAtBottom !== isAtBottom) {
        setIsAtBottom(newIsAtBottom)
      }
    }
  }

  // Fonction pour charger plus de messages
  const handleLoadMore = () => {
      const list = listRef.current
      if (list) {
        // Enregistrer la hauteur actuelle pour maintenir la position
        setPrevScrollHeight(list.scrollHeight) 
      }
      loadMore()
  }

  return (
    <Box sx={{ border: '1px solid rgba(255,255,255,0.3)', borderRadius: 1, p: 2 }}>
      <Stack spacing={1.5}>
        <Box 
          ref={listRef}
          onScroll={handleScroll}
          sx={{ maxHeight: '60dvh', minHeight: '40dvh', overflowY: 'auto', px: 0.5 }}
        >
          {/* BANDEAU "AFFICHER PLUS" */}
          {hasMore && (
            <Box sx={{ textAlign: 'center', py: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<ExpandLessIcon />}
                onClick={handleLoadMore}
              >
                {t('chat.load_more', 'Afficher plus')}
              </Button>
            </Box>
          )}
          {/* FIN BANDEAU */}


          {messages.map((m) => (
            <Stack
              key={m.id}
              direction="row"
              spacing={1}
              alignItems="flex-start"
              sx={{ py: 0.75, opacity: m.__error ? 0.6 : 1 }}
            >
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  <b>{m.userId?.slice(0, 6) || t('chat.guest')}</b> ·{' '}
                  {new Date(m.createdAt).toLocaleTimeString()}
                  {m.__optimistic ? ` · ${t('chat.sending')}` : ''}
                  {m.__error ? ` · ${t('chat.failed')}` : ''}
                </Typography>
                <div>{m.content}</div>
              </Box>
              {m.userId === user?.id && !m.__optimistic && (
                <IconButton
                  size="small"
                  color="inherit"
                  onClick={() => remove(m.id)}
                  aria-label={t('chat.delete', 'Supprimer')}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          ))}
        </Box>

        {!user ? (
          <Box
            sx={{
              border: '1px dashed rgba(255,255,255,0.4)',
              borderRadius: 1,
              p: 2,
              textAlign: 'center',
              opacity: 0.9,
            }}
          >
            <Typography sx={{ mb: 1.25 }}>
              {t('chat.signin_hint')}
            </Typography>
            <Button
              component={RouterLink}
              to="/login"
              size="small"
              variant="contained"
              color="primary"
            >
              {t('nav.login')}
            </Button>
          </Box>
        ) : (
          // LOGIQUE MODIFIÉE POUR GÉRER isBanned
          !isBanned ? (
            <Stack component="form" direction="row" spacing={1} onSubmit={onSubmit}>
              <TextField
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('chat.placeholder')}
                autoComplete="off"
                fullWidth
                size="small"
              />
              <Button type="submit" variant="contained" color="primary">
                {t('chat.send')}
              </Button>
            </Stack>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center', opacity: 0.8 }}>
              <Typography color="error">
                {t('chat.banned_message', 'Vous avez été banni de cette salle.')}
              </Typography>
            </Box>
          )
        )}
      </Stack>
    </Box>
  )
}