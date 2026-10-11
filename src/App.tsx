import { Navigate, Route, Routes } from "react-router";

import { AppShell } from "./components/AppShell";
import { RequireAdmin, RequireAuth } from "./components/RouteGuards";
import { AdminBranchesPage } from "./pages/AdminBranchesPage";
import { AdminDataSourcesPage } from "./pages/AdminDataSourcesPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ExportPage } from "./pages/ExportPage";
import { LoginPage } from "./pages/LoginPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route element={<RequireAdmin />}>
            <Route
              path="/admin"
              element={<Navigate to="/admin/data-sources" replace />}
            />
            <Route
              path="/admin/data-sources"
              element={<AdminDataSourcesPage />}
            />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/branches" element={<AdminBranchesPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
