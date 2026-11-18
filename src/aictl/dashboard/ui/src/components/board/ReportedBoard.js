import { html } from 'htm/preact';
import { useState } from 'preact/hooks';
import { boardNodePath } from '../../api.js';
import { mergeSearch, rangeToParams } from '../../hooks/urlState.js';
import BoardRange from './BoardRange.js';
import { DEFAULT_RANGE, parseFilters, windowOf } from './filters.js';
import { NA, fmtCpu, fmtMem, fmtN, fmtUsd, stamp } from './format.js';
import { Ico, PATHS } from './icons.js';
import { scopeLabel, useNodeView } from './NodeScope.js';
import { Stats } from './Panel.js';

const SCREENS = [['health', 'aictl Health', PATHS.health], ['board', 'Overview', PATHS.top], ['settings', 'Settings', PATHS.settings]];
const TITLES = { overview: 'Overview', health: 'aictl Health', settings: 'Settings', session: 'Session detail' };
const NOTES = {
  overview: 'The range selects current session records by start time: at or after the start, but before the end. Requests, tokens and cost are the recorded totals for those sessions, not just activity during the interval. Local board filters do not apply.',
  session: 'Historical usage for this session on its reporting node.',
  health: 'Each node reports its own runtime. The shared Kusto store is shown separately.',
  settings: 'Settings last reported by each node. To inspect or change local files, switch to This node.',
};
const text = v => (typeof v === 'string' && v) || Number.isFinite(v) ? String(v) : NA;
const time = v => Number.isFinite(v) ? stamp(v, true) : 'Unknown';
const METRICS = [['sessions', 'Sessions', fmtN], ['requests', 'Requests', fmtN], ['input_tokens', 'Input tokens', fmtN],
  ['output_tokens', 'Output tokens', fmtN], ['cost_usd', 'Cost (USD)', fmtUsd]];
const NODE = ['node_id', 'Reporting node'];
const SAMPLE = [NODE, ['captured_at', 'Captured at', time], ['status', 'Report status']];
const HEALTH = [...SAMPLE, ['cpu_percent', 'CPU', fmtCpu], ['memory_used_mb', 'Memory used', fmtMem],
  ['memory_total_mb', 'Total memory', fmtMem], ['active_sessions', 'Active sessions'], ['active_processes', 'Active processes'], ['daemon_pid', 'Daemon PID']];
const SETTINGS = [...SAMPLE, ['node_source', 'Node ID source'], ['capture', 'Capture'], ['ingestion', 'Ingestion'],
  ['retention_days', 'Retention (days)'], ['content_retention_days', 'Content retention (days)']];
const SESSION = [NODE, ['session_id', 'Session ID'], ['tool', 'Tool'], ['model', 'Model'],
  ['started_at', 'Started', time], ['ended_at', 'Ended', time]];
const CLEAR_DETAIL = { session_id: null, agent: null, tab: null, session: null, show: null };

function ReportTable({ title, columns, rows, links }) {
  return html`<section class="bd-healthcard bd-reporttable"><h2>${title}</h2>
    ${rows.length ? html`<div class="bd-healthtable-wrap" tabindex="0" role="region" aria-label=${title}>
      <table aria-label=${title}><thead><tr>${columns.map(([key, label]) => html`<th key=${key} scope="col">${label}</th>`)}</tr></thead>
      <tbody>${rows.map(r => html`<tr key=${JSON.stringify([r.node_id, r.session_id])}>${columns.map(([key, , fmt = text]) => {
        const val = links?.[key] ? links[key](r) : fmt(r[key]);
        return key === 'node_id' ? html`<th key=${key} scope="row">${val}</th>` : html`<td key=${key}>${val}</td>`;
      })}</tr>`)}</tbody></table>
    </div>` : html`<p>No records were reported for this scope.</p>`}
  </section>`;
}

function Report({ view, data, links }) {
  if (view === 'overview') return html`<section class="bd-healthcard"><h2>Usage totals</h2>
    <${Stats} stats=${METRICS.map(([k, label, fmt]) => ({ label, value: fmt(data.totals?.[k]) }))}/></section>
    <${ReportTable} title="Usage by node" columns=${[NODE, ...METRICS]} rows=${data.rows} links=${links}/>
    <${ReportTable} title="Sessions" columns=${SESSION} rows=${data.sessions} links=${links}/>`;
  if (view === 'session') {
    const r = data.rows[0];
    if (!r) return html`<p>No session was reported with this ID on this node.</p>`;
    return html`<section class="bd-healthcard"><h2>Session record</h2>
      <dl class="bd-reportfields">${[...SESSION, ['request_count', 'Requests', fmtN], ...METRICS.slice(2), ['project_path', 'Reported project path']]
        .map(([k, label, fmt = text]) => html`<div key=${k}><dt>${label}</dt><dd>${fmt(r[k])}</dd></div>`)}</dl></section>`;
  }
  if (view === 'settings') return html`<${ReportTable} title="Reported settings" columns=${SETTINGS} rows=${data.rows} links=${links}/>`;
  const shared = data.shared_kusto?.scope === 'shared' ? data.shared_kusto : null;
  return html`<${ReportTable} title="Reported node runtime" columns=${HEALTH} rows=${data.rows} links=${links}/>
    <section class="bd-healthcard" aria-labelledby="shared-kusto-title"><h2 id="shared-kusto-title">Shared Kusto store</h2>
      ${shared ? html`<dl class="bd-reportfields"><div><dt>Cluster</dt><dd>${text(shared.cluster)}</dd></div>
        <div><dt>Database</dt><dd>${text(shared.database)}</dd></div>
        <div><dt>Total ingestion slots</dt><dd>${text(shared.capacity_total)}</dd></div>
        <div><dt>Available ingestion slots</dt><dd>${text(shared.capacity_available)}</dd></div>
        <div><dt>Capacity last checked</dt><dd>${time(shared.capacity_checked_at)}</dd></div>
        <div><dt>Capacity status</dt><dd>${text(shared.capacity_status)}</dd></div></dl>
        <p>Ingestion capacity is shared across the cluster. It does not measure an individual node’s health.</p>`
        : html`<p>No shared store was reported.</p>`}
    </section>`;
}

function reportError(error) {
  if (error.status === 409) return 'This history is unavailable. Fleet reports require a shared Kusto store with queryable history.';
  if (error.status === 404) return 'The requested report was not found on this node or the server does not support node views.';
  if (error.status === 400) return 'The server rejected this request. Check the node ID, session ID and time range.';
  return error.status ? `The server could not read this report (HTTP ${error.status}).` : error.message;
}

export default function ReportedBoard({ scope, nodeId, search, screen, picker, navigate, resolvedTheme }) {
  const params = new URLSearchParams(search);
  const sessionId = screen === 'board' && (params.get('session_id') || params.get('agent')) || null;
  const view = screen === 'board' ? sessionId ? 'session' : 'overview' : screen;
  const { range, sel } = parseFilters(search);
  const [revision, setRevision] = useState(0);
  const [custom, setCustom] = useState(false);
  const win = view === 'overview' ? sel || windowOf(range) : {};
  const request = { view, scope, nodeId, sessionId, since: win.since, until: win.until };
  const { data, error } = useNodeView(request, revision);
  const link = (patch, label, attrs = {}) => html`<a ...${attrs} href=${mergeSearch(search, patch) || window.location.pathname}
    onClick=${e => {
      if (e.button || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      e.preventDefault(); setCustom(false); navigate(patch);
    }}>${label}</a>`;
  const named = (r, sid) => ({ ...CLEAR_DETAIL, scope: 'node', node_id: r.node_id, session_id: sid || null });
  const links = {
    node_id: r => scope === 'node' ? r.node_id : link(named(r), r.node_id, { class: 'bd-link' }),
    session_id: r => link(named(r, r.session_id), r.session_id, { class: 'bd-link', 'aria-label': `Session ${r.session_id} on ${r.node_id}` }),
  };
  const setRange = r => { setCustom(false); navigate({ ...rangeToParams(r.id === DEFAULT_RANGE ? null : r), sel: null }); };
  return html`<div class="bd-app" data-theme=${resolvedTheme}>
    <aside class="bd-rail" aria-label="Sections"><div class="bd-brandrow"><span class="bd-brand-t">aictl</span></div>
      <nav class="bd-railnav" aria-label="Sections of this screen">${SCREENS.map(([id, label, icon]) =>
        link({ ...CLEAR_DETAIL, screen: id === 'board' ? null : id }, html`<${Ico} d=${icon}/><b>${label}</b>`,
          { key: id, class: 'bd-navi', 'aria-current': id === screen ? 'page' : undefined }))}</nav>
    </aside>
    <div class="bd-main"><div class="bd-bar" role="region" aria-label="Report controls">${picker}
      ${view === 'overview' && html`<${BoardRange} range=${range} open=${custom} onToggle=${() => setCustom(v => !v)} onClose=${() => setCustom(false)}
        onRange=${id => setRange({ id })} onCustom=${(since, until) => setRange({ id: 'custom', since, until })}/>`}
      <button class="bd-ctl" type="button" onClick=${() => setRevision(n => n + 1)}>Refresh report</button>
    </div><main class="bd-area" id="main-area" aria-label=${TITLES[view]}>
      <div class="bd-healthoverview"><header class="bd-healthheader"><div><h1>${TITLES[view]}</h1>
        <span>${scopeLabel(scope, nodeId)} · Read-only</span></div>
        <div>${NOTES[view]}</div>
        ${view === 'overview' && html`<div class="bd-muted">From ${time(win.since)} to ${time(win.until)} (local time)</div>`}
        ${view === 'session' && link(CLEAR_DETAIL, 'Back to node overview', { class: 'bd-link' })}
      </header>
      ${error ? html`<p class="bd-banner" role="alert">${reportError(error)}</p>`
        : !data ? html`<p class="bd-sk" role="status">Loading report…</p>`
        : !data.fleet_available && (scope === 'fleet' || nodeId !== data.local_node?.node_id)
          ? html`<p class="bd-banner" role="status">Fleet history requires a shared Kusto store.</p>`
          : html`<${Report} view=${view} data=${data} links=${links}/>
            ${data.truncated && html`<p role="status">Only part of the list is shown.${view === 'overview' && ' Totals include all matching sessions.'}</p>`}
            <p class="bd-muted">Report generated: ${time(data.generated_at)} · <a class="bd-link" href=${boardNodePath(request)}>View report JSON</a></p>`}
      </div>
    </main></div>
  </div>`;
}
