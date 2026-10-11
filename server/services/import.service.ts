import { Prisma } from "../../generated/prisma/client";
import type { ImportRecordResult } from "../../src/shared/schemas/responses";
import { prisma } from "../db";
import { HttpError } from "../errors";
import { parseImportFile } from "./import-parsers";
import { toSyncRunItem } from "./sync.service";

const REQUIRED_COLUMNS = [
  "branch",
  "category",
  "product",
  "quantity",
  "record_date",
] as const;
const MAX_ERRORS = 20;
const BATCH_SIZE = 500;
const MAX_ROWS = 20_000;
const MS_PER_DAY = 86_400_000;

export interface ImportInput {
  buffer: Buffer;
  filename: string;
  /** Create branches/categories/products that do not exist yet. */
  createMissing: boolean;
  userId: bigint;
}

interface Candidate {
  row: number;
  branch: string;
  category: string;
  product: string;
  quantity: number;
  value: number | null;
  recordDate: Date;
  externalRef: string | null;
}

/**
 * Option A pipeline: admin uploads a CSV/XLSX file, rows are validated,
 * resolved against master data, inserted in batches, and the whole run is
 * logged in sync_runs (visible in the sync history table).
 *
 * Rows carrying an external_ref are idempotent: importing the same file
 * twice skips the already-imported rows instead of duplicating them.
 */
export async function importSalesRecords(
  input: ImportInput,
): Promise<ImportRecordResult> {
  const startedAt = new Date();

  try {
    return await runImport(input, startedAt);
  } catch (error) {
    const message =
      error instanceof HttpError
        ? error.message
        : "The import failed. Please try again.";

    await prisma.syncRun
      .create({
        data: {
          status: "failed",
          source: "file-import",
          recordCount: 0,
          message: message.slice(0, 500),
          startedAt,
          finishedAt: new Date(),
          triggeredByUserId: input.userId,
        },
      })
      .catch(() => undefined);

    if (error instanceof HttpError) throw error;
    console.error("Import failed:", error);
    throw new HttpError(500, "We could not complete the import. Please try again.");
  }
}

async function runImport(
  input: ImportInput,
  startedAt: Date,
): Promise<ImportRecordResult> {
  let parsed;
  try {
    parsed = await parseImportFile(input);
  } catch {
    throw new HttpError(
      400,
      "Could not read the file. Use the CSV/XLSX template and try again.",
    );
  }

  const { headers, rows } = parsed;
  if (rows.length === 0) {
    throw new HttpError(400, "The file has no data rows.");
  }
  if (rows.length > MAX_ROWS) {
    throw new HttpError(
      400,
      `The file has too many rows (max ${MAX_ROWS.toLocaleString("en-US")} per import).`,
    );
  }

  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => !headers.includes(column),
  );
  if (missingColumns.length > 0) {
    throw new HttpError(
      400,
      `Missing required column(s): ${missingColumns.join(", ")}.`,
    );
  }

  // --- Phase 1: row-level validation -------------------------------------
  const errors: Array<{ row: number; message: string }> = [];
  const candidates: Candidate[] = [];
  const refsInFile = new Set<string>();

  for (const { row, cells } of rows) {
    const result = validateRow(row, cells);
    if ("message" in result) {
      errors.push({ row, message: result.message });
      continue;
    }

    const candidate = result.candidate;
    if (candidate.externalRef) {
      if (refsInFile.has(candidate.externalRef)) {
        errors.push({
          row,
          message: `duplicate external_ref "${candidate.externalRef}" in the file.`,
        });
        continue;
      }
      refsInFile.add(candidate.externalRef);
    }
    candidates.push(candidate);
  }

  // --- Phase 2: idempotency check against already imported rows ----------
  const existingRefs =
    refsInFile.size > 0
      ? new Set(
          (
            await prisma.salesRecord.findMany({
              where: { externalRef: { in: [...refsInFile] } },
              select: { externalRef: true },
            })
          ).map((record) => record.externalRef as string),
        )
      : new Set<string>();

  // --- Phase 3: resolve master data (optionally creating missing) --------
  const branchIds = new Map<string, bigint>();
  for (const branch of await prisma.branch.findMany({
    select: { id: true, name: true },
  })) {
    branchIds.set(branch.name.trim().toLowerCase(), branch.id);
  }

  const categoryIds = new Map<string, bigint>();
  for (const category of await prisma.productCategory.findMany({
    select: { id: true, name: true },
  })) {
    categoryIds.set(category.name.trim().toLowerCase(), category.id);
  }

  const productIds = new Map<string, bigint>();
  for (const product of await prisma.product.findMany({
    select: { id: true, name: true, categoryId: true },
  })) {
    productIds.set(productKey(product.categoryId, product.name), product.id);
  }

  const created = { branches: 0, categories: 0, products: 0 };
  const toInsert: Prisma.SalesRecordCreateManyInput[] = [];
  let skipped = 0;

  for (const candidate of candidates) {
    if (candidate.externalRef && existingRefs.has(candidate.externalRef)) {
      skipped += 1;
      continue;
    }

    const branchId = await resolveBranch(candidate.branch);
    if (!branchId) {
      errors.push({
        row: candidate.row,
        message: `branch "${candidate.branch}" does not exist (enable "create missing entries" to add it).`,
      });
      continue;
    }

    const categoryId = await resolveCategory(candidate.category);
    if (!categoryId) {
      errors.push({
        row: candidate.row,
        message: `category "${candidate.category}" does not exist (enable "create missing entries" to add it).`,
      });
      continue;
    }

    const productId = await resolveProduct(categoryId, candidate.product);
    if (!productId) {
      errors.push({
        row: candidate.row,
        message: `product "${candidate.product}" does not exist in category "${candidate.category}" (enable "create missing entries" to add it).`,
      });
      continue;
    }

    toInsert.push({
      branchId,
      productId,
      quantity: candidate.quantity,
      value: candidate.value,
      recordDate: candidate.recordDate,
      source: "file-import",
      externalRef: candidate.externalRef,
    });
  }

  // --- Phase 4: insert in batches ----------------------------------------
  let imported = 0;
  for (let index = 0; index < toInsert.length; index += BATCH_SIZE) {
    const chunk = toInsert.slice(index, index + BATCH_SIZE);
    const result = await prisma.salesRecord.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    imported += result.count;
  }

  const failed = errors.length;
  errors.sort((a, b) => a.row - b.row);
  const details = [
    `Imported ${imported} of ${rows.length} row(s) from ${input.filename}`,
    skipped > 0 ? `skipped ${skipped} already-imported` : null,
    failed > 0 ? `${failed} failed` : null,
    failed > MAX_ERRORS ? `first ${MAX_ERRORS} errors shown` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const run = await prisma.syncRun.create({
    data: {
      status: "success",
      source: "file-import",
      recordCount: imported,
      message: `${details}.`.slice(0, 500),
      startedAt,
      finishedAt: new Date(),
      triggeredByUserId: input.userId,
    },
  });

  return {
    run: toSyncRunItem(run),
    imported,
    skipped,
    failed,
    created,
    errors: errors.slice(0, MAX_ERRORS),
  };

  // --- helpers -----------------------------------------------------------

  async function resolveBranch(name: string): Promise<bigint | null> {
    const key = name.trim().toLowerCase();
    const existing = branchIds.get(key);
    if (existing) return existing;
    if (!input.createMissing) return null;

    const row = await prisma.branch.create({ data: { name: name.trim() } });
    branchIds.set(key, row.id);
    created.branches += 1;
    return row.id;
  }

  async function resolveCategory(name: string): Promise<bigint | null> {
    const key = name.trim().toLowerCase();
    const existing = categoryIds.get(key);
    if (existing) return existing;
    if (!input.createMissing) return null;

    const row = await prisma.productCategory.create({
      data: { name: name.trim() },
    });
    categoryIds.set(key, row.id);
    created.categories += 1;
    return row.id;
  }

  async function resolveProduct(
    categoryId: bigint,
    name: string,
  ): Promise<bigint | null> {
    const key = productKey(categoryId, name);
    const existing = productIds.get(key);
    if (existing) return existing;
    if (!input.createMissing) return null;

    const row = await prisma.product.create({
      data: { name: name.trim(), categoryId },
    });
    productIds.set(key, row.id);
    created.products += 1;
    return row.id;
  }
}

function productKey(categoryId: bigint, name: string): string {
  return `${categoryId}:${name.trim().toLowerCase()}`;
}

function validateRow(
  row: number,
  cells: Record<string, string>,
): { candidate: Candidate } | { message: string } {
  const branch = (cells.branch ?? "").trim();
  if (!branch) return { message: "branch is required." };

  const category = (cells.category ?? "").trim();
  if (!category) return { message: "category is required." };

  const product = (cells.product ?? "").trim();
  if (!product) return { message: "product is required." };

  const quantityRaw = (cells.quantity ?? "").trim();
  const quantity = Number(quantityRaw);
  if (quantityRaw === "" || !Number.isFinite(quantity) || quantity < 0) {
    return { message: "quantity must be a number of 0 or more." };
  }

  const valueRaw = (cells.value ?? "").trim();
  let value: number | null = null;
  if (valueRaw !== "") {
    value = Number(valueRaw);
    if (!Number.isFinite(value) || value < 0) {
      return {
        message:
          "value must be a number of 0 or more (leave it empty for unit-only rows).",
      };
    }
  }

  const recordDate = parseRecordDate((cells.record_date ?? "").trim());
  if (!recordDate) {
    return { message: "record_date must be a date like 2026-10-01." };
  }

  const externalRef = (cells.external_ref ?? "").trim();
  if (externalRef.length > 100) {
    return { message: "external_ref must be 100 characters or fewer." };
  }

  return {
    candidate: {
      row,
      branch,
      category,
      product,
      quantity,
      value,
      recordDate,
      externalRef: externalRef === "" ? null : externalRef,
    },
  };
}

function parseRecordDate(raw: string): Date | null {
  // Excel stores dates as serial numbers when the cell is not text.
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const serial = Number(raw);
    if (serial > 20_000 && serial < 80_000) {
      return new Date(Date.UTC(1899, 11, 30) + serial * MS_PER_DAY);
    }
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== raw) return null;
  return date;
}
