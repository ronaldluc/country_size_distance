import { type CSSProperties, useMemo, useState } from "react";

import { CONTINENT_COLORS } from "../domain/continentColors.js";
import { CONTINENTS, type CountryDatasetRow, type FilterState } from "../types/contracts.js";

interface Props {
  filterState: FilterState;
  countries: CountryDatasetRow[];
  onChange: (next: FilterState) => void;
  onReset: () => void;
}

export const FilterPanel = ({ filterState, countries, onChange, onReset }: Props): JSX.Element => {
  const [search, setSearch] = useState("");

  const toggleContinent = (continent: (typeof CONTINENTS)[number]) => {
    const has = filterState.included_continents.includes(continent);
    const included_continents = has
      ? filterState.included_continents.filter((c) => c !== continent)
      : [...filterState.included_continents, continent];
    onChange({ ...filterState, included_continents });
  };
  const excludedSet = new Set(filterState.excluded_iso3 ?? []);

  const suggestedCountries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return [];
    }
    return countries
      .filter((country) => country.name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [countries, search]);

  const addExcludedCountry = (iso3: string) => {
    const next = new Set(filterState.excluded_iso3 ?? []);
    next.add(iso3);
    onChange({ ...filterState, excluded_iso3: [...next] });
  };

  const removeExcludedCountry = (iso3: string) => {
    const next = (filterState.excluded_iso3 ?? []).filter((v) => v !== iso3);
    onChange({ ...filterState, excluded_iso3: next });
  };

  return (
    <section className="panel">
      <h2>Filters</h2>

      <div className="field-group">
        <label htmlFor="axis_mode">Axis Mode</label>
        <select
          id="axis_mode"
          value={filterState.axis_mode}
          onChange={(e) => onChange({ ...filterState, axis_mode: e.target.value as "linear" | "log" })}
        >
          <option value="linear">Linear</option>
          <option value="log">Log</option>
        </select>
      </div>

      <div className="field-group">
        <label>
          <input
            type="checkbox"
            checked={filterState.exclude_outliers}
            onChange={(e) => onChange({ ...filterState, exclude_outliers: e.target.checked })}
          />
          Exclude outliers
        </label>
      </div>

      <div className="field-group">
        <label htmlFor="outlier_mode">Outlier Mode</label>
        <select
          id="outlier_mode"
          value={filterState.outlier_mode ?? "iqr"}
          onChange={(e) =>
            onChange({
              ...filterState,
              outlier_mode: e.target.value as "iqr" | "percentile"
            })
          }
        >
          <option value="iqr">IQR</option>
          <option value="percentile">Percentile</option>
        </select>
      </div>

      <div className="field-group">
        <label htmlFor="regression_weighting">Regression weighting</label>
        <select
          id="regression_weighting"
          value={filterState.regression_weighting ?? "uniform"}
          onChange={(e) =>
            onChange({
              ...filterState,
              regression_weighting: e.target.value as "uniform" | "population"
            })
          }
        >
          <option value="uniform">Uniform (equal country weight)</option>
          <option value="population">Population-weighted (non-linear)</option>
        </select>
      </div>

      {filterState.outlier_mode === "percentile" && (
        <div className="field-group">
          <label htmlFor="outlier_percentile_threshold">
            Central coverage ({Math.round((filterState.outlier_percentile_threshold ?? 0.95) * 100)}%)
          </label>
          <input
            id="outlier_percentile_threshold"
            type="range"
            min={0.8}
            max={0.999}
            step={0.001}
            value={filterState.outlier_percentile_threshold ?? 0.95}
            onChange={(e) =>
              onChange({
                ...filterState,
                outlier_percentile_threshold: Number(e.target.value)
              })
            }
          />
        </div>
      )}

      <div className="field-group">
        <span>Continents</span>
        <div className="row-actions">
          <button type="button" className="ghost" onClick={() => onChange({ ...filterState, included_continents: [...CONTINENTS] })}>
            All
          </button>
          <button type="button" className="ghost" onClick={() => onChange({ ...filterState, included_continents: [] })}>
            None
          </button>
        </div>
        <div className="chip-grid">
          {CONTINENTS.map((continent) => {
            const active = filterState.included_continents.includes(continent);
            return (
              <button
                key={continent}
                type="button"
                className={active ? "chip continent-chip chip-on" : "chip continent-chip"}
                style={{ "--continent-color": CONTINENT_COLORS[continent] } as CSSProperties}
                onClick={() => toggleContinent(continent)}
              >
                <span className="chip-swatch" />
                {continent}
              </button>
            );
          })}
        </div>
      </div>

      <div className="field-group">
        <label htmlFor="country_search">Exclude country by name</label>
        <input
          id="country_search"
          type="text"
          placeholder="Search country..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {suggestedCountries.length > 0 && (
          <div className="suggestion-list">
            {suggestedCountries.map((country) => (
              <button
                key={country.iso3}
                type="button"
                className="suggestion-item"
                onClick={() => addExcludedCountry(country.iso3)}
                disabled={excludedSet.has(country.iso3)}
              >
                {country.name} ({country.iso3})
              </button>
            ))}
          </div>
        )}
      </div>

      {filterState.excluded_iso3 && filterState.excluded_iso3.length > 0 && (
        <div className="field-group">
          <span>Excluded countries</span>
          <div className="chip-grid">
            {filterState.excluded_iso3.map((iso3) => (
              <button key={iso3} type="button" className="chip" onClick={() => removeExcludedCountry(iso3)}>
                {iso3} ×
              </button>
            ))}
          </div>
        </div>
      )}

      <button type="button" className="reset-btn" onClick={onReset}>
        Reset filters
      </button>
    </section>
  );
};
