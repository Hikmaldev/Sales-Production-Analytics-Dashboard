import { Prisma } from "../../generated/prisma/client";
import type {
  ComparisonResponse,
  SummaryResponse,
  TrendResponse,
} from "../../src/shared/schemas/responses";
import { prisma } from "../db";

export interface DashboardFilters {
  start: string;
  end: string;
  /** Empty array means "all branches". */
  branchIds: number[];
  /** Empty array means "all categories". */
  categoryIds: number[];
}

const MS_PER_DAY = 86_400_000;

// --- Date helpers (all dates are ISO YYYY-MM-DD, UTC) ---------------------

function toUtcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function addDays(value: string, days: number): string {
  return new Date(toUtcDate(value).getTime() + days * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

function inclusiveDays(start: string, end: string): number {
  return (
    Math.round(
      (toUtcDate(end).getTime() - toUtcDate(start).getTime()) / MS_PER_DAY,
    ) + 1
  );
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return round(((current - previous) / previous) * 100, 1);
}

/**
 * Shared WHERE fragment. All aggregation happens in PostgreSQL — the API
 * never sums rows in the frontend (AGENTS.md dashboard rules).
 */
function filterConditions(
  filters: DashboardFilters,
  options: { includeBranch?: boolean; includeCategory?: boolean } = {},
): Prisma.Sql {
  const { includeBranch = true, includeCategory = true } = options;

  const conditions: Prisma.Sql[] = [
    Prisma.sql`sr.record_date >= ${filters.start}::date`,
    Prisma.sql`sr.record_date <= ${filters.end}::date`,
  ];
  if (includeBranch && filters.branchIds.length > 0) {
    conditions.push(
      Prisma.sql`sr.branch_id IN (${Prisma.join(filters.branchIds)})`,
    );
  }
  if (includeCategory && filters.categoryIds.length > 0) {
    conditions.push(
      Prisma.sql`p.category_id IN (${Prisma.join(filters.categoryIds)})`,
    );
  }
  return Prisma.join(conditions, " AND ");
}

// --- Summary --------------------------------------------------------------

interface TotalsRow {
  total_sales: number;
  total_units: number;
  record_count: number;
}

async function queryTotals(
  filters: DashboardFilters,
  range: { start: string; end: string },
): Promise<TotalsRow> {
  const rows = await prisma.$queryRaw<TotalsRow[]>(Prisma.sql`
    SELECT
      COALESCE(SUM(sr.value), 0)::float8 AS total_sales,
      COALESCE(SUM(sr.quantity), 0)::float8 AS total_units,
      COUNT(*)::int AS record_count
    FROM sales_records sr
    JOIN products p ON p.id = sr.product_id
    WHERE ${filterConditions({ ...filters, start: range.start, end: range.end })}
  `);
  return rows[0] ?? { total_sales: 0, total_units: 0, record_count: 0 };
}

/**
 * ACT-02 — summary cards. Returns null when the filter combination has no
 * records at all, so the UI shows the shared empty state.
 */
export async function getSummary(
  filters: DashboardFilters,
): Promise<SummaryResponse | null> {
  const current = await queryTotals(filters, {
    start: filters.start,
    end: filters.end,
  });
  if (current.record_count === 0) return null;

  // Period-over-period: the same number of days immediately before start.
  const days = Math.max(inclusiveDays(filters.start, filters.end), 1);
  const previousEnd = addDays(filters.start, -1);
  const previousStart = addDays(previousEnd, -(days - 1));
  const previous = await queryTotals(filters, {
    start: previousStart,
    end: previousEnd,
  });

  return {
    totalSales: round(current.total_sales, 2),
    totalUnits: round(current.total_units, 2),
    avgDailySales: round(current.total_sales / days, 2),
    change: {
      salesPct: percentChange(current.total_sales, previous.total_sales),
      unitsPct: percentChange(current.total_units, previous.total_units),
    },
    dataAsOf: await getDataAsOf(),
  };
}

/** Freshness label: last successful sync, else the newest record. */
async function getDataAsOf(): Promise<string> {
  const lastSync = await prisma.syncRun.findFirst({
    where: { status: "success", finishedAt: { not: null } },
    orderBy: { finishedAt: "desc" },
  });
  if (lastSync?.finishedAt) return lastSync.finishedAt.toISOString();

  const latestRecord = await prisma.salesRecord.aggregate({
    _max: { createdAt: true },
  });
  return (latestRecord._max.createdAt ?? new Date()).toISOString();
}

// --- Trend ----------------------------------------------------------------

interface TrendRow {
  branch_id: number;
  branch_name: string;
  bucket: string;
  total_value: number;
}

/**
 * ACT-03 — sales trend. Granularity adapts to the range so the line chart
 * stays readable: ≤31 days → daily, ≤120 days → weekly, otherwise monthly.
 * Series are split per branch (one line per branch, fixed colours in the UI).
 * Every calendar bucket in the range gets a point (0 when nothing sold), so
 * lines stay continuous instead of breaking wherever a branch had no record.
 */
export async function getTrend(
  filters: DashboardFilters,
): Promise<TrendResponse> {
  const days = inclusiveDays(filters.start, filters.end);
  const granularity: "day" | "week" | "month" =
    days <= 31 ? "day" : days <= 120 ? "week" : "month";

  const rows = await prisma.$queryRaw<TrendRow[]>(Prisma.sql`
    SELECT
      b.id::int AS branch_id,
      b.name AS branch_name,
      to_char(date_trunc(${granularity}::text, sr.record_date), 'YYYY-MM-DD') AS bucket,
      COALESCE(SUM(sr.value), 0)::float8 AS total_value
    FROM sales_records sr
    JOIN branches b ON b.id = sr.branch_id
    JOIN products p ON p.id = sr.product_id
    WHERE ${filterConditions(filters)}
    GROUP BY 1, 2, 3
    ORDER BY 2 ASC, 3 ASC
  `);

  const seriesById = new Map<number, TrendResponse["series"][number]>();
  for (const row of rows) {
    const series = seriesById.get(row.branch_id) ?? {
      branchId: row.branch_id,
      branchName: row.branch_name,
      points: [],
    };
    series.points.push({ date: row.bucket, value: round(row.total_value, 2) });
    seriesById.set(row.branch_id, series);
  }

  // Zero-fill: a bucket without records means "no sales that day in the
  // selected filter", not "unknown". A broken line reads as a bug, and the
  // zero-based axis already treats absence as zero (design system §5.2).
  const buckets = buildBuckets(filters.start, filters.end, granularity);
  for (const series of seriesById.values()) {
    const values = new Map(
      series.points.map((point) => [point.date, point.value]),
    );
    series.points = buckets.map((date) => ({
      date,
      value: values.get(date) ?? 0,
    }));
  }

  return { granularity, series: [...seriesById.values()] };
}

/** All bucket start dates (UTC, YYYY-MM-DD) covering [start, end]. */
function buildBuckets(
  start: string,
  end: string,
  granularity: "day" | "week" | "month",
): string[] {
  const buckets: string[] = [];
  const last = bucketStart(end, granularity);
  let cursor = bucketStart(start, granularity);

  while (cursor.getTime() <= last.getTime()) {
    buckets.push(cursor.toISOString().slice(0, 10));
    cursor = nextBucket(cursor, granularity);
  }
  return buckets;
}

function bucketStart(
  value: string,
  granularity: "day" | "week" | "month",
): Date {
  const date = toUtcDate(value);
  if (granularity === "day") return date;
  if (granularity === "month") {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }
  // date_trunc('week') uses ISO weeks starting on Monday.
  const offsetToMonday = (date.getUTCDay() + 6) % 7;
  return new Date(date.getTime() - offsetToMonday * MS_PER_DAY);
}

function nextBucket(
  date: Date,
  granularity: "day" | "week" | "month",
): Date {
  if (granularity === "day") return new Date(date.getTime() + MS_PER_DAY);
  if (granularity === "week") return new Date(date.getTime() + 7 * MS_PER_DAY);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

// --- Comparisons ----------------------------------------------------------

interface ComparisonRow {
  id: number;
  name: string;
  total_sales: number;
  total_units: number;
}

/**
 * ACT-04 — branch comparison. The branch filter is intentionally not applied
 * (the branches are what gets compared); the category filter is applied.
 */
export async function getBranchComparison(
  filters: DashboardFilters,
): Promise<ComparisonResponse> {
  const rows = await prisma.$queryRaw<ComparisonRow[]>(Prisma.sql`
    SELECT
      b.id::int AS id,
      b.name AS name,
      COALESCE(SUM(sr.value), 0)::float8 AS total_sales,
      COALESCE(SUM(sr.quantity), 0)::float8 AS total_units
    FROM sales_records sr
    JOIN branches b ON b.id = sr.branch_id
    JOIN products p ON p.id = sr.product_id
    WHERE ${filterConditions(filters, { includeBranch: false })}
    GROUP BY 1, 2
    ORDER BY 3 DESC, 2 ASC
  `);

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      totalSales: round(row.total_sales, 2),
      totalUnits: round(row.total_units, 2),
    })),
  };
}

/**
 * ACT-04 — category comparison. The category filter is intentionally not
 * applied (the categories are what gets compared); the branch filter is.
 */
export async function getCategoryComparison(
  filters: DashboardFilters,
): Promise<ComparisonResponse> {
  const rows = await prisma.$queryRaw<ComparisonRow[]>(Prisma.sql`
    SELECT
      c.id::int AS id,
      c.name AS name,
      COALESCE(SUM(sr.value), 0)::float8 AS total_sales,
      COALESCE(SUM(sr.quantity), 0)::float8 AS total_units
    FROM sales_records sr
    JOIN products p ON p.id = sr.product_id
    JOIN product_categories c ON c.id = p.category_id
    WHERE ${filterConditions(filters, { includeCategory: false })}
    GROUP BY 1, 2
    ORDER BY 3 DESC, 2 ASC
  `);

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      totalSales: round(row.total_sales, 2),
      totalUnits: round(row.total_units, 2),
    })),
  };
}
