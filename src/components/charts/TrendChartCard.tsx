import type { UseQueryResult } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { seriesColor } from "../../lib/colors";
import {
  formatCompactNumber,
  formatCurrency,
  formatDate,
} from "../../lib/format";
import type { TrendResponse } from "../../shared/schemas/responses";
import { EmptyState } from "../EmptyState";
import { ErrorState } from "../ErrorState";
import { LineChartSkeleton } from "../Skeletons";

interface TrendChartCardProps {
  query: UseQueryResult<TrendResponse>;
  colorMap: Map<number, string>;
  onClearFilters: () => void;
}

type TrendSeries = TrendResponse["series"][number];

// Recharts needs one row per x value with a key per series, so the per-branch
// point lists are merged into rows keyed by date.
function buildRows(series: TrendSeries[]) {
  const rows = new Map<string, Record<string, number | string>>();

  for (const item of series) {
    for (const point of item.points) {
      const row = rows.get(point.date) ?? { date: point.date };
      row[`branch-${item.branchId}`] = point.value;
      rows.set(point.date, row);
    }
  }

  return [...rows.values()].sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
}

export function TrendChartCard({
  query,
  colorMap,
  onClearFilters,
}: TrendChartCardProps) {
  const series = query.data?.series ?? [];
  const hasSeries = series.length > 0;

  return (
    <section className="chart-card trend-card" aria-labelledby="trend-title">
      <div className="chart-header">
        <div>
          <p className="chart-kicker">Trend over time</p>
          <h2 id="trend-title">Sales trend</h2>
        </div>
        {hasSeries ? (
          <div className="legend" aria-label="Branch legend">
            {series.map((item, index) => (
              <span key={item.branchId} className="legend-item">
                <span
                  className="legend-swatch"
                  style={{
                    background: colorMap.get(item.branchId) ?? seriesColor(index),
                  }}
                />
                {item.branchName}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {query.isPending ? (
        <LineChartSkeleton />
      ) : query.isError ? (
        <ErrorState
          message={query.error?.message}
          onRetry={() => {
            void query.refetch();
          }}
        />
      ) : !hasSeries ? (
        <EmptyState actionLabel="Clear filters" onAction={onClearFilters} />
      ) : (
        <>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={buildRows(series)}
                margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#dee1e6"
                  strokeOpacity={0.7}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => formatDate(String(value))}
                  tick={{ fontSize: 12, fill: "#565c66" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                />
                <YAxis
                  tickFormatter={(value) => formatCompactNumber(Number(value))}
                  tick={{ fontSize: 12, fill: "#565c66" }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  labelFormatter={(label) => formatDate(String(label))}
                />
                {series.map((item, index) => (
                  <Line
                    key={item.branchId}
                    type="monotone"
                    dataKey={`branch-${item.branchId}`}
                    name={item.branchName}
                    stroke={colorMap.get(item.branchId) ?? seriesColor(index)}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-note">
            Sales value · Y-axis starts at zero · Hover a data point for exact
            value
          </p>
        </>
      )}
    </section>
  );
}
