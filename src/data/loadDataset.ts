import rawDataset from "../../data/processed/countries_distance_area.json";

import type { CountryDistanceAreaDataset } from "../types/contracts.js";
import { assertCountryDistanceAreaDataset } from "../validation/validators.js";

export const loadDataset = (): CountryDistanceAreaDataset =>
  assertCountryDistanceAreaDataset(rawDataset);
