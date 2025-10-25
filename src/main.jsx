import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, CssBaseline, GlobalStyles } from '@mui/material'
import theme from './ui/theme'
import './index.css'
import './i18n/i18n.js'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={{
        'html, body, #root': { height: '100%', minHeight: '100dvh' },
        'main.content': {
          backgroundColor: '#b9c1ff',
          minHeight: '100%',
          paddingBlock: 'clamp(16px, 4vh, 48px)',
        },
        ':root': { '--page-pad': 'clamp(12px, 2.5vw, 28px)' },
      }} />
      <App />
    </ThemeProvider>
  </StrictMode>
)
