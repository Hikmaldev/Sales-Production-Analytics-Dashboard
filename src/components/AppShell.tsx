import { Link, NavLink, Outlet } from "react-router";

import { useAuth } from "../state/AuthContext";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? "topnav-link is-active" : "topnav-link";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

// App frame for the dashboard, export, and admin pages. The login page is
// rendered outside this shell (it has its own full-page layout).
export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="Sales analytics dashboard home">
          <span className="brand-mark" aria-hidden="true">
            SA
          </span>
          <span className="brand-copy">
            <strong>Sales Analytics</strong>
            <span>Operations dashboard</span>
          </span>
        </Link>

        <nav className="topnav" aria-label="Primary navigation">
          <NavLink to="/" end className={navLinkClass}>
            Dashboard
          </NavLink>
          {user?.role === "admin" ? (
            <NavLink to="/admin" className={navLinkClass}>
              Admin
            </NavLink>
          ) : null}
        </nav>

        <div className="user-area">
          <span className="role-label">
            {user?.role === "admin" ? "Admin" : "Viewer"}
          </span>
          <span className="user-avatar" aria-hidden="true">
            {user ? initials(user.name) : "?"}
          </span>
          <button
            type="button"
            className="text-link sign-out"
            onClick={() => {
              void logout();
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <Outlet />
    </div>
  );
}
