import type { CountryDatasetRow, FilterState } from "../types/contracts.js";

const asSet = (values?: string[]): Set<string> | null =>
  values && values.length > 0 ? new Set(values) : null;

const quantile = (values: number[], p: number): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)));
  return sorted[idx]!;
};

const fitLinear = (
  x: number[],
  y: number[]
): { slope: number; intercept: number } => {
  const mx = x.reduce((acc, v) => acc + v, 0) / x.length;
  const my = y.reduce((acc, v) => acc + v, 0) / y.length;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < x.length; i += 1) {
    const dx = x[i]! - mx;
    numerator += dx * (y[i]! - my);
    denominator += dx * dx;
  }
  if (denominator === 0) {
    return { slope: 0, intercept: my };
  }
  const slope = numerator / denominator;
  return { slope, intercept: my - slope * mx };
};

const getLogLogResiduals = (
  rows: CountryDatasetRow[]
): { row: CountryDatasetRow; residual: number }[] => {
  const positiveRows = rows.filter((r) => r.distance_km_from_brno > 0 && r.area_km2 > 0);
  if (positiveRows.length === 0) {
    return [];
  }
  const logX = positiveRows.map((r) => Math.log(r.distance_km_from_brno));
  const logY = positiveRows.map((r) => Math.log(r.area_km2));
  const { slope, intercept } = fitLinear(logX, logY);
  return positiveRows.map((row, i) => ({
    row,
    residual: logY[i]! - (intercept + slope * logX[i]!)
  }));
};

const detectOutliersIqr = (rows: CountryDatasetRow[]): Set<string> => {
  if (rows.length < 4) {
    return new Set();
  }
  const residualRows = getLogLogResiduals(rows);
  if (residualRows.length < 4) {
    return new Set(rows.filter((r) => r.distance_km_from_brno <= 0 || r.area_km2 <= 0).map((r) => r.iso3));
  }

  const residuals = residualRows.map((r) => r.residual);
  const q1 = quantile(residuals, 0.25);
  const q3 = quantile(residuals, 0.75);
  const iqr = q3 - q1;
  const low = q1 - iqr * 1.5;
  const high = q3 + iqr * 1.5;

  const out = new Set(
    residualRows.filter((r) => r.residual < low || r.residual > high).map((r) => r.row.iso3)
  );
  for (const row of rows) {
    if (row.distance_km_from_brno <= 0 || row.area_km2 <= 0) {
      out.add(row.iso3);
    }
  }
  return out;
};

const detectOutliersPercentile = (rows: CountryDatasetRow[], threshold: number): Set<string> => {
  if (rows.length === 0) {
    return new Set();
  }
  const residualRows = getLogLogResiduals(rows);
  if (residualRows.length === 0) {
    return new Set(rows.map((r) => r.iso3));
  }

  // Keep central `threshold` fraction by absolute residual, trim both tails symmetrically.
  const absResiduals = residualRows.map((r) => Math.abs(r.residual));
  const cut = quantile(absResiduals, Math.max(0, Math.min(1, threshold)));
  const out = new Set(
    residualRows.filter((r) => Math.abs(r.residual) > cut).map((r) => r.row.iso3)
  );
  for (const row of rows) {
    if (row.distance_km_from_brno <= 0 || row.area_km2 <= 0) {
      out.add(row.iso3);
    }
  }
  return out;
};

export const applyFilters = (
  rows: CountryDatasetRow[],
  filterState: FilterState
): CountryDatasetRow[] => {
  const allowedContinents = new Set(filterState.included_continents);
  const excludedIso = asSet(filterState.excluded_iso3);
  const includedIso = asSet(filterState.included_iso3);

  let filtered = rows.filter((row) => allowedContinents.has(row.continent));

  if (excludedIso) {
    filtered = filtered.filter((row) => !excludedIso.has(row.iso3));
  }

  if (includedIso) {
    filtered = filtered.filter((row) => includedIso.has(row.iso3));
  }

  if (filterState.exclude_outliers) {
    const outliers =
      filterState.outlier_mode === "percentile"
        ? detectOutliersPercentile(filtered, filterState.outlier_percentile_threshold ?? 0.95)
        : detectOutliersIqr(filtered);
    filtered = filtered.filter((row) => !outliers.has(row.iso3));
  }

  return filtered;
};
