// src/pages/UpdatePassword.jsx
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import PasswordStrength from '../components/PasswordStrength'
import { passwordIssues, isPasswordStrong } from '../utils/validators'
import { useAuth } from '../context/auth'
import { useNavigate } from 'react-router-dom'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Card from '../ui/Card'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'

export default function UpdatePassword() {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('info')
  const [done, setDone] = useState(false)

  const issues = useMemo(() => passwordIssues(pw), [pw])
  const mismatch = pw && pw2 && pw !== pw2
  const canSubmit = !busy && isPasswordStrong(pw) && !mismatch

  const showMessage = (message, type = 'info') => {
    setMsg(message)
    setMsgType(type)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    showMessage('')

    if (!pw.trim() || !pw2.trim()) {
      showMessage(t('auth.password_required') || 'Both password fields are required', 'error')
      return
    }

    if (mismatch) { 
      showMessage(t('auth.passwords_no_match') || 'Passwords do not match', 'error')
      return 
    }
    
    if (!isPasswordStrong(pw)) { 
      showMessage(t('auth.password_too_weak') || 'Password is too weak. Please follow the requirements.', 'error')
      return 
    }

    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pw })
      
      if (error) throw error
      
      setDone(true)
      showMessage(t('auth.password_updated') || 'Password updated successfully!', 'success')
      
      // Auto-redirect after success on mobile
      if (isMobile) {
        setTimeout(() => {
          navigate('/login')
        }, 3000)
      }
    } catch (err) {
      console.error('Password update error:', err)
      showMessage(err?.message || t('auth.error') || 'An error occurred. Please try again.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && canSubmit) {
      onSubmit(e)
    }
  }

  if (authLoading) {
    return (
      <Box sx={{ 
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!user && !done) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 } }}>
        <Card sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            gutterBottom
            sx={{ 
              fontWeight: 700,
              textAlign: 'center',
              mb: 3
            }}
          >
            {t('auth.reset_title') || 'Reset Password'}
          </Typography>
          
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
          >
            {t('auth.magic_link_required') || 'Please open this page from the password reset email link.'}
          </Alert>
          
          <Stack spacing={2}>
            <Button 
              href="/reset" 
              variant="contained"
              fullWidth
              size={isMobile ? "medium" : "large"}
            >
              {t('auth.request_reset') || 'Request Password Reset'}
            </Button>
            
            <Button 
              href="/login" 
              variant="outlined"
              fullWidth
              size={isMobile ? "medium" : "large"}
            >
              {t('nav.login') || 'Back to Login'}
            </Button>
          </Stack>
        </Card>
      </Container>
    )
  }

  return (
    <Container 
      maxWidth="sm" 
      sx={{ 
        py: { xs: 3, sm: 6 },
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center'
      }}
    >
      <Box sx={{ width: '100%' }}>
        <Card sx={{ 
          p: { xs: 3, sm: 4 },
          backdropFilter: 'saturate(140%) blur(8px)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            gutterBottom
            sx={{ 
              fontWeight: 700,
              textAlign: 'center',
              mb: 2,
              color: '#9b5cff'
            }}
          >
            {t('auth.reset_title') || 'Set New Password'}
          </Typography>
          
          <Typography 
            sx={{ 
              opacity: 0.8, 
              mb: 3,
              textAlign: 'center',
              fontSize: { xs: '0.9rem', sm: '1rem' }
            }}
          >
            {t('auth.password_instructions') || 'Create a strong password for your account.'}
          </Typography>

          <Box component="form" onSubmit={onSubmit} onKeyPress={handleKeyPress}>
            <Stack spacing={3}>
              {/* New Password Field */}
              <Box>
                <TextField
                  type={showPassword ? 'text' : 'password'}
                  label={t('auth.new_password') || 'New Password'}
                  placeholder={t('auth.password_placeholder') || 'Enter your new password'}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  required
                  fullWidth
                  size={isMobile ? "small" : "medium"}
                  disabled={busy || done}
                  InputProps={{
                    sx: {
                      fontSize: { xs: '0.9rem', sm: '1rem' }
                    },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: 'rgba(255,255,255,0.7)' }}
                          size={isMobile ? "small" : "medium"}
                          disabled={busy || done}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  InputLabelProps={{
                    sx: {
                      fontSize: { xs: '0.9rem', sm: '1rem' }
                    }
                  }}
                />
                
                <PasswordStrength value={pw} />
              </Box>

              {/* Password Requirements */}
              {issues.length > 0 && (
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 1, 
                  bgcolor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      opacity: 0.8,
                      display: 'block',
                      mb: 1,
                      fontWeight: 500
                    }}
                  >
                    {t('password.requirements') || 'Password must include:'}
                  </Typography>
                  <Stack spacing={0.5}>
                    {[
                      { key: 'length', label: t('password.issue.length') || 'At least 8 characters' },
                      { key: 'lowercase', label: t('password.issue.lowercase') || 'One lowercase letter' },
                      { key: 'uppercase', label: t('password.issue.uppercase') || 'One uppercase letter' },
                      { key: 'digit', label: t('password.issue.digit') || 'One number or special character' }
                    ].map((requirement) => (
                      <Box 
                        key={requirement.key}
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1 
                        }}
                      >
                        <Box 
                          sx={{ 
                            width: 6, 
                            height: 6, 
                            borderRadius: '50%', 
                            backgroundColor: issues.includes(requirement.key) ? 'error.main' : 'success.main',
                            opacity: issues.includes(requirement.key) ? 0.7 : 1
                          }} 
                        />
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            opacity: issues.includes(requirement.key) ? 0.7 : 0.9,
                            fontSize: '0.75rem'
                          }}
                        >
                          {requirement.label}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

              {/* Confirm Password Field */}
              <TextField
                type={showConfirmPassword ? 'text' : 'password'}
                label={t('auth.confirm_password') || 'Confirm Password'}
                placeholder={t('auth.password_placeholder') || 'Re-enter your password'}
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                required
                fullWidth
                size={isMobile ? "small" : "medium"}
                disabled={busy || done}
                error={Boolean(mismatch)}
                helperText={mismatch ? (t('auth.passwords_no_match') || 'Passwords do not match') : ' '}
                InputProps={{
                  sx: {
                    fontSize: { xs: '0.9rem', sm: '1rem' }
                  },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        sx={{ color: 'rgba(255,255,255,0.7)' }}
                        size={isMobile ? "small" : "medium"}
                        disabled={busy || done}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                InputLabelProps={{
                  sx: {
                    fontSize: { xs: '0.9rem', sm: '1rem' }
                  }
                }}
              />

              {/* Message Display */}
              {msg && (
                <Alert 
                  severity={msgType} 
                  onClose={() => setMsg('')}
                  sx={{ 
                    '& .MuiAlert-message': {
                      fontSize: { xs: '0.85rem', sm: '0.9rem' }
                    }
                  }}
                >
                  {msg}
                </Alert>
              )}

              {/* Action Buttons */}
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={2} 
                sx={{ mt: 2 }}
              >
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={!canSubmit}
                  fullWidth={isMobile}
                  size={isMobile ? "medium" : "large"}
                  sx={{
                    fontWeight: 600,
                    py: { xs: 1.5, sm: 1.75 }
                  }}
                  startIcon={busy && <CircularProgress size={20} color="inherit" />}
                >
                  {busy 
                    ? (t('auth.saving') || 'Saving...') 
                    : done 
                      ? (t('auth.password_updated') || 'Updated!') 
                      : (t('auth.update_password') || 'Update Password')
                  }
                </Button>
                
                {done ? (
                  <Button 
                    href="/login" 
                    variant="outlined"
                    fullWidth={isMobile}
                    size={isMobile ? "medium" : "large"}
                  >
                    {t('nav.login') || 'Go to Login'}
                  </Button>
                ) : (
                  <Button 
                    href="/reset" 
                    variant="text"
                    fullWidth={isMobile}
                    size={isMobile ? "medium" : "large"}
                    sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}
                  >
                    {t('auth.need_reset') || 'Need a new reset link?'}
                  </Button>
                )}
              </Stack>

              {/* Mobile Tips */}
              {isMobile && !done && (
                <Box sx={{ 
                  mt: 2, 
                  p: 2, 
                  borderRadius: 1, 
                  bgcolor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      opacity: 0.7,
                      fontSize: '0.75rem',
                      display: 'block',
                      textAlign: 'center'
                    }}
                  >
                    🔒 {t('auth.password_tip') || 'Use a password manager for strong, unique passwords.'}
                  </Typography>
                </Box>
              )}

              {/* Success Message with Auto-redirect */}
              {done && isMobile && (
                <Box sx={{ 
                  mt: 2, 
                  p: 2, 
                  borderRadius: 1, 
                  bgcolor: 'rgba(76, 175, 80, 0.1)',
                  border: '1px solid rgba(76, 175, 80, 0.3)',
                  textAlign: 'center'
                }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      opacity: 0.9,
                      fontSize: '0.8rem'
                    }}
                  >
                    ✅ {t('auth.redirect_notice') || 'Redirecting to login page in 3 seconds...'}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        </Card>

        {/* Mobile Footer Navigation */}
        {isMobile && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography 
              variant="caption" 
              sx={{ 
                opacity: 0.6,
                fontSize: '0.75rem'
              }}
            >
              {t('auth.help_text') || 'Need help? Contact support@watchwithme.com'}
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  )
}