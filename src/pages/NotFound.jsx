// src/pages/NotFound.jsx
import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'

export default function NotFound() {
  const { t } = useTranslation()

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 4,
        color: 'common.white',
        backgroundImage: 'linear-gradient(to bottom, #111827, #000)',
      }}
    >
      <Stack spacing={3} alignItems="center">
        <Typography variant="h1" fontWeight={800} sx={{ fontSize: { xs: '6rem', md: '8rem' } }}>
          {t('notFound.code')}
        </Typography>

        <Typography variant="h6" sx={{ opacity: 0.8 }}>
          {t('notFound.message')}
        </Typography>

        <Button
          component={RouterLink}
          to="/"
          size="large"
          variant="contained"
          color="primary"
        >
          {t('notFound.backHome')}
        </Button>
      </Stack>
    </Box>
  )
}
