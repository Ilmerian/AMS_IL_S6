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
    setLoading(true); setMsg('')
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
    } finally { setLoading(false) }
  }

  const onPickAvatar = async (e) => {
    const inputEl = e.currentTarget;
    const file = inputEl?.files?.[0];
    if (!file) return;
    setMsg('');
    setBusyAvatar(true);
    const previewUrl = URL.createObjectURL(file);
    setAvatar(previewUrl);

    const clearBusy = () => setBusyAvatar(false);
    const timer = setTimeout(clearBusy, 20000);
    try {
      const { url } = await AvatarService.upload(file);
      URL.revokeObjectURL(previewUrl);
      setAvatar(url || '');
      setProfile((p) => (p ? { ...p, avatarUrl: url || null } : p));
      setMsg(t('settings.saved'));
    } catch (e2) {
      setMsg(e2?.message || t('settings.error'));
    } finally {
      clearTimeout(timer);
      try { if (inputEl) inputEl.value = ''; } catch (e){
        console.warn('Failed to clear file input value:', e)
      }
      setBusyAvatar(false);
    }
  };

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
      try { await AvatarService.remove(prev) } catch (e) {
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
    setLoading(true); setMsg('')
    try {
      await AuthService.updateEmail(email)
      setMsg(t('settings.confirmNewEmail'))
    } catch (e) {
      setMsg(e?.message || t('settings.error'))
    } finally { setLoading(false) }
  }

  return (
    <Box className="fullbleed" sx={{ py: 6, maxWidth: 960, mx: 'auto' }}>
      <Typography variant="h4" mb={3}>{t('nav.settings')}</Typography>

      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <Avatar
            alt={username || email}
            src={avatar || undefined}
            sx={{ width: 72, height: 72 }}
          />
          <Stack direction="row" spacing={1} alignItems="center">
            <Button component="label" variant="outlined" disabled={busyAvatar}>
              {busyAvatar ? (t('common.sending') || 'Sending…') : (t('settings.changeAvatar') || 'Change avatar')}
              <input
                type="file"
                accept="image/*"
                hidden
                onClick={(e) => { e.currentTarget.value = ''; }}
                onChange={onPickAvatar}
              />
            </Button>
            <Button variant="text" color="error" disabled={!avatar || busyAvatar} onClick={onRemoveAvatar}>
              {t('settings.removeAvatar') || 'Remove'}
            </Button>
          </Stack>
          <Typography sx={{ opacity: 0.8 }}>{email}</Typography>
        </Stack>

        <TextField
          label={t('settings.username')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          fullWidth
        />

        <Stack direction="row" spacing={1}>
          <Button onClick={saveProfile} disabled={loading} variant="contained" color="primary">
            {t('settings.saveProfile')}
          </Button>
          <Button onClick={changeEmail} disabled={loading} variant="outlined">
            {t('settings.changeEmail')}
          </Button>
        </Stack>

        {msg && (
          <Typography role="status" color="text.secondary" sx={{ opacity: 0.9 }}>
            {msg}
          </Typography>
        )}
      </Stack>
    </Box>
  )
}
