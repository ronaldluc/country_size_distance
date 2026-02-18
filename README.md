# country_size_distance

Single-page local app to analyze correlation between:
- `x`: geodesic distance from Brno, Czechia (km)
- `y`: country area (km²)

Country point uses polygon centroid with capital fallback.

## Stack

- Python (`uv`) for dataset build
- React + TypeScript + Vite for frontend
- Plotly for scatter/hover/regression line
- JSON Schema + Ajv runtime validation

## Setup

```bash
uv venv .venv
uv sync
npm install
```

## Run

```bash
# 1) Build/refresh dataset JSON
npm run refresh:data

# 2) Start frontend + backend watcher (auto-reload on code/data changes)
npm run dev
```

Then open the local Vite URL (usually `http://localhost:5173`).

If you only want the frontend dev server:

```bash
npm run dev:frontend
```

Export options in the page header download the currently filtered data as CSV or JSON.

## Verify

```bash
npm run typecheck
npm run build
npm test
```

## Key folders

- `scripts/build_dataset.py`: downloads Natural Earth data, computes centroid/capital fallback, geodesic distance, and area.
- `data/processed/countries_distance_area.json`: generated dataset consumed by frontend.
- `src/components/`: filter panel, stats bar, scatter chart.
- `src/domain/`: filtering and correlation/regression logic.
- `schemas/`: JSON Schema contracts for dataset, filter state, and analysis output.
