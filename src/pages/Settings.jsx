// src/pages/Settings.jsx
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserService } from '../services/UserService'
import { AuthService } from '../services/AuthService'
import { sanitizeText } from '../utils/validators'
import { AvatarService } from '../services/AvatarService'
import { useAuth } from '../context/auth'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Avatar from '@mui/material/Avatar'
import Card from '../ui/Card'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import PhotoCamera from '@mui/icons-material/PhotoCamera'
import DeleteIcon from '@mui/icons-material/Delete'
import Divider from '@mui/material/Divider'

export default function Settings() {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { profile: ctxProfile } = useAuth()

  const [profile, setProfile] = useState(null)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [avatar, setAvatar] = useState('')
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('info')
  const [loading, setLoading] = useState(false)
  const [busyAvatar, setBusyAvatar] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

  useEffect(() => {
    if (!ctxProfile) return
    setProfile(ctxProfile)
    setEmail(ctxProfile.email || '')
    setUsername(ctxProfile.username || '')
    if (ctxProfile.avatarUrl) setAvatar(ctxProfile.avatarUrl)
  }, [ctxProfile])

  const showMessage = (message, type = 'info') => {
    setMsg(message)
    setMsgType(type)
  }

  const saveProfile = async () => {
    if (!profile?.id) return

    const trimmedUsername = username.trim()
    if (!trimmedUsername) {
      showMessage(t('settings.username_required') || 'Username is required', 'error')
      return
    }

    setLoading(true)
    showMessage('')

    try {
      await UserService.upsertProfile({
        user_id: profile.id,
        username: sanitizeText(trimmedUsername, { max: 50 }),
        email: sanitizeText(email, { max: 100 }),
        avatar_url: sanitizeText(avatar, { max: 2048 }) || null,
      })
      showMessage(t('settings.saved') || 'Profile saved successfully!', 'success')
    } catch (e) {
      showMessage(e?.message || t('settings.error') || 'Error saving profile', 'error')
    } finally {
      setLoading(false)
    }
  }

  const onPickAvatar = async (e) => {
    const inputEl = e.currentTarget
    const file = inputEl?.files?.[0]
    if (!file) return

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage(t('settings.avatar_too_large') || 'Image must be less than 5MB', 'error')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showMessage(t('settings.invalid_image') || 'Please select an image file', 'error')
      return
    }

    setMsg('')
    setBusyAvatar(true)

    const previewUrl = URL.createObjectURL(file)
    setAvatar(previewUrl)

    const clearFileInput = () => {
      try {
        if (inputEl) inputEl.value = ''
      } catch (err) {
        console.warn('Failed to clear file input value:', err)
      }
    }

    let timeoutId
    try {
      const uploadPromise = AvatarService.upload(file)
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Upload timeout')),
          30000 // 30 seconds for mobile
        )
      })

      const result = await Promise.race([uploadPromise, timeoutPromise])
      if (timeoutId) clearTimeout(timeoutId)

      const url = result?.url || ''
      if (!url) {
        throw new Error('No URL returned from avatar upload')
      }

      URL.revokeObjectURL(previewUrl)

      setAvatar(url)
      setProfile((p) => (p ? { ...p, avatarUrl: url || null } : p))
      showMessage(t('settings.avatar_updated') || 'Avatar updated!', 'success')
    } catch (e2) {
      if (timeoutId) clearTimeout(timeoutId)
      console.error('[Settings] avatar upload failed:', e2)
      setAvatar(prev => prev === previewUrl ? '' : prev)
      showMessage(e2?.message || t('settings.upload_error') || 'Upload failed', 'error')
    } finally {
      clearFileInput()
      setBusyAvatar(false)
    }
  }

  const confirmRemoveAvatar = () => {
    setConfirmDialogOpen(true)
  }

  const onRemoveAvatar = async () => {
    setConfirmDialogOpen(false)
    if (!avatar) return

    setMsg('')
    setBusyAvatar(true)

    const prev = avatar

    setAvatar('')
    setProfile((p) => (p ? { ...p, avatarUrl: null } : p))

    const clearBusy = () => setBusyAvatar(false)
    const timer = setTimeout(clearBusy, 30000)

    try {
      try {
        await AvatarService.remove(prev)
      } catch (e) {
        console.warn('Failed to remove avatar from storage:', e)
      }

      if (profile?.id) {
        await UserService.upsertProfile({
          user_id: profile.id,
          avatar_url: null,
        })
      }

      showMessage(t('settings.avatar_removed') || 'Avatar removed', 'success')
    } catch (e2) {
      setAvatar(prev)
      setProfile((p) => (p ? { ...p, avatarUrl: prev } : p))
      showMessage(e2?.message || t('settings.error') || 'Error removing avatar', 'error')
    } finally {
      clearTimeout(timer)
      clearBusy()
    }
  }

  const changeEmail = async () => {
    if (!email.trim()) {
      showMessage(t('settings.email_required') || 'Email is required', 'error')
      return
    }

    setLoading(true)
    setMsg('')
    try {
      await AuthService.updateEmail(email)
      showMessage(t('settings.confirmNewEmail') || 'Please check your email to confirm the change', 'success')
    } catch (e) {
      showMessage(e?.message || t('settings.error') || 'Error updating email', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      pb: { xs: 8, sm: 4 }
    }}>
      <Box sx={{
        py: { xs: 2, sm: 4 },
        px: { xs: 1.5, sm: 2, md: 3 }
      }}>

        <Card sx={{
          p: { xs: 2.5, sm: 3, md: 4 },
          backdropFilter: 'saturate(140%) blur(8px)',
          border: '1px solid',
          borderColor: theme.palette.divider
        }}>

          <Typography
            variant={isMobile ? "h5" : "h4"}
            mb={{ xs: 3, sm: 4 }}
            sx={{
              textAlign: 'center',
              fontWeight: 800,
              color: theme.palette.primary.main,
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }
            }}
          >
            {t('nav.settings')}
          </Typography>

          <Stack spacing={{ xs: 3, sm: 4 }}>
            {/* Avatar Section */}
            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              gap: { xs: 3, sm: 4 },
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              bgcolor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`
            }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  alt={username || email}
                  src={avatar || undefined}
                  sx={{
                    width: { xs: 100, sm: 120, md: 140 },
                    height: { xs: 100, sm: 120, md: 140 },
                    border: `3px solid ${theme.palette.divider}`,
                    fontSize: { xs: '2rem', sm: '2.5rem' }
                  }}
                >
                  {!avatar && (username || email)?.charAt(0)?.toUpperCase()}
                </Avatar>

                <IconButton
                  component="label"
                  disabled={busyAvatar}
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                    width: { xs: 36, sm: 40 },
                    height: { xs: 36, sm: 40 }
                  }}
                  size="small"
                >
                  <PhotoCamera fontSize={isMobile ? "small" : "medium"} />
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={onPickAvatar}
                    disabled={busyAvatar}
                  />
                </IconButton>
              </Box>

              <Stack spacing={1.5} sx={{ flex: 1, width: '100%' }}>
                <Typography
                  variant="h6"
                  sx={{
                    opacity: 0.9,
                    fontWeight: 500,
                    fontSize: { xs: '1rem', sm: '1.1rem' },
                    textAlign: { xs: 'center', sm: 'left' }
                  }}
                >
                  {email}
                </Typography>

                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  justifyContent={{ xs: 'center', sm: 'flex-start' }}
                  flexWrap="wrap"
                  gap={1}
                >
                  <Button
                    component="label"
                    variant="outlined"
                    size={isMobile ? "small" : "medium"}
                    disabled={busyAvatar}
                    startIcon={<PhotoCamera />}
                    sx={{ flexShrink: 0 }}
                  >
                    {busyAvatar
                      ? t('common.uploading') || 'Uploading...'
                      : t('settings.changeAvatar') || 'Change'}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={onPickAvatar}
                      disabled={busyAvatar}
                    />
                  </Button>

                  <Button
                    variant="outlined"
                    color="error"
                    size={isMobile ? "small" : "medium"}
                    disabled={!avatar || busyAvatar}
                    onClick={confirmRemoveAvatar}
                    startIcon={<DeleteIcon />}
                    sx={{ flexShrink: 0 }}
                  >
                    {t('settings.removeAvatar') || 'Remove'}
                  </Button>
                </Stack>

                {busyAvatar && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {t('common.processing') || 'Processing...'}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>

            <Divider sx={{ borderColor: theme.palette.divider }} />


            {/* Username Field */}
            <TextField
              label={t('settings.username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              variant="outlined"
              size={isMobile ? "small" : "medium"}
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
              helperText={t('settings.username_helper') || 'This is how other users will see you'}
            />

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

            {/* Email Section */}
            <Box>
              <Typography
                variant="subtitle1"
                sx={{
                  mb: 2,
                  fontWeight: 600,
                  fontSize: { xs: '0.95rem', sm: '1rem' }
                }}
              >
                {t('settings.email_section') || 'Email Address'}
              </Typography>

              <TextField
                type="email"
                label={t('settings.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                variant="outlined"
                size={isMobile ? "small" : "medium"}
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
                helperText={t('settings.email_helper') || 'Your current email address'}
              />
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
              justifyContent="space-between"
              sx={{ pt: 2 }}
            >
              <Button
                onClick={changeEmail}
                disabled={loading}
                variant="outlined"
                color="info"
                size={isMobile ? "medium" : "large"}
                fullWidth={isMobile}
                startIcon={loading && <CircularProgress size={20} color="inherit" />}
              >
                {t('settings.changeEmail')}
              </Button>

              <Button
                onClick={saveProfile}
                disabled={loading}
                variant="contained"
                color="primary"
                size={isMobile ? "medium" : "large"}
                fullWidth={isMobile}
                sx={{
                  px: { xs: 2, sm: 4 },
                  fontWeight: 600
                }}
                startIcon={loading && <CircularProgress size={20} color="inherit" />}
              >
                {loading
                  ? t('common.saving') || 'Saving...'
                  : t('settings.saveProfile') || 'Save Profile'
                }
              </Button>
            </Stack>

            {/* Mobile Tips */}
            {isMobile && (
              <Box sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`
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
                  💡 {t('settings.mobile_tip') || 'Tap on any field to edit. Changes are saved automatically.'}
                </Typography>
              </Box>
            )}
          </Stack>
        </Card>
      </Box>

      {/* Confirmation Dialog for Avatar Removal */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: "#1e1e1e",
            color: "white",
            borderColor: theme.palette.divider,
            borderRadius: isMobile ? 0 : 2,
            margin: isMobile ? 0 : '32px',
            width: isMobile ? '100%' : 'auto'
          }
        }}
        fullScreen={isMobile}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1
        }}>
          <Typography variant="h6">
            {t('settings.confirm_remove') || 'Remove Avatar'}
          </Typography>
          <IconButton onClick={() => setConfirmDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Typography>
            {t('settings.confirm_remove_message') || 'Are you sure you want to remove your avatar? This action cannot be undone.'}
          </Typography>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setConfirmDialogOpen(false)}
            variant="outlined"
            fullWidth={isMobile}
          >
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button
            onClick={onRemoveAvatar}
            color="error"
            variant="contained"
            fullWidth={isMobile}
          >
            {t('common.remove') || 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}