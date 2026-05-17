import { useState, useEffect, useMemo, useContext } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { fmtK, fmtSz, fmtTime } from '../utils.js';
import ChartCard from './ChartCard.js';
import AnalyticsChart from './AnalyticsChart.js';
import TabSamples from './TabSamples.js';
import * as api from '../api.js';

const MODEL_COLORS = [
  'var(--green)', 'var(--orange)', 'var(--accent)', 'var(--red)',
  'var(--yellow)', '#8b5cf6', '#06b6d4', '#f472b6',
];

function fmtMs(v) { return v >= 1000 ? fmtK(v / 1000) + 's' : Math.round(v) + 'ms'; }
function fmtSeq(v) { return '#' + Math.round(v); }
function shortPath(p) { const parts = (p || '').split('/'); return parts.slice(-2).join('/'); }

// ── Section: Response Time Analysis ──────────────────────────────

function ResponseTimeSection({data}) {
  if (!data || !data.requests || !data.requests.length)
    return html`<div class="analytics-section">
      <div class="analytics-section-title">Response Time Analysis</div>
      <p class="empty-state">No request data in this time range.</p>
    </div>`;

  const reqs = data.requests;

  // 1. Over Time — line chart (ts vs duration_ms)
  const overTime = useMemo(() => {
    const ts = reqs.map(r => r.ts);
    const dur = reqs.map(r => r.duration_ms);
    return [ts, dur];
  }, [reqs]);

  // 2. Scatter: input_tokens vs duration_ms, colored by model
  const scatter = useMemo(() => {
    const models = [...new Set(reqs.map(r => r.model || '(unknown)'))];
    const xAll = [], seriesData = models.map(() => []);
    // uPlot needs aligned x-axis — sort by input_tokens, use sparse series
    // Filter out zero input_tokens for log scale
    const filtered = reqs.filter(r => r.input_tokens > 0);
    const sorted = [...filtered].sort((a, b) => a.input_tokens - b.input_tokens);
    const xs = sorted.map(r => r.input_tokens);
    for (const m of models) {
      seriesData[models.indexOf(m)] = sorted.map(r =>
        (r.model || '(unknown)') === m ? r.duration_ms : null
      );
    }
    return { data: [xs, ...seriesData], labels: models, colors: MODEL_COLORS.slice(0, models.length) };
  }, [reqs]);

  // 3. By model — horizontal bars
  const byModel = data.by_model || [];
  const maxP95 = Math.max(1, ...byModel.map(m => m.p95_ms));

  // 4. Session lifecycle — seq vs duration_ms, colored by model
  const lifecycle = useMemo(() => {
    const models = [...new Set(reqs.map(r => r.model || '(unknown)'))];
    const filtered = reqs.filter(r => r.seq > 0);
    const sorted = [...filtered].sort((a, b) => a.seq - b.seq);
    const xs = sorted.map(r => r.seq);
    const seriesData = models.map(m =>
      sorted.map(r => (r.model || '(unknown)') === m ? r.duration_ms : null)
    );
    return { data: [xs, ...seriesData], labels: models, colors: MODEL_COLORS.slice(0, models.length) };
  }, [reqs]);

  const lastVal = reqs.length ? reqs[reqs.length - 1].duration_ms : 0;

  return html`<div class="analytics-section">
    <div class="analytics-section-title">Response Time Analysis</div>
    <div class="analytics-charts">
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time Over Time</span>
          <span class="chart-val" style="color:var(--accent)">${fmtMs(lastVal)}</span></div>
        <${AnalyticsChart} mode="line" data=${overTime} isTime=${true} fmtY=${fmtMs} height=${200}/>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time vs Input Size</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">${reqs.length} requests</span></div>
        <${AnalyticsChart} mode="scatter" data=${scatter.data} labels=${scatter.labels}
          colors=${scatter.colors} fmtX=${fmtK} fmtY=${fmtMs} logX=${true} height=${200}/>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time by Model</span></div>
        <div class="hbar-list">
          ${byModel.map((m, i) => html`<div key=${m.model} class="hbar-row">
            <span class="hbar-label" title=${m.model}>${m.model.replace(/^claude-/, '') || m.model}</span>
            <div class="hbar-track">
              <div class="hbar-fill" style=${'width:'+Math.round(m.avg_ms/maxP95*100)+'%;background:'+MODEL_COLORS[i%MODEL_COLORS.length]}></div>
              <div class="hbar-p95" style=${'left:'+Math.round(m.p95_ms/maxP95*100)+'%'} title=${'p95: '+fmtMs(m.p95_ms)}></div>
            </div>
            <span class="hbar-value">${fmtMs(m.avg_ms)}</span>
            <span class="badge">${m.count}</span>
          </div>`)}
        </div>
        ${byModel.length > 0 && html`<div class="text-muted" style="font-size:var(--fs-2xs);margin-top:var(--sp-2);padding-left:130px">
          Bar = avg, dashed line = p95</div>`}
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Session Lifecycle (seq vs latency)</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">degradation?</span></div>
        <${AnalyticsChart} mode="scatter" data=${lifecycle.data} labels=${lifecycle.labels}
          colors=${lifecycle.colors} fmtX=${fmtSeq} fmtY=${fmtMs} logX=${true} height=${200}/>
      </div>
    </div>
  </div>`;
}

// ── CLI tool color palette (consistent across all bars) ─────────
const CLI_COLORS = {
  'claude-code': '#8b5cf6',  // purple
  'codex': '#f97316',        // orange
  'aider': '#06b6d4',        // cyan
  'cursor': '#f472b6',       // pink
};
function _cliColor(name, idx) {
  return CLI_COLORS[name] || MODEL_COLORS[idx % MODEL_COLORS.length];
}

/** Render stacked bar segments for a tool's by_cli breakdown. */
function StackedBar({by_cli, total, barWidth, cliTools}) {
  if (!by_cli || !by_cli.length) {
    // Fallback: single-color bar
    return html`<div class="hbar-fill" style=${'width:'+barWidth+'%;background:var(--accent)'}></div>`;
  }
  // Render segments left-to-right, proportional to each cli_tool's count
  return by_cli.map((seg, i) => {
    const pct = (seg.count / total) * barWidth;
    const color = _cliColor(seg.cli_tool, cliTools.indexOf(seg.cli_tool));
    return html`<div key=${seg.cli_tool}
      style=${'width:'+pct.toFixed(1)+'%;background:'+color+';height:100%;display:inline-block'}
      title=${seg.cli_tool + ': ' + seg.count}></div>`;
  });
}

// ── Section: Tool Usage ──────────────────────────────────────────

function ToolUsageSection({data}) {
  if (!data || !data.invocations || !data.invocations.length)
    return html`<div class="analytics-section">
      <div class="analytics-section-title">Tool Usage</div>
      <p class="empty-state">${data?.total_all_time
        ? 'No tool invocation data in this time range. Try a wider range (' + data.total_all_time + ' invocations exist).'
        : 'No tool invocation data yet. Configure Claude Code hooks to capture tool usage.'}</p>
    </div>`;

  const invocations = data.invocations;
  const cliTools = data.cli_tools || [];
  const maxCount = Math.max(1, ...invocations.map(t => t.count));
  const maxDur = Math.max(1, ...invocations.map(t => t.p95_ms));

  return html`<div class="analytics-section">
    <div class="analytics-section-title">Tool Usage</div>
    ${cliTools.length > 1 && html`<div style="display:flex;gap:var(--sp-4);margin-bottom:var(--sp-3);flex-wrap:wrap">
      ${cliTools.map((ct, i) => html`<span key=${ct} style="display:flex;align-items:center;gap:var(--sp-2);font-size:var(--fs-sm)">
        <span style=${'width:10px;height:10px;border-radius:2px;background:'+_cliColor(ct, i)}></span>
        ${ct}
      </span>`)}
    </div>`}
    <div class="analytics-charts">
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Invocation Frequency</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">${invocations.reduce((s,t)=>s+t.count,0)} total</span></div>
        <div class="hbar-list">
          ${invocations.slice(0, 15).map(t => html`<div key=${t.tool_name} class="hbar-row">
            <span class="hbar-label" title=${t.tool_name}>${t.tool_name}</span>
            <div class="hbar-track" style="overflow:hidden">
              <${StackedBar} by_cli=${t.by_cli} total=${t.count}
                barWidth=${Math.round(t.count/maxCount*100)} cliTools=${cliTools}/>
            </div>
            <span class="hbar-value">${fmtK(t.count)}</span>
            ${t.error_count ? html`<span class="badge" style="color:var(--red)">${t.error_count} err</span>` : ''}
          </div>`)}
        </div>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Execution Duration</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">avg + p95</span></div>
        <div class="hbar-list">
          ${invocations.slice(0, 15).map((t, i) => html`<div key=${t.tool_name} class="hbar-row">
            <span class="hbar-label" title=${t.tool_name}>${t.tool_name}</span>
            <div class="hbar-track">
              <${StackedBar} by_cli=${t.by_cli} total=${t.count}
                barWidth=${Math.round(t.avg_ms/maxDur*100)} cliTools=${cliTools}/>
              <div class="hbar-p95" style=${'left:'+Math.round(t.p95_ms/maxDur*100)+'%'} title=${'p95: '+fmtMs(t.p95_ms)}></div>
            </div>
            <span class="hbar-value">${fmtMs(t.avg_ms)}</span>
          </div>`)}
        </div>
      </div>
    </div>
  </div>`;
}

// ── Section: File & Memory Tracking ──────────────────────────────

function MemorySection({data}) {
  const [showAll, setShowAll] = useState(false);

  if (!data) return null;

  const timeline = data.memory_timeline || {};
  const events = data.memory_events || [];
  const paths = Object.keys(timeline);

  if (!paths.length && !events.length)
    return html`<div class="analytics-section">
      <div class="analytics-section-title">File Write Activity</div>
      <p class="empty-state">No file write data in this time range.</p>
    </div>`;

  const displayPaths = showAll ? paths : paths.slice(0, 6);

  return html`<div class="analytics-section">
    <div class="analytics-section-title">File Write Activity</div>

    ${paths.length > 0 && html`<div style="margin-bottom:var(--sp-6)">
      <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:var(--sp-3)">
        Cumulative Bytes Written (${paths.length} files)</div>
      <div class="analytics-charts">
        ${displayPaths.map(p => {
          const t = timeline[p];
          if (!t || t.ts.length < 2) return html`<div key=${p} class="diag-card">
            <div class="chart-hdr"><span class="chart-label" title=${p}>${shortPath(p)}</span>
              <span class="chart-val text-muted">${t && t.size_bytes.length ? fmtSz(t.size_bytes[t.size_bytes.length-1]) : '-'}</span></div>
            <div class="empty-state" style="font-size:var(--fs-sm)">Single snapshot</div>
          </div>`;
          const lastSz = t.size_bytes[t.size_bytes.length - 1];
          return html`<div key=${p} class="diag-card">
            <${ChartCard} label=${shortPath(p)} value=${fmtSz(lastSz)}
              data=${[t.ts, t.size_bytes]} chartColor="var(--accent)"/>
          </div>`;
        })}
      </div>
      ${paths.length > 6 && !showAll && html`<button class="range-btn" style="margin-top:var(--sp-2)"
        onClick=${() => setShowAll(true)}>Show all ${paths.length} files</button>`}
    </div>`}

    ${events.length > 0 && html`<div>
      <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:var(--sp-3)">
        Recent File Writes (${events.length})</div>
      <div style="overflow-x:auto">
        <table style="width:100%;font-size:var(--fs-base);border-collapse:collapse">
          <thead>
            <tr class="text-muted" style="text-align:left;border-bottom:1px solid var(--border)">
              <th style="padding:var(--sp-2) var(--sp-4)">Time</th>
              <th style="padding:var(--sp-2) var(--sp-4)">File</th>
              <th style="padding:var(--sp-2) var(--sp-4)">Bytes</th>
              <th style="padding:var(--sp-2) var(--sp-4)">Growth</th>
              <th style="padding:var(--sp-2) var(--sp-4)">Tokens</th>
            </tr>
          </thead>
          <tbody>
            ${events.slice(0, 30).map((e, i) => html`<tr key=${i}
              style="border-bottom:1px solid var(--border);${i % 2 ? 'background:var(--bg2)' : ''}">
              <td class="mono text-nowrap" style="padding:var(--sp-2) var(--sp-4)">${fmtTime(e.ts)}</td>
              <td style="padding:var(--sp-2) var(--sp-4)" title=${e.path}>${shortPath(e.path)}</td>
              <td class="mono" style="padding:var(--sp-2) var(--sp-4)">${fmtSz(e.size_bytes)}</td>
              <td class="mono" style="padding:var(--sp-2) var(--sp-4);color:${e.delta > 0 ? 'var(--green)' : e.delta < 0 ? 'var(--red)' : 'var(--fg2)'}">
                ${e.delta > 0 ? '+' : ''}${fmtSz(Math.abs(e.delta))}${e.delta < 0 ? ' \u2193' : e.delta > 0 ? ' \u2191' : ''}
              </td>
              <td class="mono" style="padding:var(--sp-2) var(--sp-4)">${fmtK(e.tokens)}</td>
            </tr>`)}
          </tbody>
        </table>
      </div>
    </div>`}
  </div>`;
}

// ── Main Tab ─────────────────────────────────────────────────────

export default function TabAnalytics() {
  const ctx = useContext(SnapContext);
  const globalRange = ctx?.globalRange;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const since = globalRange?.since || (Date.now() / 1000 - 86400);
    const until = globalRange?.until || '';
    const analyticsUrl = `/api/analytics?since=${since}${until ? '&until=' + until : ''}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    api.getAnalytics(analyticsUrl, { signal: ctrl.signal })
      .then(d => { setData(d); setError(null); })
      .catch(e => {
        if (e.name === 'AbortError') setError('Request timed out');
        else setData(null), setError(e.message);
      })
      .finally(() => { clearTimeout(timer); setLoading(false); });
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [globalRange?.since, globalRange?.until]);

  return html`<div class="analytics-grid">
    ${loading && html`<p class="loading-state">Loading analytics...</p>`}
    ${error && html`<p class="error-state">Error: ${error}</p>`}
    ${!loading && !error && html`<Fragment>
      <${ResponseTimeSection} data=${data?.response_time}/>
      <${ToolUsageSection} data=${data?.tools}/>
      <${MemorySection} data=${data?.files}/>
      <details class="analytics-section">
        <summary class="analytics-section-title" style="cursor:pointer;user-select:none">
          Raw Metrics Explorer</summary>
        <div style="margin-top:var(--sp-4)"><${TabSamples}/></div>
      </details>
    </Fragment>`}
  </div>`;
}
