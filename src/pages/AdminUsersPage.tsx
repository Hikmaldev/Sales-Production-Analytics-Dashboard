import { useState } from "react";
import type { FormEvent } from "react";
import type { UserRole } from "../shared/schemas/enums";

import { useCreateUser, useUsers } from "../api/users";
import { AdminNav } from "../components/AdminNav";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Modal } from "../components/Modal";
import { PageHeading } from "../components/PageHeading";
import { TableSkeleton } from "../components/Skeletons";
import { formatDateTime } from "../lib/format";

export function AdminUsersPage() {
  const usersQuery = useUsers();
  const createUser = useCreateUser();
  const [isModalOpen, setModalOpen] = useState(false);
  const users = usersQuery.data ?? [];

  function closeModal() {
    setModalOpen(false);
    createUser.reset();
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      await createUser.mutateAsync({
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        role: String(formData.get("role") ?? "viewer") as UserRole,
        password: String(formData.get("password") ?? ""),
      });
      closeModal();
    } catch {
      // createUser.error renders the message (e.g. duplicate email → 409).
    }
  }

  return (
    <main className="page-content">
      <PageHeading
        eyebrow="Administration"
        title="Users"
        description="Manage who can access the dashboard and their role."
        aside={
          <button
            className="button"
            type="button"
            onClick={() => setModalOpen(true)}
          >
            + Add user
          </button>
        }
      />

      <AdminNav />

      <section className="table-card" aria-labelledby="users-title">
        <div className="table-card-header">
          <div>
            <h2 id="users-title">Account directory</h2>
            <p>Authenticated users with access to this dashboard.</p>
          </div>
        </div>

        {usersQuery.isPending ? (
          <TableSkeleton columns={5} />
        ) : usersQuery.isError ? (
          <ErrorState
            message={usersQuery.error?.message}
            onRetry={() => {
              void usersQuery.refetch();
            }}
          />
        ) : users.length === 0 ? (
          <EmptyState message="No users yet." />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Last active</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                  </td>
                  <td>{user.email}</td>
                  <td>{user.role === "admin" ? "Admin" : "Viewer"}</td>
                  <td>
                    {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "—"}
                  </td>
                  <td>
                    <span
                      className={
                        user.isActive
                          ? "status-badge is-active"
                          : "status-badge is-inactive"
                      }
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <Modal title="Add user" open={isModalOpen} onClose={closeModal}>
        <form onSubmit={handleCreate}>
          <div className="form-field">
            <label htmlFor="user-name">Name</label>
            <input id="user-name" name="name" maxLength={150} required />
          </div>

          <div className="form-field">
            <label htmlFor="user-email">Email address</label>
            <input id="user-email" name="email" type="email" required />
          </div>

          <div className="form-field">
            <label htmlFor="user-role">Role</label>
            <select id="user-role" name="role" defaultValue="viewer">
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="user-password">Initial password</label>
            <input
              id="user-password"
              name="password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
            <p className="form-hint">
              At least 8 characters. Share it with the user securely.
            </p>
          </div>

          {createUser.isError ? (
            <p className="inline-note error" role="alert">
              {createUser.error.message}
            </p>
          ) : null}

          <div className="modal-actions">
            <button
              className="button-secondary"
              type="button"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              className="button"
              type="submit"
              disabled={createUser.isPending}
            >
              {createUser.isPending ? "Creating…" : "Create user"}
            </button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
