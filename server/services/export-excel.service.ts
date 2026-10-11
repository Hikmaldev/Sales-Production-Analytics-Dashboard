import ExcelJS from "exceljs";

import type { ExportPayload } from "./exports.service";

/**
 * ACT-07 — Excel export. Every sheet is built from the same filtered
 * aggregation the dashboard screen uses (AGENTS.md rule 3).
 */
export async function renderExcelReport(
  payload: ExportPayload,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sales / Production Analytics Dashboard";
  workbook.created = payload.generatedAt;

  addSummarySheet(workbook, payload);
  addTrendSheet(workbook, payload);
  addComparisonSheet(
    workbook,
    "Branch comparison",
    "Branch",
    payload.branchComparison.items,
  );
  addComparisonSheet(
    workbook,
    "Category comparison",
    "Category",
    payload.categoryComparison.items,
  );

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function addSummarySheet(
  workbook: ExcelJS.Workbook,
  payload: ExportPayload,
): void {
  const sheet = workbook.addWorksheet("Summary");
  sheet.columns = [
    { header: "Item", key: "item", width: 38 },
    { header: "Value", key: "value", width: 34 },
  ];

  const rows: Array<[string, string | number]> = [
    ["Period", `${payload.filters.start} to ${payload.filters.end}`],
    ["Branches", payload.filterLabels.branches],
    ["Categories", payload.filterLabels.categories],
    ["Generated at", payload.generatedAt.toISOString()],
    ["Exported by", payload.exportedBy],
  ];

  if (payload.summary) {
    rows.push(
      ["Data as of", payload.summary.dataAsOf],
      ["Total sales", payload.summary.totalSales],
      ["Total units", payload.summary.totalUnits],
      ["Average daily sales", payload.summary.avgDailySales],
      [
        "Sales change vs previous period (%)",
        payload.summary.change.salesPct ?? "n/a",
      ],
      [
        "Units change vs previous period (%)",
        payload.summary.change.unitsPct ?? "n/a",
      ],
    );
  } else {
    rows.push(["Data", "No data for the selected filters."]);
  }

  rows.forEach(([item, value]) => sheet.addRow({ item, value }));
  styleSheet(sheet);
}

function addTrendSheet(
  workbook: ExcelJS.Workbook,
  payload: ExportPayload,
): void {
  const sheet = workbook.addWorksheet("Sales trend");
  const seriesNames = payload.trend.series.map((series) => series.branchName);

  sheet.columns = [
    { header: "Date", key: "date", width: 14 },
    ...seriesNames.map((name, index) => ({
      header: name,
      key: `series_${index}`,
      width: 18,
    })),
  ];

  const buckets = [
    ...new Set(
      payload.trend.series.flatMap((series) =>
        series.points.map((point) => point.date),
      ),
    ),
  ].sort();

  buckets.forEach((bucket) => {
    const row: Record<string, string | number> = { date: bucket };
    payload.trend.series.forEach((series, index) => {
      const point = series.points.find((entry) => entry.date === bucket);
      row[`series_${index}`] = point ? point.value : 0;
    });
    sheet.addRow(row);
  });

  if (buckets.length === 0) {
    sheet.addRow({ date: "No data for the selected filters." });
  }

  styleSheet(sheet);
  sheet.getColumn(1).numFmt = "@";
  for (let index = 2; index <= seriesNames.length + 1; index += 1) {
    sheet.getColumn(index).numFmt = "#,##0.00";
  }
}

function addComparisonSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  labelHeader: string,
  items: Array<{ name: string; totalSales: number; totalUnits: number }>,
): void {
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = [
    { header: labelHeader, key: "name", width: 28 },
    { header: "Sales value", key: "sales", width: 18 },
    { header: "Units", key: "units", width: 14 },
  ];

  items.forEach((item) =>
    sheet.addRow({ name: item.name, sales: item.totalSales, units: item.totalUnits }),
  );
  if (items.length === 0) {
    sheet.addRow({ name: "No data for the selected filters." });
  }

  styleSheet(sheet);
  sheet.getColumn(2).numFmt = "#,##0.00";
  sheet.getColumn(3).numFmt = "#,##0.00";
}

function styleSheet(sheet: ExcelJS.Worksheet): void {
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF3F4F6" },
    };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFDEE1E6" } },
    };
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}
