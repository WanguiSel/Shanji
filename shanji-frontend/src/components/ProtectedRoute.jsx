import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

// Blocks protected pages until the session is restored; redirects
// unauthenticated users to login. Frontend guard only - RLS is the real boundary.
function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <p style={{ padding: 30 }}>Loading session...</p>
  if (!user) return <Navigate to="/" replace state={{ from: location.pathname }} />

  return <Outlet />
}

export default ProtectedRoute
