// src/pages/UpdatePassword.jsx
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import PasswordStrength from '../components/PasswordStrength'
import { passwordIssues, isPasswordStrong } from '../utils/validators'
import { useAuth } from '../context/auth'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'

export default function UpdatePassword() {
  const { t } = useTranslation()
  const { user, loading } = useAuth()

  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(false)

  const issues = useMemo(() => passwordIssues(pw), [pw])
  const mismatch = pw && pw2 && pw !== pw2
  const canSubmit = !busy && isPasswordStrong(pw) && !mismatch

  const onSubmit = async (e) => {
    e.preventDefault()
    setMsg('')

    if (mismatch) { setMsg(t('auth.passwords_no_match') || 'Passwords do not match'); return }
    if (!isPasswordStrong(pw)) { setMsg(t('auth.password_too_weak') || 'Password too weak'); return }

    setBusy(true)
    try {
      await supabase.auth.updateUser({ password: pw })
      setDone(true)
      setMsg(t('auth.signed_in') || 'Password updated.')
    } catch (err) {
      setMsg(err?.message || t('auth.error') || 'Error')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return null

  if (!user && !done) {
    return (
      <Box className="fullbleed" sx={{ py: 6, maxWidth: 560, mx: 'auto' }}>
        <Typography variant="h5" gutterBottom>
          {t('auth.reset_title') || 'Reset password'}
        </Typography>
        <Typography sx={{ opacity: 0.9 }}>
          {t('auth.magic_link_failed') || 'Open this page from the password-reset email link.'}
        </Typography>
        <Button href="/reset" sx={{ mt: 2 }} variant="contained">
          {t('auth.reset_title') || 'Reset password'}
        </Button>
      </Box>
    )
  }

  return (
    <Box className="fullbleed" sx={{ py: 6, maxWidth: 560, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        {t('auth.reset_title') || 'Reset password'}
      </Typography>
      <Typography sx={{ opacity: 0.85, mb: 2 }}>
        {t('auth.policy_hint') || 'Policy: 8+ chars, lower+upper, digit or symbol.'}
      </Typography>

      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2}>
          <TextField
            type="password"
            label={t('auth.password') || 'New password'}
            placeholder={t('auth.password_placeholder') || '••••••••'}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
            fullWidth
          />
          <PasswordStrength value={pw} />

          {issues.length > 0 && (
            <Box
              component="ul"
              sx={{ mt: -0.5, mb: 0, opacity: 0.9, fontSize: '0.9rem', pl: 3 }}
            >
              {issues.map((k) => (
                <li key={k}>{t(`password.issue.${k}`, k)}</li>
              ))}
            </Box>
          )}

          <TextField
            type="password"
            label={t('auth.confirm_password') || 'Confirm password'}
            placeholder={t('auth.password_placeholder') || '••••••••'}
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            required
            fullWidth
            error={Boolean(mismatch)}
            helperText={mismatch ? (t('auth.passwords_no_match') || 'Passwords do not match') : ' '}
          />

          <Stack direction="row" spacing={1}>
            <Button type="submit" variant="contained" disabled={!canSubmit}>
              {busy ? (t('auth.creating') || 'Saving...') : (t('auth.sign_in') || 'Save')}
            </Button>
            {done ? (
              <Button href="/login" variant="outlined">
                {t('nav.login') || 'Login'}
              </Button>
            ) : null}
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
