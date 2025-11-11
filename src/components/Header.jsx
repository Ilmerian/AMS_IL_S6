// src/components/Header.jsx
import { useTranslation } from 'react-i18next'
import { useMemo, useCallback, useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth'
import { AuthService } from '../services/AuthService'

import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Link from '@mui/material/Link'
import ButtonGroup from '@mui/material/ButtonGroup'
import Typography from '@mui/material/Typography'

function NavItem({ to, children }) {
  const { pathname } = useLocation()
  const active = pathname === to
  return (
    <Link
      component={RouterLink}
      to={to}
      aria-current={active ? 'page' : undefined}
      sx={{
        position: 'relative', px: 1, py: 0.5,
        fontWeight: active ? 600 : 500,
        color: active ? 'primary.light' : 'common.white',
        opacity: active ? 1 : 0.92,
        '&:hover': { opacity: 1, color: 'primary.main', textDecoration: 'none' },
        '&::after': active ? {
          content: '""', position: 'absolute', left: '10%', right: '10%', bottom: -6,
          height: 2, borderRadius: 1, bgcolor: 'primary.main'
        } : {},
      }}
    >
      {children}
    </Link>
  )
}

export default function Header() {
  const { t, i18n } = useTranslation()
  const { user, profile } = useAuth()
  const current = i18n.language?.slice(0, 2) || 'en'
  const [anchorEl, setAnchorEl] = useState(null)
  const navigate = useNavigate()

  const langs = useMemo(() => ([
    { code: 'en', label: t('lang.en') || 'EN' },
    { code: 'fr', label: t('lang.fr') || 'FR' },
    { code: 'ru', label: t('lang.ru') || 'RU' },
  ]), [t])

  const switchLang = useCallback(
    (lng) => { if (lng && lng !== current) i18n.changeLanguage(lng) },
    [i18n, current]
  )

  const baseAvatar = profile?.avatarUrl || user?.user_metadata?.avatar_url || null
  const avatarUrl = baseAvatar ? `${baseAvatar}${baseAvatar.includes('?') ? '&' : '?'}v=${profile?.id || ''}` : null
  const userLabel =
    profile?.username ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    t('user.default')

  const handleSignOut = useCallback(async (global = false) => {
    try {
      if (global) await AuthService.signOutAll()
      else await AuthService.signOut()
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Error signing out:', err?.message || err)
    } finally {
      setAnchorEl(null)
    }
  }, [navigate, setAnchorEl])

  return (
    <AppBar position="sticky" elevation={6}
      sx={{
        top: 0, zIndex: (t) => t.zIndex.appBar + 1,
        background: 'linear-gradient(90deg, rgba(0,0,0,.7), rgba(0,0,0,.5))',
        backdropFilter: 'saturate(160%) blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.2)',
      }}
    >
      <Toolbar sx={{ px: { xs: 1.5, md: 3 }, py: 1.25, gap: 2 }}>
        <Box sx={{ display: { xs: 'inline-flex', md: 'none' }, width: 24, height: 2, bgcolor: 'common.white', borderRadius: 1 }} />

        {/* Brand */}
        <Typography component={RouterLink} to="/" variant="h6"
          sx={{ flex: 1, fontWeight: 800, letterSpacing: .2, color: 'primary.light', '&:hover': { color: 'primary.main' } }}>
          {t('app.title')}
        </Typography>

        {/* Desktop Nav */}
        <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
          <NavItem to="/">{t('nav.home')}</NavItem>
          <NavItem to="/rooms">{t('nav.rooms')}</NavItem>
          {user ? <NavItem to="/rooms/new">{t('nav.new')}</NavItem> : null}
        </Stack>

        {/* Right controls */}
        <Stack direction="row" spacing={1} alignItems="center">
          {/* Lang */}
          <ButtonGroup variant="outlined" size="small" sx={{ display: { xs: 'none', sm: 'inline-flex' }, borderRadius: 999 }}>
            {langs.map(({ code, label }) => (
              <Button
                key={code}
                onClick={() => switchLang(code)}
                variant={code === current ? 'contained' : 'outlined'}
                color="primary"
                sx={{ borderRadius: 999, minWidth: 44 }}
              >
                {label}
              </Button>
            ))}
          </ButtonGroup>

          {/* Profile/Guest */}
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small" sx={{ ml: 1 }}>
            <Avatar
              src={avatarUrl || undefined}
              alt={userLabel}
              sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}
              imgProps={{ onError: (e) => { e.currentTarget.src = '' } }}
            >
              {userLabel?.slice(0, 1)?.toUpperCase()}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            {user ? [
              <MenuItem key="settings" component={RouterLink} to="/settings" onClick={() => setAnchorEl(null)}>
                {t('nav.settings')}
              </MenuItem>,
              <MenuItem key="rooms" component={RouterLink} to="/rooms" onClick={() => setAnchorEl(null)}>
                {t('nav.myRooms')}
              </MenuItem>,
              <MenuItem
                key="logout"
                onClick={() => { void handleSignOut(false) }}
              >
                {t('nav.logout')}
              </MenuItem>
            ] : [
              <MenuItem key="login" component={RouterLink} to="/login" onClick={() => setAnchorEl(null)}>
                {t('nav.login')}
              </MenuItem>,
              <MenuItem key="register" component={RouterLink} to="/register" onClick={() => setAnchorEl(null)}>
                {t('nav.register')}
              </MenuItem>,
            ]}
          </Menu>
        </Stack>
      </Toolbar>
    </AppBar>
  )
}
