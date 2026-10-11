import type { DashboardFilters } from "../state/FiltersContext";
import { getPresetLabel } from "./date-range";
import { formatDateRange } from "./format";

interface NamedEntity {
  id: number;
  name: string;
}

export function branchFilterLabel(
  branchId: number | null,
  branches: NamedEntity[],
): string {
  if (branchId === null) return "All branches";
  return (
    branches.find((branch) => branch.id === branchId)?.name ?? `Branch #${branchId}`
  );
}

export function categoryFilterLabel(
  categoryId: number | null,
  categories: NamedEntity[],
): string {
  if (categoryId === null) return "All categories";
  return (
    categories.find((category) => category.id === categoryId)?.name ??
    `Category #${categoryId}`
  );
}

// Short form used by the export menu: "This Month · All branches · All categories".
export function describeFiltersByPreset(
  filters: DashboardFilters,
  branches: NamedEntity[],
  categories: NamedEntity[],
): string {
  return [
    getPresetLabel(filters.preset),
    branchFilterLabel(filters.branchId, branches),
    categoryFilterLabel(filters.categoryId, categories),
  ].join(" · ");
}

// Detailed form used by the export page: "Oct 1 – Oct 10, 2026 · All branches · ...".
export function describeFiltersByRange(
  filters: DashboardFilters,
  branches: NamedEntity[],
  categories: NamedEntity[],
): string {
  return [
    formatDateRange(filters.start, filters.end),
    branchFilterLabel(filters.branchId, branches),
    categoryFilterLabel(filters.categoryId, categories),
  ].join(" · ");
}
