import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Request, Response } from "express";

import { HttpError } from "../errors";
import * as importService from "../services/import.service";

const FALLBACK_TEMPLATE = [
  "branch,category,product,quantity,value,record_date,external_ref",
  "Central Branch,Equipment,Espresso Machine,2,30000000,2026-10-01,DEMO-0001",
  "West Branch,Consumables,Coffee Beans 1kg,10,2500000,2026-10-01,DEMO-0002",
  "East Branch,Services,Barista Training,1,3000000,2026-10-02,DEMO-0003",
].join("\n");

/** POST /api/v1/admin/imports/records — multipart upload (field: file). */
export async function importRecords(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw new HttpError(400, "Attach a CSV or Excel file (field name: file).");
  }

  const result = await importService.importSalesRecords({
    buffer: req.file.buffer,
    filename: req.file.originalname,
    createMissing: req.body?.createMissing === "true",
    userId: req.authUser!.id,
  });

  res.json(result);
}

/** GET /api/v1/admin/imports/template.csv — downloadable import template. */
export async function downloadTemplate(
  _req: Request,
  res: Response,
): Promise<void> {
  let content = FALLBACK_TEMPLATE;
  try {
    content = await readFile(
      path.resolve(process.cwd(), "samples", "import-template.csv"),
      "utf8",
    );
  } catch {
    // Sample file not present (e.g. fresh checkout); use the inline fallback.
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="import-template.csv"',
  );
  res.send(content);
}
