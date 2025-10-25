import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

export default function PageHeading({ title, sub, right }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-end" mb={4}>
      <div>
        <Typography variant="h4" gutterBottom>{title}</Typography>
        {sub ? <Typography variant="body2" color="text.secondary">{sub}</Typography> : null}
      </div>
      {right || null}
    </Stack>
  )
}
