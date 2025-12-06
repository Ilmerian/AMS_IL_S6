// src/components/LoginDialog.jsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthService } from '../services/AuthService'

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
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'

import InputAdornment from '@mui/material/InputAdornment'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

export default function LoginDialog({ open, onClose, onSwitchToRegister }) {
  const { t } = useTranslation()
  const [mode, setMode] = useState('password') 
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const handleClose = () => {
    setMsg('')
    setEmail('')
    setPw('')
    setShowPassword(false) 
    onClose()
  }

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
      await AuthService.signInWithPassword({ 
        email, 
        password: pw,
        remember: rememberMe
      })
      handleClose()
    } catch (err) {
      setMsg(err?.message || t('auth.signin_error'))
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
        {t('auth.loginTitle')}
        <IconButton onClick={handleClose} size="small" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          
          <Stack direction="row" spacing={1}>
            <Button
              variant={mode === 'password' ? 'contained' : 'outlined'}
              onClick={() => setMode('password')}
              size="small"
              fullWidth
            >
              {t('auth.mode.password')}
            </Button>
            <Button
              variant={mode === 'magic' ? 'contained' : 'outlined'}
              onClick={() => setMode('magic')}
              size="small"
              fullWidth
            >
              {t('auth.mode.magic')}
            </Button>
          </Stack>

          {mode === 'magic' && (
            <Box component="form" onSubmit={doMagic}>
              <Stack spacing={2}>
                <TextField
                  type="email"
                  label={t('auth.email')}
                  placeholder={t('auth.email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                />
                <Button type="submit" disabled={loading} variant="contained">
                  {loading ? t('auth.sending') : t('auth.send_magic')}
                </Button>
                
                <Button href="/reset" variant="text" size="small" sx={{ alignSelf: 'flex-start' }}>
                  {t('auth.forgot')}
                </Button>
              </Stack>
            </Box>
          )}

          {mode === 'password' && (
            <Box component="form" onSubmit={doPasswordLogin}>
              <Stack spacing={2}>
                <TextField
                  type="email"
                  label={t('auth.email')}
                  placeholder={t('auth.email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  type={showPassword ? 'text' : 'password'}
                  label={t('auth.password')}
                  placeholder={t('auth.password_placeholder')}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  required
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: 'rgba(255,255,255,0.7)' }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />           
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        size="small"
                        sx={{ color: 'rgba(255,255,255,0.7)' }}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        {t('auth.remember_me') || 'Remember me'}
                      </Typography>
                    }
                  />
                </Box>                
                <Button type="submit" disabled={loading} variant="contained">
                  {loading ? t('auth.signing') : t('auth.sign_in')}
                </Button>
                
                <Button href="/reset" variant="text" size="small" sx={{ alignSelf: 'flex-start' }}>
                  {t('auth.forgot')}
                </Button>
              </Stack>
            </Box>
          )}

          {msg && <Typography color="error" variant="body2">{msg}</Typography>}

          <Box sx={{ textAlign: 'center', pt: 1, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>
              {t('auth.no_account')}
            </Typography>
            <Button variant="outlined" size="small" onClick={onSwitchToRegister}>
              {t('auth.create_account')}
            </Button>
          </Box>

        </Stack>
      </DialogContent>
    </Dialog>
  )
}