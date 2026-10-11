import { useQuery } from "@tanstack/react-query";

import type {
  ComparisonResponse,
  SummaryResponse,
  TrendResponse,
} from "../shared/schemas/responses";
import type { DashboardFilters } from "../state/FiltersContext";
import { apiFetch } from "./client";

// Every cache key contains the complete filter combination, so switching
// back to a previously viewed filter set reuses the cached aggregation
// (PRD §10.5, AGENTS.md rule 2). The comparison endpoints omit the filter
// they compare across — changing it does not refetch those charts.
export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: (filters: DashboardFilters) =>
    [...dashboardKeys.all, "summary", filters] as const,
  trend: (filters: DashboardFilters) =>
    [...dashboardKeys.all, "trend", filters] as const,
  branchComparison: (filters: DashboardFilters) =>
    [
      ...dashboardKeys.all,
      "branch-comparison",
      { start: filters.start, end: filters.end, categoryId: filters.categoryId },
    ] as const,
  categoryComparison: (filters: DashboardFilters) =>
    [
      ...dashboardKeys.all,
      "category-comparison",
      { start: filters.start, end: filters.end, branchId: filters.branchId },
    ] as const,
};

function filterQuery(
  filters: DashboardFilters,
  options: { includeBranch?: boolean; includeCategory?: boolean } = {},
): string {
  const { includeBranch = true, includeCategory = true } = options;
  const params = new URLSearchParams({
    start: filters.start,
    end: filters.end,
  });
  if (includeBranch && filters.branchId !== null) {
    params.set("branch", String(filters.branchId));
  }
  if (includeCategory && filters.categoryId !== null) {
    params.set("category", String(filters.categoryId));
  }
  return params.toString();
}

export function useDashboardSummary(filters: DashboardFilters) {
  return useQuery({
    queryKey: dashboardKeys.summary(filters),
    queryFn: () =>
      apiFetch<SummaryResponse | null>(
        `/dashboard/summary?${filterQuery(filters)}`,
      ),
  });
}

export function useDashboardTrend(filters: DashboardFilters) {
  return useQuery({
    queryKey: dashboardKeys.trend(filters),
    queryFn: () =>
      apiFetch<TrendResponse>(`/dashboard/trend?${filterQuery(filters)}`),
  });
}

export function useBranchComparison(filters: DashboardFilters) {
  return useQuery({
    queryKey: dashboardKeys.branchComparison(filters),
    queryFn: () =>
      apiFetch<ComparisonResponse>(
        `/dashboard/branch-comparison?${filterQuery(filters, {
          includeBranch: false,
        })}`,
      ),
  });
}

export function useCategoryComparison(filters: DashboardFilters) {
  return useQuery({
    queryKey: dashboardKeys.categoryComparison(filters),
    queryFn: () =>
      apiFetch<ComparisonResponse>(
        `/dashboard/category-comparison?${filterQuery(filters, {
          includeCategory: false,
        })}`,
      ),
  });
}
