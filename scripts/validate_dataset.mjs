import addFormats from "ajv-formats";
import Ajv2020 from "ajv/dist/2020.js";

import datasetSchema from "../schemas/country-distance-area.dataset.schema.json" with { type: "json" };
import dataset from "../data/processed/countries_distance_area.json" with { type: "json" };

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

const validate = ajv.compile(datasetSchema);
if (!validate(dataset)) {
  const message = (validate.errors ?? [])
    .map((err) => `${err.instancePath || "/"} ${err.message ?? "invalid"}`)
    .join("; ");
  console.error(`Dataset schema validation failed: ${message}`);
  process.exit(1);
}

const continents = new Set(dataset.countries.map((c) => c.continent));
console.log(
  `Dataset valid. Countries: ${dataset.countries.length}. Continents: ${[...continents].sort().join(", ")}.`
);
