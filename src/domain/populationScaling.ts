export const populationToRegressionWeight = (population: number): number => {
  if (!Number.isFinite(population) || population <= 0) {
    return 1;
  }
  // Linear weighting by population for regression.
  return population;
};
