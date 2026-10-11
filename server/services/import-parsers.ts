import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";

export interface ImportFileInput {
  buffer: Buffer;
  filename: string;
}

export interface ParsedImportFile {
  headers: string[];
  rows: Array<{ row: number; cells: Record<string, string> }>;
}

/** Reads a CSV or XLSX upload into normalized header -> cell maps. */
export async function parseImportFile(
  input: ImportFileInput,
): Promise<ParsedImportFile> {
  const name = input.filename.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    return parseCsv(input.buffer);
  }
  if (name.endsWith(".xlsx")) {
    return parseXlsx(input.buffer);
  }
  throw new Error(`Unsupported file type: ${input.filename}`);
}

function parseCsv(buffer: Buffer): ParsedImportFile {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(text);
  const records = parse(text, {
    delimiter,
    skip_empty_lines: true,
    trim: true,
    // Rows with a different number of cells are still readable.
    relax_column_count: true,
  }) as string[][];

  if (records.length === 0) return { headers: [], rows: [] };

  const headers = records[0].map(normalizeHeader);
  const rows = records.slice(1).map((cells, index) => ({
    row: index + 2,
    cells: toCellMap(headers, cells),
  }));
  return { headers: headers.filter(Boolean), rows };
}

async function parseXlsx(buffer: Buffer): Promise<ParsedImportFile> {
  const workbook = new ExcelJS.Workbook();
  // ExcelJS declares its own ArrayBuffer-style Buffer type; the runtime
  // accepts a Node Buffer, so bridge the two type worlds here.
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [] };

  const headerRow = sheet.getRow(1);
  const columnCount = Math.max(headerRow.cellCount, 1);
  const headers: string[] = [];
  for (let column = 1; column <= columnCount; column += 1) {
    headers.push(normalizeHeader(cellToString(headerRow.getCell(column).value)));
  }

  const rows: ParsedImportFile["rows"] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const cells: string[] = [];
    for (let column = 1; column <= columnCount; column += 1) {
      cells.push(cellToString(row.getCell(column).value));
    }
    if (cells.every((cell) => cell.trim() === "")) return;

    rows.push({ row: rowNumber, cells: toCellMap(headers, cells) });
  });

  return { headers: headers.filter(Boolean), rows };
}

/** CSV files from spreadsheets often use ";" — pick the most frequent one. */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = 0;
  for (const candidate of candidates) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

// "Record Date" -> "record_date", "BRANCH" -> "branch".
function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function toCellMap(
  headers: string[],
  cells: string[],
): Record<string, string> {
  const map: Record<string, string> = {};
  headers.forEach((header, index) => {
    if (!header) return;
    map[header] = (cells[index] ?? "").trim();
  });
  return map;
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const rich = value as {
      text?: string;
      result?: unknown;
      richText?: Array<{ text: string }>;
    };
    if (typeof rich.text === "string") return rich.text;
    if (Array.isArray(rich.richText)) {
      return rich.richText.map((part) => part.text).join("");
    }
    if (rich.result !== undefined) return String(rich.result);
    return "";
  }
  return String(value);
}
