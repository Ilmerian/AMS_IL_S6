// src/components/VideoPlayerShell.jsx
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '../ui/Card'
import { useTranslation } from 'react-i18next'

export default function VideoPlayerShell({ embedUrl }) {
  const { t } = useTranslation()

  return (
    <Card
      sx={{
        p: 0,
        overflow: 'hidden',
        minHeight: { xs: 360, sm: 420, md: 480, lg: 540 },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: { xs: 320, sm: 420, md: '55vh', lg: '65vh' },
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'rgba(0,0,0,0.7)',
        }}
      >
        {embedUrl ? (
          <iframe
            title="YouTube"
            width="100%"
            height="100%"
            src={embedUrl}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <Typography sx={{ opacity: 0.85, color: 'white' }}>
            {t('video.emptyHint')}
          </Typography>
        )}
      </Box>
    </Card>
  )
}
