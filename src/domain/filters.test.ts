import { describe, expect, it } from "vitest";

import { applyFilters } from "./filters.js";
import type { CountryDatasetRow, FilterState } from "../types/contracts.js";

const mkRow = (
  iso3: string,
  continent: CountryDatasetRow["continent"],
  area_km2: number,
  distance_km_from_brno: number
): CountryDatasetRow => ({
  iso3,
  name: iso3,
  continent,
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
});
