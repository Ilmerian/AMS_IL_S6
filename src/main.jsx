import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, CssBaseline, GlobalStyles } from '@mui/material'
import theme from './ui/theme'
import './index.css'
import './i18n/i18n.js'
import App from './App.jsx'
import { supabase } from "./lib/supabaseClient";
window.supabase = supabase;

let reconnectTimeout;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectAttempts = 0;

if (supabase.realtime) {
  const realtime = supabase.realtime;
  
  if (realtime.on) {
    realtime.on('open', () => {
      console.log('✅ WebSocket connection established');
      reconnectAttempts = 0;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    });

    realtime.on('close', () => {
      console.log('🔌 WebSocket connection closed');
      
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        console.log(`🔄 Reconnecting in ${delay}ms...`);
        
        reconnectTimeout = setTimeout(() => {
          reconnectAttempts++;
          console.log(`🔄 Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
          window.location.reload();
        }, delay);
      } else {
        console.error('❌ Max reconnection attempts reached');
      }
    });

    realtime.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  } else {
    console.warn('⚠️ Supabase realtime.on method not available');
  }
} else {
  console.warn('⚠️ Supabase realtime not available');
}

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