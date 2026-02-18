import Ajv2020 from "ajv/dist/2020";
import type { ErrorObject, ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

import type {
  AnalysisResult,
  CountryDistanceAreaDataset,
  FilterState
} from "../types/contracts.js";
import {
  analysisResultSchema,
  datasetSchema,
  filterStateSchema
} from "./schemas.js";

const ajv = new Ajv2020({
  allErrors: true,
  strict: true
});
addFormats(ajv);

const validateDatasetFn = ajv.compile(datasetSchema) as ValidateFunction<CountryDistanceAreaDataset>;
const validateFilterStateFn = ajv.compile(filterStateSchema) as ValidateFunction<FilterState>;
const validateAnalysisResultFn = ajv.compile(analysisResultSchema) as ValidateFunction<AnalysisResult>;

const formatErrors = (errors: ErrorObject[] | null | undefined): string => {
  if (!errors || errors.length === 0) {
    return "Unknown schema validation error.";
  }

  return errors
    .map((err) => {
      const path = err.instancePath || "/";
      const message = err.message || "invalid value";
      return `${path} ${message}`.trim();
    })
    .join("; ");
};

const assertValid = <T>(validate: ValidateFunction<T>, value: unknown, label: string): T => {
  if (validate(value)) {
    return value as T;
  }
  throw new Error(`${label} failed schema validation: ${formatErrors(validate.errors)}`);
};

export const isCountryDistanceAreaDataset = (value: unknown): value is CountryDistanceAreaDataset =>
  validateDatasetFn(value);

export const isFilterState = (value: unknown): value is FilterState =>
  validateFilterStateFn(value);

export const isAnalysisResult = (value: unknown): value is AnalysisResult =>
  validateAnalysisResultFn(value);

export const assertCountryDistanceAreaDataset = (value: unknown): CountryDistanceAreaDataset =>
  assertValid(validateDatasetFn, value, "CountryDistanceAreaDataset");

export const assertFilterState = (value: unknown): FilterState =>
  assertValid(validateFilterStateFn, value, "FilterState");

export const assertAnalysisResult = (value: unknown): AnalysisResult =>
  assertValid(validateAnalysisResultFn, value, "AnalysisResult");
