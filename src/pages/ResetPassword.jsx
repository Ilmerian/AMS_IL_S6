// src/pages/ResetPassword.jsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthService } from '../services/AuthService'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'

export default function ResetPassword() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      await AuthService.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`
      })
      setMsg(t('auth.reset_sent'))
    } catch (err) {
      setMsg(err?.message || t('auth.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box className="fullbleed" sx={{ py: 6, maxWidth: 600 }}>
      <Typography variant="h4" gutterBottom>
        {t('auth.reset_title')}
      </Typography>

      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2} mt={2}>
          <TextField
            type="email"
            label={t('auth.email_address')}
            placeholder={t('auth.email_placeholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
          />
          <Button
            type="submit"
            disabled={loading}
            variant="contained"
            color="primary"
          >
            {loading ? t('auth.sending') : t('auth.send_reset')}
          </Button>
          {msg && (
            <Typography role="status" sx={{ opacity: 0.9 }}>
              {msg}
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  )
}
