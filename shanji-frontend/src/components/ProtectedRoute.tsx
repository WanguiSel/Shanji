import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Loading } from "./Loading";

// Frontend guard only. Supabase RLS remains the security boundary.
function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/" replace state={{ from: location.pathname }} />;

  return <Outlet />;
}

export default ProtectedRoute;
