import type { Request, Response } from "express";

import { exportRequestSchema } from "../../src/shared/schemas/requests";
import { parseBody } from "../http/validation";
import * as exportsService from "../services/exports.service";
import type { ExportResult } from "../services/exports.service";

/** ACT-06 — POST /api/v1/exports/pdf. */
export async function exportPdf(req: Request, res: Response): Promise<void> {
  const input = parseBody(exportRequestSchema, req.body);
  const result = await exportsService.createExport(
    "pdf",
    input.filters,
    req.authUser!,
  );
  sendFile(res, result);
}

/** ACT-07 — POST /api/v1/exports/excel. */
export async function exportExcel(req: Request, res: Response): Promise<void> {
  const input = parseBody(exportRequestSchema, req.body);
  const result = await exportsService.createExport(
    "excel",
    input.filters,
    req.authUser!,
  );
  sendFile(res, result);
}

/** GET /api/v1/exports/logs — own history for viewers, all for admins. */
export async function listLogs(req: Request, res: Response): Promise<void> {
  const user = req.authUser!;
  res.json(await exportsService.listExportLogs({ id: user.id, role: user.role }));
}

function sendFile(res: Response, result: ExportResult): void {
  res.setHeader("Content-Type", result.contentType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${result.filename}"`,
  );
  res.send(result.buffer);
}
