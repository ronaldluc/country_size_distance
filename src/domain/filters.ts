import type { CountryDatasetRow, FilterState } from "../types/contracts.js";

const asSet = (values?: string[]): Set<string> | null =>
  values && values.length > 0 ? new Set(values) : null;

const detectOutliersIqr = (rows: CountryDatasetRow[]): Set<string> => {
  if (rows.length < 4) {
    return new Set();
  }

  const bounds = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const at = (p: number): number => {
      const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)));
      return sorted[idx]!;
    };
    const q1 = at(0.25);
    const q3 = at(0.75);
    const iqr = q3 - q1;
    return { low: q1 - iqr * 1.5, high: q3 + iqr * 1.5 };
  };

  const logArea = rows.map((r) => Math.log10(r.area_km2));
  const distance = rows.map((r) => r.distance_km_from_brno);
  const areaBounds = bounds(logArea);
  const distanceBounds = bounds(distance);

  return new Set(
    rows
      .filter((r) => {
        const a = Math.log10(r.area_km2);
        const d = r.distance_km_from_brno;
        const areaOut = a < areaBounds.low || a > areaBounds.high;
        const distanceOut = d < distanceBounds.low || d > distanceBounds.high;
        return areaOut || distanceOut;
      })
      .map((r) => r.iso3)
  );
};

const detectOutliersPercentile = (rows: CountryDatasetRow[], threshold: number): Set<string> => {
  if (rows.length === 0) {
    return new Set();
  }
  const sorted = [...rows].sort((a, b) => a.area_km2 - b.area_km2);
  const keepCount = Math.max(1, Math.floor(sorted.length * threshold));
  const maxIdx = Math.min(sorted.length - 1, keepCount - 1);
  const cut = sorted[maxIdx]!.area_km2;
  return new Set(rows.filter((r) => r.area_km2 > cut).map((r) => r.iso3));
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
