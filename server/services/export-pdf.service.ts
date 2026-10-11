import PDFDocument from "pdfkit";

import { buildEntityColorMap } from "../../src/shared/design-colors";
import type { ComparisonResponse, SummaryResponse } from "../../src/shared/schemas/responses";
import type { ExportPayload } from "./exports.service";

const INK = "#111318";
const MUTED = "#565c66";
const BORDER = "#dee1e6";
const PAGE_MARGIN = 40;

/**
 * ACT-06 — straightforward chart-and-table report (PRD open question #3).
 * Uses the same filter set and the same aggregated numbers as the screen.
 */
export function renderPdfReport(payload: ExportPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: PAGE_MARGIN,
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      drawReport(doc, payload);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function drawReport(doc: PDFKit.PDFDocument, payload: ExportPayload): void {
  const left = PAGE_MARGIN;
  const contentWidth = doc.page.width - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  doc.font("Helvetica-Bold").fontSize(18).fillColor(INK);
  doc.text("Sales / Production Analytics Report", left, y);
  y = doc.y + 6;

  doc.font("Helvetica").fontSize(9).fillColor(MUTED);
  doc.text(`Period: ${payload.filters.start} to ${payload.filters.end}`, left, y);
  y = doc.y + 2;
  doc.text(`Branches: ${payload.filterLabels.branches}`, left, y);
  y = doc.y + 2;
  doc.text(`Categories: ${payload.filterLabels.categories}`, left, y);
  y = doc.y + 2;
  doc.text(
    `Generated ${formatTimestamp(payload.generatedAt)} by ${payload.exportedBy}`,
    left,
    y,
  );
  y = doc.y + 2;
  if (payload.summary) {
    doc.text(`Data as of ${formatTimestamp(payload.summary.dataAsOf)}`, left, y);
    y = doc.y + 2;
  }
  y += 10;

  if (payload.summary) {
    y = drawSummaryBlocks(doc, payload.summary, left, y, contentWidth);
  } else {
    doc.font("Helvetica").fontSize(10).fillColor(MUTED);
    doc.text("No data for the selected filters.", left, y);
    y = doc.y + 12;
  }

  const branchColors = buildEntityColorMap(payload.branchIds);
  const categoryColors = buildEntityColorMap(payload.categoryIds);

  y = drawTrendSection(doc, payload, left, y, contentWidth);
  y = drawComparisonSection(
    doc,
    "Sales by branch",
    payload.branchComparison,
    branchColors,
    left,
    y,
    contentWidth,
  );
  y = drawComparisonSection(
    doc,
    "Sales by category",
    payload.categoryComparison,
    categoryColors,
    left,
    y,
    contentWidth,
  );
}

function drawSummaryBlocks(
  doc: PDFKit.PDFDocument,
  summary: SummaryResponse,
  x: number,
  y: number,
  width: number,
): number {
  const gap = 8;
  const blockWidth = (width - gap * 3) / 4;
  const blocks: Array<{ label: string; value: string }> = [
    { label: "TOTAL SALES", value: formatCurrency(summary.totalSales) },
    { label: "TOTAL UNITS", value: formatNumber(summary.totalUnits) },
    { label: "AVG DAILY SALES", value: formatCurrency(summary.avgDailySales) },
    {
      label: "SALES CHANGE",
      value:
        summary.change.salesPct === null
          ? "n/a"
          : formatSignedPercent(summary.change.salesPct),
    },
  ];

  blocks.forEach((block, index) => {
    const blockX = x + index * (blockWidth + gap);
    doc
      .roundedRect(blockX, y, blockWidth, 50, 6)
      .strokeColor(BORDER)
      .lineWidth(1)
      .stroke();
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(MUTED)
      .text(block.label, blockX + 10, y + 10, {
        width: blockWidth - 20,
        lineBreak: false,
      });
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(INK)
      .text(block.value, blockX + 10, y + 22, {
        width: blockWidth - 20,
        height: 16,
        ellipsis: true,
      });
  });

  return y + 50 + 16;
}

function drawTrendSection(
  doc: PDFKit.PDFDocument,
  payload: ExportPayload,
  x: number,
  y: number,
  width: number,
): number {
  const height = 150;
  y = ensureSpace(doc, y, height + 90);
  y = drawSectionTitle(doc, "Sales trend", y, x);

  const allPoints = payload.trend.series.flatMap((series) => series.points);
  if (allPoints.length === 0) {
    doc.font("Helvetica").fontSize(10).fillColor(MUTED);
    doc.text("No data for the selected filters.", x, y);
    return y + 20;
  }

  const buckets = [...new Set(allPoints.map((point) => point.date))].sort();
  const maxValue = Math.max(...allPoints.map((point) => point.value), 1);
  const chartTop = y + 4;
  const chartBottom = chartTop + height;

  doc.lineWidth(0.5).strokeColor(BORDER);
  for (let line = 0; line <= 4; line += 1) {
    const gridY = chartTop + (height / 4) * line;
    doc.moveTo(x, gridY).lineTo(x + width, gridY).stroke();
  }

  doc.font("Helvetica").fontSize(7).fillColor(MUTED);
  doc.text(formatCompactNumber(maxValue), x + 2, chartTop - 8);
  doc.text("0", x + 2, chartBottom - 9);

  const colorMap = buildEntityColorMap(payload.branchIds);
  payload.trend.series.forEach((series) => {
    const color = colorMap.get(series.branchId) ?? INK;
    const values = new Map(series.points.map((point) => [point.date, point.value]));
    doc.strokeColor(color).lineWidth(1.6);

    let started = false;
    buckets.forEach((bucket, index) => {
      const value = values.get(bucket);
      if (value === undefined) {
        started = false;
        return;
      }
      const px = bucketX(x, width, buckets.length, index);
      const py = chartBottom - (value / maxValue) * height;
      if (!started) {
        doc.moveTo(px, py);
        started = true;
      } else {
        doc.lineTo(px, py);
      }
    });
    doc.stroke();
  });

  // X-axis labels: first, middle, and last bucket only.
  doc.font("Helvetica").fontSize(7).fillColor(MUTED);
  const labelIndexes = [
    ...new Set(
      buckets.length > 2
        ? [0, Math.floor((buckets.length - 1) / 2), buckets.length - 1]
        : [0, buckets.length - 1],
    ),
  ];
  labelIndexes.forEach((index) => {
    const px = bucketX(x, width, buckets.length, index);
    const labelX = Math.min(Math.max(px - 20, x), x + width - 40);
    doc.text(buckets[index] ?? "", labelX, chartBottom + 4, {
      width: 40,
      align: "center",
      lineBreak: false,
    });
  });

  // Legend beneath the chart.
  let legendX = x;
  let legendY = chartBottom + 20;
  payload.trend.series.forEach((series) => {
    const color = colorMap.get(series.branchId) ?? INK;
    doc.font("Helvetica").fontSize(8);
    const labelWidth = doc.widthOfString(series.branchName);
    if (legendX + labelWidth + 26 > x + width) {
      legendX = x;
      legendY += 14;
    }
    doc.circle(legendX + 3, legendY + 3.5, 3).fill(color);
    doc.fillColor(MUTED).text(series.branchName, legendX + 10, legendY, {
      lineBreak: false,
    });
    legendX += labelWidth + 26;
  });

  return legendY + 20;
}

function drawComparisonSection(
  doc: PDFKit.PDFDocument,
  title: string,
  comparison: ComparisonResponse,
  colorMap: Map<number, string>,
  x: number,
  y: number,
  width: number,
): number {
  y = ensureSpace(doc, y, 60);
  y = drawSectionTitle(doc, title, y, x);

  if (comparison.items.length === 0) {
    doc.font("Helvetica").fontSize(10).fillColor(MUTED);
    doc.text("No data for the selected filters.", x, y);
    return y + 20;
  }

  const maxValue = Math.max(
    ...comparison.items.map((item) => item.totalSales),
    1,
  );
  const labelWidth = 120;
  const barArea = width - labelWidth - 110;

  comparison.items.forEach((item) => {
    y = ensureSpace(doc, y, 18);
    const color = colorMap.get(item.id) ?? INK;
    doc.font("Helvetica").fontSize(9).fillColor(INK);
    doc.text(item.name, x, y + 1, {
      width: labelWidth - 8,
      height: 12,
      ellipsis: true,
    });

    const barWidth = Math.max((item.totalSales / maxValue) * barArea, 1);
    doc.rect(x + labelWidth, y + 1, barWidth, 10).fill(color);

    doc.font("Helvetica").fontSize(9).fillColor(MUTED);
    doc.text(formatCurrency(item.totalSales), x + labelWidth + barArea + 8, y + 1, {
      width: 100,
      align: "right",
      lineBreak: false,
    });
    y += 17;
  });

  return y + 8;
}

function drawSectionTitle(
  doc: PDFKit.PDFDocument,
  title: string,
  y: number,
  x: number,
): number {
  doc.font("Helvetica-Bold").fontSize(12).fillColor(INK);
  doc.text(title, x, y);
  return doc.y + 8;
}

function bucketX(x: number, width: number, count: number, index: number): number {
  if (count <= 1) return x + width / 2;
  return x + (index / (count - 1)) * width;
}

function ensureSpace(doc: PDFKit.PDFDocument, y: number, needed: number): number {
  if (y + needed <= doc.page.height - PAGE_MARGIN) return y;
  doc.addPage();
  return PAGE_MARGIN;
}

function formatTimestamp(value: string | Date): string {
  const iso = typeof value === "string" ? value : value.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrency(value: number): string {
  return `Rp ${formatCompactNumber(value)}`;
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}
