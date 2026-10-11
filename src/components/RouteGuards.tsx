import { Navigate, Outlet, useLocation } from "react-router";

import { useAuth } from "../state/AuthContext";

/** Redirects to /login unless a valid session is present. */
export function RequireAuth() {
  const { user, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return (
      <main className="page-content">
        <p className="freshness">Checking your session…</p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

/** Admin-only area; viewers are sent back to the dashboard. */
export function RequireAdmin() {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
