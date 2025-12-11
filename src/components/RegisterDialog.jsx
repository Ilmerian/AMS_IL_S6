// src/components/RegisterDialog.jsx
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthService } from '../services/AuthService'
import PasswordStrength from './PasswordStrength'
import { passwordIssues, isPasswordStrong } from '../utils/validators'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
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
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

export default function RegisterDialog({ open, onClose, onSwitchToLogin }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  
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
    if (mismatch) { 
      setMsg(t('auth.passwords_no_match')); 
      return 
    }
    if (!isPasswordStrong(pw)) { 
      setMsg(t('auth.password_too_weak')); 
      return 
    }

    setLoading(true)
    try {
      await AuthService.signUp(
        { 
          email, 
          password: pw, 
          metadata: { username: email.split('@')[0] } 
        },
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      onSubmit(e)
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
      <DialogTitle sx={{ 
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
          {t('auth.create_account_title')}
        </Typography>
        <IconButton 
          onClick={handleClose} 
          size={isMobile ? "medium" : "small"} 
          sx={{ color: 'rgba(255,255,255,0.7)' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ 
        py: isMobile ? 2 : 3, 
        px: isMobile ? 2 : 3,
        '&.MuiDialogContent-root': {
          paddingTop: isMobile ? 2 : 3
        }
      }}>
        {success ? (
          <Box sx={{ 
            textAlign: 'center', 
            py: isMobile ? 2 : 3,
            px: isMobile ? 1 : 0
          }}>
            <CheckCircleIcon 
              sx={{ 
                fontSize: isMobile ? 48 : 60, 
                color: 'success.light', 
                mb: 2 
              }} 
            />
            <Typography 
              variant={isMobile ? "h6" : "h5"} 
              color="success.light" 
              gutterBottom
              sx={{ mb: 2 }}
            >
              {t('auth.account_created')}
            </Typography>
            <Typography 
              sx={{ 
                mb: 3,
                opacity: 0.8,
                fontSize: isMobile ? '0.9rem' : '1rem'
              }}
            >
              {t('auth.account_created_desc') || 'Your account has been created successfully!'}
            </Typography>
            <Button 
              variant="contained" 
              onClick={handleClose}
              fullWidth={isMobile}
              size={isMobile ? "medium" : "large"}
              sx={{
                bgcolor: '#9b5cff',
                ':hover': { bgcolor: '#7c3aed' },
                fontWeight: 600,
                py: isMobile ? 1.5 : 2
              }}
            >
              {t('common.continue') || 'Continue'}
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={onSubmit} onKeyPress={handleKeyPress}>
            <Stack spacing={isMobile ? 2 : 2.5}>
              {/* EMAIL FIELD */}
              <TextField
                label={t('auth.email')}
                type="email"
                placeholder={t('auth.email_placeholder') || 'you@example.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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

              {/* PASSWORD FIELD */}
              <Box>
                <TextField
                  label={t('auth.password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder={t('auth.password_placeholder') || '••••••••'}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  required
                  fullWidth
                  size={isMobile ? "small" : "medium"}
                  disabled={loading}
                  helperText={t('auth.policy_hint')}
                  InputProps={{
                    sx: {
                      fontSize: isMobile ? '0.875rem' : '1rem',
                      height: isMobile ? 48 : 56
                    },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPw(!showPw)}
                          edge="end"
                          sx={{ color: 'rgba(255,255,255,0.7)' }}
                          size={isMobile ? "small" : "medium"}
                          disabled={loading}
                        >
                          {showPw ? <VisibilityOff /> : <Visibility />}
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
                <PasswordStrength value={pw} />
              </Box>

              {/* CONFIRM PASSWORD FIELD */}
              <TextField
                label={t('auth.confirm_password')}
                type={showPw2 ? 'text' : 'password'}
                placeholder={t('auth.password_placeholder') || '••••••••'}
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                required
                fullWidth
                size={isMobile ? "small" : "medium"}
                disabled={loading}
                error={Boolean(mismatch)}
                helperText={mismatch ? t('auth.passwords_no_match') : ' '}
                InputProps={{
                  sx: {
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    height: isMobile ? 48 : 56
                  },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPw2(!showPw2)}
                        edge="end"
                        sx={{ color: 'rgba(255,255,255,0.7)' }}
                        size={isMobile ? "small" : "medium"}
                        disabled={loading}
                      >
                        {showPw2 ? <VisibilityOff /> : <Visibility />}
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

              {/* PASSWORD ISSUES LIST */}
              {issues.length > 0 && (
                <Box component="ul" sx={{ 
                  mt: isMobile ? -1 : -0.5, 
                  mb: 0, 
                  opacity: 0.9, 
                  fontSize: isMobile ? '0.75rem' : '0.85rem', 
                  pl: 3,
                  '& li': {
                    mb: isMobile ? 0.5 : 1
                  }
                }}>
                  {issues.map((k) => (
                    <li key={k}>
                      {t(`password.issue.${k}`, k)}
                    </li>
                  ))}
                </Box>
              )}

              {/* ERROR/SUCCESS MESSAGES */}
              {msg && (
                <Alert 
                  severity={msg.includes('created') ? "success" : "error"}
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

              {/* REGISTER BUTTON */}
              <Button 
                type="submit" 
                variant="contained" 
                disabled={loading} 
                size={isMobile ? "medium" : "large"}
                fullWidth
                sx={{
                  height: isMobile ? 48 : 56,
                  fontSize: isMobile ? '0.875rem' : '1rem',
                  fontWeight: 600,
                  bgcolor: '#9b5cff',
                  ':hover': { bgcolor: '#7c3aed' },
                  mt: isMobile ? 1 : 2
                }}
                startIcon={loading && <CircularProgress size={20} color="inherit" />}
              >
                {loading 
                  ? t('auth.creating') || 'Creating...' 
                  : t('auth.create_account') || 'Create Account'
                }
              </Button>

              {/* SWITCH TO LOGIN */}
              <Box sx={{ 
                textAlign: 'center', 
                pt: isMobile ? 1 : 2, 
                borderTop: '1px solid rgba(255,255,255,0.1)'
              }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    opacity: 0.8, 
                    mb: isMobile ? 1.5 : 2,
                    fontSize: isMobile ? '0.875rem' : '0.9rem'
                  }}
                >
                  {t('auth.have_account') || 'Already have an account?'}
                </Typography>
                <Button 
                  variant="outlined" 
                  size={isMobile ? "medium" : "large"}
                  onClick={onSwitchToLogin}
                  fullWidth
                  sx={{
                    height: isMobile ? 48 : 56,
                    fontSize: isMobile ? '0.875rem' : '1rem'
                  }}
                >
                  {t('auth.sign_in') || 'Sign In'}
                </Button>
              </Box>

              {/* MOBILE FOOTER INFO */}
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
          </Box>
        )}
      </DialogContent>

      {/* MOBILE FOOTER ACTIONS */}
      {isMobile && !success && (
        <DialogActions sx={{ 
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
            {t('common.cancel') || 'Cancel'}
          </Button>
        </DialogActions>
      )}

      {/* PRIVACY NOTE FOR MOBILE */}
      {isMobile && (
        <Box sx={{ 
          p: 2, 
          borderTop: '1px solid rgba(255,255,255,0.05)',
          backgroundColor: 'rgba(0,0,0,0.1)'
        }}>
          <Typography 
            variant="caption" 
            sx={{ 
              opacity: 0.5,
              fontSize: '0.7rem',
              display: 'block',
              textAlign: 'center'
            }}
          >
            {t('auth.privacy_note') || 'Your data is protected with industry-standard security.'}
          </Typography>
        </Box>
      )}
    </Dialog>
  )
}