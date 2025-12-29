// src/ui/theme.js
import { createTheme } from '@mui/material/styles'

/**
 * Thème graphique de l'application
 */

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      light: '#9aa4ff',
      main: '#646cff',
      dark: '#4144a6',
    },
    background: {
      default: '#8b8b97',
      paper: 'rgba(0,0,0,0.6)',
    },
    text: {
      primary: 'rgba(255,255,255,0.92)',
      secondary: 'rgba(255,255,255,0.8)',
    },
  },
  shape: { borderRadius: 10 },
  shadows: [
    'none',
    '0 6px 18px rgba(0,0,0,0.35)',
    ...Array(23).fill('0 6px 18px rgba(0,0,0,0.35)'),
  ],
  components: {
    MuiLink: {
      styleOverrides: {
        root: { textDecoration: 'none', color: '#b9c1ff', '&:hover': { color: '#b9c1ff' } },
      },
    },
  },
})

export default theme
export { theme }
