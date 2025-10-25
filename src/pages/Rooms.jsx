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

export default function Rooms() {
  const { t } = useTranslation()
  const [rooms, setRooms] = useState([])
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const { user } = useAuth()

  const load = async () => {
    const list = user ? await RoomService.listMy() : await RoomService.listPublic()
    setRooms(list)
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
              <Link
                component={RouterLink}
                to={`/rooms/${r.id}`}
                underline="hover"
                color="primary.light"
                sx={{
                  fontSize: '1.05rem', fontWeight: 500,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}
              >
                {r.name}
              </Link>
              <Divider orientation="vertical" flexItem sx={{ mx: 1.5, opacity: 0.2 }} />
              {user && (
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  {r.password ? t('rooms.visibility.private') : t('rooms.visibility.public')}
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
