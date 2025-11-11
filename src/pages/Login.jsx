// src/pages/Login.jsx
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AuthService } from '../services/AuthService'
import PasswordStrength from '../components/PasswordStrength'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'

import { passwordIssues } from '../utils/validators'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mode, setMode] = useState('magic')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const issues = useMemo(() => passwordIssues(pw), [pw])

  const doMagic = async (e) => {
    e?.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      await AuthService.signIn(email, { redirectTo: `${window.location.origin}/` })
      setMsg(t('auth.magic_sent'))
    } catch (err) {
      setMsg(err?.message || t('auth.signin_error'))
    } finally {
      setLoading(false)
    }
  }

  const doPasswordLogin = async (e) => {
    e?.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      await AuthService.signInWithPassword({ email, password: pw })
      navigate('/')
    } catch (err) {
      setMsg(err?.message || t('auth.signin_error'))
      setLoading(false)
    }
  }

  return (
    <Box className="fullbleed" sx={{ py: 6, maxWidth: 600 }}>
      <Typography variant="h4" mb={2}>{t('auth.loginTitle')}</Typography>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button
          variant={mode === 'magic' ? 'contained' : 'outlined'}
          onClick={() => setMode('magic')}
        >
          {t('auth.mode.magic')}
        </Button>
        <Button
          variant={mode === 'password' ? 'contained' : 'outlined'}
          onClick={() => setMode('password')}
        >
          {t('auth.mode.password')}
        </Button>
      </Stack>

      {mode === 'magic' && (
        <Stack component="form" spacing={2} onSubmit={doMagic}>
          <TextField
            type="email"
            label={t('auth.email')}
            placeholder={t('auth.email_placeholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" disabled={loading} variant="contained">
            {loading ? t('auth.sending') : t('auth.send_magic')}
          </Button>
          <Button href="/reset" variant="text" size="small" sx={{ alignSelf: 'flex-start' }}>
            {t('auth.forgot')}
          </Button>
          {msg && <Typography role="status" sx={{ opacity: .9 }}>{msg}</Typography>}
        </Stack>
      )}

      {mode === 'password' && (
        <Stack component="form" spacing={2} onSubmit={doPasswordLogin} sx={{ mt: 2 }}>
          <TextField
            type="email"
            label={t('auth.email')}
            placeholder={t('auth.email_placeholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            type="password"
            label={t('auth.password')}
            placeholder={t('auth.password_placeholder')}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
            helperText={t('auth.policy_hint')}
          />
          <PasswordStrength value={pw} />
          {issues.length > 0 && (
            <Box component="ul" sx={{ mt: 1, opacity: .9, fontSize: '0.9rem', pl: 3 }}>
              {issues.map((k) => (
                <li key={k}>{t(`password.issue.${k}`, k)}</li>
              ))}
            </Box>
          )}
          <Button type="submit" disabled={loading} variant="contained">
            {loading ? t('auth.signing') : t('auth.sign_in')}
          </Button>
          <Button href="/reset" variant="text" size="small" sx={{ alignSelf: 'flex-start' }}>
            {t('auth.forgot')}
          </Button>
          {msg && <Typography role="status" sx={{ opacity: .9 }}>{msg}</Typography>}
        </Stack>
      )}
    </Box>
  )
}
