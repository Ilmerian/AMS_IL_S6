import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import Pitches from './pages/Pitches.jsx'
import PitchNew from './pages/PitchNew.jsx'
import NotFound from './pages/NotFound.jsx'
import Login from './pages/Login.jsx'
import MainLayout from './layouts/MainLayout.jsx'
import AuthLayout from './layouts/AuthLayout.jsx'
import { PitchContext } from './context/PitchContext.jsx'
import { useMemo, useState } from 'react'
import AuthProvider from './context/AuthProvider.jsx'
import { useAuth } from './context/auth'
import Loader from './components/common/Loader.jsx'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function Providers({ children }) {
  const [pitches, setPitches] = useState([])
  const pitchValue = useMemo(()=>({ items: pitches, setItems: setPitches }), [pitches])
  return (
    <AuthProvider>
      <PitchContext.Provider value={pitchValue}>{children}</PitchContext.Provider>
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
                <Route path="/pitches" element={<Pitches />} />
                <Route path="/pitches/new" element={<Protected><PitchNew /></Protected>} />
              </Route>
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
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
