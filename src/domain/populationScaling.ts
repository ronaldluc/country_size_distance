export const populationToRegressionWeight = (population: number): number => {
  if (!Number.isFinite(population) || population <= 0) {
    return 1;
  }
  // Linear weighting by population for regression.
  return population;
};

export const populationToBubbleSize = (population: number): number => {
  if (!Number.isFinite(population) || population <= 0) {
    return 1;
  }

  // Piecewise log-log interpolation through anchor points:
  // 1e3 -> 1, 1e6 -> 5, 1e9 -> 30 (radius / marker size in px).
  const logP = Math.log10(population);
  const x1 = 3;
  const x2 = 6;
  const x3 = 9;
  const y1 = Math.log10(1);
  const y2 = Math.log10(5);
  const y3 = Math.log10(30);

  const lerp = (x: number, xa: number, ya: number, xb: number, yb: number): number =>
    ya + ((x - xa) / (xb - xa)) * (yb - ya);

  let logRadius: number;
  if (logP <= x2) {
    logRadius = lerp(logP, x1, y1, x2, y2);
  } else {
    logRadius = lerp(logP, x2, y2, x3, y3);
  }

  const radius = 10 ** logRadius;
  return Math.max(1, Math.min(42, radius));
};
