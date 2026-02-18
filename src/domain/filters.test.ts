import { describe, expect, it } from "vitest";

import { applyFilters } from "./filters.js";
import type { CountryDatasetRow, FilterState } from "../types/contracts.js";

const mkRow = (
  iso3: string,
  continent: CountryDatasetRow["continent"],
  area_km2: number,
  distance_km_from_brno: number,
  population = 1_000_000
): CountryDatasetRow => ({
  iso3,
  name: iso3,
  continent,
  population,
  area_km2,
  distance_km_from_brno,
  point_source: "centroid",
  point_lat: 0,
  point_lon: 0
});

const baseFilter: FilterState = {
  axis_mode: "linear",
  included_continents: ["Europe", "Asia"],
  exclude_outliers: false,
  outlier_mode: "iqr"
};

describe("applyFilters", () => {
  it("filters by continent", () => {
    const rows = [
      mkRow("CZE", "Europe", 10, 100),
      mkRow("JPN", "Asia", 20, 200),
      mkRow("BRA", "South America", 30, 300)
    ];
    const out = applyFilters(rows, baseFilter);
    expect(out.map((r) => r.iso3)).toEqual(["CZE", "JPN"]);
  });

  it("applies excluded ISO list", () => {
    const rows = [mkRow("CZE", "Europe", 10, 100), mkRow("JPN", "Asia", 20, 200)];
    const out = applyFilters(rows, { ...baseFilter, excluded_iso3: ["JPN"] });
    expect(out.map((r) => r.iso3)).toEqual(["CZE"]);
  });

  it("applies include ISO override", () => {
    const rows = [mkRow("CZE", "Europe", 10, 100), mkRow("JPN", "Asia", 20, 200)];
    const out = applyFilters(rows, { ...baseFilter, included_iso3: ["JPN"] });
    expect(out.map((r) => r.iso3)).toEqual(["JPN"]);
  });

  it("removes symmetric outliers in log-log residual space with percentile mode", () => {
    const trend = Array.from({ length: 10 }, (_, i) => {
      const x = 100 + i * 100;
      return mkRow(`T${i}`, "Europe", x, x);
    });
    const highOutlier = mkRow("HIGH", "Europe", 10_000, 1000);
    const lowOutlier = mkRow("LOW", "Europe", 10, 1000);

    const out = applyFilters(
      [...trend, highOutlier, lowOutlier],
      {
        ...baseFilter,
        exclude_outliers: true,
        outlier_mode: "percentile",
        outlier_percentile_threshold: 0.8
      }
    );

    const iso = out.map((r) => r.iso3);
    expect(iso).not.toContain("HIGH");
    expect(iso).not.toContain("LOW");
  });

  it("removes strong positive and negative residual outliers with iqr mode", () => {
    const trend = Array.from({ length: 10 }, (_, i) => {
      const x = 100 + i * 100;
      return mkRow(`B${i}`, "Europe", x, x);
    });
    const highOutlier = mkRow("UP", "Europe", 20_000, 1000);
    const lowOutlier = mkRow("DOWN", "Europe", 5, 1000);

    const out = applyFilters(
      [...trend, highOutlier, lowOutlier],
      { ...baseFilter, exclude_outliers: true, outlier_mode: "iqr" }
    );
    const iso = out.map((r) => r.iso3);
    expect(iso).not.toContain("UP");
    expect(iso).not.toContain("DOWN");
  });
});
