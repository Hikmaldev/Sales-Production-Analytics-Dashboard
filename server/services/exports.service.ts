import { Prisma } from "../../generated/prisma/client";
import type { FilterSnapshot } from "../../src/shared/schemas/entities";
import type { ExportLog } from "../../src/shared/schemas/entities";
import type {
  ComparisonResponse,
  SummaryResponse,
  TrendResponse,
} from "../../src/shared/schemas/responses";
import { prisma } from "../db";
import { HttpError } from "../errors";
import * as dashboardService from "./dashboard.service";
import { renderExcelReport } from "./export-excel.service";
import { renderPdfReport } from "./export-pdf.service";

export interface ExportPayload {
  filters: FilterSnapshot;
  filterLabels: { branches: string; categories: string };
  summary: SummaryResponse | null;
  trend: TrendResponse;
  branchComparison: ComparisonResponse;
  categoryComparison: ComparisonResponse;
  /** All branch/category ids, ascending — drives fixed series colors. */
  branchIds: number[];
  categoryIds: number[];
  exportedBy: string;
  generatedAt: Date;
}

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

/**
 * ACT-06/ACT-07 — builds PDF or Excel from the exact same filters the user
 * sees on screen (AGENTS.md rule 3: no separate data source for exports) and
 * records the outcome in export_logs, including the filter snapshot.
 */
export async function createExport(
  format: "pdf" | "excel",
  snapshot: FilterSnapshot,
  user: { id: bigint; name: string },
): Promise<ExportResult> {
  try {
    const payload = await collectExportPayload(snapshot, user.name);
    const buffer =
      format === "pdf"
        ? await renderPdfReport(payload)
        : await renderExcelReport(payload);

    await prisma.exportLog.create({
      data: {
        userId: user.id,
        format,
        filterSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        status: "success",
      },
    });

    return {
      buffer,
      filename: `sales-report_${snapshot.start}_${snapshot.end}.${
        format === "pdf" ? "pdf" : "xlsx"
      }`,
      contentType:
        format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  } catch (error) {
    console.error("Export generation failed:", error);
    await prisma.exportLog
      .create({
        data: {
          userId: user.id,
          format,
          filterSnapshot: snapshot as unknown as Prisma.InputJsonValue,
          status: "failed",
        },
      })
      .catch(() => undefined);

    throw error instanceof HttpError
      ? error
      : new HttpError(500, "We could not generate the export. Please try again.");
  }
}

async function collectExportPayload(
  snapshot: FilterSnapshot,
  exportedByName: string,
): Promise<ExportPayload> {
  const filters = {
    start: snapshot.start,
    end: snapshot.end,
    branchIds: snapshot.branches,
    categoryIds: snapshot.categories,
  };

  const [
    summary,
    trend,
    branchComparison,
    categoryComparison,
    branchLabel,
    categoryLabel,
    allBranches,
    allCategories,
  ] = await Promise.all([
    dashboardService.getSummary(filters),
    dashboardService.getTrend(filters),
    dashboardService.getBranchComparison(filters),
    dashboardService.getCategoryComparison(filters),
    describeBranches(snapshot.branches),
    describeCategories(snapshot.categories),
    prisma.branch.findMany({ select: { id: true }, orderBy: { id: "asc" } }),
    prisma.productCategory.findMany({
      select: { id: true },
      orderBy: { id: "asc" },
    }),
  ]);

  return {
    filters: snapshot,
    filterLabels: { branches: branchLabel, categories: categoryLabel },
    summary,
    trend,
    branchComparison,
    categoryComparison,
    branchIds: allBranches.map((branch) => Number(branch.id)),
    categoryIds: allCategories.map((category) => Number(category.id)),
    exportedBy: exportedByName,
    generatedAt: new Date(),
  };
}

async function describeBranches(ids: number[]): Promise<string> {
  if (ids.length === 0) return "All branches";
  const rows = await prisma.branch.findMany({
    where: { id: { in: ids.map((id) => BigInt(id)) } },
    orderBy: { name: "asc" },
    select: { name: true },
  });
  return rows.length > 0 ? rows.map((row) => row.name).join(", ") : `#${ids.join(", ")}`;
}

async function describeCategories(ids: number[]): Promise<string> {
  if (ids.length === 0) return "All categories";
  const rows = await prisma.productCategory.findMany({
    where: { id: { in: ids.map((id) => BigInt(id)) } },
    orderBy: { name: "asc" },
    select: { name: true },
  });
  return rows.length > 0 ? rows.map((row) => row.name).join(", ") : `#${ids.join(", ")}`;
}

/** GET /exports/logs — viewers see their own history, admins see all. */
export async function listExportLogs(user: {
  id: bigint;
  role: "viewer" | "admin";
}): Promise<ExportLog[]> {
  const logs = await prisma.exportLog.findMany({
    where: user.role === "admin" ? undefined : { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return logs.map((log) => ({
    id: Number(log.id),
    userId: Number(log.userId),
    format: log.format,
    filterSnapshot: log.filterSnapshot as unknown as FilterSnapshot,
    status: log.status,
    createdAt: log.createdAt.toISOString(),
  }));
}
