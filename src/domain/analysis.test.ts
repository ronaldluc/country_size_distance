import { describe, expect, it } from "vitest";

import { analyzeRows } from "./analysis.js";
import type { CountryDatasetRow } from "../types/contracts.js";

const row = (
  iso3: string,
  distance_km_from_brno: number,
  area_km2: number
): CountryDatasetRow => ({
  iso3,
  name: iso3,
  continent: "Europe",
  area_km2,
  distance_km_from_brno,
  point_source: "centroid",
  point_lat: 0,
  point_lon: 0
});

describe("analyzeRows", () => {
  it("returns warning for empty set", () => {
    const r = analyzeRows([]);
    expect(r.sample_size).toBe(0);
    expect(r.warnings?.[0]).toContain("No countries");
  });

  it("computes strong positive correlation for monotonic data", () => {
    const rows = [row("A", 100, 10), row("B", 200, 20), row("C", 300, 30), row("D", 400, 40)];
    const r = analyzeRows(rows);
    expect(r.sample_size).toBe(4);
    expect(r.pearson_r).toBeCloseTo(1, 8);
    expect(r.spearman_rho).toBeCloseTo(1, 8);
    expect(r.regression.r_squared).toBeCloseTo(1, 8);
  });
});
