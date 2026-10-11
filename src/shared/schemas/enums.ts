// Enum schemas shared by the API (validation) and the frontend (typing).
// Zod v4 API: top-level z.enum, z.email, z.iso.date, z.iso.datetime.

import * as z from "zod";

/** User roles — PRD §11.1: enum(viewer, admin). */
export const userRoleSchema = z.enum(["viewer", "admin"]);

/** Export formats — PRD §11.1: enum(pdf, excel). */
export const exportFormatSchema = z.enum(["pdf", "excel"]);

/** Export log statuses — PRD §11.1: enum(success, failed). */
export const exportStatusSchema = z.enum(["success", "failed"]);

export type UserRole = z.infer<typeof userRoleSchema>;
export type ExportFormat = z.infer<typeof exportFormatSchema>;
export type ExportStatus = z.infer<typeof exportStatusSchema>;
