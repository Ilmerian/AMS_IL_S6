import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="fullbleed" style={{ width: 'min(700px,100%)' }}>
      <Outlet />
    </div>
  )
}
