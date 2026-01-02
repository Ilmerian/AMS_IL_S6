import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, CssBaseline, GlobalStyles } from '@mui/material'
import './index.css'
import './i18n/i18n.js'
import App from './App.jsx'
import { supabase } from "./lib/supabaseClient";
import { CustomThemeProvider } from './ui/ThemeContext'
window.supabase = supabase;

let reconnectTimeout;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectAttempts = 0;

if (supabase.realtime?.on) {
  const realtime = supabase.realtime;

  realtime.on('open', () => {
    reconnectAttempts = 0;
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
  });

  realtime.on('close', () => {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      reconnectTimeout = setTimeout(() => {
        reconnectAttempts++;
        window.location.reload();
      }, delay);
    }
  });

  realtime.on('error', () => {
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CustomThemeProvider>
      <CssBaseline />
      <GlobalStyles styles={{
        'html, body, #root': { height: '100%', minHeight: '100dvh' },
        'main.content': {
          backgroundColor: 'transparent',
          // Mode sombre : 12091E
          // Mode clair : '#b9c1ff'
          minHeight: '100%',
          paddingBlock: 'clamp(16px, 4vh, 48px)',
        },
        ':root': { '--page-pad': 'clamp(12px, 2.5vw, 28px)' },
      }} />
      <App />
    </CustomThemeProvider>
  </StrictMode>
)