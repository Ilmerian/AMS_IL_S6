// src/components/GuestUpgradeBanner.jsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { AuthService } from '../services/AuthService'

export default function GuestUpgradeBanner({ redirectTo }) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const sendLink = async (e) => {
    e.preventDefault()
    setMsg('')
    if (!email.trim()) return
    setBusy(true)
    try {
      await AuthService.signIn(email.trim(), {
        redirectTo: redirectTo || window.location.href,
      })
      setMsg(t('auth.magic_link_sent'))
    } catch (e2) {
      setMsg(e2?.message || t('auth.magic_link_failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        border: '1px dashed rgba(255,255,255,0.35)',
        backdropFilter: 'saturate(140%) blur(6px)',
      }}
    >
      <form onSubmit={sendLink}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField
            type="email"
            label={t('auth.email_label')}
            placeholder={t('auth.email_placeholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            size="small"
            fullWidth
          />
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? t('common.sending') : t('auth.get_magic_link')}
          </Button>
        </Stack>
        {msg && (
          <Typography sx={{ mt: 1, opacity: 0.9 }} role="status">
            {msg}
          </Typography>
        )}
      </form>
    </Paper>
  )
}
