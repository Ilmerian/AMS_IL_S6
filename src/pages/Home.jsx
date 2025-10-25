// src/pages/Home.jsx
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Card from '../ui/Card'
import Section from '../ui/Section'

export default function Home() {
  const { t } = useTranslation()

  return (
    <Section>
      <Card sx={{ p: { xs: 3, md: 5 } }}>
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 700 }}
        >
          {t('hero.heading')}
        </Typography>

        <Typography sx={{ opacity: 0.9, mb: 3 }}>
          {t('hero.sub')}
        </Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mt: 2 }}
        >
          <Button
            component={RouterLink}
            to="/rooms"
            variant="contained"
            color="primary"
            size="large"
          >
            {t('hero.cta')}
          </Button>

          <Button
            component={RouterLink}
            to="/rooms"
            variant="outlined"
            size="large"
          >
            {t('nav.rooms')}
          </Button>
        </Stack>
      </Card>
    </Section>
  )
}
