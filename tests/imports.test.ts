import ExcelJS from "exceljs";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "../server/db";
import {
  app,
  auth,
  createBranch,
  createCategory,
  createProduct,
  loginAs,
  utcDay,
  V1,
} from "./helpers";

const HEADER =
  "branch,category,product,quantity,value,record_date,external_ref";

async function setupCatalog() {
  const branch = await createBranch("Central Branch");
  const category = await createCategory("Equipment");
  const product = await createProduct(category.id, "Espresso Machine");
  return { branch, category, product };
}

function importRequest(
  token: string,
  file: Buffer | string,
  options: { filename?: string; createMissing?: boolean } = {},
) {
  return request(app)
    .post(`${V1}/admin/imports/records`)
    .set(auth(token))
    .field("createMissing", options.createMissing ? "true" : "false")
    .attach(
      "file",
      typeof file === "string" ? Buffer.from(file, "utf8") : file,
      options.filename ?? "records.csv",
    );
}

describe("file import pipeline (option A)", () => {
  it("imports valid rows, logs the run, and refreshes the data-as-of label", async () => {
    await setupCatalog();
    const { token } = await loginAs("admin");

    const csv = [
      HEADER,
      `Central Branch,Equipment,Espresso Machine,2,30000000,${utcDay(-1)},IMP-001`,
      `Central Branch,Equipment,Espresso Machine,1,15000000,${utcDay(0)},IMP-002`,
    ].join("\n");

    const response = await importRequest(token, csv);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      imported: 2,
      skipped: 0,
      failed: 0,
      created: { branches: 0, categories: 0, products: 0 },
      errors: [],
    });
    expect(response.body.run).toMatchObject({
      status: "success",
      source: "file-import",
      recordCount: 2,
    });

    const records = await prisma.salesRecord.findMany({
      orderBy: { externalRef: "asc" },
    });
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      externalRef: "IMP-001",
      source: "file-import",
    });

    const status = await request(app)
      .get(`${V1}/admin/sync-status`)
      .set(auth(token));
    expect(status.body.lastSyncedAt).toBe(response.body.run.finishedAt);
  });

  it("is idempotent: re-importing the same file skips the rows", async () => {
    await setupCatalog();
    const { token } = await loginAs("admin");
    const csv = [
      HEADER,
      `Central Branch,Equipment,Espresso Machine,2,30000000,${utcDay(-1)},IDEM-001`,
      `Central Branch,Equipment,Espresso Machine,1,5000000,${utcDay(-1)},IDEM-002`,
    ].join("\n");

    await importRequest(token, csv).expect(200);
    const second = await importRequest(token, csv);

    expect(second.body).toMatchObject({ imported: 0, skipped: 2, failed: 0 });
    expect(await prisma.salesRecord.count()).toBe(2);
  });

  it("reports row-level errors without failing the whole file", async () => {
    await setupCatalog();
    const { token } = await loginAs("admin");

    const csv = [
      HEADER,
      `Central Branch,Equipment,Espresso Machine,2,100,${utcDay(0)},ERR-1`,
      `Central Branch,Equipment,Espresso Machine,abc,100,${utcDay(0)},ERR-2`,
      `Nowhere,Equipment,Espresso Machine,1,100,${utcDay(0)},ERR-3`,
      `Central Branch,Equipment,React Machine,1,100,${utcDay(0)},ERR-4`,
      `Central Branch,Equipment,Espresso Machine,1,100,10-10-2026,ERR-5`,
      `Central Branch,Equipment,Espresso Machine,1,100,${utcDay(0)},ERR-6`,
      `Central Branch,Equipment,Espresso Machine,1,100,${utcDay(0)},ERR-6`,
    ].join("\n");

    const response = await importRequest(token, csv);

    expect(response.body).toMatchObject({ imported: 2, failed: 5 });
    expect(response.body.errors.map((error: { row: number }) => error.row)).toEqual(
      [3, 4, 5, 6, 8],
    );
    expect(response.body.errors[0].message).toContain("quantity");
    expect(response.body.errors[1].message).toContain(
      'branch "Nowhere" does not exist',
    );
    expect(response.body.errors[2].message).toContain(
      'product "React Machine" does not exist',
    );
    expect(await prisma.salesRecord.count()).toBe(2);
  });

  it("can create missing branches, categories, and products on request", async () => {
    const { token } = await loginAs("admin");
    const csv = [
      HEADER,
      `Brand New Branch,Brand New Category,Brand New Product,3,900000,${utcDay(0)},CM-1`,
    ].join("\n");

    const strict = await importRequest(token, csv, { createMissing: false });
    expect(strict.body).toMatchObject({ imported: 0, failed: 1 });
    expect(strict.body.errors[0].message).toContain("does not exist");

    const permissive = await importRequest(token, csv, { createMissing: true });
    expect(permissive.body).toMatchObject({
      imported: 1,
      failed: 0,
      created: { branches: 1, categories: 1, products: 1 },
    });
    expect(await prisma.branch.count()).toBe(1);
    expect(await prisma.salesRecord.count()).toBe(1);
  });

  it("imports XLSX files with the same template", async () => {
    await setupCatalog();
    const { token } = await loginAs("admin");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Records");
    sheet.addRow([
      "branch",
      "category",
      "product",
      "quantity",
      "value",
      "record_date",
      "external_ref",
    ]);
    sheet.addRow([
      "Central Branch",
      "Equipment",
      "Espresso Machine",
      2,
      100,
      utcDay(0),
      "XLSX-1",
    ]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const response = await importRequest(token, buffer, {
      filename: "records.xlsx",
    });

    expect(response.body).toMatchObject({ imported: 1, failed: 0 });
    expect(await prisma.salesRecord.count()).toBe(1);
  });

  it("logs a failed run when the file cannot be processed", async () => {
    const { token } = await loginAs("admin");

    const response = await importRequest(token, "no required headers here", {
      filename: "broken.csv",
    });

    expect(response.status).toBe(400);
    const run = await prisma.syncRun.findFirstOrThrow();
    expect(run.status).toBe("failed");
    expect(run.source).toBe("file-import");
  });

  it("rejects requests without a file or with an unsupported type", async () => {
    const { token } = await loginAs("admin");

    const noFile = await request(app)
      .post(`${V1}/admin/imports/records`)
      .set(auth(token))
      .field("createMissing", "false");
    expect(noFile.status).toBe(400);

    const wrongType = await importRequest(token, "%PDF-1.4", {
      filename: "report.pdf",
    });
    expect(wrongType.status).toBe(400);
    expect(wrongType.body.error.message).toContain("Could not read the file");
  });

  it("keeps the module admin-only", async () => {
    const { token } = await loginAs("viewer");

    const upload = await importRequest(token, `${HEADER}\n`);
    expect(upload.status).toBe(403);

    const template = await request(app)
      .get(`${V1}/admin/imports/template.csv`)
      .set(auth(token));
    expect(template.status).toBe(403);
  });

  it("serves a downloadable CSV template with the expected headers", async () => {
    const { token } = await loginAs("admin");
    const response = await request(app)
      .get(`${V1}/admin/imports/template.csv`)
      .set(auth(token));

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    expect(response.text).toContain(
      "branch,category,product,quantity,value,record_date,external_ref",
    );
  });
});
