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
      size: 9,
      color: "#0fba9b",
      opacity: 0.82
    }
  };

  const regressionTrace = {
    x: analysis.regression_line_points?.map((p) => p.x_distance_km) ?? [],
    y: analysis.regression_line_points?.map((p) => p.y_area_km2) ?? [],
    mode: "lines",
    type: "scatter",
    name: "Regression",
    line: {
      color: "#ff6b35",
      width: 3
    },
    hovertemplate: "Regression line<extra></extra>"
  };

  const band2LowerTrace = {
    x: analysis.regression_band_2sigma_points?.map((p) => p.x_distance_km) ?? [],
    y: analysis.regression_band_2sigma_points?.map((p) => p.y_lower_km2) ?? [],
    mode: "lines",
    type: "scatter",
    name: "Regression -2\u03c3",
    line: { color: "rgba(239,35,60,0)", width: 0 },
    hoverinfo: "skip",
    showlegend: false
  };

  const band2UpperTrace = {
    x: analysis.regression_band_2sigma_points?.map((p) => p.x_distance_km) ?? [],
    y: analysis.regression_band_2sigma_points?.map((p) => p.y_upper_km2) ?? [],
    mode: "lines",
    type: "scatter",
    name: "Regression \u00b12\u03c3",
    line: { color: "rgba(255,107,53,0.28)", width: 1 },
    fill: "tonexty" as const,
    fillcolor: "rgba(255,107,53,0.09)",
    hovertemplate: "Regression band: \u00b12\u03c3<extra></extra>"
  };

  const band1LowerTrace = {
    x: analysis.regression_band_1sigma_points?.map((p) => p.x_distance_km) ?? [],
    y: analysis.regression_band_1sigma_points?.map((p) => p.y_lower_km2) ?? [],
    mode: "lines",
    type: "scatter",
    name: "Regression -1\u03c3",
    line: { color: "rgba(239,35,60,0)", width: 0 },
    hoverinfo: "skip",
    showlegend: false
  };

  const band1UpperTrace = {
    x: analysis.regression_band_1sigma_points?.map((p) => p.x_distance_km) ?? [],
    y: analysis.regression_band_1sigma_points?.map((p) => p.y_upper_km2) ?? [],
    mode: "lines",
    type: "scatter",
    name: "Regression \u00b11\u03c3",
    line: { color: "rgba(255,107,53,0.55)", width: 1 },
    fill: "tonexty" as const,
    fillcolor: "rgba(255,107,53,0.18)",
    hovertemplate: "Regression band: \u00b11\u03c3<extra></extra>"
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
        data={[
          scatterTrace,
          band2LowerTrace,
          band2UpperTrace,
          band1LowerTrace,
          band1UpperTrace,
          regressionTrace
        ]}
        layout={{
          autosize: true,
          dragmode: "pan",
          paper_bgcolor: "#0f1f34",
          plot_bgcolor: "#0f1f34",
          margin: { l: 96, r: 20, t: 20, b: 74 },
          xaxis: {
            title: { text: "Distance from Brno (km)", standoff: 14 },
            type: axisMode === "log" ? "log" : "linear",
            gridcolor: "#2d4061",
            color: "#c8d7ef",
            zerolinecolor: "#3e5b86"
          },
          yaxis: {
            title: { text: "Country area (km²)", standoff: 14 },
            type: axisMode === "log" ? "log" : "linear",
            gridcolor: "#2d4061",
            color: "#c8d7ef",
            zerolinecolor: "#3e5b86"
          },
          legend: {
            orientation: "h",
            x: 0,
            y: 1.1,
            font: { color: "#d7e6ff", size: 13 },
            bgcolor: "rgba(12, 26, 45, 0.76)",
            bordercolor: "rgba(124, 163, 217, 0.35)",
            borderwidth: 1
          }
        }}
        useResizeHandler
        onInitialized={(_, gd) => setGraphDiv(gd)}
        onUpdate={(_, gd) => setGraphDiv(gd)}
        style={{ width: "100%", height: "68vh" }}
        config={{ responsive: true, displaylogo: false, displayModeBar: false }}
      />
    </section>
  );
};
