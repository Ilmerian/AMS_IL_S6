import Paper from '@mui/material/Paper'

export default function Card({ children, ...props }) {
  return (
    <Paper elevation={1} sx={{ p: 3, backdropFilter: 'saturate(140%) blur(8px)', border: '1px solid', borderColor: 'rgba(255,255,255,0.2)' }} {...props}>
      {children}
    </Paper>
  )
}
