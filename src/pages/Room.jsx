// src/pages/Room.jsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/auth'
import GuestUpgradeBanner from '../components/GuestUpgradeBanner'
import { useParams } from 'react-router-dom'

import { useRoom } from '../hooks/useRoom'
import { usePlaylistForRoom } from '../hooks/usePlaylistForRoom'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'

import ChatBox from '../components/ChatBox'
import Section from '../ui/Section'
import VideoPlayerShell from '../components/VideoPlayerShell'
import PlaylistPanel from '../components/PlaylistPanel'

export default function Room() {
  const { t } = useTranslation()
  const { roomId } = useParams()
  const { user } = useAuth()

  const [pw, setPw] = useState('')

  const {
    room,
    needPw,
    checked,
    error: err,
    verifyPassword,
  } = useRoom(roomId)

  const {
    playlistId,
    embedUrl,
    addVideoByRawUrl,
    playYouTubeId,
  } = usePlaylistForRoom({ room, roomId, accessGranted: !needPw || checked })

  const verify = async (e) => {
    e.preventDefault()
    const ok = await verifyPassword(pw)
    if (ok) setPw('')
  }

  const handleAddVideo = addVideoByRawUrl
  const handlePlay = playYouTubeId

  if (!room) return null

  return (
    <Section>
      {!user && (
        <Box sx={{ mb: 2 }}>
          <GuestUpgradeBanner />
        </Box>
      )}

      <Typography variant="h4" gutterBottom>{room.name}</Typography>
      <Typography sx={{ opacity: 0.8 }}>
        {room.password ? t('room.private') : t('room.public')}
      </Typography>

      {needPw && !checked ? (
        <Box component="form" onSubmit={verify} sx={{ mt: 2, maxWidth: 480 }}>
          <Stack spacing={2}>
            <Typography>{t('room.enterPassword')}</Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                type="password"
                placeholder={t('room.password_placeholder')}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                fullWidth
              />
              <Button type="submit" variant="contained">
                {t('room.join')}
              </Button>
            </Stack>
            {err && <Typography color="error" role="alert">{err}</Typography>}
          </Stack>
        </Box>
      ) : (
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} lg={8}>
            <VideoPlayerShell embedUrl={embedUrl} />
          </Grid>

          <Grid item xs={12} lg={4}>
            <PlaylistPanel
              playlistId={playlistId}
              onAdd={handleAddVideo}
              onPlay={handlePlay}
            />
          </Grid>

          <Grid item xs={12}>
            <ChatBox roomId={roomId} />
          </Grid>
        </Grid>
      )}
    </Section>
  )
}
