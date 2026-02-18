export const CONTINENTS = [
  "Africa",
  "Antarctica",
  "Asia",
  "Europe",
  "North America",
  "Oceania",
  "Seven seas (open ocean)",
  "South America"
] as const;

export type Continent = (typeof CONTINENTS)[number];

export type CountryPointSource = "centroid" | "capital_fallback";

export interface BrnoReference {
  name: "Brno, Czechia";
  lat: number;
  lon: number;
}

export interface CountryDatasetRow {
  iso3: string;
  name: string;
  continent: Continent;
  area_km2: number;
  distance_km_from_brno: number;
  point_source: CountryPointSource;
  point_lat: number;
  point_lon: number;
  capital_name?: string;
  outlier_flags?: Record<string, boolean>;
}

export interface CountryDistanceAreaDataset {
  generated_at: string;
  generator_version: string;
  brno_reference: BrnoReference;
  countries: CountryDatasetRow[];
}

export type AxisMode = "linear" | "log";
export type OutlierMode = "iqr" | "percentile";

export interface FilterState {
  axis_mode: AxisMode;
  included_continents: Continent[];
  exclude_outliers: boolean;
  outlier_mode?: OutlierMode;
  outlier_percentile_threshold?: number;
  excluded_iso3?: string[];
  included_iso3?: string[];
}

export interface RegressionStats {
  slope: number;
  intercept: number;
  r_squared: number;
}

export interface RegressionLinePoint {
  x_distance_km: number;
  y_area_km2: number;
}

export interface AnalysisResult {
  sample_size: number;
  pearson_r: number;
  spearman_rho: number;
  regression: RegressionStats;
  x_domain_km: {
    min: number;
    max: number;
  };
  regression_line_points?: RegressionLinePoint[];
  warnings?: string[];
}
