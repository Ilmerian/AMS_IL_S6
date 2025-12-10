// src/layouts/MainLayout.jsx
import Container from '@mui/material/Container'
import { Outlet } from 'react-router-dom'

// On récupère la prop onOpenLogin
export default function MainLayout({ onOpenLogin }) {
  return (
    <Container maxWidth="false">
      <Outlet context={{ openLogin: onOpenLogin }} />
    </Container>
  )
}