import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import NotFound from './pages/NotFound.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
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

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

function Providers({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <div className="app">
          <Header />
          <main className="content" role="main" aria-label="Main content">
            <Routes>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/rooms" element={<Rooms />} />
                <Route path="/update-password" element={<UpdatePassword />} />
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
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/reset" element={<ResetPassword />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </Providers>
  )
}
