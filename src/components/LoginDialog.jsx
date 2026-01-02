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
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'

export default function LoginDialog({ open, onClose, onSwitchToRegister }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
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

  const handleModeChange = (newMode) => {
    setMode(newMode)
    setMsg('')
  }

  const doMagic = async (e) => {
    e?.preventDefault()
    if (!email.trim()) {
      setMsg(t('auth.email_required') || 'Email is required')
      return
    }
    
    setLoading(true)
    setMsg('')
    try {
      await AuthService.signIn(email, { redirectTo: `${window.location.origin}/` })
      setMsg(t('auth.magic_sent') || 'Magic link sent! Check your email.')
    } catch (err) {
      setMsg(err?.message || t('auth.signin_error') || 'Sign in error')
    } finally {
      setLoading(false)
    }
  }

  const doPasswordLogin = async (e) => {
    e?.preventDefault()
    if (!email.trim() || !pw.trim()) {
      setMsg(t('auth.email_password_required') || 'Email and password are required')
      return
    }
    
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
      setMsg(err?.message || t('auth.signin_error') || 'Sign in error')
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && mode === 'password') {
      doPasswordLogin(e)
    } else if (e.key === 'Enter' && mode === 'magic') {
      doMagic(e)
    }
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="xs" 
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          backgroundColor: '#242424',
          backgroundImage: 'none',
          color: 'white',
          borderRadius: isMobile ? 0 : 2,
          maxHeight: isMobile ? '100%' : '90vh',
          margin: isMobile ? 0 : '32px',
          width: isMobile ? '100%' : 'auto'
        }
      }}
      scroll="paper"
    >
      <DialogTitle disableTypography sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        px: isMobile ? 2 : 3,
        pt: isMobile ? 3 : 2,
        pb: isMobile ? 1 : 2
      }}>
        <Typography 
          variant={isMobile ? "h5" : "h6"} 
          sx={{ fontWeight: 600 }}
        >
          {t('auth.loginTitle')}
        </Typography>
        <IconButton 
          onClick={handleClose} 
          size={isMobile ? "medium" : "small"} 
          sx={{ color: 'rgba(255,255,255,0.7)' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ 
        borderBottom: 1, 
        borderColor: 'rgba(255,255,255,0.1)',
        px: isMobile ? 2 : 3
      }}>
        <Tabs 
          value={mode} 
          onChange={(e, newValue) => handleModeChange(newValue)}
          variant="fullWidth"
          textColor="secondary"
          indicatorColor="secondary"
          sx={{
            minHeight: isMobile ? 48 : 56,
            '& .MuiTab-root': {
              minHeight: isMobile ? 48 : 56,
              fontSize: isMobile ? '0.875rem' : '1rem',
              textTransform: 'none'
            }
          }}
        >
          <Tab 
            value="password" 
            label={t('auth.mode.password') || 'Password'}
            sx={{ fontSize: isMobile ? '0.875rem' : '1rem' }}
          />
          <Tab 
            value="magic" 
            label={t('auth.mode.magic') || 'Magic Link'}
            sx={{ fontSize: isMobile ? '0.875rem' : '1rem' }}
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ 
        py: 3, 
        px: isMobile ? 2 : 3,
        '&.MuiDialogContent-root': {
          paddingTop: 3
        }
      }}>
        <Stack spacing={isMobile ? 2.5 : 3}>
          {/* Magic Link Mode */}
          {mode === 'magic' && (
            <Box component="form" onSubmit={doMagic}>
              <Stack spacing={2.5}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    opacity: 0.7,
                    fontSize: isMobile ? '0.875rem' : '0.9rem'
                  }}
                >
                  {t('auth.magic_description') || 'Enter your email and we\'ll send you a magic link to sign in.'}
                </Typography>
                
                <TextField
                  type="email"
                  label={t('auth.email')}
                  placeholder={t('auth.email_placeholder') || 'you@example.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  required
                  fullWidth
                  size={isMobile ? "small" : "medium"}
                  disabled={loading}
                  InputProps={{
                    sx: {
                      fontSize: isMobile ? '0.875rem' : '1rem',
                      height: isMobile ? 48 : 56
                    }
                  }}
                  InputLabelProps={{
                    sx: {
                      fontSize: isMobile ? '0.875rem' : '1rem'
                    }
                  }}
                />
                
                <Button 
                  type="submit" 
                  disabled={loading} 
                  variant="contained"
                  fullWidth
                  size={isMobile ? "medium" : "large"}
                  sx={{
                    height: isMobile ? 48 : 56,
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    fontWeight: 600
                  }}
                  startIcon={loading && <CircularProgress size={20} color="inherit" />}
                >
                  {loading 
                    ? t('auth.sending') || 'Sending...' 
                    : t('auth.send_magic') || 'Send Magic Link'
                  }
                </Button>
                
                <Button 
                  href="/reset" 
                  variant="text" 
                  size={isMobile ? "small" : "medium"}
                  sx={{ 
                    alignSelf: 'flex-start',
                    fontSize: isMobile ? '0.75rem' : '0.875rem'
                  }}
                >
                  {t('auth.forgot') || 'Forgot password?'}
                </Button>
              </Stack>
            </Box>
          )}

          {/* Password Mode */}
          {mode === 'password' && (
            <Box component="form" onSubmit={doPasswordLogin}>
              <Stack spacing={2.5}>
                <TextField
                  type="email"
                  label={t('auth.email')}
                  placeholder={t('auth.email_placeholder') || 'you@example.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  required
                  fullWidth
                  size={isMobile ? "small" : "medium"}
                  disabled={loading}
                  InputProps={{
                    sx: {
                      fontSize: isMobile ? '0.875rem' : '1rem',
                      height: isMobile ? 48 : 56
                    }
                  }}
                  InputLabelProps={{
                    sx: {
                      fontSize: isMobile ? '0.875rem' : '1rem'
                    }
                  }}
                />
                
                <TextField
                  type={showPassword ? 'text' : 'password'}
                  label={t('auth.password')}
                  placeholder={t('auth.password_placeholder') || '••••••••'}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  onKeyPress={handleKeyPress}
                  required
                  fullWidth
                  size={isMobile ? "small" : "medium"}
                  disabled={loading}
                  InputProps={{
                    sx: {
                      fontSize: isMobile ? '0.875rem' : '1rem',
                      height: isMobile ? 48 : 56
                    },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: 'rgba(255,255,255,0.7)' }}
                          size={isMobile ? "small" : "medium"}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  InputLabelProps={{
                    sx: {
                      fontSize: isMobile ? '0.875rem' : '1rem'
                    }
                  }}
                />
                
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between'
                }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        size={isMobile ? "small" : "medium"}
                        sx={{ color: 'rgba(255,255,255,0.7)' }}
                        disabled={loading}
                      />
                    }
                    label={
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          opacity: 0.8,
                          fontSize: isMobile ? '0.75rem' : '0.875rem'
                        }}
                      >
                        {t('auth.remember_me') || 'Remember me'}
                      </Typography>
                    }
                  />
                  
                  <Button 
                    href="/reset" 
                    variant="text" 
                    size={isMobile ? "small" : "medium"}
                    sx={{ 
                      fontSize: isMobile ? '0.75rem' : '0.875rem'
                    }}
                  >
                    {t('auth.forgot') || 'Forgot password?'}
                  </Button>
                </Box>
                
                <Button 
                  type="submit" 
                  disabled={loading} 
                  variant="contained"
                  fullWidth
                  size={isMobile ? "medium" : "large"}
                  sx={{
                    height: isMobile ? 48 : 56,
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    fontWeight: 600
                  }}
                  startIcon={loading && <CircularProgress size={20} color="inherit" />}
                >
                  {loading 
                    ? t('auth.signing') || 'Signing in...' 
                    : t('auth.sign_in') || 'Sign In'
                  }
                </Button>
              </Stack>
            </Box>
          )}

          {/* Error/Success Messages */}
          {msg && (
            <Alert 
              severity={msg.includes('sent') ? "success" : "error"}
              sx={{ 
                '& .MuiAlert-message': {
                  fontSize: isMobile ? '0.875rem' : '1rem'
                }
              }}
              onClose={() => setMsg('')}
            >
              {msg}
            </Alert>
          )}

          {/* Divider */}
          <Divider sx={{ 
            borderColor: 'rgba(255,255,255,0.1)',
            my: isMobile ? 1 : 2
          }}>
            <Typography 
              variant="caption" 
              sx={{ 
                opacity: 0.5,
                px: 1
              }}
            >
              {t('auth.or') || 'or'}
            </Typography>
          </Divider>

          {/* Create Account Section */}
          <Box sx={{ 
            textAlign: 'center', 
            pt: 1
          }}>
            <Typography 
              variant="body2" 
              sx={{ 
                opacity: 0.8, 
                mb: 2,
                fontSize: isMobile ? '0.875rem' : '0.9rem'
              }}
            >
              {t('auth.no_account') || "Don't have an account?"}
            </Typography>
            <Button 
              variant="outlined" 
              size={isMobile ? "medium" : "large"}
              onClick={onSwitchToRegister}
              fullWidth
              sx={{
                height: isMobile ? 48 : 56,
                fontSize: isMobile ? '0.875rem' : '1rem'
              }}
            >
              {t('auth.create_account') || 'Create Account'}
            </Button>
          </Box>

          {/* Mobile Footer Info */}
          {isMobile && (
            <Box sx={{ 
              mt: 2, 
              p: 1.5, 
              borderRadius: 1, 
              bgcolor: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.1)'
            }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  opacity: 0.6,
                  fontSize: '0.75rem',
                  display: 'block',
                  textAlign: 'center'
                }}
              >
                {t('auth.tap_to_dismiss') || 'Tap outside to close'}
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>

      {/* Mobile Footer Actions */}
      {isMobile && (
        <Box sx={{ 
          p: 2, 
          borderTop: '1px solid rgba(255,255,255,0.1)',
          backgroundColor: 'rgba(0,0,0,0.2)'
        }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleClose}
            size="medium"
            sx={{
              fontSize: '0.875rem'
            }}
          >
            {t('common.close') || 'Close'}
          </Button>
        </Box>
      )}
    </Dialog>
  )
}
