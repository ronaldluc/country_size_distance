import { Suspense, lazy, useMemo, useState } from "react";

import { FilterPanel } from "./components/FilterPanel.js";
import { StatsBar } from "./components/StatsBar.js";
import { analyzeRows } from "./domain/analysis.js";
import { downloadTextFile, rowsToCsv } from "./domain/export.js";
import { applyFilters } from "./domain/filters.js";
import { loadDataset } from "./data/loadDataset.js";
import { CONTINENTS, type FilterState } from "./types/contracts.js";

const defaultFilterState: FilterState = {
  axis_mode: "linear",
  included_continents: [...CONTINENTS],
  exclude_outliers: false,
  outlier_mode: "iqr"
};

const ScatterChart = lazy(async () => {
  const mod = await import("./components/ScatterChart.js");
  return { default: mod.ScatterChart };
});

export const App = (): JSX.Element => {
  const dataset = useMemo(() => loadDataset(), []);
  const [filterState, setFilterState] = useState<FilterState>(defaultFilterState);
  const resetFilters = () => setFilterState(defaultFilterState);

  const filteredRows = useMemo(
    () => applyFilters(dataset.countries, filterState),
    [dataset.countries, filterState]
  );
  const analysis = useMemo(() => analyzeRows(filteredRows), [filteredRows]);
  const exportCsv = () => {
    const csv = rowsToCsv(filteredRows);
    downloadTextFile("countries_distance_area.filtered.csv", csv, "text/csv;charset=utf-8");
  };
  const exportJson = () => {
    downloadTextFile(
      "countries_distance_area.filtered.json",
      JSON.stringify(filteredRows, null, 2),
      "application/json;charset=utf-8"
    );
  };

  return (
    <main className="layout">
      <header className="masthead">
        <div className="masthead-top">
          <h1>Country Size vs Distance from Brno</h1>
          <div className="row-actions">
            <button type="button" className="ghost" onClick={exportCsv}>
              Export CSV
            </button>
            <button type="button" className="ghost" onClick={exportJson}>
              Export JSON
            </button>
          </div>
        </div>
        <p>
          X/Y graph of <strong>distance from Brno (km)</strong> and <strong>country area (km²)</strong>.
          Country point uses centroid with capital fallback.
        </p>
      </header>

      <div className="content-grid">
        <aside>
          <FilterPanel
            filterState={filterState}
            countries={dataset.countries}
            onChange={setFilterState}
            onReset={resetFilters}
          />
          <StatsBar result={analysis} />
        </aside>

        <section>
          <Suspense
            fallback={
              <section className="panel chart-panel chart-loading">
                <h2>Distance from Brno vs Country Area</h2>
                <p>Loading chart module...</p>
              </section>
            }
          >
            <ScatterChart rows={filteredRows} analysis={analysis} axisMode={filterState.axis_mode} />
          </Suspense>
        </section>
      </div>
    </main>
  );
};
