import { Link } from "react-router";

import { useBranches } from "../api/branches";
import { useProductCategories } from "../api/categories";
import { DATE_PRESETS } from "../lib/date-range";
import type { DateRangePreset } from "../lib/date-range";
import { describeFiltersByPreset } from "../lib/filter-summary";
import { useDashboardFilters } from "../state/FiltersContext";

// Sticky filter bar (design system section 5.4). Every control writes to the
// shared filter state, so all charts and cards move together (FR-FLT-04).
export function FilterBar() {
  const { filters, setPreset, setBranchId, setCategoryId } =
    useDashboardFilters();
  // Filter options only include active entities; deactivated ones remain in
  // historical data but cannot be newly selected (PRD §11.2).
  const branchesQuery = useBranches({ activeOnly: true });
  const categoriesQuery = useProductCategories({ activeOnly: true });

  const branches = branchesQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];

  return (
    <section className="filter-bar" aria-label="Dashboard filters">
      <div className="filter-controls">
        <label className="filter-field">
          <span>Date range</span>
          <select
            value={filters.preset}
            onChange={(event) =>
              setPreset(event.target.value as DateRangePreset)
            }
          >
            {DATE_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span>Branch</span>
          <select
            value={filters.branchId ?? ""}
            onChange={(event) =>
              setBranchId(
                event.target.value === "" ? null : Number(event.target.value),
              )
            }
          >
            <option value="">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span>Category</span>
          <select
            value={filters.categoryId ?? ""}
            onChange={(event) =>
              setCategoryId(
                event.target.value === "" ? null : Number(event.target.value),
              )
            }
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <details className="export-menu">
        <summary>
          <span className="download-icon" aria-hidden="true">
            ↓
          </span>
          Export
          <span className="chevron" aria-hidden="true">
            ⌄
          </span>
        </summary>
        <div className="export-options">
          <p className="export-label">Export current view</p>
          <p className="export-context">
            {describeFiltersByPreset(filters, branches, categories)}
          </p>
          <Link to="/export">Export to PDF</Link>
          <Link to="/export">Export to Excel</Link>
        </div>
      </details>
    </section>
  );
}
