// Fixed series-color assignment from the design system (section 2.2).
// The same color always means the same branch or category on every chart.
// Shared so exported PDF reports use identical colors to the screen.
export const SERIES_COLORS = [
  "#2f5fbf",
  "#d97706",
  "#15803d",
  "#9333ea",
  "#db2777",
  "#0891b2",
] as const;

export function seriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

// Assign colors by ascending entity id so a branch keeps the same color
// across the trend chart and the branch comparison chart.
export function buildEntityColorMap(entityIds: number[]): Map<number, string> {
  const sorted = [...entityIds].sort((a, b) => a - b);
  return new Map(sorted.map((id, index) => [id, seriesColor(index)]));
}
