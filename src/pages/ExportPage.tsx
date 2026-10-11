import { useMemo, useState } from "react";
import { Link } from "react-router";

import { useBranches } from "../api/branches";
import { useProductCategories } from "../api/categories";
import { useRequestExport } from "../api/exports";
import { PageHeading } from "../components/PageHeading";
import { formatDateRange } from "../lib/format";
import { branchFilterLabel, categoryFilterLabel } from "../lib/filter-summary";
import type { FilterSnapshot } from "../shared/schemas/entities";
import type { ExportFormat } from "../shared/schemas/enums";
import { useDashboardFilters } from "../state/FiltersContext";

export function ExportPage() {
  const { filters } = useDashboardFilters();
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const exportMutation = useRequestExport();

  const branchesQuery = useBranches();
  const categoriesQuery = useProductCategories();
  const branches = branchesQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];

  // The exact filter combination currently on screen (FR-EXP-03); empty
  // arrays mean "all branches" / "all categories".
  const filterSnapshot = useMemo<FilterSnapshot>(
    () => ({
      start: filters.start,
      end: filters.end,
      branches: filters.branchId !== null ? [filters.branchId] : [],
      categories: filters.categoryId !== null ? [filters.categoryId] : [],
    }),
    [filters.start, filters.end, filters.branchId, filters.categoryId],
  );

  const periodLabel = formatDateRange(filters.start, filters.end);
  const branchLabel = branchFilterLabel(filters.branchId, branches);
  const categoryLabel = categoryFilterLabel(filters.categoryId, categories);

  return (
    <main className="page-content">
      <PageHeading
        eyebrow="Report delivery"
        title="Export current view"
        description="Choose a format for the exact dashboard filters currently on screen."
        aside={
          <Link className="text-link" to="/">
            ← Back to dashboard
          </Link>
        }
      />

      <div className="export-layout">
        <section className="export-card" aria-labelledby="export-title">
          <h2 id="export-title">Select a format</h2>
          <p className="export-card-intro">
            Your export will include the active filters and the aggregated data
            behind this view.
          </p>

          <div className="format-options">
            <div className="format-option">
              <input
                id="format-pdf"
                name="format"
                type="radio"
                checked={format === "pdf"}
                onChange={() => setFormat("pdf")}
              />
              <label htmlFor="format-pdf">
                <span className="format-icon" aria-hidden="true">
                  PDF
                </span>
                <strong>Dashboard PDF</strong>
                <small>Charts and summary cards for a meeting-ready report.</small>
              </label>
            </div>
            <div className="format-option">
              <input
                id="format-excel"
                name="format"
                type="radio"
                checked={format === "excel"}
                onChange={() => setFormat("excel")}
              />
              <label htmlFor="format-excel">
                <span className="format-icon" aria-hidden="true">
                  XLS
                </span>
                <strong>Filtered Excel</strong>
                <small>Underlying filtered data for offline analysis.</small>
              </label>
            </div>
          </div>

          <div className="filter-summary">
            <p className="filter-summary-label">Filters included</p>
            <p>{`${periodLabel} · ${branchLabel} · ${categoryLabel}`}</p>
          </div>

          <div className="page-actions">
            <button
              className="button"
              type="button"
              disabled={exportMutation.isPending}
              onClick={() =>
                exportMutation.mutate({ format, filters: filterSnapshot })
              }
            >
              {exportMutation.isPending ? "Generating…" : "Generate and download"}
            </button>
            <Link className="button-secondary" to="/">
              Cancel
            </Link>
          </div>

          {exportMutation.isError ? (
            <p className="inline-note error" role="alert">
              {exportMutation.error.message}
            </p>
          ) : null}

          {exportMutation.isSuccess ? (
            <p className="inline-note success" role="status">
              Export downloaded: {exportMutation.data}
            </p>
          ) : null}
        </section>

        <aside className="detail-card" aria-labelledby="details-title">
          <h2 id="details-title">Export details</h2>
          <dl className="detail-list">
            <div className="detail-row">
              <dt>Period</dt>
              <dd>{periodLabel}</dd>
            </div>
            <div className="detail-row">
              <dt>Branches</dt>
              <dd>{branchLabel}</dd>
            </div>
            <div className="detail-row">
              <dt>Categories</dt>
              <dd>{categoryLabel}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </main>
  );
}
