import { NavLink } from "react-router";

const ADMIN_TABS = [
  { to: "/admin/data-sources", label: "Data sources" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/branches", label: "Branches & categories" },
];

export function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="Administration navigation">
      {ADMIN_TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => (isActive ? "is-active" : "")}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
