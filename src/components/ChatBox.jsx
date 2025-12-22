// src/components/ChatBox.jsx
import { useEffect, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/auth'
import { useChat } from '../hooks/useChat'
import { useChatPolling } from '../hooks/useChatPolling'
import { stringToColor } from '../utils/formatters'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'

import Picker from "emoji-picker-react";
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';

export default function ChatBox({ roomId, isBanned }) {
  const { t } = useTranslation()
  const { user } = useAuth()

  const isProduction = typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'

  const chatDataRealtime = useChat(roomId)
  const chatDataPolling = useChatPolling(roomId)

  const chatData = isProduction ? chatDataPolling : chatDataRealtime
  const { messages, send, remove, loadMore, hasMore } = chatData

  const [text, setText] = useState('')
  const listRef = useRef(null)

  const [isAtBottom, setIsAtBottom] = useState(true)
  const [prevScrollHeight, setPrevScrollHeight] = useState(0)

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const scrollToBottom = (behavior) => {
    const list = listRef.current
    if (list) {
      list.scrollTo({
        top: list.scrollHeight,
        behavior: behavior,
      })
    }
  }

  useEffect(() => {
    const list = listRef.current
    if (!list) return

    const currentScrollHeight = list.scrollHeight

    if (list.scrollTop === 0 && currentScrollHeight > list.clientHeight) {
      if (messages.length > 0) {
        queueMicrotask(() => scrollToBottom('instant'))
      }
      setIsAtBottom(true)
      setPrevScrollHeight(currentScrollHeight)
      return
    }

    if (isAtBottom) {
      queueMicrotask(() => {
        scrollToBottom('smooth')
        setPrevScrollHeight(currentScrollHeight)
      })
    }

    if (currentScrollHeight > prevScrollHeight && !isAtBottom) {
      const offset = currentScrollHeight - prevScrollHeight
      list.scrollTop += offset
    }

    setPrevScrollHeight(currentScrollHeight)

  }, [messages, roomId, isAtBottom, prevScrollHeight])

  const onSubmit = async (e) => {
    e?.preventDefault()
    if (!user) return
    if (!text.trim()) return

    const originalText = text
    setText('')

    const ok = await send(originalText)

    if (!ok) {
      setText(originalText)
    }

    queueMicrotask(() => {
      scrollToBottom('smooth')
      setIsAtBottom(true)
    })
  }

  const handleScroll = () => {
    const list = listRef.current
    if (list) {
      const tolerance = 10
      const newIsAtBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - tolerance
      if (newIsAtBottom !== isAtBottom) {
        setIsAtBottom(newIsAtBottom)
      }
    }
  }

  const handleLoadMore = () => {
    const list = listRef.current
    if (list) {
      setPrevScrollHeight(list.scrollHeight)
    }
    loadMore()
  }

  const onEmojiClick = (emojiData) => {
    setText(prev => prev + emojiData.emoji);
  };

  return (
    <Box sx={{ height: '100%', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 1, p: 2, boxSizing: 'border-box' }}>
      <Stack spacing={1.5} sx={{ height: '100%' }}>

        {isProduction && (
          <Box sx={{ textAlign: 'center', py: 1, bgcolor: 'warning.main', color: 'warning.contrastText', borderRadius: 1 }}>
            <Typography variant="caption">
              Production Mode: Chat updates every 3 seconds
            </Typography>
          </Box>
        )}

        <Box
          ref={listRef}
          onScroll={handleScroll}
          sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 0.5 }}
        >
          {hasMore && (
            <Box sx={{ textAlign: 'center', py: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<ExpandLessIcon />}
                onClick={handleLoadMore}
              >
                {t('chat.load_more')}
              </Button>
            </Box>
          )}

          {messages.map((m) => {
            const displayName = m.username ||
              m.userId?.slice(0, 6) ||
              t('chat.guest');

            const userColor = stringToColor(m.userId || displayName);

            return (
              <Stack
                key={m.id}
                direction="row"
                spacing={1}
                alignItems="flex-start"
                sx={{ py: 0.75, opacity: m.__error ? 0.6 : 1 }}
              >
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    <b style={{ color: userColor }}>{displayName}</b> ·{' '}
                    <span style={{ fontSize: '0.85em', opacity: 0.7 }}>
                      {new Date(m.createdAt).toLocaleTimeString()}
                    </span>
                    {m.__optimistic ? ` · ${t('chat.sending')}` : ''}
                    {m.__error ? ` · ${t('chat.failed')}` : ''}
                  </Typography>
                  <div style={{ wordBreak: 'break-word' }}>{m.content}</div>
                </Box>
                {m.userId === user?.id && !m.__optimistic && (
                  <IconButton
                    size="small"
                    color="inherit"
                    onClick={() => remove(m.id)}
                    aria-label={t('chat.delete')}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            )
          })}
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
          !isBanned ? (
            <Box sx={{ position: "relative", width: "100%" }}>
              <Stack component="form" direction="row" spacing={1} onSubmit={onSubmit}>

                {/* Bouton Emoji */}
                <IconButton
                  onClick={() => setShowEmojiPicker(prev => !prev)}
                  color="primary"
                  sx={{ alignSelf: "center" }}
                >
                  <EmojiEmotionsIcon />
                </IconButton>

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

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <Box
                  sx={{
                    position: "absolute",
                    bottom: "50px",
                    left: "10px",
                    zIndex: 9999
                  }}
                >
                  <Picker
                    theme="dark"
                    onEmojiClick={(emojiData) => onEmojiClick(emojiData)}
                  />
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center', opacity: 0.8 }}>
              <Typography color="error">
                {t('chat.banned_message')}
              </Typography>
            </Box>
          )
        )}
      </Stack>
    </Box>
  )
}