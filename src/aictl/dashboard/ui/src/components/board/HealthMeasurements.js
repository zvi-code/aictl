import { html } from 'htm/preact';
import { useMemo, useRef, useState } from 'preact/hooks';
import { fmtBps, fmtBytes, fmtN, stamp } from './format.js';
import { mergeSearch } from '../../hooks/urlState.js';

const known = Number.isFinite;
const WINDOW = 15 * 60, BUCKET = 10;

/** Reuse the live feed: at most 90 buckets, no sampling timer or additional requests. */
export function updateTrend(last, health) {
  const at = health?.generated_at;
  if (!known(at)) return last;
  const report = health.node_report;
  const id = JSON.stringify([health.store.destination, health.pipeline.self.pid, health.pipeline.self.started_at,
    report?.scope, report?.nodeId, report?.rows.map(r => [r.node_id, r.daemon_pid]), report?.contributors]);
  if (last.id !== id) last = { id, points: [] };
  const start = Math.floor(at / BUCKET) * BUCKET;
  const prev = last.points.at(-1);
  if (prev && prev.t >= start) return last;
  const modes = health.store.ingestion_traffic || {};
  const point = { t: start, streaming: modes.streaming?.rows_per_s, inline: modes.inline?.rows_per_s,
    queued: modes.queued?.rows_per_s, read: health.store.reads?.recent_avg_ms,
    pending: modes.queued?.pending_history_rows };
  return { id, points: [...last.points.filter(p => p.t > start - WINDOW), point] };
}

export function useMeasuredTrend(health) {
  const saved = useRef({ id: null, points: [] });
  if (!document.hidden) saved.current = updateTrend(saved.current, health);
  return saved.current.points;
}

export function Trend({ points, metric, label }) {
  const values = points.filter(p => known(p[metric]));
  if (values.length < 2) return null;
  const lo = Math.min(...values.map(p => p[metric])), hi = Math.max(...values.map(p => p[metric]));
  const start = points[0].t, span = points.at(-1).t - start;
  if (!span) return null;
  let prior = null;
  const d = points.map(p => {
    if (!known(p[metric])) { prior = null; return ''; }
    const op = prior == null || p.t - prior > 3 * BUCKET ? 'M' : 'L'; prior = p.t;
    return `${op}${(100 * (p.t-start)/span).toFixed(1)},${(hi === lo ? 13 : 24-22*(p[metric]-lo)/(hi-lo)).toFixed(1)}`;
  }).join(' ');
  const title = `${label}: ${values.length} observed samples across ${span < 60 ? span + ' s' : Math.round(span/60) + ' min'}; range ${lo.toFixed(2)}–${hi.toFixed(2)}`;
  return html`<svg class="bd-healthtrend" role="img" aria-label=${title} viewBox="0 0 100 26" preserveAspectRatio="none">
    <title>${title}</title><path d=${d} vector-effect="non-scaling-stroke" fill="none" stroke="currentColor" stroke-width="1.7"/>
  </svg>`;
}

const pct = n => `${n.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
function NodeName({ report, row }) {
  if (row.node_id === 'legacy') return 'Untagged history';
  return report.scope === 'fleet'
    ? html`<a class="bd-link" href=${mergeSearch(location.search, { scope: 'node', node_id: row.node_id })}>${row.node_id}</a>`
    : row.node_id;
}

function NodeResources({ report }) {
  const rows = report.rows;
  return html`<div class="bd-healthresource bd-healthhosts">
    <h3>${report.scope === 'fleet' ? 'Reporting machines' : 'Reporting machine'}</h3>
    ${rows.length ? html`<div class="bd-healthscroll" tabindex="0" role="region" aria-label="Node measurements">
      <table aria-label="Reported node runtime"><thead><tr>
        ${['Reporting node', 'Last report', 'Host CPU', 'Memory used / total', 'Sessions', 'Processes', 'Daemon PID', 'Daemon CPU', 'Daemon RSS'].map(s => html`<th scope="col" key=${s}>${s}</th>`)}
      </tr></thead><tbody>${rows.map(r => html`<tr key=${r.node_id}>
        <th scope="row"><${NodeName} report=${report} row=${r}/></th>
        <td>${r.captured_at ? stamp(r.captured_at, true) : 'Not reported'}${r.status === 'stale' ? ' · stale' : ''}</td>
        <td>${known(r.cpu_percent) ? pct(r.cpu_percent) : '—'}</td>
        <td>${[r.memory_used_mb, r.memory_total_mb].map(v => known(v) ? fmtBytes(v * 1048576) : '—').join(' / ')}</td>
        <td title="Monitored sessions, including idle sessions">${r.status === 'reported' && known(r.active_sessions) ? fmtN(r.active_sessions) : '—'}</td>
        <td title="Processes associated with monitored AI tools">${r.status === 'reported' && known(r.active_processes) ? fmtN(r.active_processes) : '—'}</td><td>${r.daemon_pid ?? '—'}</td>
        <td>${known(r.daemon?.cpu_percent) ? pct(r.daemon.cpu_percent) : '—'}</td><td>${known(r.daemon?.rss_bytes) ? fmtBytes(r.daemon.rss_bytes) : '—'}</td>
      </tr>`)}</tbody></table></div>` : html`<p>No nodes have reported host measurements.</p>`}
    ${report.truncated && html`<p>Not all reporting nodes are listed.</p>`}</div>`;
}

function NodeTraffic({ report }) {
  const rate = (row, value) => row.status === 'reported' && known(value) && value >= 0 ? fmtBps(value) : '—';
  return html`<div class="bd-healthresource bd-healthhosts">
    <h3>Network traffic by node</h3>
    ${report.rows.length ? html`<div class="bd-healthscroll" tabindex="0" role="region" aria-label="Node traffic measurements">
      <table aria-label="Reported node network traffic"><thead><tr>
        <th scope="col">Reporting node</th><th scope="col">Sample time</th><th scope="col">Inbound</th><th scope="col">Outbound</th>
      </tr></thead><tbody>${report.rows.map(r => html`<tr key=${r.node_id}>
        <th scope="row"><${NodeName} report=${report} row=${r}/></th>
        <td>${known(r.activity_at) && r.status !== 'unknown' ? stamp(r.activity_at, true) : 'Not reported'}${r.status === 'stale' ? ' · stale' : ''}</td>
        <td>${rate(r, r.inbound_bps)}</td><td>${rate(r, r.outbound_bps)}</td>
      </tr>`)}</tbody></table></div>` : html`<p>No nodes have reported network traffic.</p>`}
    <p>Network rates for monitored AI tools, in bytes per second. Kusto client traffic is shown separately.</p>
  </div>`;
}

function ResourceBlock({ label, metrics, note, warning }) {
  const present = metrics.filter(m => known(m[1]));
  return html`<div class="bd-healthresource"><h3>${label}</h3>
    ${present.length ? html`<dl>${present.map(([name, v, fmt, at]) => html`<div key=${name} title=${at ? `Measured ${stamp(at, true)}` : undefined}>
      <dt>${name}</dt><dd>${fmt(v)}</dd></div>`)}</dl>` : null}
    ${note && html`<p>${note}</p>`}${warning && html`<p class="bd-warn">${warning}</p>`}</div>`;
}

export function Resources({ health, localNode }) {
  const { daemon: d = {}, host: h = {}, cluster: c } = health.resources || {};
  const self = health.pipeline.self;
  const sample = c?.samples || {};
  const clusterMetrics = [['CPU', 'cpu_percent'], ['Hot-cache utilization', 'cache_percent'], ['Ingestion utilization', 'ingestion_percent'],
    ['Streaming utilization', 'streaming_percent']].map(([label, key]) => [label, sample[key]?.value, pct, sample[key]?.at]);
  const dates = Object.values(sample).map(v => v.at).filter(known);
  const mb = v => known(v) ? v / 1048576 : null;
  const report = !health.node_report ? {
    scope: 'local',
    rows: [{ node_id: h.node_id || localNode || 'This node', captured_at: h.activity_at ?? h.checked_at, activity_at: h.activity_at,
      status: !known(h.activity_at) || h.activity_at <= 0 || h.activity_at > health.generated_at + 60 ? 'unknown'
        : health.generated_at - h.activity_at > 300 ? 'stale' : 'reported',
      cpu_percent: h.cpu_percent, memory_used_mb: mb(h.memory_used_bytes), memory_total_mb: mb(h.memory_total_bytes),
      active_sessions: h.active_sessions, active_processes: h.active_processes,
      inbound_bps: h.inbound_bps, outbound_bps: h.outbound_bps,
      daemon_pid: self.pid, daemon: d }],
  } : health.node_report;
  return html`<section class="bd-healthcard bd-healthresources" aria-label="Resource usage">
    <div class="bd-healthsectionhead"><h2>Resource usage</h2><span>By measurement source</span></div>
    <div class="bd-healthresourcegrid">
      <${NodeResources} report=${report}/>
      <${NodeTraffic} report=${report}/>
      ${health.store.kind === 'kusto' && html`<${ResourceBlock} label="ADX cluster" metrics=${[
        ['Nodes', c?.native?.nodes, fmtN], ['Offline nodes', c?.native?.offline_nodes || null, fmtN],
        ['Active ingestions', c?.native?.ingestions || null, fmtN], ['Active merges', c?.native?.merges || null, fmtN],
        ['Hot extent storage', c?.native?.hot_extent_bytes, fmtBytes], ...clusterMetrics,
      ]} note=${[c?.checked_at ? `Cluster diagnostics · ${stamp(c.checked_at, true)}` : 'Waiting for cluster diagnostics.',
        dates.length ? `Azure Monitor · one-minute averages · ${stamp(Math.min(...dates), true)}` : c?.monitor_status === 'empty' ? 'No recent CPU/cache samples from Azure Monitor.' : ''].filter(Boolean).join(' · ')}
        warning=${c?.last_error || c?.monitor_error}/>`}
    </div></section>`;
}

const COLUMNS = [['rows', 'Extent rows', fmtN], ['extent_count', 'Extents', fmtN], ['extent_bytes', 'Extent size', fmtBytes],
  ['original_bytes', 'Original size', fmtBytes], ['hot_bytes', 'Hot bytes', fmtBytes]];
export function TableInventory({ inventory, all, kind }) {
  const [query, setQuery] = useState(''), [sort, setSort] = useState('rows'), [limit, setLimit] = useState(8);
  const raw = inventory?.tables;
  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (raw || []).filter(t => t.name.toLowerCase().includes(term)
      && (all || term || COLUMNS.some(([key]) => known(t[key]) && t[key] > 0))).sort((a, b) =>
        (b[sort] ?? -1) - (a[sort] ?? -1) || a.name.localeCompare(b.name));
  }, [raw, query, sort, all]);
  const cols = COLUMNS.filter(([key]) => raw?.some(t => known(t[key]) && (all || t[key] > 0)));
  return html`<section class="bd-healthcard bd-healthinventorytables" aria-label="Table inventory">
    <div class="bd-healthsectionhead"><h2>Tables and storage</h2>
      <span>${inventory?.checked_at ? `Measured ${stamp(inventory.checked_at, true)}` : 'Not yet measured'}</span></div>
    ${inventory?.last_error && html`<p class="bd-warn">${inventory.last_error}${inventory.checked_at ? ' · Last successful inventory shown.' : ''}</p>`}
    ${Array.isArray(raw) && inventory?.checked_at ? html`
      <div class="bd-healthtablecontrols"><label>Find a table<input type="search" value=${query} placeholder="Table name"
        onInput=${e => { setQuery(e.currentTarget.value); setLimit(8); }}/></label>
      <label>Order by<select value=${sort} onChange=${e => { setSort(e.currentTarget.value); setLimit(8); }}>
        ${COLUMNS.filter(([k]) => raw.some(t => known(t[k])) || k === sort).map(([k, title]) => html`<option value=${k} key=${k}>${title}</option>`)}
      </select></label><span>${Math.min(limit, rows.length)} of ${rows.length} matching · ${raw.length} reported</span></div>
      <div class="bd-healthscroll bd-healthinventoryscroll" tabindex="0" role="region" aria-label="Scrollable table inventory">${rows.length ? html`<table aria-label="Measured tables"><thead><tr><th scope="col">Table</th>
        ${cols.map(([k, title]) => html`<th scope="col" key=${k}>${title}</th>`)}</tr></thead>
        <tbody>${rows.slice(0, limit).map(t => html`<tr key=${t.name}><th scope="row">${t.name}</th>
          ${cols.map(([k,,fmt]) => html`<td key=${k} title=${known(t[k]) ? String(t[k]) : 'Not reported'}>${known(t[k]) ? fmt(t[k]) : all ? 'n/a' : ''}</td>`)}</tr>`)}</tbody></table>`
        : html`<p>${query ? 'No matching table.' : 'No nonempty table reported.'}</p>`}</div>
      ${rows.length > limit && html`<button class="bd-btn" type="button" onClick=${() => setLimit(limit + 20)}>Show more tables</button>`}`
      : html`<p>${inventory?.status === 'unsupported' ? 'No inventory for this store.' : inventory?.status === 'error' ? 'No inventory is available.' : 'Waiting for table measurements.'}</p>`}
    <p>${inventory?.scope || (kind === 'kusto' ? 'Cluster metadata, not client submission counts.' : 'Rows from the local history store.')}</p>
  </section>`;
}
