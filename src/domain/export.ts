import type { CountryDatasetRow } from "../types/contracts.js";

const CSV_COLUMNS = [
  "iso3",
  "name",
  "continent",
  "distance_km_from_brno",
  "area_km2",
  "point_source",
  "point_lat",
  "point_lon"
] as const;

const esc = (value: string | number): string => {
  const text = String(value);
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
};

export const rowsToCsv = (rows: CountryDatasetRow[]): string => {
  const header = CSV_COLUMNS.join(",");
  const body = rows.map((row) =>
    CSV_COLUMNS.map((col) => esc(row[col] ?? "")).join(",")
  );
  return [header, ...body].join("\n");
};

export const downloadTextFile = (filename: string, content: string, contentType: string): void => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
