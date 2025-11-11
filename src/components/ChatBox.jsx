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

export default function ChatBox({ roomId }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { messages, send, remove } = useChat(roomId)
  const [text, setText] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    queueMicrotask(() => {
      listRef.current?.scrollTo?.({
        top: listRef.current.scrollHeight,
        behavior: 'instant',
      })
    })
  }, [roomId])

  const onSubmit = async (e) => {
    e?.preventDefault()
    if (!user) return
    if (!text.trim()) return

    const ok = await send(text)
    if (ok) setText('')

    queueMicrotask(() => {
      listRef.current?.scrollTo?.({
        top: listRef.current.scrollHeight,
        behavior: 'smooth',
      })
    })
  }

  return (
    <Box sx={{ border: '1px solid rgba(255,255,255,0.3)', borderRadius: 1, p: 2 }}>
      <Stack spacing={1.5}>
        <Box ref={listRef} sx={{ maxHeight: '40dvh', overflowY: 'auto', px: 0.5 }}>
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
        )}
      </Stack>
    </Box>
  )
}
