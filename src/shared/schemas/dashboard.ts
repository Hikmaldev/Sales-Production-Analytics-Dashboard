// Dashboard query-parameter schemas (ACT-02/03/04).
// Zod v4 API.

import * as z from "zod";

/**
 * Accepts either repeated params (?branch=1&branch=2) or a comma-separated
 * list (?branch=1,2). Missing or empty means "all" (no filter).
 */
const multiIdParam = z.preprocess(
  (raw) => {
    if (raw === undefined || raw === null || raw === "") return undefined;
    return Array.isArray(raw) ? raw : String(raw).split(",");
  },
  z.array(z.coerce.number().int().positive()).optional()
);

// ISO date strings compare correctly with plain string ordering.

/** ACT-02/03/04 — GET /api/v1/dashboard/trend. */
export const trendQuerySchema = z
  .object({
    start: z.iso.date(),
    end: z.iso.date(),
    branch: multiIdParam,
    category: multiIdParam,
  })
  .refine((q) => q.start <= q.end, {
    message: "start must be on or before end",
    path: ["end"],
  });
export type TrendQuery = z.infer<typeof trendQuerySchema>;

/** ACT-02/03/04 — GET /api/v1/dashboard/summary. */
export const summaryQuerySchema = z
  .object({
    start: z.iso.date(),
    end: z.iso.date(),
    branch: multiIdParam,
    category: multiIdParam,
  })
  .refine((q) => q.start <= q.end, {
    message: "start must be on or before end",
    path: ["end"],
  });
export type SummaryQuery = z.infer<typeof summaryQuerySchema>;

/**
 * ACT-02/03/04 — GET /api/v1/dashboard/branch-comparison.
 * No branch param: the branches are what gets compared.
 */
export const branchComparisonQuerySchema = z
  .object({
    start: z.iso.date(),
    end: z.iso.date(),
    category: multiIdParam,
  })
  .refine((q) => q.start <= q.end, {
    message: "start must be on or before end",
    path: ["end"],
  });
export type BranchComparisonQuery = z.infer<typeof branchComparisonQuerySchema>;

/**
 * ACT-02/03/04 — GET /api/v1/dashboard/category-comparison.
 * No category param: the categories are what gets compared.
 */
export const categoryComparisonQuerySchema = z
  .object({
    start: z.iso.date(),
    end: z.iso.date(),
    branch: multiIdParam,
  })
  .refine((q) => q.start <= q.end, {
    message: "start must be on or before end",
    path: ["end"],
  });
export type CategoryComparisonQuery = z.infer<typeof categoryComparisonQuerySchema>;
