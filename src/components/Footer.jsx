// src/components/Footer.jsx
import { useTranslation } from 'react-i18next'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import { useState } from 'react'
import Link from '@mui/material/Link'

import LegalModal from '../pages/LegalModal'
import TermsModal from '../pages/TermsModal'
import PrivacyModal from '../pages/PrivacyModal'

export default function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  const [openLegal, setOpenLegal] = useState(false)
  const [openTerms, setOpenTerms] = useState(false)
  const [openPrivacy, setOpenPrivacy] = useState(false)

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
      <LegalModal open={openLegal} onClose={() => setOpenLegal(false)} />
      <TermsModal open={openTerms} onClose={() => setOpenTerms(false)} />
      <PrivacyModal open={openPrivacy} onClose={() => setOpenPrivacy(false)} />

      <Toolbar sx={{ px: { xs: 3, md: 6 }, width: '100%', maxWidth: '100%', display: 'flex', justifyContent: 'space-between', opacity: 0.9 }}>
        <span>{t('footer.tagline')}</span>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Link sx={{ cursor: "pointer" }} onClick={() => setOpenLegal(true)}>
            Legal Notice
          </Link>

          <Link sx={{ cursor: "pointer" }} onClick={() => setOpenTerms(true)}>
            Terms of Use
          </Link>

          <Link sx={{ cursor: "pointer" }} onClick={() => setOpenPrivacy(true)}>
            Privacy Policy
          </Link>
        </Box>
        <span>© {year} • {t('footer.rights')}</span>
      </Toolbar>
    </AppBar>
  )
}
