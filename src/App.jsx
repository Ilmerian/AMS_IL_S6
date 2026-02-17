import { useState, useEffect } from 'react'
import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import NotFound from './pages/NotFound.jsx'

import LoginDialog from './components/LoginDialog.jsx'
import RegisterDialog from './components/RegisterDialog.jsx'

import MainLayout from './layouts/MainLayout.jsx'
import AuthLayout from './layouts/AuthLayout.jsx'
import AuthProvider from './context/AuthProvider.jsx'
import { useAuth } from './context/auth'

import Settings from './pages/Settings.jsx'
import Rooms from './pages/Rooms.jsx'
import Room from './pages/Room.jsx'
import RoomCreate from './pages/RoomCreate.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import UpdatePassword from './pages/UpdatePassword.jsx'
import RegieLanding from './pages/RegieLanding.jsx'
import RegieViewer from './pages/RegieViewer.jsx'
import RegieDirector from './pages/RegieDirector.jsx'
import { cacheService } from './services/CacheService';

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/" replace />
  return children
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      gcTime: 300000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  },
});

function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default function App() {
  const [loginOpen, setLoginOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)

  useEffect(() => {
    const intervalId = setInterval(() => {
      cacheService.cleanup();
    }, 300000);

    return () => {
      clearInterval(intervalId);
      if (cacheService && typeof cacheService.clear === 'function') {
        cacheService.clear();
      }
    };
  }, []);

  const openLogin = () => { setRegisterOpen(false); setLoginOpen(true) }
  const openRegister = () => { setLoginOpen(false); setRegisterOpen(true) }

  return (
    <Providers>
      <BrowserRouter>
        <div className="app">
          <Header onOpenLogin={openLogin} onOpenRegister={openRegister} />
          
          <main className="content" role="main" aria-label="Main content">
            <Routes>
              <Route element={<MainLayout onOpenLogin={openLogin} />}>
                <Route path="/" element={<Home />} />
                <Route path="/rooms" element={<Rooms />} />
                <Route path="/update-password" element={<UpdatePassword />} />
                {/* --- NOUVELLES ROUTES REGIE --- */}
                <Route path="/regie" element={<RegieLanding />} />
                <Route path="/regie/viewer" element={<RegieViewer />} />
                <Route path="/regie/director" element={<Protected><RegieDirector /></Protected>} />
                {/* ------------------------------ */}
                <Route
                  path="/rooms/new"
                  element={
                    <Protected>
                      <RoomCreate />
                    </Protected>
                  }
                />
                <Route path="/rooms/:roomId" element={<Room />} />
                <Route
                  path="/settings"
                  element={
                    <Protected>
                      <Settings />
                    </Protected>
                  }
                />
              </Route>

              <Route element={<AuthLayout />}>
                <Route path="/reset" element={<ResetPassword />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          
          <Footer />

          <LoginDialog 
            open={loginOpen} 
            onClose={() => setLoginOpen(false)} 
            onSwitchToRegister={openRegister}
          />
          <RegisterDialog 
            open={registerOpen} 
            onClose={() => setRegisterOpen(false)} 
            onSwitchToLogin={openLogin}
          />
        </div>
      </BrowserRouter>
    </Providers>
  )
}