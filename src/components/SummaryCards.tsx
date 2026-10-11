import type { UseQueryResult } from "@tanstack/react-query";

import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatSignedPercent,
} from "../lib/format";
import type { SummaryResponse } from "../shared/schemas/responses";
import { ErrorState } from "./ErrorState";
import { SummaryCardsSkeleton } from "./Skeletons";

interface SummaryCardsProps {
  query: UseQueryResult<SummaryResponse | null>;
}

interface CardSpec {
  label: string;
  value: string;
  changePct: number | null;
  hasData: boolean;
  trendWord?: boolean;
}

function buildCards(summary: SummaryResponse | null): CardSpec[] {
  const change = summary?.change ?? null;

  return [
    {
      label: "Total sales",
      value: summary ? formatCurrency(summary.totalSales) : "—",
      changePct: change?.salesPct ?? null,
      hasData: summary !== null,
    },
    {
      label: "Total units",
      value: summary ? formatNumber(summary.totalUnits) : "—",
      changePct: change?.unitsPct ?? null,
      hasData: summary !== null,
    },
    {
      label: "Average daily sales",
      value: summary ? formatCurrency(summary.avgDailySales) : "—",
      changePct: change?.salesPct ?? null,
      hasData: summary !== null,
    },
    {
      label: "Period-over-period",
      value:
        change?.salesPct != null ? formatSignedPercent(change.salesPct) : "—",
      changePct: change?.salesPct ?? null,
      hasData: summary !== null,
      trendWord: true,
    },
  ];
}

export function SummaryCards({ query }: SummaryCardsProps) {
  if (query.isPending) {
    return <SummaryCardsSkeleton />;
  }

  if (query.isError) {
    return (
      <ErrorState
        message={query.error?.message}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }

  const cards = buildCards(query.data ?? null);

  return (
    <section className="summary-grid" aria-label="Summary metrics">
      {cards.map((card) => (
        <article className="summary-card" key={card.label}>
          <div className="card-label-row">
            <p className="card-label">{card.label}</p>
          </div>
          <p className="metric-value">{card.value}</p>
          <ChangeLine card={card} />
        </article>
      ))}
    </section>
  );
}

function ChangeLine({ card }: { card: CardSpec }) {
  if (!card.hasData) {
    return <p className="metric-change is-flat">No data yet</p>;
  }

  if (card.changePct === null) {
    return <p className="metric-change is-flat">No comparison data</p>;
  }

  const positive = card.changePct >= 0;
  const text = card.trendWord
    ? positive
      ? "Positive trend"
      : "Negative trend"
    : formatPercent(Math.abs(card.changePct));

  return (
    <p className={`metric-change ${positive ? "is-positive" : "is-negative"}`}>
      <span aria-hidden="true">{positive ? "▲" : "▼"}</span> {text}
      <span className="change-context"> vs previous period</span>
    </p>
  );
}
