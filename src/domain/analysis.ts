import type {
  AnalysisResult,
  CountryDatasetRow,
  RegressionLinePoint
} from "../types/contracts.js";

const mean = (values: number[]): number => values.reduce((acc, v) => acc + v, 0) / values.length;

const pearson = (x: number[], y: number[]): number => {
  const mx = mean(x);
  const my = mean(y);
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < x.length; i += 1) {
    const dx = x[i]! - mx;
    const dy = y[i]! - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  if (dx2 === 0 || dy2 === 0) {
    return 0;
  }
  return num / Math.sqrt(dx2 * dy2);
};

const rank = (values: number[]): number[] => {
  const sorted = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const ranks = new Array(values.length).fill(0);

  for (let i = 0; i < sorted.length; ) {
    let j = i + 1;
    while (j < sorted.length && sorted[j]!.value === sorted[i]!.value) {
      j += 1;
    }
    const avgRank = (i + j - 1) / 2 + 1;
    for (let k = i; k < j; k += 1) {
      ranks[sorted[k]!.index] = avgRank;
    }
    i = j;
  }

  return ranks;
};

const linearRegression = (x: number[], y: number[]): { slope: number; intercept: number; r2: number } => {
  const mx = mean(x);
  const my = mean(y);
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < x.length; i += 1) {
    const dx = x[i]! - mx;
    numerator += dx * (y[i]! - my);
    denominator += dx * dx;
  }

  if (denominator === 0) {
    return { slope: 0, intercept: my, r2: 0 };
  }

  const slope = numerator / denominator;
  const intercept = my - slope * mx;
  const yPred = x.map((xi) => slope * xi + intercept);
  const ssRes = y.reduce((acc, yi, i) => acc + (yi - yPred[i]!) ** 2, 0);
  const ssTot = y.reduce((acc, yi) => acc + (yi - my) ** 2, 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope, intercept, r2: Math.max(0, Math.min(1, r2)) };
};

const buildRegressionLine = (
  xMin: number,
  xMax: number,
  slope: number,
  intercept: number
): RegressionLinePoint[] => [
  { x_distance_km: xMin, y_area_km2: slope * xMin + intercept },
  { x_distance_km: xMax, y_area_km2: slope * xMax + intercept }
];

export const analyzeRows = (rows: CountryDatasetRow[]): AnalysisResult => {
  if (rows.length === 0) {
    return {
      sample_size: 0,
      pearson_r: 0,
      spearman_rho: 0,
      regression: { slope: 0, intercept: 0, r_squared: 0 },
      x_domain_km: { min: 0, max: 0 },
      warnings: ["No countries match current filter settings."]
    };
  }

  const x = rows.map((r) => r.distance_km_from_brno);
  const y = rows.map((r) => r.area_km2);
  const xMin = Math.min(...x);
  const xMax = Math.max(...x);
  const p = pearson(x, y);
  const s = pearson(rank(x), rank(y));
  const reg = linearRegression(x, y);

  const warnings: string[] = [];
  if (rows.length < 8) {
    warnings.push("Small sample size; correlation estimates may be unstable.");
  }

  return {
    sample_size: rows.length,
    pearson_r: p,
    spearman_rho: s,
    regression: {
      slope: reg.slope,
      intercept: reg.intercept,
      r_squared: reg.r2
    },
    x_domain_km: { min: xMin, max: xMax },
    regression_line_points: buildRegressionLine(xMin, xMax, reg.slope, reg.intercept),
    warnings
  };
};
