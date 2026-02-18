import type {
  AnalysisResult,
  CountryDatasetRow,
  RegressionBandPoint,
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

const linearRegression = (
  x: number[],
  y: number[]
): { slope: number; intercept: number; r2: number; residuals: number[] } => {
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
    const residuals = y.map((yi) => yi - my);
    return { slope: 0, intercept: my, r2: 0, residuals };
  }

  const slope = numerator / denominator;
  const intercept = my - slope * mx;
  const yPred = x.map((xi) => slope * xi + intercept);
  const residuals = y.map((yi, i) => yi - yPred[i]!);
  const ssRes = y.reduce((acc, yi, i) => acc + (yi - yPred[i]!) ** 2, 0);
  const ssTot = y.reduce((acc, yi) => acc + (yi - my) ** 2, 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope, intercept, r2: Math.max(0, Math.min(1, r2)), residuals };
};

const buildRegressionLine = (
  xMin: number,
  xMax: number,
  slope: number,
  intercept: number,
  points = 80
): RegressionLinePoint[] => {
  const minLogX = Math.log(xMin);
  const maxLogX = Math.log(xMax);
  const rows: RegressionLinePoint[] = [];
  for (let i = 0; i < points; i += 1) {
    const t = points === 1 ? 0 : i / (points - 1);
    const logX = minLogX + (maxLogX - minLogX) * t;
    const x = Math.exp(logX);
    rows.push({
      x_distance_km: x,
      y_area_km2: Math.exp(intercept + slope * logX)
    });
  }
  return rows;
};

const buildRegressionBand = (
  xMin: number,
  xMax: number,
  slope: number,
  intercept: number,
  sigma: number,
  sigmaLevel: 1 | 2,
  points = 80
): RegressionBandPoint[] => {
  const minLogX = Math.log(xMin);
  const maxLogX = Math.log(xMax);
  const rows: RegressionBandPoint[] = [];
  for (let i = 0; i < points; i += 1) {
    const t = points === 1 ? 0 : i / (points - 1);
    const logX = minLogX + (maxLogX - minLogX) * t;
    const x = Math.exp(logX);
    const meanLogY = intercept + slope * logX;
    const delta = sigmaLevel * sigma;
    rows.push({
      x_distance_km: x,
      y_lower_km2: Math.exp(meanLogY - delta),
      y_upper_km2: Math.exp(meanLogY + delta)
    });
  }
  return rows;
};

export const analyzeRows = (rows: CountryDatasetRow[]): AnalysisResult => {
  if (rows.length === 0) {
    return {
      sample_size: 0,
      pearson_r: 0,
      spearman_rho: 0,
      regression: { model: "log_log_power_law", slope: 0, intercept: 0, sigma_log: 0, r_squared: 0 },
      x_domain_km: { min: 0, max: 0 },
      warnings: ["No countries match current filter settings."]
    };
  }

  const positiveRows = rows.filter((r) => r.distance_km_from_brno > 0 && r.area_km2 > 0);
  if (positiveRows.length === 0) {
    return {
      sample_size: rows.length,
      pearson_r: 0,
      spearman_rho: 0,
      regression: { model: "log_log_power_law", slope: 0, intercept: 0, sigma_log: 0, r_squared: 0 },
      x_domain_km: { min: 0, max: 0 },
      warnings: ["No positive values available for log-log regression."]
    };
  }

  const x = positiveRows.map((r) => r.distance_km_from_brno);
  const y = positiveRows.map((r) => r.area_km2);
  const xMin = Math.min(...x);
  const xMax = Math.max(...x);
  const p = pearson(x, y);
  const s = pearson(rank(x), rank(y));
  const logX = x.map((v) => Math.log(v));
  const logY = y.map((v) => Math.log(v));
  const reg = linearRegression(logX, logY);

  const dof = Math.max(1, logX.length - 2);
  const sigmaLog = Math.sqrt(reg.residuals.reduce((acc, r) => acc + r ** 2, 0) / dof);

  const warnings: string[] = [];
  if (rows.length < 8) {
    warnings.push("Small sample size; correlation estimates may be unstable.");
  }
  if (positiveRows.length !== rows.length) {
    warnings.push("Some non-positive points were excluded from log-log regression.");
  }

  return {
    sample_size: positiveRows.length,
    pearson_r: p,
    spearman_rho: s,
    regression: {
      model: "log_log_power_law",
      slope: reg.slope,
      intercept: reg.intercept,
      sigma_log: sigmaLog,
      r_squared: reg.r2
    },
    x_domain_km: { min: xMin, max: xMax },
    regression_line_points: buildRegressionLine(xMin, xMax, reg.slope, reg.intercept),
    regression_band_1sigma_points: buildRegressionBand(
      xMin,
      xMax,
      reg.slope,
      reg.intercept,
      sigmaLog,
      1
    ),
    regression_band_2sigma_points: buildRegressionBand(
      xMin,
      xMax,
      reg.slope,
      reg.intercept,
      sigmaLog,
      2
    ),
    warnings
  };
};
