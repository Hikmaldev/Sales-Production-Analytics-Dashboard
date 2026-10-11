// API response schemas for the dashboard and admin endpoints.
// Zod v4 API.

import * as z from "zod";

import {
  branchSchema,
  exportLogSchema,
  idSchema,
  productCategorySchema,
  userSchema,
} from "./entities";
import { userRoleSchema } from "./enums";

/** Logged-in user shape shared by POST /login and GET /me. */
export const sessionUserSchema = z.object({
  id: idSchema,
  name: z.string(),
  email: z.email(),
  role: userRoleSchema,
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

/** ACT-01 — POST /api/v1/login success. */
export const loginResponseSchema = z.object({
  token: z.string(),
  user: sessionUserSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

/** GET /api/v1/me — session restore. */
export const meResponseSchema = sessionUserSchema;
export type MeResponse = z.infer<typeof meResponseSchema>;

/**
 * GET /api/v1/dashboard/summary.
 * change.* is null when the comparison period has no records.
 * dataAsOf drives the "Data as of [timestamp]" label (design system §5.4).
 * The endpoint returns null when the filter combination has no records.
 */
export const summaryResponseSchema = z.object({
  totalSales: z.number().nonnegative(),
  totalUnits: z.number().nonnegative(),
  avgDailySales: z.number().nonnegative(),
  change: z.object({
    salesPct: z.number().nullable(),
    unitsPct: z.number().nullable(),
  }),
  dataAsOf: z.iso.datetime(),
});
export type SummaryResponse = z.infer<typeof summaryResponseSchema>;

/** GET /api/v1/dashboard/trend (metric: sales value in MVP — decision #5). */
export const trendPointSchema = z.object({
  date: z.iso.date(),
  value: z.number().nonnegative(),
});

export const trendResponseSchema = z.object({
  granularity: z.enum(["day", "week", "month"]),
  series: z.array(
    z.object({
      branchId: idSchema,
      branchName: z.string(),
      points: z.array(trendPointSchema),
    })
  ),
});
export type TrendResponse = z.infer<typeof trendResponseSchema>;

/**
 * GET /api/v1/dashboard/branch-comparison and /category-comparison.
 * Items are always ordered by totalSales descending (design system §5.3).
 */
export const comparisonResponseSchema = z.object({
  items: z.array(
    z.object({
      id: idSchema,
      name: z.string(),
      totalSales: z.number().nonnegative(),
      totalUnits: z.number().nonnegative(),
    })
  ),
});
export type ComparisonResponse = z.infer<typeof comparisonResponseSchema>;

/** ACT-08 — POST /api/v1/admin/sync-trigger. */
export const syncTriggerResponseSchema = z.object({
  status: z.literal("syncing"),
  startedAt: z.iso.datetime(),
});
export type SyncTriggerResponse = z.infer<typeof syncTriggerResponseSchema>;

/** ACT-08 supporting — GET /api/v1/admin/sync-status (polled by the UI). */
export const syncStatusResponseSchema = z.object({
  status: z.enum(["idle", "syncing", "failed"]),
  lastSyncedAt: z.iso.datetime().nullable(),
});
export type SyncStatusResponse = z.infer<typeof syncStatusResponseSchema>;

/** GET /api/v1/admin/sync-runs — feeds the sync history table. */
export const syncRunSchema = z.object({
  id: idSchema,
  status: z.enum(["running", "success", "failed"]),
  source: z.string(),
  recordCount: z.number().int().nonnegative(),
  message: z.string().nullable(),
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
  durationSeconds: z.number().nonnegative().nullable(),
});
export type SyncRun = z.infer<typeof syncRunSchema>;
export const syncRunListResponseSchema = z.array(syncRunSchema);
export type SyncRunListResponse = z.infer<typeof syncRunListResponseSchema>;

/**
 * POST /api/v1/admin/imports/records — option A pipeline (file import).
 * `run` is the sync_runs row so the import also shows in the sync history.
 */
export const importRecordErrorSchema = z.object({
  row: z.number().int().positive(),
  message: z.string(),
});

export const importRecordResultSchema = z.object({
  run: syncRunSchema,
  imported: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  created: z.object({
    branches: z.number().int().nonnegative(),
    categories: z.number().int().nonnegative(),
    products: z.number().int().nonnegative(),
  }),
  errors: z.array(importRecordErrorSchema),
});
export type ImportRecordResult = z.infer<typeof importRecordResultSchema>;

// --- Supporting list endpoints (approved in design review) ---------------

/**
 * GET /api/v1/branches and GET /api/v1/product-categories.
 * List items extend the pure entity with counts for the admin tables
 * ("Records" and "Products" columns); history is never hard-deleted.
 */
export const branchListItemSchema = branchSchema.extend({
  recordCount: z.number().int().nonnegative(),
});
export type BranchListItem = z.infer<typeof branchListItemSchema>;
export const branchListResponseSchema = z.array(branchListItemSchema);

export const categoryListItemSchema = productCategorySchema.extend({
  productCount: z.number().int().nonnegative(),
  recordCount: z.number().int().nonnegative(),
});
export type CategoryListItem = z.infer<typeof categoryListItemSchema>;
export const categoryListResponseSchema = z.array(categoryListItemSchema);

/** GET /api/v1/users (admin). */
export const userListResponseSchema = z.array(userSchema);

/** GET /api/v1/exports/logs (own logs for viewers, all for admins). */
export const exportLogListResponseSchema = z.array(exportLogSchema);
