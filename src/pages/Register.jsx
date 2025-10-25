// src/pages/Register.jsx
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthService } from '../services/AuthService'
import PasswordStrength from '../components/PasswordStrength'
import { passwordIssues, isPasswordStrong } from '../utils/validators'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'

export default function Register() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const issues = useMemo(() => passwordIssues(pw), [pw])
  const mismatch = pw && pw2 && pw !== pw2

  const onSubmit = async (e) => {
    e.preventDefault()
    setMsg('')
    if (mismatch) { setMsg(t('auth.passwords_no_match')); return }
    if (!isPasswordStrong(pw)) { setMsg(t('auth.password_too_weak')); return }

    setLoading(true)
    try {
      await AuthService.signUp(
        { email, password: pw, metadata: { username: email.split('@')[0] } },
        {}
      )
      setMsg(t('auth.account_created'))
    } catch (err) {
      setMsg(err?.message || t('auth.signup_error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box className="fullbleed" sx={{ py: 6, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>{t('auth.create_account_title')}</Typography>

      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2}>
          <TextField
            label={t('auth.email')}
            type="email"
            placeholder={t('auth.email_placeholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
          />

          <TextField
            label={t('auth.password')}
            type="password"
            placeholder={t('auth.password_placeholder')}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
            fullWidth
            helperText={t('auth.policy_hint')}
          />
          <PasswordStrength value={pw} />

          <TextField
            label={t('auth.confirm_password')}
            type="password"
            placeholder={t('auth.password_placeholder')}
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            required
            fullWidth
            error={Boolean(mismatch)}
            helperText={mismatch ? t('auth.passwords_no_match') : ' '}
          />

          {issues.length > 0 && (
            <Box component="ul" sx={{ mt: -1, mb: 0, opacity: 0.9, fontSize: '0.9rem', pl: 3 }}>
              {issues.map((k) => <li key={k}>{t(`password.issue.${k}`, k)}</li>)}
            </Box>
          )}

          <Stack direction="row" spacing={1}>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? t('auth.creating') : t('auth.create_account')}
            </Button>
            <Button href="/login" variant="outlined">
              {t('auth.have_account')}
            </Button>
          </Stack>

          {msg && (
            <Typography role="status" color="text.secondary" sx={{ opacity: 0.9 }}>
              {msg}
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  )
}
