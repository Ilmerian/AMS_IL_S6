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
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import MenuIcon from '@mui/icons-material/Menu'
import ThemeToggleButton from "../components/ThemeToggleButton";

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

export default function Header({ onOpenLogin, onOpenRegister }) {
  const { t, i18n } = useTranslation()
  const { user, profile } = useAuth()
  const current = i18n.language?.slice(0, 2) || 'en'
  const [anchorEl, setAnchorEl] = useState(null)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const navigate = useNavigate()

  const langs = useMemo(() => ([
    { code: 'en', label: t('lang.en') || 'EN' },
    { code: 'fr', label: t('lang.fr') || 'FR' },
    { code: 'ru', label: t('lang.ru') || 'RU' },
  ]), [t])

  const switchLang = useCallback(
    (lng) => {
      if (lng && lng !== current) i18n.changeLanguage(lng)
      setMobileDrawerOpen(false)
    },
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
      setMobileDrawerOpen(false)
    }
  }, [navigate])

  const handleLoginClick = () => {
    setAnchorEl(null)
    setMobileDrawerOpen(false)
    if (onOpenLogin) onOpenLogin()
  }

  const handleRegisterClick = () => {
    setAnchorEl(null)
    setMobileDrawerOpen(false)
    if (onOpenRegister) onOpenRegister()
  }

  const toggleMobileDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return
    }
    setMobileDrawerOpen(open)
  }

  // Mobile Drawer Content
  const mobileDrawerContent = () => (
    <Box
      sx={{
        width: 280,
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.95)',
        backdropFilter: 'blur(12px)',
        color: 'white'
      }}
      role="presentation"
      onClick={toggleMobileDrawer(false)}
      onKeyDown={toggleMobileDrawer(false)}
    >
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Avatar
          src={avatarUrl || undefined}
          alt={userLabel}
          sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}
        >
          {userLabel?.slice(0, 1)?.toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {userLabel}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {user ? t('user.logged_in') : t('user.guest')}
          </Typography>
        </Box>
      </Box>

      <List sx={{ p: 2 }}>
        <ListItem disablePadding>
          <ListItemButton
            component={RouterLink}
            to="/"
            sx={{ borderRadius: 1 }}
          >
            <ListItemText primary={t('nav.home')} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            component={RouterLink}
            to="/rooms"
            sx={{ borderRadius: 1 }}
          >
            <ListItemText primary={t('nav.rooms')} />
          </ListItemButton>
        </ListItem>

        {user && (
          <ListItem disablePadding>
            <ListItemButton
              component={RouterLink}
              to="/rooms/new"
              sx={{ borderRadius: 1 }}
            >
              <ListItemText primary={t('nav.new')} />
            </ListItemButton>
          </ListItem>
        )}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mx: 2 }} />

      <Box sx={{ p: 2 }}>
        <Typography variant="overline" sx={{ opacity: 0.5, mb: 1 }}>
          {t('nav.language')}
        </Typography>
        <ButtonGroup fullWidth variant="outlined" size="small">
          {langs.map(({ code, label }) => (
            <Button
              key={code}
              onClick={() => switchLang(code)}
              variant={code === current ? 'contained' : 'outlined'}
              sx={{ flex: 1 }}
            >
              {label}
            </Button>
          ))}
        </ButtonGroup>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mx: 2 }} />

      <List sx={{ p: 2 }}>
        {user ? (
          <>
            <ListItem disablePadding>
              <ListItemButton
                component={RouterLink}
                to="/settings"
                sx={{ borderRadius: 1 }}
              >
                <ListItemText primary={t('nav.settings')} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => { void handleSignOut(false) }}
                sx={{ borderRadius: 1, color: 'error.main' }}
              >
                <ListItemText primary={t('nav.logout')} />
              </ListItemButton>
            </ListItem>
          </>
        ) : (
          <>
            <ListItem disablePadding>
              <ListItemButton
                onClick={handleLoginClick}
                sx={{ borderRadius: 1 }}
              >
                <ListItemText primary={t('nav.login')} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                onClick={handleRegisterClick}
                sx={{ borderRadius: 1 }}
              >
                <ListItemText primary={t('nav.register')} />
              </ListItemButton>
            </ListItem>
          </>
        )}
      </List>
    </Box>
  )

  return (
    <>
      <AppBar
        position="sticky"
        elevation={6}
        sx={{
          top: 0,
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <Toolbar sx={{
          px: { xs: 1.5, sm: 2, md: 3 },
          py: 1.25,
          gap: 2,
          minHeight: { xs: 56, sm: 64 }
        }}>
          {/* Mobile Menu Button */}
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={toggleMobileDrawer(true)}
            sx={{
              display: { xs: 'flex', md: 'none' },
              mr: 1
            }}
          >
            <MenuIcon />
          </IconButton>

          {/* Brand (Logo + Title) */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            component={RouterLink}
            to="/"
            sx={{
              flex: 1,
              textDecoration: 'none',
              color: 'primary.light',
              '&:hover': { color: 'primary.main' },
              minWidth: 0
            }}
          >
            {/* LOGO */}
            <Box
              component="img"
              src="/WatchWithMe.png"
              alt="Logo"
              sx={{
                width: { xs: 32, sm: 36, md: 42 },
                height: { xs: 32, sm: 36, md: 42 }
              }}
            />

            {/* TITLE */}
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                letterSpacing: 0.2,
                paddingLeft: { xs: 1, sm: 2.5 },
                fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
                display: { xs: 'none', sm: 'block' }
              }}
            >
              {t('app.title')}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                letterSpacing: 0.2,
                fontSize: '1rem',
                display: { xs: 'block', sm: 'none' }
              }}
            >
              WWM
            </Typography>
          </Stack>

          {/* Desktop Navigation */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              display: { xs: 'none', md: 'flex' },
              flex: 1,
              justifyContent: 'center'
            }}
          >
            <NavItem to="/">{t('nav.home')}</NavItem>
            <NavItem to="/rooms">{t('nav.rooms')}</NavItem>
            {user && <NavItem to="/rooms/new">{t('nav.new')}</NavItem>}
          </Stack>

          {/* Right Controls */}
          <Stack direction="row" spacing={1} alignItems="center">
            {/* Language Selector - Desktop */}
            <ButtonGroup
              variant="outlined"
              size="small"
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                borderRadius: 999
              }}
            >
              {langs.map(({ code, label }) => (
                <Button
                  key={code}
                  onClick={() => switchLang(code)}
                  variant={code === current ? 'contained' : 'outlined'}
                  color="primary"
                  sx={{
                    borderRadius: 999,
                    minWidth: { xs: 36, sm: 44 },
                    px: { xs: 1, sm: 2 }
                  }}
                >
                  {label}
                </Button>
              ))}
            </ButtonGroup>

            {/* Mobile Language Indicator */}
            <Typography
              variant="body2"
              sx={{
                display: { xs: 'block', sm: 'none' },
                px: 1,
                py: 0.5,
                borderRadius: 1,
                bgcolor: 'rgba(255,255,255,0.1)',
                textTransform: 'uppercase'
              }}
            >
              {current}
            </Typography>

            {/* Dark/Light Mode Toggle */}
            <ThemeToggleButton />

            {/* Profile/Guest Menu */}
            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
              size="small"
              sx={{ ml: 1 }}
            >
              <Avatar
                src={avatarUrl || undefined}
                alt={userLabel}
                sx={{
                  width: { xs: 28, sm: 32, md: 32 },
                  height: { xs: 28, sm: 32, md: 32 },
                  bgcolor: 'primary.main',
                  fontSize: { xs: '0.8rem', sm: '0.875rem' }
                }}
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
              PaperProps={{
                sx: {
                  backgroundColor: '#1e1e1e',
                  color: 'white',
                  mt: 1
                }
              }}
            >
              {user ? [
                <MenuItem
                  key="settings"
                  component={RouterLink}
                  to="/settings"
                  onClick={() => setAnchorEl(null)}
                  sx={{ fontSize: '0.9rem' }}
                >
                  {t('nav.settings')}
                </MenuItem>,
                <MenuItem
                  key="logout"
                  onClick={() => { void handleSignOut(false) }}
                  sx={{ fontSize: '0.9rem', color: 'error.main' }}
                >
                  {t('nav.logout')}
                </MenuItem>
              ] : [
                <MenuItem
                  key="login"
                  onClick={handleLoginClick}
                  sx={{ fontSize: '0.9rem' }}
                >
                  {t('nav.login')}
                </MenuItem>,
                <MenuItem
                  key="register"
                  onClick={handleRegisterClick}
                  sx={{ fontSize: '0.9rem' }}
                >
                  {t('nav.register')}
                </MenuItem>,
              ]}
            </Menu>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="left"
        open={mobileDrawerOpen}
        onClose={toggleMobileDrawer(false)}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            backgroundColor: 'transparent',
            backdropFilter: 'none',
          }
        }}
      >
        {mobileDrawerContent()}
      </Drawer>
    </>
  )
}