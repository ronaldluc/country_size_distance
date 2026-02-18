import type { AnalysisResult } from "../types/contracts.js";

interface Props {
  result: AnalysisResult;
}

const n = (value: number): string => value.toLocaleString(undefined, { maximumFractionDigits: 3 });

export const StatsBar = ({ result }: Props): JSX.Element => (
  <section className="panel stats">
    <h2>Stats</h2>
    <div className="stats-grid">
      <div>
        <span className="label">Sample size</span>
        <strong>{n(result.sample_size)}</strong>
      </div>
      <div>
        <span className="label">Pearson r</span>
        <strong>{n(result.pearson_r)}</strong>
      </div>
      <div>
        <span className="label">Spearman rho</span>
        <strong>{n(result.spearman_rho)}</strong>
      </div>
      <div>
        <span className="label">R squared</span>
        <strong>{n(result.regression.r_squared)}</strong>
      </div>
      <div>
        <span className="label">Log-log slope (b)</span>
        <strong>{n(result.regression.slope)}</strong>
      </div>
      <div>
        <span className="label">Log intercept (ln a)</span>
        <strong>{n(result.regression.intercept)}</strong>
      </div>
      <div>
        <span className="label">Log residual σ</span>
        <strong>{n(result.regression.sigma_log)}</strong>
      </div>
    </div>
    {result.warnings && result.warnings.length > 0 && (
      <ul className="warnings">
        {result.warnings.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    )}
  </section>
);
