import { useState } from "react";
import type { FormEvent } from "react";

import {
  useBranches,
  useCreateBranch,
  useUpdateBranchActive,
} from "../api/branches";
import {
  useCreateCategory,
  useProductCategories,
  useUpdateCategoryActive,
} from "../api/categories";
import { AdminNav } from "../components/AdminNav";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Modal } from "../components/Modal";
import { PageHeading } from "../components/PageHeading";
import { TableSkeleton } from "../components/Skeletons";
import { formatNumber } from "../lib/format";

export function AdminBranchesPage() {
  const branchesQuery = useBranches();
  const categoriesQuery = useProductCategories();
  const branches = branchesQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];

  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranchActive();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategoryActive();

  const [isBranchModalOpen, setBranchModalOpen] = useState(false);
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);

  function closeBranchModal() {
    setBranchModalOpen(false);
    createBranch.reset();
  }

  function closeCategoryModal() {
    setCategoryModalOpen(false);
    createCategory.reset();
  }

  async function handleCreateBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const region = String(formData.get("region") ?? "").trim();

    try {
      await createBranch.mutateAsync({
        name: String(formData.get("name") ?? ""),
        region: region === "" ? null : region,
      });
      closeBranchModal();
    } catch {
      // createBranch.error renders the message (e.g. duplicate name → 409).
    }
  }

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      await createCategory.mutateAsync({
        name: String(formData.get("name") ?? ""),
      });
      closeCategoryModal();
    } catch {
      // createCategory.error renders the message.
    }
  }

  return (
    <main className="page-content">
      <PageHeading
        eyebrow="Administration"
        title="Branches & categories"
        description="Keep filter options current while preserving historical reporting data."
      />

      <AdminNav />

      {updateBranch.isError ? (
        <p className="inline-note error" role="alert">
          {updateBranch.error.message}
        </p>
      ) : null}
      {updateCategory.isError ? (
        <p className="inline-note error" role="alert">
          {updateCategory.error.message}
        </p>
      ) : null}

      <section className="table-card" aria-labelledby="branches-title">
        <div className="table-card-header">
          <div>
            <h2 id="branches-title">Branches</h2>
            <p>Inactive branches remain available in historical records.</p>
          </div>
          <button
            className="button"
            type="button"
            onClick={() => setBranchModalOpen(true)}
          >
            + Add branch
          </button>
        </div>

        {branchesQuery.isPending ? (
          <TableSkeleton columns={5} />
        ) : branchesQuery.isError ? (
          <ErrorState
            message={branchesQuery.error?.message}
            onRetry={() => {
              void branchesQuery.refetch();
            }}
          />
        ) : branches.length === 0 ? (
          <EmptyState message="No branches yet." />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Region</th>
                <th>Historical records</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.id}>
                  <td>
                    <strong>{branch.name}</strong>
                  </td>
                  <td>{branch.region ?? "—"}</td>
                  <td>{formatNumber(branch.recordCount)}</td>
                  <td>
                    <span
                      className={
                        branch.isActive
                          ? "status-badge is-active"
                          : "status-badge is-inactive"
                      }
                    >
                      {branch.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="text-link"
                      disabled={
                        updateBranch.isPending &&
                        updateBranch.variables?.id === branch.id
                      }
                      onClick={() =>
                        updateBranch.mutate({
                          id: branch.id,
                          isActive: !branch.isActive,
                        })
                      }
                    >
                      {branch.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section
        className="table-card table-card-spaced"
        aria-labelledby="categories-title"
      >
        <div className="table-card-header">
          <div>
            <h2 id="categories-title">Product categories</h2>
            <p>
              Categories are used throughout dashboard filters and comparisons.
            </p>
          </div>
          <button
            className="button"
            type="button"
            onClick={() => setCategoryModalOpen(true)}
          >
            + Add category
          </button>
        </div>

        {categoriesQuery.isPending ? (
          <TableSkeleton columns={5} />
        ) : categoriesQuery.isError ? (
          <ErrorState
            message={categoriesQuery.error?.message}
            onRetry={() => {
              void categoriesQuery.refetch();
            }}
          />
        ) : categories.length === 0 ? (
          <EmptyState message="No product categories yet." />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Products</th>
                <th>Historical records</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>
                    <strong>{category.name}</strong>
                  </td>
                  <td>{formatNumber(category.productCount)}</td>
                  <td>{formatNumber(category.recordCount)}</td>
                  <td>
                    <span
                      className={
                        category.isActive
                          ? "status-badge is-active"
                          : "status-badge is-inactive"
                      }
                    >
                      {category.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="text-link"
                      disabled={
                        updateCategory.isPending &&
                        updateCategory.variables?.id === category.id
                      }
                      onClick={() =>
                        updateCategory.mutate({
                          id: category.id,
                          isActive: !category.isActive,
                        })
                      }
                    >
                      {category.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <Modal
        title="Add branch"
        open={isBranchModalOpen}
        onClose={closeBranchModal}
      >
        <form onSubmit={handleCreateBranch}>
          <div className="form-field">
            <label htmlFor="branch-name">Branch name</label>
            <input id="branch-name" name="name" maxLength={150} required />
          </div>

          <div className="form-field">
            <label htmlFor="branch-region">Region (optional)</label>
            <input id="branch-region" name="region" maxLength={100} />
          </div>

          {createBranch.isError ? (
            <p className="inline-note error" role="alert">
              {createBranch.error.message}
            </p>
          ) : null}

          <div className="modal-actions">
            <button
              className="button-secondary"
              type="button"
              onClick={closeBranchModal}
            >
              Cancel
            </button>
            <button
              className="button"
              type="submit"
              disabled={createBranch.isPending}
            >
              {createBranch.isPending ? "Creating…" : "Create branch"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        title="Add category"
        open={isCategoryModalOpen}
        onClose={closeCategoryModal}
      >
        <form onSubmit={handleCreateCategory}>
          <div className="form-field">
            <label htmlFor="category-name">Category name</label>
            <input id="category-name" name="name" maxLength={150} required />
          </div>

          {createCategory.isError ? (
            <p className="inline-note error" role="alert">
              {createCategory.error.message}
            </p>
          ) : null}

          <div className="modal-actions">
            <button
              className="button-secondary"
              type="button"
              onClick={closeCategoryModal}
            >
              Cancel
            </button>
            <button
              className="button"
              type="submit"
              disabled={createCategory.isPending}
            >
              {createCategory.isPending ? "Creating…" : "Create category"}
            </button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
