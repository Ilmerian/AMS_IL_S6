// src/components/PasswordStrength.jsx
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { useTranslation } from 'react-i18next'
import { passwordIssues } from '../utils/validators'

function scorePassword(pw = '') {
  let s = 0
  if (pw.length >= 8) s += 1
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s += 1
  if (/\d/.test(pw) || /[^\w\s]/.test(pw)) s += 1
  if (pw.length >= 12) s += 1
  return Math.min(100, s * 25)
}

export default function PasswordStrength({ value }) {
  const { t } = useTranslation()
  const issues = passwordIssues(value)
  const percent = scorePassword(value)
  const label =
    percent >= 75
      ? t('password.strength.strong')
      : percent >= 50
      ? t('password.strength.good')
      : percent >= 25
      ? t('password.strength.weak')
      : t('password.strength.veryWeak')

  return (
    <Box sx={{ mt: 1 }}>
      <LinearProgress variant="determinate" value={percent} sx={{ mb: 0.5 }} />
      <Typography variant="caption" sx={{ opacity: 0.9 }}>
        {label}
        {issues.length ? ` • ${t('password.strength.missing')}: ${issues.join(', ')}` : ''}
      </Typography>
    </Box>
  )
}
