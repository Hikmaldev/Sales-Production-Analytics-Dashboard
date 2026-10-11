import type { Request, Response } from "express";

import {
  branchComparisonQuerySchema,
  categoryComparisonQuerySchema,
  summaryQuerySchema,
  trendQuerySchema,
} from "../../src/shared/schemas/dashboard";
import { parseQuery } from "../http/validation";
import type { DashboardFilters } from "../services/dashboard.service";
import * as dashboardService from "../services/dashboard.service";

/** ACT-02 — GET /api/v1/dashboard/summary. */
export async function getSummary(req: Request, res: Response): Promise<void> {
  const query = parseQuery(summaryQuerySchema, req.query);
  res.json(await dashboardService.getSummary(toFilters(query)));
}

/** ACT-03 — GET /api/v1/dashboard/trend. */
export async function getTrend(req: Request, res: Response): Promise<void> {
  const query = parseQuery(trendQuerySchema, req.query);
  res.json(await dashboardService.getTrend(toFilters(query)));
}

/** ACT-04 — GET /api/v1/dashboard/branch-comparison (branch filter ignored). */
export async function getBranchComparison(
  req: Request,
  res: Response,
): Promise<void> {
  const query = parseQuery(branchComparisonQuerySchema, req.query);
  res.json(await dashboardService.getBranchComparison(toFilters(query)));
}

/** ACT-04 — GET /api/v1/dashboard/category-comparison (category ignored). */
export async function getCategoryComparison(
  req: Request,
  res: Response,
): Promise<void> {
  const query = parseQuery(categoryComparisonQuerySchema, req.query);
  res.json(await dashboardService.getCategoryComparison(toFilters(query)));
}

function toFilters(query: {
  start: string;
  end: string;
  branch?: number[];
  category?: number[];
}): DashboardFilters {
  return {
    start: query.start,
    end: query.end,
    branchIds: query.branch ?? [],
    categoryIds: query.category ?? [],
  };
}
