// src/pages/RoomCreate.jsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { RoomService } from '../services/RoomService'
import { sanitizeText } from '../utils/validators'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Card from '../ui/Card'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import Container from '@mui/material/Container'
import InputAdornment from '@mui/material/InputAdornment'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import PasswordStrength from '../components/PasswordStrength'
import IconButton from '@mui/material/IconButton'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

export default function RoomCreate() {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const navigate = useNavigate()
  
  const [name, setName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('info')

  const showMessage = (message, type = 'info') => {
    setMsg(message)
    setMsgType(type)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    showMessage('')
    
    // Validation
    if (!name.trim()) {
      showMessage(t('roomCreate.error_name_required') || 'Room name is required', 'error')
      return
    }

    const cleanName = sanitizeText(name.trim(), { max: 100 })
    if (!cleanName) {
      showMessage(t('roomCreate.error_invalid_name') || 'Invalid room name', 'error')
      return
    }

    if (cleanName.length < 3) {
      showMessage(t('roomCreate.error_name_short') || 'Room name must be at least 3 characters', 'error')
      return
    }

    if (isPrivate && password.trim().length < 3) {
      showMessage(t('roomCreate.error_password_short') || 'Password must be at least 3 characters', 'error')
      return
    }

    if (isPrivate && password.trim().length > 50) {
      showMessage(t('roomCreate.error_password_long') || 'Password is too long', 'error')
      return
    }

    setLoading(true)
    try {
      const room = await RoomService.create({
        name: cleanName,
        password: isPrivate ? password.trim() : null,
      })
      
      // Success message before navigation
      showMessage(t('roomCreate.success') || 'Room created successfully!', 'success')
      
      // Slight delay for user to see success message
      setTimeout(() => {
        navigate(`/rooms/${room.id}`, { replace: true })
      }, 1000)
      
    } catch (err) {
      console.error('Room creation error:', err)
      showMessage(
        err?.message || t('roomCreate.error_creating') || 'Failed to create room. Please try again.',
        'error'
      )
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
            {t('roomCreate.title') || 'Create New Room'}
          </Typography>
          
          <Typography 
            sx={{ 
              opacity: 0.8, 
              mb: 4,
              textAlign: 'center',
              fontSize: { xs: '0.9rem', sm: '1rem' }
            }}
          >
            {t('roomCreate.subtitle') || 'Create a public or private room to watch videos with friends.'}
          </Typography>

          <Box component="form" onSubmit={onSubmit} onKeyPress={handleKeyPress}>
            <Stack spacing={3}>
              {/* Room Name Field */}
              <TextField
                label={t('roomCreate.name_label') || 'Room Name'}
                placeholder={t('roomCreate.name_placeholder') || 'Enter room name'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                fullWidth
                size={isMobile ? "small" : "medium"}
                disabled={loading}
                InputProps={{
                  sx: {
                    fontSize: { xs: '0.9rem', sm: '1rem' }
                  }
                }}
                InputLabelProps={{
                  sx: {
                    fontSize: { xs: '0.9rem', sm: '1rem' }
                  }
                }}
                helperText={t('roomCreate.name_helper') || 'Choose a descriptive name for your room'}
              />

              {/* Privacy Toggle */}
              <Box sx={{ 
                p: 2, 
                borderRadius: 2, 
                bgcolor: 'rgba(255,255,255,0.05)',
                border: `1px solid ${isPrivate ? 'rgba(155, 92, 255, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                transition: 'all 0.3s ease'
              }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      disabled={loading}
                      icon={<LockOpenIcon />}
                      checkedIcon={<LockIcon />}
                      sx={{ 
                        color: isPrivate ? '#9b5cff' : 'rgba(255,255,255,0.7)',
                        '&.Mui-checked': {
                          color: '#9b5cff'
                        }
                      }}
                    />
                  }
                  label={
                    <Typography 
                      sx={{ 
                        fontWeight: isPrivate ? 600 : 400,
                        color: isPrivate ? '#9b5cff' : 'inherit',
                        fontSize: { xs: '0.9rem', sm: '1rem' }
                      }}
                    >
                      {t('roomCreate.private_label') || 'Private Room'}
                    </Typography>
                  }
                />
                
                {isPrivate && (
                  <Box sx={{ mt: 2 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        opacity: 0.7,
                        mb: 1.5,
                        fontSize: { xs: '0.8rem', sm: '0.9rem' }
                      }}
                    >
                      {t('roomCreate.privacy_description') || 'Set a password to control who can join your room.'}
                    </Typography>
                    
                    <TextField
                      label={t('roomCreate.password_label') || 'Room Password'}
                      placeholder={t('roomCreate.password_placeholder') || 'Enter password (min. 3 characters)'}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      fullWidth
                      size={isMobile ? "small" : "medium"}
                      disabled={loading}
                      InputProps={{
                        sx: {
                          fontSize: { xs: '0.9rem', sm: '1rem' }
                        },
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              sx={{ color: 'rgba(255,255,255,0.7)' }}
                              size={isMobile ? "small" : "medium"}
                              disabled={loading}
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
                      helperText={t('roomCreate.password_helper') || 'Share this password with invited friends'}
                    />
                    
                    {/* Password strength for longer passwords */}
                    {password.length >= 6 && (
                      <PasswordStrength value={password} />
                    )}
                    
                    {/* Password tips for mobile */}
                    {isMobile && password.length > 0 && (
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          opacity: 0.6,
                          fontSize: '0.7rem',
                          mt: 1,
                          display: 'block'
                        }}
                      >
                        💡 {t('roomCreate.password_tip') || 'Use a memorable password you can share easily'}
                      </Typography>
                    )}
                  </Box>
                )}
                
                {!isPrivate && (
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      opacity: 0.7,
                      mt: 1,
                      fontSize: { xs: '0.8rem', sm: '0.9rem' }
                    }}
                  >
                    {t('roomCreate.public_description') || 'Anyone with the link can join your room.'}
                  </Typography>
                )}
              </Box>

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
                  disabled={loading}
                  fullWidth={isMobile}
                  size={isMobile ? "medium" : "large"}
                  sx={{
                    bgcolor: '#9b5cff',
                    ':hover': { bgcolor: '#7c3aed' },
                    fontWeight: 600,
                    py: { xs: 1.5, sm: 1.75 }
                  }}
                  startIcon={loading && <CircularProgress size={20} color="inherit" />}
                >
                  {loading 
                    ? (t('roomCreate.creating') || 'Creating...') 
                    : (t('roomCreate.create') || 'Create Room')
                  }
                </Button>
                
                <Button 
                  component={RouterLink} 
                  to="/rooms" 
                  variant="outlined"
                  fullWidth={isMobile}
                  size={isMobile ? "medium" : "large"}
                  disabled={loading}
                >
                  {t('roomCreate.cancel') || 'Cancel'}
                </Button>
              </Stack>

              {/* Mobile Tips */}
              {isMobile && (
                <Box sx={{ 
                  mt: 2, 
                  p: 2, 
                  borderRadius: 2, 
                  bgcolor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <Stack spacing={1}>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        opacity: 0.7,
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5
                      }}
                    >
                      <span style={{ fontSize: '1rem' }}>👥</span>
                      {t('roomCreate.tip_public') || 'Public rooms appear in the rooms list for everyone'}
                    </Typography>
                    
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        opacity: 0.7,
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5
                      }}
                    >
                      <span style={{ fontSize: '1rem' }}>🔒</span>
                      {t('roomCreate.tip_private') || 'Private rooms require a password to join'}
                    </Typography>
                    
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        opacity: 0.7,
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5
                      }}
                    >
                      <span style={{ fontSize: '1rem' }}>🎬</span>
                      {t('roomCreate.tip_videos') || 'Add YouTube videos to your room playlist'}
                    </Typography>
                  </Stack>
                </Box>
              )}

              {/* Success Redirect Notice */}
              {msgType === 'success' && (
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
                    🎉 {t('roomCreate.redirect_notice') || 'Redirecting to your new room...'}
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
              {t('roomCreate.help_text') || 'Need help? Join our community or contact support'}
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  )
}