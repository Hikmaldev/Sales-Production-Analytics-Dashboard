// Generates the portfolio sample files under samples/:
//  - import-template.csv / .xlsx      (headers + two example rows)
//  - import-sample-data.csv / .xlsx   (ready to import into a seeded database)
//
// Usage: npm run samples:generate
// The sample rows use the branch/category/product names created by
// `npm run db:seed`, with record dates relative to the day the script runs.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import ExcelJS from "exceljs";

const HEADERS = [
  "branch",
  "category",
  "product",
  "quantity",
  "value",
  "record_date",
  "external_ref",
];

const TEMPLATE_ROWS = [
  ["Central Branch", "Equipment", "Espresso Machine", "2", "30000000", "2026-10-01", "DEMO-0001"],
  ["West Branch", "Consumables", "Coffee Beans 1kg", "10", "2500000", "2026-10-01", "DEMO-0002"],
];

/** branch, category, product, unit price — matches `prisma/seed.ts`. */
const CATALOG = [
  ["Central Branch", "Equipment", "Espresso Machine", 15_000_000],
  ["Central Branch", "Equipment", "Coffee Grinder", 8_500_000],
  ["Central Branch", "Consumables", "Coffee Beans 1kg", 250_000],
  ["Central Branch", "Consumables", "Paper Filters", 45_000],
  ["Central Branch", "Services", "Barista Training", 3_000_000],
  ["West Branch", "Equipment", "Batch Brewer", 24_000_000],
  ["West Branch", "Consumables", "Coffee Beans 1kg", 250_000],
  ["West Branch", "Consumables", "Cleaning Tablets", 90_000],
  ["West Branch", "Services", "Machine Maintenance", 750_000],
  ["East Branch", "Equipment", "Espresso Machine", 15_000_000],
  ["East Branch", "Consumables", "Paper Filters", 45_000],
  ["East Branch", "Consumables", "Coffee Beans 1kg", 250_000],
  ["East Branch", "Services", "Installation Service", 1_500_000],
] as const;

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDay(offset: number): string {
  const now = new Date();
  const base = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return new Date(base + offset * 86_400_000).toISOString().slice(0, 10);
}

function buildSampleRows(): string[][] {
  const random = mulberry32(7);
  const rows: string[][] = [];
  let counter = 0;

  // Ten recent days, a few rows per day, deterministic quantities.
  for (let dayOffset = -9; dayOffset <= 0; dayOffset += 1) {
    const rowsToday = 4 + Math.floor(random() * 2);
    for (let index = 0; index < rowsToday; index += 1) {
      const entry = CATALOG[(counter + index * 5) % CATALOG.length];
      const [branch, category, product, price] = entry;
      const quantity = 1 + Math.floor(random() * 12);
      const value = Math.round(quantity * price * 100) / 100;
      counter += 1;
      rows.push([
        branch,
        category,
        product,
        String(quantity),
        String(value),
        isoDay(dayOffset),
        `PORTFOLIO-${String(counter).padStart(4, "0")}`,
      ]);
    }
  }

  return rows;
}

function toCsv(headers: string[], rows: string[][]): string {
  const escape = (value: string) =>
    /[",;\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  return (
    "\uFEFF" +
    [headers, ...rows].map((row) => row.map(escape).join(",")).join("\r\n") +
    "\r\n"
  );
}

async function toXlsx(
  filePath: string,
  sheetName: string,
  headers: string[],
  rows: string[][],
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sales / Production Analytics Dashboard";
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((column, index) => {
    column.width = index === 2 ? 22 : index === 5 ? 14 : 16;
  });
  await workbook.xlsx.writeFile(filePath);
}

async function main(): Promise<void> {
  const samplesDir = path.resolve(process.cwd(), "samples");
  mkdirSync(samplesDir, { recursive: true });

  const sampleRows = buildSampleRows();

  writeFileSync(
    path.join(samplesDir, "import-template.csv"),
    toCsv(HEADERS, TEMPLATE_ROWS),
  );
  writeFileSync(
    path.join(samplesDir, "import-sample-data.csv"),
    toCsv(HEADERS, sampleRows),
  );
  await toXlsx(
    path.join(samplesDir, "import-template.xlsx"),
    "Template",
    HEADERS,
    TEMPLATE_ROWS,
  );
  await toXlsx(
    path.join(samplesDir, "import-sample-data.xlsx"),
    "Sales records",
    HEADERS,
    sampleRows,
  );

  console.log(
    `Sample files written to samples/ (${sampleRows.length} rows in import-sample-data).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
