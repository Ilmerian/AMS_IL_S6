// src/components/PasswordStrength.jsx
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import { useTranslation } from 'react-i18next'
import { passwordIssues } from '../utils/validators'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'

function scorePassword(pw = '') {
  let s = 0
  if (pw.length >= 8) s += 1
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s += 1
  if (/\d/.test(pw) || /[^\w\s]/.test(pw)) s += 1
  if (pw.length >= 12) s += 1
  return Math.min(100, s * 25)
}

function getStrengthColor(percent) {
  if (percent >= 75) return 'success.main'
  if (percent >= 50) return 'info.main'
  if (percent >= 25) return 'warning.main'
  return 'error.main'
}

function getStrengthEmoji(percent) {
  if (percent >= 75) return '💪'
  if (percent >= 50) return '👍'
  if (percent >= 25) return '👎'
  return '🚫'
}

export default function PasswordStrength({ value }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  
  const issues = passwordIssues(value)
  const percent = scorePassword(value)
  const strengthColor = getStrengthColor(percent)
  const strengthEmoji = getStrengthEmoji(percent)
  
  const getLabel = () => {
    if (percent >= 75) return t('password.strength.strong')
    if (percent >= 50) return t('password.strength.good')
    if (percent >= 25) return t('password.strength.weak')
    return t('password.strength.veryWeak')
  }

  const label = getLabel()

  if (isMobile) {
    return (
      <Box sx={{ mt: 1.5 }}>
        <Stack spacing={0.5}>
          {/* Progress bar with label inline */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={percent} 
                sx={{ 
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: strengthColor,
                    borderRadius: 3,
                  }
                }} 
              />
            </Box>
            <Typography 
              variant="caption" 
              sx={{ 
                fontWeight: 600,
                color: strengthColor,
                fontSize: '0.7rem',
                minWidth: 40,
                textAlign: 'right'
              }}
            >
              {strengthEmoji} {label}
            </Typography>
          </Box>

          {/* Issues list - compact on mobile */}
          {issues.length > 0 && (
            <Typography 
              variant="caption" 
              sx={{ 
                opacity: 0.7,
                fontSize: '0.65rem',
                lineHeight: 1.3
              }}
            >
              {t('password.strength.missing')}: {issues.map(issue => 
                t(`password.issue.${issue}`, issue)
              ).join(', ')}
            </Typography>
          )}

          {/* Strength indicator icons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            <Box
              sx={{
                width: '100%',
                display: 'flex',
                gap: 0.5
              }}
            >
              {[0, 1, 2, 3].map((segment) => (
                <Box
                  key={segment}
                  sx={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: segment * 25 < percent 
                      ? strengthColor 
                      : 'rgba(255,255,255,0.08)',
                    opacity: segment * 25 < percent ? 1 : 0.3,
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Quick tips for mobile */}
          {value.length > 0 && value.length < 8 && (
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'warning.main',
                fontSize: '0.65rem',
                mt: 0.5
              }}
            >
              ⚠️ {t('password.tip.minimum', 'At least 8 characters')}
            </Typography>
          )}
        </Stack>
      </Box>
    )
  }

  // Desktop version
  return (
    <Box sx={{ mt: 2 }}>
      <Stack spacing={1}>
        {/* Strength indicator with emoji */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <Box 
              component="span" 
              sx={{ 
                fontSize: '1.2rem',
                lineHeight: 1
              }}
            >
              {strengthEmoji}
            </Box>
            {t('password.strength.title')}
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 600,
              color: strengthColor
            }}
          >
            {label}
          </Typography>
        </Box>

        {/* Main progress bar */}
        <LinearProgress 
          variant="determinate" 
          value={percent} 
          sx={{ 
            height: 8,
            borderRadius: 4,
            backgroundColor: 'rgba(255,255,255,0.1)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: strengthColor,
              borderRadius: 4,
              transition: 'transform 0.4s ease'
            }
          }} 
        />

        {/* Detailed issues list */}
        {issues.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography 
              variant="caption" 
              sx={{ 
                opacity: 0.8,
                display: 'block',
                mb: 0.5,
                fontSize: '0.8rem'
              }}
            >
              {t('password.strength.requirements') || 'Missing requirements:'}
            </Typography>
            <Stack spacing={0.5}>
              {issues.map((issue) => (
                <Box 
                  key={issue}
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1
                  }}
                >
                  <Box 
                    sx={{ 
                      width: 6, 
                      height: 6, 
                      borderRadius: '50%', 
                      backgroundColor: 'error.main',
                      opacity: 0.7
                    }} 
                  />
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      opacity: 0.9,
                      fontSize: '0.75rem'
                    }}
                  >
                    {t(`password.issue.${issue}`, issue)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* Strength meter visualization */}
        <Box sx={{ mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            {['Very weak', 'Weak', 'Good', 'Strong'].map((label, index) => (
              <Typography 
                key={label}
                variant="caption" 
                sx={{ 
                  fontSize: '0.7rem',
                  opacity: index * 25 < percent ? 0.9 : 0.3,
                  fontWeight: index * 25 < percent ? 600 : 400,
                  color: index * 25 < percent ? strengthColor : 'inherit'
                }}
              >
                {t(`password.level.${index}`) || label}
              </Typography>
            ))}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {[0, 1, 2, 3].map((segment) => (
              <Box
                key={segment}
                sx={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: segment * 25 < percent 
                    ? strengthColor 
                    : 'rgba(255,255,255,0.08)',
                  opacity: segment * 25 < percent ? 1 : 0.3,
                  transition: 'all 0.3s ease',
                  transform: segment * 25 < percent ? 'scaleY(1.2)' : 'scaleY(1)'
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Character count */}
        <Typography 
          variant="caption" 
          sx={{ 
            opacity: 0.7,
            display: 'flex',
            justifyContent: 'space-between',
            mt: 0.5
          }}
        >
          <span>
            {t('password.characters', 'Characters')}: {value.length}
          </span>
          <span>
            {value.length >= 8 ? '✅' : '❌'} {t('password.minimum', 'Minimum 8')}
          </span>
        </Typography>
      </Stack>
    </Box>
  )
}