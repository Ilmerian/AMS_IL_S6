// src/components/Footer.jsx
import { useTranslation } from 'react-i18next'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'

export default function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <AppBar component="footer" position="static" elevation={6}
      sx={{
        mt: 0,
        py: 1.25,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'saturate(160%) blur(8px)',
        borderTop: '1px solid rgba(255,255,255,0.2)',
      }}
    >
      <Toolbar sx={{ px: { xs: 3, md: 6 }, width: '100%', maxWidth: '100%', display: 'flex', justifyContent: 'space-between', opacity: 0.9 }}>
        <span>{t('footer.tagline')}</span>
        <span>© {year} • {t('footer.rights')}</span>
      </Toolbar>
    </AppBar>
  )
}
