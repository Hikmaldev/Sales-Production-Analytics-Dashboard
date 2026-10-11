import { useBranches } from "../api/branches";
import { useProductCategories } from "../api/categories";
import {
  useBranchComparison,
  useCategoryComparison,
  useDashboardSummary,
  useDashboardTrend,
} from "../api/dashboard";
import { FilterBar } from "../components/FilterBar";
import { PageHeading } from "../components/PageHeading";
import { SummaryCards } from "../components/SummaryCards";
import { ComparisonCard } from "../components/charts/ComparisonCard";
import { TrendChartCard } from "../components/charts/TrendChartCard";
import { buildEntityColorMap } from "../lib/colors";
import { getPresetLabel } from "../lib/date-range";
import { formatDateTime } from "../lib/format";
import { useDashboardFilters } from "../state/FiltersContext";

export function DashboardPage() {
  const { filters, clearFilters } = useDashboardFilters();

  const branchesQuery = useBranches();
  const categoriesQuery = useProductCategories();
  const summaryQuery = useDashboardSummary(filters);
  const trendQuery = useDashboardTrend(filters);
  const branchComparisonQuery = useBranchComparison(filters);
  const categoryComparisonQuery = useCategoryComparison(filters);

  // Fixed color assignment by entity id so a branch keeps its color on the
  // trend chart and the comparison chart (design system section 2.2).
  const branchColorMap = buildEntityColorMap(
    (branchesQuery.data ?? []).map((branch) => branch.id),
  );
  const categoryColorMap = buildEntityColorMap(
    (categoriesQuery.data ?? []).map((category) => category.id),
  );

  const dataAsOf = summaryQuery.data?.dataAsOf;

  return (
    <main className="page-content">
      <PageHeading
        eyebrow="Performance overview"
        title="Sales dashboard"
        description="A quick read on what is moving, where, and by how much."
        aside={
          <p className="freshness">
            <span className="freshness-dot" aria-hidden="true" />
            <span>
              Data as of{" "}
              <strong>{dataAsOf ? formatDateTime(dataAsOf) : "—"}</strong>
            </span>
          </p>
        }
      />

      <FilterBar />

      <SummaryCards query={summaryQuery} />

      <TrendChartCard
        query={trendQuery}
        colorMap={branchColorMap}
        onClearFilters={clearFilters}
      />

      <section className="comparison-grid" aria-label="Comparison charts">
        <ComparisonCard
          title="Sales by branch"
          periodLabel={getPresetLabel(filters.preset)}
          query={branchComparisonQuery}
          colorMap={branchColorMap}
          onClearFilters={clearFilters}
        />
        <ComparisonCard
          title="Sales by category"
          periodLabel={getPresetLabel(filters.preset)}
          query={categoryComparisonQuery}
          colorMap={categoryColorMap}
          onClearFilters={clearFilters}
        />
      </section>
    </main>
  );
}
