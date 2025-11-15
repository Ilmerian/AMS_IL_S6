// src/pages/Rooms.jsx
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RoomService } from '../services/RoomService'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../context/auth'
import { RealtimeService } from '../services/RealtimeService'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import DeleteIcon from '@mui/icons-material/Delete'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Tooltip from '@mui/material/Tooltip'
import LockOutlined from '@mui/icons-material/LockOutlined'
import LockOpenOutlined from '@mui/icons-material/LockOpenOutlined'

export default function Rooms() {
  const { t } = useTranslation()
  const [rooms, setRooms] = useState([])
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const { user } = useAuth()

  const load = async () => {
    try {
      if (!user) {
        const pub = await RoomService.listPublic()
        setRooms(pub)
        return
      }
      const [mine, discoverable] = await Promise.all([
        RoomService.listMy(),
        RoomService.listPublic(),
      ])
      const merged = Array.from(new Map(
        [...mine, ...discoverable].map(r => [r.id, r])
      ).values())
      setRooms(merged)
    } catch (e) {
      console.error('[Rooms.load]', e)
    }
  }

  useEffect(() => { load() }, [user])
  useEffect(() => {
    const unsubs = [
      RealtimeService.onInsert({ table: 'rooms', cb: () => load() }),
      RealtimeService.onUpdate({ table: 'rooms', cb: () => load() }),
      RealtimeService.onDelete({ table: 'rooms', cb: () => load() }),
    ]
    return () => unsubs.forEach((off) => off?.())
  }, [user])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    const onOnline = () => load()

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [user])

  const confirmDelete = (room) => { setToDelete(room); setErr('') }
  const cancelDelete = () => { setToDelete(null); setErr('') }

  const doDelete = async () => {
    if (!toDelete) return
    setBusy(true); setErr('')
    try {
      await RoomService.remove(toDelete.id)
      setToDelete(null)
      await load()
    } catch (e) {
      setErr(e?.message || t('rooms.errors.deleteFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box
      className="fullbleed"
      sx={{ py: 6, maxWidth: 900, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" fontWeight="bold">
          {user ? t('rooms.titleMy') : t('rooms.titlePublic')}
        </Typography>
        {user && (
          <Button component={RouterLink} to="/rooms/new" variant="contained" color="primary">
            {t('rooms.newRoom')}
          </Button>
        )}
      </Stack>

      <Stack spacing={2}>
        {rooms.length === 0 && (
          <Typography sx={{ opacity: 0.85 }}>
            {user ? t('rooms.emptyMy') : t('rooms.emptyPublic')}
          </Typography>
        )}

        {rooms.map((r) => (
          <Paper
            key={r.id}
            elevation={1}
            sx={{
              px: 2, py: 1.5,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 2,
              backdropFilter: 'saturate(140%) blur(6px)',
              gap: 1,
            }}
          >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0, flex: 1 }}>
              <Link
                component={RouterLink}
                to={`/rooms/${r.id}`}
                underline="hover"
                color="primary.light"
                sx={{
                  fontSize: '1.05rem',
                  fontWeight: 500,
                  minWidth: 0,
                  maxWidth: '100%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {r.name}
              </Link>

              {(r?.hasPassword ?? r?.password) ? (
                <Tooltip title={t('rooms.visibility.private')}>
                  <LockOutlined fontSize="small" aria-label="Private room (password required)" />
                </Tooltip>
              ) : (
                <Tooltip title={t('rooms.visibility.public')}>
                  <LockOpenOutlined fontSize="small" aria-label="Public room" />
                </Tooltip>
              )}
            </Stack>

            <Divider orientation="vertical" flexItem sx={{ mx: 1.5, opacity: 0.2 }} />

            {user && (
              <Typography variant="body2" sx={{ opacity: 0.7, whiteSpace: 'nowrap' }}>
                {(r?.hasPassword ?? r?.password)
                  ? t('rooms.visibility.private')
                  : t('rooms.visibility.public')}
              </Typography>
            )}
          </Stack>


            {user && r.ownerId === user.id &&  (
              <IconButton
                aria-label={t('rooms.aria.deleteRoom', { name: r.name })}
                color="error"
                onClick={() => confirmDelete(r)}
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Paper>
        ))}
      </Stack>

      <Dialog open={!!toDelete} onClose={cancelDelete}>
        <DialogTitle>{t('rooms.dialog.deleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography sx={{ opacity: 0.9 }}>
            {t('rooms.dialog.deleteBody', { name: toDelete?.name })}
          </Typography>
          {err && <Typography color="error" sx={{ mt: 1 }}>{err}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} disabled={busy}>{t('rooms.dialog.cancel')}</Button>
          <Button onClick={doDelete} color="error" variant="contained" disabled={busy}>
            {busy ? t('rooms.dialog.deleting') : t('rooms.dialog.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
