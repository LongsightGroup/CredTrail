import { SYNCHRONOUS_EXPORT_ROW_LIMIT } from "@credtrail/db";
import { stringify } from "csv-stringify/sync";

export type CsvCell = string | number | boolean | null | undefined;
type CsvSerializableKey<T extends object> = Extract<
  {
    [K in keyof T]: T[K] extends CsvCell ? K : never;
  }[keyof T],
  string
>;

export interface CsvColumn<T extends object> {
  key: CsvSerializableKey<T>;
  header: string;
}

export interface SerializeCsvInput<T extends object> {
  rows: readonly T[];
  columns: readonly CsvColumn<T>[];
}

export interface ExportTooLargeError {
  status: "too_large";
  error: "export_too_large";
  rowLimit: number;
  message: string;
}

const sanitizeFilenameSegment = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
};

const resolveFilenameDate = (generatedAt: string): string => {
  const parsed = new Date(generatedAt);

  if (Number.isFinite(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return generatedAt.slice(0, 10);
};

export const buildCsvFilename = (baseName: string, generatedAt: string): string => {
  const sanitizedBaseName = sanitizeFilenameSegment(baseName) || "export";
  return `${sanitizedBaseName}-${resolveFilenameDate(generatedAt)}.csv`;
};

export const buildCsvAttachmentHeaders = (filename: string): Record<string, string> => {
  return {
    "Cache-Control": "no-store",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Type": "text/csv; charset=utf-8",
  };
};

export const createExportTooLargeError = (
  rowLimit: number = SYNCHRONOUS_EXPORT_ROW_LIMIT,
): ExportTooLargeError => {
  return {
    status: "too_large",
    error: "export_too_large",
    rowLimit,
    message: `Synchronous export is limited to ${rowLimit} rows. Narrow your filters and try again.`,
  };
};

export const serializeCsv = <T extends object>(input: SerializeCsvInput<T>): string => {
  const rows = input.rows.map((row) => {
    return Object.fromEntries(
      input.columns.map((column) => [column.key, row[column.key] as CsvCell]),
    );
  });

  return stringify(rows, {
    header: true,
    bom: true,
    escape_formulas: true,
    columns: input.columns.map((column) => ({
      key: column.key,
      header: column.header,
    })),
  });
};
