// src/ui/Section.jsx
import Box from '@mui/material/Box'

export default function Section({ children, ...props }) {
  return (
    <Box className="fullbleed" sx={{ py: 6 }} {...props}>
      {children}
    </Box>
  )
}
