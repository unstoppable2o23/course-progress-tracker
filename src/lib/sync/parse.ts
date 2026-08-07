import "server-only";
import Papa from "papaparse";

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
  batchMeta?: { title: string; startDate: string; endDate: string };
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv")) {
    return parseCsv(file);
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    return parseXlsx(file);
  }
  throw new Error("Unsupported file type. Upload CSV or Excel.");
}

async function parseCsv(file: File): Promise<ParsedFile> {
  const text = await file.text();
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
  return gridToRows(parsed.data);
}

async function parseXlsx(file: File): Promise<ParsedFile> {
  const { default: ExcelJS } = await import("exceljs");
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Empty spreadsheet.");
  const values: string[][] = [];
  sheet.eachRow((row) => {
    const cells = row.values as unknown;
    values.push(
      Array.isArray(cells)
        ? cells.slice(1).map((v) => (v == null ? "" : String(v)))
        : []
    );
  });
  return gridToRows(values);
}

function gridToRows(values: string[][]): ParsedFile {
  if (!values.length) return { headers: [], rows: [] };

  // Check if first row is a metadata/batch header (UCLA)
  const firstRow = values[0];
  const batchMeta = extractBatchMeta(firstRow);

  // Find the real header row
  let headerIdx = 0;
  if (batchMeta || isTitleRow(firstRow)) {
    headerIdx = 1;
  }

  if (headerIdx >= values.length) return { headers: [], rows: [], batchMeta };

  const headers = values[headerIdx].map((h) => (h ?? "").trim());
  const rows: Record<string, string>[] = [];

  for (let i = headerIdx + 1; i < values.length; i++) {
    const cells = values[i];
    if (!cells || cells.every((c) => !c?.trim())) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? "").trim();
    });
    rows.push(row);
  }

  return { headers, rows, batchMeta };
}

function isTitleRow(row: string[]): boolean {
  const joined = row.filter(Boolean).join(" ").toLowerCase();
  return joined.includes("batch") && joined.includes("20") && row.filter(Boolean).length <= 3;
}

function extractBatchMeta(row: string[]): { title: string; startDate: string; endDate: string } | undefined {
  const text = row.filter(Boolean).join(" ");
  if (!text.toLowerCase().includes("batch")) return undefined;

  // Try to extract dates like "Dec 20, 2021" or "December 20th, 2021"
  const datePattern = /([A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/gi;
  const dates = text.match(datePattern);
  if (dates && dates.length >= 2) {
    return {
      title: text.trim(),
      startDate: parseDate(dates[0]) || dates[0],
      endDate: parseDate(dates[1]) || dates[1],
    };
  }
  return { title: text.trim(), startDate: "", endDate: "" };
}

function parseDate(text: string): string | null {
  const cleaned = text.replace(/(\d)(st|nd|rd|th)/, "$1");
  const d = new Date(cleaned);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}
