import { useState } from "react";

import { Plot, Plotly } from "./PlotlyClient.js";

import type { AnalysisResult, AxisMode, CountryDatasetRow } from "../types/contracts.js";

interface Props {
  rows: CountryDatasetRow[];
  analysis: AnalysisResult;
  axisMode: AxisMode;
}

export const ScatterChart = ({ rows, analysis, axisMode }: Props): JSX.Element => {
  const [graphDiv, setGraphDiv] = useState<unknown>(null);

  const exportImage = async (format: "png" | "svg"): Promise<void> => {
    if (!graphDiv) {
      return;
    }
    await Plotly.downloadImage(graphDiv, {
      format,
      width: 1400,
      height: 900,
      filename: `country-size-distance-${format}`
    });
  };

  const scatterTrace = {
    x: rows.map((r) => r.distance_km_from_brno),
    y: rows.map((r) => r.area_km2),
    mode: "markers",
    type: "scatter",
    name: "Countries",
    customdata: rows.map((r) => [r.name, r.iso3, r.continent, r.point_source]),
    hovertemplate:
      "<b>%{customdata[0]}</b> (%{customdata[1]})<br>" +
      "Continent: %{customdata[2]}<br>" +
      "Distance from Brno: %{x:.1f} km<br>" +
      "Area: %{y:.0f} km²<br>" +
      "Point source: %{customdata[3]}<extra></extra>",
    marker: {
      size: 8,
      color: "#0b5fff",
      opacity: 0.8
    }
  };

  const regressionTrace = {
    x: analysis.regression_line_points?.map((p) => p.x_distance_km) ?? [],
    y: analysis.regression_line_points?.map((p) => p.y_area_km2) ?? [],
    mode: "lines",
    type: "scatter",
    name: "Regression",
    line: {
      color: "#ef233c",
      width: 3
    },
    hovertemplate: "Regression line<extra></extra>"
  };

  return (
    <section className="panel chart-panel">
      <div className="chart-head">
        <h2>Distance from Brno vs Country Area</h2>
        <div className="row-actions">
          <button type="button" className="ghost" onClick={() => void exportImage("png")}>
            Chart PNG
          </button>
          <button type="button" className="ghost" onClick={() => void exportImage("svg")}>
            Chart SVG
          </button>
        </div>
      </div>
      <Plot
        data={[scatterTrace, regressionTrace]}
        layout={{
          autosize: true,
          dragmode: "pan",
          paper_bgcolor: "transparent",
          plot_bgcolor: "#f7fafc",
          margin: { l: 70, r: 20, t: 20, b: 70 },
          xaxis: {
            title: { text: "Distance from Brno (km)" },
            type: axisMode === "log" ? "log" : "linear",
            gridcolor: "#d9e2ec"
          },
          yaxis: {
            title: { text: "Country area (km²)" },
            type: axisMode === "log" ? "log" : "linear",
            gridcolor: "#d9e2ec"
          },
          legend: {
            orientation: "h",
            x: 0,
            y: 1.1
          }
        }}
        useResizeHandler
        onInitialized={(_, gd) => setGraphDiv(gd)}
        onUpdate={(_, gd) => setGraphDiv(gd)}
        style={{ width: "100%", height: "68vh" }}
        config={{ responsive: true, displaylogo: false }}
      />
    </section>
  );
};
