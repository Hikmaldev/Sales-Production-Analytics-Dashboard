// Entity schemas matching the PRD data spec (§11.1).
// Zod v4 API.

import * as z from "zod";

import {
  exportFormatSchema,
  exportStatusSchema,
  userRoleSchema,
} from "./enums";

/**
 * Strict id for payloads and responses. Prisma stores ids as BigInt; the API
 * layer serializes them to JSON numbers (design review decision #1).
 */
export const idSchema = z.number().int().positive();

/** Path parameter ids arrive as strings, e.g. /branches/{id}. */
export const idParamSchema = z.coerce.number().int().positive();

/** users — password_hash is never returned by the API. */
export const userSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(150),
  email: z.email(),
  role: userRoleSchema,
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  lastLoginAt: z.iso.datetime().nullable(),
});
export type User = z.infer<typeof userSchema>;

/** branches */
export const branchSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(150),
  region: z.string().max(100).nullable(),
  isActive: z.boolean(),
});
export type Branch = z.infer<typeof branchSchema>;

/** product_categories */
export const productCategorySchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(150),
  isActive: z.boolean(),
});
export type ProductCategory = z.infer<typeof productCategorySchema>;

/** products */
export const productSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(150),
  categoryId: idSchema,
  isActive: z.boolean(),
});
export type Product = z.infer<typeof productSchema>;

/**
 * sales_records (or production_records — same shape per PRD §11.1).
 * Decimal columns are serialized to JSON numbers (design review decision #2).
 */
export const salesRecordSchema = z.object({
  id: idSchema,
  branchId: idSchema,
  productId: idSchema,
  quantity: z.number().nonnegative(),
  value: z.number().nonnegative().nullable(),
  recordDate: z.iso.date(),
  source: z.string().max(50).nullable(),
  externalRef: z.string().max(100).nullable(),
  createdAt: z.iso.datetime(),
});
export type SalesRecord = z.infer<typeof salesRecordSchema>;

/**
 * export_logs.filter_snapshot — the exact filters active at export time
 * (FR-EXP-03). Empty arrays mean "all branches" / "all categories".
 * The export request body reuses this same shape (decision #4).
 */
export const filterSnapshotSchema = z.object({
  start: z.iso.date(),
  end: z.iso.date(),
  branches: z.array(idSchema),
  categories: z.array(idSchema),
});
export type FilterSnapshot = z.infer<typeof filterSnapshotSchema>;

/** export_logs */
export const exportLogSchema = z.object({
  id: idSchema,
  userId: idSchema,
  format: exportFormatSchema,
  filterSnapshot: filterSnapshotSchema,
  status: exportStatusSchema,
  createdAt: z.iso.datetime(),
});
export type ExportLog = z.infer<typeof exportLogSchema>;
