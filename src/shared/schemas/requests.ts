// Request body schemas for API endpoints (see api-endpoints doc).
// Zod v4 API.

import * as z from "zod";

import { filterSnapshotSchema } from "./entities";
import { userRoleSchema } from "./enums";

/**
 * Emails are normalized (trimmed, lowercased) before validation so login and
 * account creation accept "  User@Example.com " and store/compare it as
 * "user@example.com".
 */
const normalizedEmail = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z.email(),
);

/** ACT-01 — POST /api/v1/login. */
export const loginRequestSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

/**
 * ACT-09 — POST /api/v1/users (admin only).
 * Admin sets the initial password (design review decision #3).
 */
export const createUserRequestSchema = z.object({
  name: z.string().min(1).max(150),
  email: normalizedEmail,
  role: userRoleSchema.default("viewer"),
  password: z.string().min(8).max(72),
});
export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;

/** ACT-10 — PATCH /api/v1/branches/{id}. */
export const updateBranchRequestSchema = z.object({
  isActive: z.boolean(),
});
export type UpdateBranchRequest = z.infer<typeof updateBranchRequestSchema>;

/** ACT-10 — PATCH /api/v1/product-categories/{id}. */
export const updateCategoryRequestSchema = z.object({
  isActive: z.boolean(),
});
export type UpdateCategoryRequest = z.infer<typeof updateCategoryRequestSchema>;

/**
 * Supporting — POST /api/v1/branches (acceptance criteria §13.4:
 * a newly added branch must appear as a filter option without a refresh).
 */
export const createBranchRequestSchema = z.object({
  name: z.string().min(1).max(150),
  region: z.string().max(100).nullish(),
});
export type CreateBranchRequest = z.infer<typeof createBranchRequestSchema>;

/** Supporting — POST /api/v1/product-categories (acceptance criteria §13.4). */
export const createCategoryRequestSchema = z.object({
  name: z.string().min(1).max(150),
});
export type CreateCategoryRequest = z.infer<typeof createCategoryRequestSchema>;

/**
 * ACT-06/07 — POST /api/v1/exports/pdf and /api/v1/exports/excel.
 * The client sends the same filter combination shown on screen; the server
 * records it in export_logs.filter_snapshot (FR-EXP-03).
 */
export const exportRequestSchema = z.object({
  filters: filterSnapshotSchema,
});
export type ExportRequest = z.infer<typeof exportRequestSchema>;
