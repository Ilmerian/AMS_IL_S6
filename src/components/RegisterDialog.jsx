// src/components/RegisterDialog.jsx
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthService } from '../services/AuthService'
import PasswordStrength from './PasswordStrength'
import { passwordIssues, isPasswordStrong } from '../utils/validators'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'

import InputAdornment from '@mui/material/InputAdornment'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

export default function RegisterDialog({ open, onClose, onSwitchToLogin }) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  
  const [showPw, setShowPw] = useState(false)
  const [showPw2, setShowPw2] = useState(false)

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [success, setSuccess] = useState(false)

  const issues = useMemo(() => passwordIssues(pw), [pw])
  const mismatch = pw && pw2 && pw !== pw2

  const handleClose = () => {
    setSuccess(false)
    setMsg('')
    setEmail('')
    setPw('')
    setPw2('')
    setShowPw(false)
    setShowPw2(false)
    onClose()
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setMsg('')
    if (mismatch) { setMsg(t('auth.passwords_no_match')); return }
    if (!isPasswordStrong(pw)) { setMsg(t('auth.password_too_weak')); return }

    setLoading(true)
    try {
      await AuthService.signUp(
        { email, password: pw, metadata: { username: email.split('@')[0] } },
        { redirectTo: window.location.origin }
      )
      setSuccess(true)
      setMsg(t('auth.account_created'))
    } catch (err) {
      setMsg(err?.message || t('auth.signup_error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="xs" 
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#242424', 
          backgroundImage: 'none',
          color: 'white'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {t('auth.create_account_title')}
        <IconButton onClick={handleClose} size="small" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {success ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="h6" color="success.light" gutterBottom>
              {t('settings.saved')}
            </Typography>
            <Typography sx={{ mb: 2 }}>{msg}</Typography>
            <Button variant="outlined" onClick={handleClose}>
              Fermer
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={onSubmit} sx={{ pt: 1 }}>
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
                type={showPw ? 'text' : 'password'}
                placeholder={t('auth.password_placeholder')}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
                fullWidth
                helperText={t('auth.policy_hint')}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPw(!showPw)}
                        edge="end"
                        sx={{ color: 'rgba(255,255,255,0.7)' }}
                      >
                        {showPw ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <PasswordStrength value={pw} />

              <TextField
                label={t('auth.confirm_password')}
                // TOGGLE TYPE
                type={showPw2 ? 'text' : 'password'}
                placeholder={t('auth.password_placeholder')}
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                required
                fullWidth
                error={Boolean(mismatch)}
                helperText={mismatch ? t('auth.passwords_no_match') : ' '}
                // BOUTON OEIL
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPw2(!showPw2)}
                        edge="end"
                        sx={{ color: 'rgba(255,255,255,0.7)' }}
                      >
                        {showPw2 ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              {issues.length > 0 && (
                <Box component="ul" sx={{ mt: -1, mb: 0, opacity: 0.9, fontSize: '0.85rem', pl: 3 }}>
                  {issues.map((k) => <li key={k}>{t(`password.issue.${k}`, k)}</li>)}
                </Box>
              )}

              {msg && <Typography color="error" variant="body2">{msg}</Typography>}

              <Button type="submit" variant="contained" disabled={loading} size="large">
                {loading ? t('auth.creating') : t('auth.create_account')}
              </Button>

              <Box sx={{ textAlign: 'center', pt: 1, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>
                  {t('auth.have_account')}
                </Typography>
                <Button variant="outlined" size="small" onClick={onSwitchToLogin}>
                  {t('auth.sign_in')}
                </Button>
              </Box>
            </Stack>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}