import { useState, useEffect, useCallback, useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import { fmtK, fmtTime, esc } from '../utils.js';
import ChartCard from './ChartCard.js';
import * as api from '../api.js';

/** Group metric entries by prefix (drop last dotted segment). */
function groupByPrefix(entries) {
  const groups = {};
  for (const entry of entries) {
    // entry is {metric: string, count: N, latest_ts: N, last_value: N}
    const name = typeof entry === 'string' ? entry : entry.metric;
    if (!name) continue;
    const parts = name.split('.');
    const prefix = parts.length > 1 ? parts.slice(0, -1).join('.') : '(ungrouped)';
    (groups[prefix] = groups[prefix] || []).push({ name, count: entry.count || 0, lastValue: entry.last_value });
  }
  return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
}

export default function TabSamples() {
  const [metrics, setMetrics] = useState([]);
  const [selected, setSelected] = useState(null);
  const [series, setSeries] = useState(null);
  const [rawSamples, setRawSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState(null);

  // Load metric list on mount
  useEffect(() => {
    api.getSamplesList()
      .then(names => { setMetrics(names || []); setListError(null); })
      .catch(e => { setMetrics([]); setListError(e.message); });
  }, []);

  const grouped = useMemo(() => groupByPrefix(metrics), [metrics]);

  // Fetch series + raw samples when a metric is selected
  const loadSeries = useCallback((name) => {
    setSelected(name);
    setSeries(null);
    setRawSamples([]);
    setLoading(true);

    const since = Math.floor(Date.now() / 1000) - 1800; // 30 min ago

    const seriesReq = api.getSamplesSeries(name, since)
      .then(d => setSeries(d))
      .catch(() => setSeries(null));

    const rawReq = api.getSamplesRaw(name, since)
      .then(d => setRawSamples(Array.isArray(d) ? d : []))
      .catch(() => setRawSamples([]));

    Promise.allSettled([seriesReq, rawReq]).then(() => setLoading(false));
  }, []);

  // Derive current value from series
  const currentValue = useMemo(() => {
    if (!series || !series.value || !series.value.length) return null;
    return series.value[series.value.length - 1];
  }, [series]);

  // Derive tag columns from raw samples
  const tagColumns = useMemo(() => {
    const cols = new Set();
    for (const s of rawSamples) {
      if (s.tags) Object.keys(s.tags).forEach(k => cols.add(k));
    }
    return [...cols].sort();
  }, [rawSamples]);

  return html`<div class="es-layout">
    <div class="es-tool-list">
      <div class="es-section-title">Metrics</div>
      ${listError && html`<p class="error-state" style="padding:0 var(--sp-4)">Error: ${esc(listError)}</p>`}
      ${!listError && !metrics.length && html`<p class="empty-state" style="padding:0 var(--sp-4)">No metrics available.</p>`}
      ${grouped.map(([prefix, entries]) => html`<div key=${prefix}>
        <div class="text-muted" style="font-size:0.62rem;padding:0.35rem var(--sp-5) 0.1rem;text-transform:uppercase;letter-spacing:0.03em">${prefix}</div>
        ${entries.map(entry => html`<button key=${entry.name}
          class=${selected === entry.name ? 'es-tool-btn active' : 'es-tool-btn'}
          onClick=${() => loadSeries(entry.name)}>
          ${entry.name.split('.').pop()}
          ${entry.count ? html`<span class="badge" style="margin-left:auto;font-size:var(--fs-2xs)">${fmtK(entry.count)}</span>` : ''}
        </button>`)}
      </div>`)}
    </div>
    <div>
      ${!selected && html`<div class="diag-card text-center" style="padding:2rem">
        <p class="text-muted">Select a metric from the sidebar to view its time series.</p>
      </div>`}

      ${selected && html`<Fragment>
        <h3 class="mb-sm">${selected}</h3>

        ${loading && html`<p class="loading-state">Loading...</p>`}

        ${!loading && series && series.ts && series.ts.length >= 2 ? html`<div class="es-section">
          <div class="es-section-title">Time Series (last 30m)</div>
          <${ChartCard}
            label=${selected.split('.').pop()}
            value=${currentValue != null ? fmtK(currentValue) : '-'}
            data=${[series.ts, series.value]}
            chartColor="var(--accent)"
            smooth />
        </div>` : ''}

        ${!loading && series && series.ts && series.ts.length < 2 && html`<div class="es-section">
          <div class="es-section-title">Time Series</div>
          <p class="empty-state">Not enough data points to chart.</p>
        </div>`}

        ${!loading && !series && !loading && html`<div class="es-section">
          <div class="es-section-title">Time Series</div>
          <p class="empty-state">No series data available.</p>
        </div>`}

        ${!loading && rawSamples.length > 0 && html`<div class="es-section" style="margin-top:var(--sp-6)">
          <div class="es-section-title">Recent Samples (${rawSamples.length})</div>
          <div style="overflow-x:auto">
            <table style="width:100%;font-size:var(--fs-base);border-collapse:collapse">
              <thead>
                <tr class="text-muted" style="text-align:left;border-bottom:1px solid var(--border)">
                  <th style="padding:var(--sp-2) var(--sp-4)">Time</th>
                  <th style="padding:var(--sp-2) var(--sp-4)">Value</th>
                  ${tagColumns.map(col => html`<th key=${col} style="padding:var(--sp-2) var(--sp-4)">${col}</th>`)}
                </tr>
              </thead>
              <tbody>
                ${rawSamples.slice(-50).reverse().map((s, i) => html`<tr key=${i}
                  style="border-bottom:1px solid var(--border);${i % 2 ? 'background:var(--bg2)' : ''}">
                  <td class="mono text-nowrap" style="padding:var(--sp-2) var(--sp-4)">${fmtTime(s.ts)}</td>
                  <td class="mono" style="padding:var(--sp-2) var(--sp-4)">${fmtK(s.value)}</td>
                  ${tagColumns.map(col => html`<td key=${col} style="padding:var(--sp-2) var(--sp-4)">
                    ${s.tags && s.tags[col] != null ? html`<span class="badge">${s.tags[col]}</span>` : '-'}
                  </td>`)}
                </tr>`)}
              </tbody>
            </table>
          </div>
        </div>`}

        ${!loading && rawSamples.length === 0 && series && html`<div class="es-section" style="margin-top:var(--sp-6)">
          <div class="es-section-title">Recent Samples</div>
          <p class="empty-state">No raw samples in the last 30 minutes.</p>
        </div>`}
      </Fragment>`}
    </div>
  </div>`;
}
