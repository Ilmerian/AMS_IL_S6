// src/layouts/MainLayout.jsx
import Container from '@mui/material/Container'
import { Outlet } from 'react-router-dom'

export default function MainLayout() {
  return (
    <Container maxWidth="false">
      <Outlet />
    </Container>
  )
}
