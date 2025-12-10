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

export default function Settings() {
  const { t } = useTranslation()
  const { profile: ctxProfile } = useAuth()
  const [profile, setProfile] = useState(null)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [avatar, setAvatar] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyAvatar, setBusyAvatar] = useState(false)

  useEffect(() => {
    if (!ctxProfile) return
    setProfile(ctxProfile)
    setEmail(ctxProfile.email || '')
    setUsername(ctxProfile.username || '')
    if (ctxProfile.avatarUrl) setAvatar(ctxProfile.avatarUrl)
  }, [ctxProfile])

  const saveProfile = async () => {
    if (!profile?.id) return
    setLoading(true)
    setMsg('')
    try {
      await UserService.upsertProfile({
        user_id: profile.id,
        username: sanitizeText(username, { max: 50 }),
        email: sanitizeText(email, { max: 100 }),
        avatar_url: sanitizeText(avatar, { max: 2048 }) || null,
      })
      setMsg(t('settings.saved'))
    } catch (e) {
      setMsg(e?.message || t('settings.error'))
    } finally {
      setLoading(false)
    }
  }

  const onPickAvatar = async (e) => {
    const inputEl = e.currentTarget
    const file = inputEl?.files?.[0]
    if (!file) return

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
          20000
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
      setMsg(t('settings.saved'))
    } catch (e2) {
      if (timeoutId) clearTimeout(timeoutId)
      console.error('[Settings] avatar upload failed:', e2)
      setMsg(e2?.message || t('settings.error'))
    } finally {
      clearFileInput()
      setBusyAvatar(false)
    }
  }

  const onRemoveAvatar = async () => {
    if (!avatar) return
    setMsg('')
    setBusyAvatar(true)

    const prev = avatar

    setAvatar('')
    setProfile((p) => (p ? { ...p, avatarUrl: null } : p))

    const clearBusy = () => setBusyAvatar(false)
    const timer = setTimeout(clearBusy, 20000)

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

      setMsg(t('settings.saved'))
    } catch (e2) {
      setAvatar(prev)
      setProfile((p) => (p ? { ...p, avatarUrl: prev } : p))
      setMsg(e2?.message || t('settings.error'))
    } finally {
      clearTimeout(timer)
      clearBusy()
    }
  }

  const changeEmail = async () => {
    setLoading(true)
    setMsg('')
    try {
      await AuthService.updateEmail(email)
      setMsg(t('settings.confirmNewEmail'))
    } catch (e) {
      setMsg(e?.message || t('settings.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box className="fullbleed" sx={{ 
      py: 4, 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', // Centrage Vertical
      minHeight: '85vh'     // Hauteur minimale de la zone
    }}>
      
      <Box sx={{ width: { xs: '95%', md: '70%' }, maxWidth: 1000 }}>
        
        {/* CARTE AGGRANDIE */}
        <Card sx={{ 
            p: { xs: 3, md: 5 }, // Padding interne plus grand
            minHeight: '65vh',   // <-- HAUTEUR MINIMALE AUGMENTÉE
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center', // Centre le contenu verticalement
            
            // Ré-application du style D.A. (Glassmorphism)
            backdropFilter: 'saturate(140%) blur(8px)', 
            border: '1px solid', 
            borderColor: 'rgba(255,255,255,0.2)'
        }}> 
          
          <Typography variant="h4" mb={5} sx={{ textAlign: 'center', fontWeight: 800 , color: '#9b5cff', textTransform: 'uppercase'}}>
            {t('nav.settings')}
          </Typography>

          <Stack spacing={5}> {/* Espacement vertical augmenté entre les éléments */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={4}
              alignItems="center"
              justifyContent="center"
            >
              <Avatar
                alt={username || email}
                src={avatar || undefined}
                sx={{ width: 120, height: 120, border: '3px solid rgba(255,255,255,0.1)' }}
              />
              <Stack spacing={1.5} alignItems={{ xs: 'center', sm: 'flex-start' }}>
                <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 500 }}>
                  {email}
                </Typography>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Button component="label" variant="outlined" size="small" disabled={busyAvatar}>
                    {busyAvatar
                      ? t('common.sending') || 'Envoi…'
                      : t('settings.changeAvatar') || 'Changer'}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onClick={(e) => {
                        e.currentTarget.value = ''
                      }}
                      onChange={onPickAvatar}
                    />
                  </Button>
                  <Button
                    variant="text"
                    color="error"
                    size="small"
                    disabled={!avatar || busyAvatar}
                    onClick={onRemoveAvatar}
                  >
                    {t('settings.removeAvatar') || 'Supprimer'}
                  </Button>
                </Stack>
              </Stack>
            </Stack>

            <TextField
              label={t('settings.username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              variant="outlined"
              sx={{ '& .MuiOutlinedInput-root': { fontSize: '1.1rem' } }}
            />

            <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ pt: 2 }}>
              <Button
                onClick={changeEmail}
                disabled={loading}
                variant="outlined"
                color="info"
                size="large"
              >
                {t('settings.changeEmail')}
              </Button>
              <Button
                onClick={saveProfile}
                disabled={loading}
                variant="contained"
                color="primary"
                size="large"
                sx={{ px: 4 }}
              >
                {t('settings.saveProfile')}
              </Button>
            </Stack>

            {msg && (
              <Typography
                role="status"
                color="text.secondary"
                sx={{ 
                  opacity: 0.9, 
                  textAlign: 'center', 
                  p: 1.5, 
                  bgcolor: 'rgba(255,255,255,0.05)', 
                  borderRadius: 2 
                }}
              >
                {msg}
              </Typography>
            )}
          </Stack>
        </Card>
      </Box>
    </Box>
  )
}