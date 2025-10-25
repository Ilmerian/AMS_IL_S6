// src/pages/RoomCreate.jsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { RoomService } from '../services/RoomService'
import { sanitizeText } from '../utils/validators'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Paper from '@mui/material/Paper'

export default function RoomCreate() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setMsg('')
    if (!name.trim()) {
      setMsg(t('roomCreate.error_name_required'))
      return
    }

    const cleanName = sanitizeText(name, { max: 100 })
    if (!cleanName) {
      setMsg(t('roomCreate.error_name_required'))
      return
    }

    if (isPrivate && password.trim().length < 3) {
      setMsg(t('roomCreate.error_password_short'))
      return
    }

    setLoading(true)
    try {
      const room = await RoomService.create({
        name: cleanName,
        password: isPrivate ? password.trim() : null,
      })
      navigate(`/rooms/${room.id}`, { replace: true })
    } catch (err) {
      setMsg(err?.message || t('roomCreate.error_creating'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box className="fullbleed" sx={{ py: 6, maxWidth: 560, mx: 'auto' }}>
      <Paper elevation={1} sx={{ p: { xs: 3, md: 4 } }}>
        <Typography variant="h4" gutterBottom>
          {t('roomCreate.title')}
        </Typography>
        <Typography sx={{ opacity: 0.85, mb: 3 }}>
          {t('roomCreate.subtitle')}
        </Typography>

        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2.5}>
            <TextField
              label={t('roomCreate.name_label')}
              placeholder={t('roomCreate.name_placeholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                />
              }
              label={t('roomCreate.private_label')}
            />

            {isPrivate && (
              <TextField
                label={t('roomCreate.password_label')}
                type="password"
                placeholder={t('roomCreate.password_placeholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
              />
            )}

            <Stack direction="row" spacing={1}>
              <Button type="submit" variant="contained" disabled={loading}>
                {loading ? t('roomCreate.creating') : t('roomCreate.create')}
              </Button>
              <Button component={RouterLink} to="/rooms" variant="outlined">
                {t('roomCreate.cancel')}
              </Button>
            </Stack>

            {msg && (
              <Typography role="alert" color="text.secondary" sx={{ opacity: 0.9 }}>
                {msg}
              </Typography>
            )}
          </Stack>
        </Box>
      </Paper>
    </Box>
  )
}
