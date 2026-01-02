// src/components/Footer.jsx
import { useTranslation } from 'react-i18next'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import { useState } from 'react'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import MenuIcon from '@mui/icons-material/Menu'

import LegalModal from '../pages/LegalModal'
import TermsModal from '../pages/TermsModal'
import PrivacyModal from '../pages/PrivacyModal'

export default function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  const [openLegal, setOpenLegal] = useState(false)
  const [openTerms, setOpenTerms] = useState(false)
  const [openPrivacy, setOpenPrivacy] = useState(false)
  const [anchorEl, setAnchorEl] = useState(null)
  const open = Boolean(anchorEl)

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLegalClick = () => {
    handleMenuClose()
    setOpenLegal(true)
  }

  const handleTermsClick = () => {
    handleMenuClose()
    setOpenTerms(true)
  }

  const handlePrivacyClick = () => {
    handleMenuClose()
    setOpenPrivacy(true)
  }

  return (
    <AppBar 
      component="footer" 
      position="static" 
      elevation={6}
      sx={{
        mt: 0,
        py: { xs: 1.5, sm: 1.25 },
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'saturate(160%) blur(8px)',
        borderTop: '1px solid rgba(255,255,255,0.2)',
      }}
    >
      <LegalModal open={openLegal} onClose={() => setOpenLegal(false)} />
      <TermsModal open={openTerms} onClose={() => setOpenTerms(false)} />
      <PrivacyModal open={openPrivacy} onClose={() => setOpenPrivacy(false)} />

      <Toolbar sx={{ 
        px: { xs: 1.5, sm: 3, md: 6 }, 
        width: '100%', 
        maxWidth: 1280, 
        mx: 'auto',
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        gap: { xs: 1.5, sm: 0 },
        opacity: 0.9 
      }}>
        {/* Tagline  */}
        <Typography 
          variant="body2" 
          sx={{ 
            fontSize: { xs: '0.8rem', sm: '0.875rem' },
            textAlign: { xs: 'left', sm: 'center' }
          }}
        >
          {t('footer.tagline')}
        </Typography>

        {/* Desktop Links */}
        <Box sx={{ 
          display: { xs: 'none', sm: 'flex' }, 
          gap: 2 
        }}>
          <Link 
            sx={{ 
              cursor: "pointer", 
              fontSize: '0.875rem',
              '&:hover': { color: 'primary.light' }
            }} 
            onClick={() => setOpenLegal(true)}
          >
            {t('footer.legal')}
          </Link>

          <Link 
            sx={{ 
              cursor: "pointer", 
              fontSize: '0.875rem',
              '&:hover': { color: 'primary.light' }
            }} 
            onClick={() => setOpenTerms(true)}
          >
            {t('footer.terms')}
          </Link>

          <Link 
            sx={{ 
              cursor: "pointer", 
              fontSize: '0.875rem',
              '&:hover': { color: 'primary.light' }
            }} 
            onClick={() => setOpenPrivacy(true)}
          >
            {t('footer.privacy')}
          </Link>
        </Box>

        {/* Mobile Menu Button */}
        <Box sx={{ 
          display: { xs: 'flex', sm: 'none' }, 
          alignItems: 'center',
          width: '100%',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              size="small"
              onClick={handleMenuClick}
              sx={{ color: 'rgba(255,255,255,0.8)' }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              {t('footer.menu')}
            </Typography>
          </Box>

          {/* Copyright */}
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.75rem',
              opacity: 0.8
            }}
          >
            © {year}
          </Typography>
        </Box>

        {/* Desktop Copyright*/}
        <Typography 
          variant="body2" 
          sx={{ 
            fontSize: '0.875rem',
            display: { xs: 'none', sm: 'block' },
            textAlign: { xs: 'left', sm: 'center' }
          }}
        >
          © {year} • {t('footer.rights')}
        </Typography>

        {/* Mobile Menu */}
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            sx: {
              backgroundColor: '#1e1e1e',
              color: 'white',
              mt: 1,
              minWidth: 180
            }
          }}
        >
          <MenuItem onClick={handleLegalClick} sx={{ fontSize: '0.9rem' }}>
            {t('footer.legal')}
          </MenuItem>
          <MenuItem onClick={handleTermsClick} sx={{ fontSize: '0.9rem' }}>
            {t('footer.terms')}
          </MenuItem>
          <MenuItem onClick={handlePrivacyClick} sx={{ fontSize: '0.9rem' }}>
            {t('footer.privacy')}
          </MenuItem>
        </Menu>
      </Toolbar>

      <Box sx={{ 
        display: { xs: 'flex', sm: 'none' },
        justifyContent: 'center',
        pb: 1,
        px: 2
      }}>
        <Typography 
          variant="body2" 
          sx={{ 
            fontSize: '0.7rem',
            opacity: 0.7,
            textAlign: 'center'
          }}
        >
          {t('footer.rights')}
        </Typography>
      </Box>
    </AppBar>
  )
}
