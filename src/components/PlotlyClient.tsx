import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js/lib/core";
import scatter from "plotly.js/lib/scatter";

Plotly.register([scatter]);

export const Plot = createPlotlyComponent(Plotly);
export { Plotly };
