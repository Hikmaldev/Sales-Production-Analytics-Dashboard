import { useId } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { seriesColor } from "../../lib/colors";
import { formatCurrency } from "../../lib/format";
import type { ComparisonResponse } from "../../shared/schemas/responses";
import { EmptyState } from "../EmptyState";
import { ErrorState } from "../ErrorState";
import { BarChartSkeleton } from "../Skeletons";

interface ComparisonCardProps {
  title: string;
  periodLabel: string;
  query: UseQueryResult<ComparisonResponse>;
  colorMap: Map<number, string>;
  onClearFilters: () => void;
}

export function ComparisonCard({
  title,
  periodLabel,
  query,
  colorMap,
  onClearFilters,
}: ComparisonCardProps) {
  const headingId = useId();
  const items = query.data?.items ?? [];
  const hasItems = items.length > 0;
  const chartHeight = Math.max(180, items.length * 44 + 16);

  return (
    <article className="chart-card comparison-card" aria-labelledby={headingId}>
      <div className="chart-header compact-header">
        <div>
          <p className="chart-kicker">Ranked comparison</p>
          <h2 id={headingId}>{title}</h2>
        </div>
        <span className="chart-period">{periodLabel}</span>
      </div>

      {query.isPending ? (
        <BarChartSkeleton />
      ) : query.isError ? (
        <ErrorState
          message={query.error?.message}
          onRetry={() => {
            void query.refetch();
          }}
        />
      ) : !hasItems ? (
        <EmptyState actionLabel="Clear filters" onAction={onClearFilters} />
      ) : (
        <>
          <div className="chart-body" style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={items}
                layout="vertical"
                margin={{ top: 4, right: 76, bottom: 4, left: 8 }}
              >
                <XAxis type="number" hide domain={[0, "dataMax"]} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={124}
                  tick={{ fontSize: 12, fill: "#565c66" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  cursor={{ fill: "rgba(17, 19, 24, 0.04)" }}
                />
                <Bar
                  dataKey="totalSales"
                  name="Sales value"
                  barSize={14}
                  radius={2}
                  isAnimationActive={false}
                >
                  {items.map((item, index) => (
                    <Cell
                      key={item.id}
                      fill={colorMap.get(item.id) ?? seriesColor(index)}
                    />
                  ))}
                  <LabelList
                    dataKey="totalSales"
                    position="right"
                    className="bar-value-label"
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-note">Ordered highest to lowest</p>
        </>
      )}
    </article>
  );
}
