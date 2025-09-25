import { Outlet } from 'react-router-dom'

export default function MainLayout() {
  return (
    <div className="fullbleed" style={{ width: 'min(1200px,100%)' }}>
      <Outlet />
    </div>
  )
}
