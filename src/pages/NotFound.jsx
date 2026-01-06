// src/pages/NotFound.jsx
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import Container from '@mui/material/Container'
import HomeIcon from '@mui/icons-material/Home'
import SearchIcon from '@mui/icons-material/Search'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied'
import Grid from '@mui/material/Grid'

export default function NotFound() {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const location = useLocation()
  const currentPath = location.pathname

  const quickLinks = [
    { path: '/', label: t('nav.home'), icon: <HomeIcon /> },
    { path: '/rooms', label: t('nav.rooms'), icon: null },
    { path: '/rooms/new', label: t('nav.new'), icon: null },
  ]

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: { xs: 2, sm: 4 },
        color: 'common.white',
        background: `
          radial-gradient(circle at 20% 50%, rgba(155, 92, 255, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(120, 0, 255, 0.15) 0%, transparent 50%),
          linear-gradient(to bottom, #0f0b1e, #000000)
        `,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated Background Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          width: { xs: 100, sm: 200 },
          height: { xs: 100, sm: 200 },
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(155, 92, 255, 0.1) 0%, transparent 70%)',
          animation: 'float 20s ease-in-out infinite',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '15%',
          right: '10%',
          width: { xs: 80, sm: 150 },
          height: { xs: 80, sm: 150 },
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(120, 0, 255, 0.08) 0%, transparent 70%)',
          animation: 'float 25s ease-in-out infinite reverse',
        }}
      />

      <Container maxWidth="md">
        <Stack spacing={{ xs: 4, sm: 5 }} alignItems="center">
          {/* Error Code with Animation */}
          <Box sx={{ position: 'relative' }}>
            <Typography
              variant="h1"
              fontWeight={900}
              sx={{
                fontSize: { xs: '5rem', sm: '7rem', md: '9rem' },
                lineHeight: 1,
                background: 'linear-gradient(135deg, #9b5cff 0%, #7c3aed 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 4px 20px rgba(155, 92, 255, 0.3)',
                mb: 1,
              }}
            >
              404
            </Typography>
            
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                mb: 2,
              }}
            >
              <SentimentDissatisfiedIcon 
                sx={{ 
                  fontSize: { xs: '2rem', sm: '2.5rem' },
                  color: 'rgba(255,255,255,0.3)'
                }} 
              />
              <Typography
                variant="h4"
                fontWeight={700}
                sx={{
                  fontSize: { xs: '1.5rem', sm: '2rem' },
                  opacity: 0.9,
                }}
              >
                {t('notFound.title') || 'Page Not Found'}
              </Typography>
            </Box>
          </Box>

          {/* Error Message */}
          <Box sx={{ maxWidth: '600px' }}>
            <Typography
              variant="h6"
              sx={{
                opacity: 0.8,
                mb: 2,
                fontSize: { xs: '1rem', sm: '1.25rem' },
                lineHeight: 1.5,
              }}
            >
              {t('notFound.message') || "Oops! The page you're looking for doesn't exist or has been moved."}
            </Typography>

            {currentPath && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  mb: 3,
                  textAlign: 'left',
                  maxWidth: '500px',
                  mx: 'auto',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    opacity: 0.7,
                    fontSize: { xs: '0.8rem', sm: '0.9rem' },
                    mb: 0.5,
                  }}
                >
                  {t('notFound.requested_path') || 'Requested path:'}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                    fontSize: { xs: '0.85rem', sm: '1rem' },
                  }}
                >
                  {currentPath}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Quick Actions */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ width: '100%', maxWidth: '500px' }}
          >
            <Button
              component={RouterLink}
              to="/"
              size={isMobile ? "medium" : "large"}
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<HomeIcon />}
              sx={{
                bgcolor: '#9b5cff',
                ':hover': { bgcolor: '#7c3aed' },
                fontWeight: 600,
                py: { xs: 1.5, sm: 1.75 },
                fontSize: { xs: '0.9rem', sm: '1rem' },
              }}
            >
              {t('notFound.backHome') || 'Go to Homepage'}
            </Button>

            {document.referrer && (
              <Button
                onClick={() => window.history.back()}
                size={isMobile ? "medium" : "large"}
                variant="outlined"
                fullWidth
                startIcon={<ArrowBackIcon />}
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'rgba(255,255,255,0.9)',
                  ':hover': {
                    borderColor: 'rgba(255,255,255,0.5)',
                    bgcolor: 'rgba(255,255,255,0.05)',
                  },
                  py: { xs: 1.5, sm: 1.75 },
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                }}
              >
                {t('notFound.goBack') || 'Go Back'}
              </Button>
            )}
          </Stack>

          {/* Quick Links Section */}
          <Box sx={{ width: '100%', maxWidth: '600px', mt: 2 }}>
            <Typography
              variant="subtitle1"
              sx={{
                opacity: 0.7,
                mb: 2,
                fontSize: { xs: '0.9rem', sm: '1rem' },
              }}
            >
              {t('notFound.quickLinks') || 'Quick Links:'}
            </Typography>

            <Grid container spacing={2} justifyContent="center">
              {quickLinks.map((link) => (
                <Grid size={{ xs: 6, sm: 4 }} key={link.path}>
                  <Button
                    component={RouterLink}
                    to={link.path}
                    variant="text"
                    size="small"
                    fullWidth
                    sx={{
                      p: 2,
                      height: '100%',
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.8)',
                      textTransform: 'none',
                      ':hover': {
                        bgcolor: 'rgba(255,255,255,0.08)',
                        borderColor: 'rgba(155, 92, 255, 0.3)',
                      },
                    }}
                  >
                    <Stack spacing={0.5} alignItems="center">
                      {link.icon && (
                        <Box sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>
                          {link.icon}
                        </Box>
                      )}
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: { xs: '0.75rem', sm: '0.8rem' },
                          fontWeight: 500,
                        }}
                      >
                        {link.label}
                      </Typography>
                    </Stack>
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Search Suggestion for Mobile */}
          {isMobile && (
            <Box
              sx={{
                mt: 3,
                p: 2,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                maxWidth: '400px',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  opacity: 0.7,
                  fontSize: '0.85rem',
                  mb: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                }}
              >
                <SearchIcon fontSize="small" />
                {t('notFound.searchHint') || 'Try searching for what you need:'}
              </Typography>
              
              <Button
                component={RouterLink}
                to="/rooms"
                variant="outlined"
                size="small"
                fullWidth
                sx={{
                  borderColor: 'rgba(155, 92, 255, 0.3)',
                  color: '#9b5cff',
                  ':hover': {
                    borderColor: '#9b5cff',
                    bgcolor: 'rgba(155, 92, 255, 0.05)',
                  },
                }}
              >
                {t('notFound.browseRooms') || 'Browse Public Rooms'}
              </Button>
            </Box>
          )}

          {/* Contact Support */}
          <Box sx={{ mt: 2 }}>
            <Typography
              variant="caption"
              sx={{
                opacity: 0.5,
                fontSize: { xs: '0.7rem', sm: '0.8rem' },
              }}
            >
              {t('notFound.contactSupport') || 'Still lost?'}{' '}
              <Button
                component={RouterLink}
                to="/contact"
                variant="text"
                size="small"
                sx={{
                  color: '#9b5cff',
                  fontSize: 'inherit',
                  fontWeight: 500,
                  minWidth: 'auto',
                  p: 0,
                  textDecoration: 'underline',
                }}
              >
                {t('notFound.contactUs') || 'Contact Support'}
              </Button>
            </Typography>
          </Box>
        </Stack>
      </Container>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          33% {
            transform: translateY(-20px) rotate(120deg);
          }
          66% {
            transform: translateY(20px) rotate(240deg);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </Box>
  )
}
