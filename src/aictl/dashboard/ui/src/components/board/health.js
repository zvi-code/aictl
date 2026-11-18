import { html } from 'htm/preact';
import { ago, fmtBps, fmtBytes, fmtMs, fmtN, NA, stamp } from './format.js';
import { STALE_AFTER_S } from './summary.js';
import { clientState, ingesterState, measuredValue, measurementState, operationFailing, otelConfig, pollSuccess, qualityContext, writeWarning } from './healthModel.js';
import Table from './Table.js';

export function healthStatus(data, error, nowS = Date.now() / 1000) {
  if (!data) return error ? { label: 'Unavailable', cls: 'crit', issues: ['Could not read live health.'] }
    : { label: 'Unknown', cls: 'warn', issues: [], pending: ['Waiting for live health.'] };
  const pipe = data.pipeline;
  const store = data.store;
  const severe = [], warnings = [], pending = [];
  const add = (text, critical = false) => (critical ? severe : warnings).push(text);
  if (error) add('Could not update health; showing the last response.', true);
  if (!data.generated_at) add('The server does not report a health timestamp.');
  else if (nowS - data.generated_at > STALE_AFTER_S) add('Health response is stale.');
  if (pipe.stream.snapshot_age_s > STALE_AFTER_S) add('Collector snapshot is stale.');
  const write = writeWarning(pipe.self.writes, store.kind);
  if (write) add(write);
  if (pipe.sink?.flood) add('Flood protection is dropping collector samples.', true);
  const state = clientState(store);
  const failures = storeOperations(store).filter(([, op]) => operationFailing(op));
  for (const [label, op] of failures) add(`${label}: ${op.last_error || 'last request failed'}`, true);
  if (state === 'degraded' && (!failures.length || store.health.last_error && !failures.some(([, op]) => op.last_error === store.health.last_error))) {
    add('Store client: ' + (store.health.last_error || 'degraded'), true);
  } else if (state !== 'degraded' && state !== 'ok') pending.push('Store client: ' + state + '.');
  for (const [label, metric] of [['Stored volume', store.volume], ['Cluster ingestion capacity', store.ingestion_capacity], ['Kusto ingestion policies', store.ingestion_details?.policies]]) {
    if (metric?.last_error || ['stale', 'error'].includes(metric?.status)) add(`${label}: ${metric.last_error || metric.status}.`);
    else if (metric?.status === 'pending') pending.push(`${label}: measurement pending.`);
    else if (store.kind === 'kusto' && measurementState(metric) === 'not reported') pending.push(`${label}: measurement status not reported.`);
  }
  for (const collector of data.monitor.collectors) {
    if (!['active', 'ok'].includes(collector.status)) add(`${collector.name}: ${collector.status || 'unknown'}` + (collector.detail ? ` — ${collector.detail}` : ''), ['failed', 'error'].includes(collector.status));
  }
  for (const ingester of pipe.ingesters) {
    const { status, cls } = ingesterState(ingester);
    if (cls) add(`${ingester.name}: ${status}` + (ingester.error ? ` — ${ingester.error}` : ''), cls === 'crit');
    else if (status !== 'off' && !ingester.last_ok) pending.push(`${ingester.name}: ${pollSuccess(ingester, nowS)}.`);
  }
  for (const tool of Object.keys(pipe.otel_setup || {})) {
    const config = otelConfig(pipe, tool, nowS);
    if (config?.warning) add(`${tool}: ${config.detail}`);
  }
  const otel = pipe.otel_receiver;
  if (otel?.active === false) add('OTel receiver has no traffic in the last 5 min.');
  for (const q of pipe.data_quality) {
    if (!['warning', 'error'].includes(q.severity) || qualityContext(q, pipe.ingesters)) continue;
    if (pipe.ingesters.some(i => q.component === `ingester:${i.name}` && q.status === i.status && i.error && i.error === (q.error || q.text)
      && (q.severity === 'warning' || ingesterState(i).cls === 'crit'))) continue;
    add(`${q.component || 'Data quality'}: ${q.text || q.error || q.status || q.severity}`, q.severity === 'error');
  }
  if (!data.monitor.collectors.length && !pipe.ingesters.some(i => i.status !== 'off') && otel?.active == null) pending.push('No active collection health is reported.');
  const issues = [...new Set([...severe, ...warnings])];
  return { label: severe.length ? 'Degraded' : issues.length ? 'Needs attention' : pending.length ? 'Not ready' : 'OK', cls: severe.length ? 'crit' : issues.length || pending.length ? 'warn' : 'good', issues, pending };
}

/** Source names come from live health; querying session history is not required. */
export function healthSources(health) {
  const pipe = health.pipeline;
  const byTool = new Map(health.monitor.per_tool.map(t => [t.tool, t]));
  for (const f of pipe.freshness) byTool.set(f.tool, { ...byTool.get(f.tool), ...f, last_seen: Math.max(f.last_seen || 0, byTool.get(f.tool)?.last_seen || 0) });
  for (const tool of [...Object.keys(pipe.hooks), ...Object.keys(pipe.otel_receiver?.by_tool || {}), ...Object.keys(pipe.otel_setup || {})]) {
    if (!byTool.has(tool)) byTool.set(tool, { tool });
  }
  return [...byTool.values()].map(t => ({
    tool: t.tool, label: t.label, data_from: t.source,
    last_data_ts: Math.max(t.last_seen || 0, pipe.hooks[t.tool]?.last_fire_ts || 0, pipe.otel_receiver?.by_tool?.[t.tool]?.last_at || 0) || null,
  }));
}

const perSecond = value => value == null ? NA : value.toLocaleString('en-US', { maximumFractionDigits: 2 }) + '/s';
const safeUrl = value => { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; } catch { return null; } };

export function trafficGroupTable(store) {
  const groups = Array.isArray(store.traffic_groups) ? store.traffic_groups : [];
  return {
    key: 'health-traffic-groups',
    cols: [
      { k: 'group', l: 'Table group', w: '190px' }, { k: 'modes', l: 'Mode(s)', w: '130px' },
      { k: 'requestRate', l: 'Requests/s', n: true }, { k: 'rowRate', l: 'Rows/s', n: true }, { k: 'byteRate', l: 'Bytes/s', n: true },
      { k: 'requests', l: 'Requests', n: true }, { k: 'rows', l: 'Rows', n: true }, { k: 'bytes', l: 'Bytes', n: true },
      { k: 'failed', l: 'Failures (total)', n: true }, { k: 'pending', l: 'Pending rows', n: true },
    ],
    rows: groups.map((group, index) => {
      const tables = Array.isArray(group.tables) ? group.tables : [];
      const modes = Array.isArray(group.ingestion_modes) ? group.ingestion_modes : [];
      return {
        id: group.id || index,
        sort: { group: group.label || group.id, modes: modes.join(', '), requestRate: group.rate_per_s, rowRate: group.rows_per_s, byteRate: group.bytes_per_s, requests: group.requests, rows: group.rows, bytes: group.bytes, failed: group.failed, pending: group.pending },
        cells: {
          group: { v: group.label || group.id || NA, sub: tables.length ? tables.length + (tables.length === 1 ? ' table' : ' tables') : null, title: [group.measurement_scope, tables.length ? tables.join('\n') : 'Table membership not reported'].filter(Boolean).join('\n') },
          modes: { v: modes.length ? modes.join(', ') : NA },
          requestRate: { v: perSecond(group.rate_per_s) }, rowRate: { v: perSecond(group.rows_per_s) }, byteRate: { v: fmtBps(group.bytes_per_s) },
          requests: { v: fmtN(group.requests) }, rows: { v: fmtN(group.rows) }, bytes: { v: fmtBytes(group.bytes) },
          failed: { v: fmtN(group.failed) },
          pending: { v: fmtN(group.pending), title: 'Pending rows reported for this group; not a queryability check' },
        },
      };
    }),
    none: 'Traffic by table group is not reported by this daemon.',
  };
}

export function ingestionDetailsTable(details, stage = 'all') {
  const rows = [];
  const add = (scope, setting, value, title) => rows.push({
    id: scope + ':' + setting, sort: {},
    cells: { scope: { v: scope }, setting: { v: setting }, value: { v: value ?? NA, title: title || String(value ?? NA) } },
  });
  if (details) {
    const policy = details.policies || {};
    const batching = policy.batching || {};
    const streaming = policy.streaming || {};
    const limits = details.client_limits || {};
    const batches = details.batches || {};
    add('Client routing', 'Current mode', details.mode);
    add('Client routing', 'Default mode', details.default_mode);
    for (const [table, mode] of Object.entries(details.table_overrides || {}).sort(([a], [b]) => a.localeCompare(b))) add('Client table mode override', table, mode);
    add('Database queued batching policy', 'Maximum batching time', batching.MaximumBatchingTimeSpan);
    add('Database queued batching policy', 'Maximum items', fmtN(batching.MaximumNumberOfItems));
    add('Database queued batching policy', 'Maximum raw size (MB)', batching.MaximumRawDataSizeMB);
    add('Database streaming policy', 'Streaming enabled', streaming.IsEnabled == null ? NA : streaming.IsEnabled ? 'Enabled' : 'Disabled');
    add('Database streaming policy', 'HintAllocatedRate (raw)', streaming.HintAllocatedRate);
    for (const [key, label] of [['inline_max_bytes', 'Inline payload limit'], ['streaming_max_bytes', 'Streaming payload limit'], ['queued_max_bytes', 'Queued payload limit'], ['otel_max_pending_bytes', 'OTel pending-byte limit']]) {
      add('Client limits', label, fmtBytes(limits[key]), limits[key] == null ? 'Not reported' : limits[key] + ' bytes');
    }
    add('Client limits', 'Queued pending-row limit', fmtN(limits.queued_pending_rows));
    add('Client limits', 'OTel linger time (s)', limits.otel_linger_s);
    add('Acknowledged client uploads', 'Successful requests', fmtN(batches.successful_requests));
    add('Acknowledged client uploads', 'Average rows per request', batches.avg_rows == null ? NA : batches.avg_rows.toLocaleString('en-US', { maximumFractionDigits: 2 }));
    add('Acknowledged client uploads', 'Average bytes per request', fmtBytes(batches.avg_bytes), batches.avg_bytes == null ? 'Not reported' : batches.avg_bytes + ' bytes');
    add('Acknowledged client uploads', 'Last request rows', fmtN(batches.last_rows));
    add('Acknowledged client uploads', 'Last request bytes', fmtBytes(batches.last_bytes), batches.last_bytes == null ? 'Not reported' : batches.last_bytes + ' bytes');
  }
  return {
    key: 'health-ingestion-details',
    cols: [{ k: 'scope', l: 'Scope', w: '240px' }, { k: 'setting', l: 'Setting', w: '270px' }, { k: 'value', l: 'Reported value' }],
    rows: rows.filter(row => {
      if (stage === 'all') return true;
      const { scope, setting, value } = row.cells;
      if (scope.v === 'Acknowledged client uploads') return false;
      if (stage === 'queued') return scope.v === 'Database queued batching policy'
        || (scope.v === 'Client limits' && setting.v.startsWith('Queued'))
        || scope.v === 'Client routing'
        || (scope.v === 'Client table mode override' && value.v === 'queued');
      return scope.v === 'Database streaming policy'
        || (scope.v === 'Client limits' && /^(Inline|Streaming)/.test(setting.v))
        || (scope.v === 'Client table mode override' && ['streaming', 'inline'].includes(value.v));
    }),
    none: 'Ingestion configuration and batch sizes are not reported by this daemon.',
  };
}

const metricTable = (key, metrics) => ({
  key,
  cols: [{ k: 'metric', l: 'Metric', w: '270px' }, { k: 'value', l: 'Reported value' }],
  rows: metrics.map(([label, value, title, cls]) => ({
    id: label, sort: {},
    cells: { metric: { v: label }, value: { v: value ?? NA, title: title || String(value ?? NA), cls } },
  })),
});

export function modeTrafficTable(store, modes) {
  const table = trafficGroupTable({
    traffic_groups: modes.map(mode => {
      const metrics = store.ingestion_traffic?.[mode];
      return { ...(metrics || {}), id: mode, label: mode, ingestion_modes: [mode], requests: metrics?.requests ?? metrics?.total, pending: mode === 'queued' ? metrics?.pending_history_rows : null };
    }),
  });
  return { ...table, key: 'health-mode-' + modes.join('-'), cols: table.cols.filter(col => col.k !== 'modes').map(col => col.k === 'group' ? { ...col, l: 'Physical ingest mode' } : col) };
}

export function modeGroupTable(store, modes) {
  const groups = modes.flatMap(mode => {
    const reported = store.ingestion_traffic?.[mode]?.groups;
    return (Array.isArray(reported) ? reported : []).map(group => ({ ...group, id: mode + ':' + group.id, ingestion_modes: [mode] }));
  });
  return { ...trafficGroupTable({ traffic_groups: groups }), key: 'health-mode-groups-' + modes.join('-'), none: 'Per-mode table-group traffic is not reported. Mixed-mode totals are not substituted.' };
}

function batchTable(store, modes) {
  return {
    key: 'health-batches-' + modes.join('-'),
    cols: [{ k: 'mode', l: 'Physical ingest mode' }, { k: 'requests', l: 'Acknowledged requests', n: true }, { k: 'avgRows', l: 'Average rows/upload', n: true }, { k: 'avgBytes', l: 'Average bytes/upload', n: true }, { k: 'lastRows', l: 'Last upload rows', n: true }, { k: 'lastBytes', l: 'Last upload bytes', n: true }],
    rows: modes.map(mode => {
      const metrics = store.ingestion_traffic?.[mode];
      return {
        id: mode, sort: {},
        cells: {
          mode: { v: mode }, requests: { v: fmtN(metrics?.successful_requests) },
          avgRows: { v: metrics?.avg_rows == null ? NA : metrics.avg_rows.toLocaleString('en-US', { maximumFractionDigits: 2 }) },
          avgBytes: { v: fmtBytes(metrics?.avg_bytes) }, lastRows: { v: fmtN(metrics?.last_rows) }, lastBytes: { v: fmtBytes(metrics?.last_bytes) },
        },
      };
    }),
  };
}

function PolicyStatus({ policy, nowS, showError = false }) {
  return html`<div class="bd-note">Database policy read: ${policy?.status || 'unavailable'}.
    Last checked: ${ago(policy?.checked_at, nowS)} (${stamp(policy?.checked_at, true)}).
    ${policy?.age_s != null ? 'Cache age: ' + policy.age_s + ' s.' : ''}
    ${policy?.attempted_at ? 'Last attempt: ' + stamp(policy.attempted_at, true) + '.' : ''}
  </div>
  ${showError && policy?.last_error ? html`<div class="bd-pbanner" role="alert">Could not read ingestion policies: ${policy.last_error}. ${policy.checked_at ? 'Showing cached policy values.' : 'No policy values are available.'}</div>` : null}`;
}

function storeOperations(store) {
  const http = ['sqlite', 'memory'].includes(store.kind);
  return [[http ? 'Daemon HTTP GET' : 'Read requests', store.reads], [http ? 'Daemon HTTP POST' : 'Write requests', store.writes],
    ...(store.kind === 'kusto' || store.commands ? [['Management requests', store.commands]] : [])];
}

function requestTable(store, nowS) {
  return {
    key: 'health-client-requests',
    cols: [{ k: 'kind', l: 'Client operation' }, { k: 'total', l: 'Requests', n: true }, { k: 'rate', l: 'Requests/s', n: true }, { k: 'active', l: 'In flight', n: true }, { k: 'failed', l: 'Failures (total)', n: true }, { k: 'latency', l: 'Average', n: true }, { k: 'success', l: 'Last success' }, { k: 'error', l: 'Last error' }],
    rows: storeOperations(store).map(([label, op]) => ({
      id: label, sort: {},
      cells: {
        kind: { v: label }, total: { v: fmtN(op?.total) }, rate: { v: perSecond(op?.rate_per_s) },
        active: { v: fmtN(op?.in_flight) }, failed: { v: fmtN(op?.failed) },
        latency: { v: fmtMs(op?.avg_ms) }, success: { v: op?.last_success_at === null ? 'No success yet' : op?.last_success_at ? ago(op.last_success_at, nowS) : NA, title: stamp(op?.last_success_at, true) },
        error: { v: op?.last_error || (op?.last_error === null ? 'None reported' : NA), sub: op?.last_error_at ? ago(op.last_error_at, nowS) : null, cls: operationFailing(op) ? 'crit' : 'dim' },
      },
    })),
  };
}

function storeLinks(store) {
  const cluster = safeUrl(store.cluster_url);
  const explorer = cluster && store.database ? cluster.replace(/\/$/, '') + '/' + encodeURIComponent(store.database) + '?web=1' : null;
  return cluster ? [
    { label: 'Open Kusto cluster', href: cluster },
    ...(explorer ? [
      { label: 'Open Kusto Explorer', href: explorer },
      { label: 'Cluster capacity query', href: explorer + '&query=' + encodeURIComponent('.show capacity ingestions') + '&autorun=false' },
    ] : []),
  ] : [];
}

function StoreDetails({ store, pipeline, nowS, links }) {
  const policy = store.ingestion_details?.policies;
  const queued = store.ingestion_traffic?.queued;
  const showPolicies = store.kind === 'kusto' || store.ingestion_details;
  const clientHealth = store.health || {};
  const capacity = store.ingestion_capacity;
  const volume = store.volume;
  const state = clientState(store);
  const input = metricTable('health-collection-input', [
    ['Collector samples received', fmtN(pipeline?.sink?.emitted), 'Received by this daemon; not rows stored'],
    ['Collector samples buffered', fmtN(pipeline?.sink?.buffered)],
    ['Raw OTel rows awaiting local flush', fmtN(store.otel_sink?.pending_rows), 'Local input queue, before an ingestion request'],
    ['Raw OTel bytes awaiting local flush', fmtBytes(store.otel_sink?.pending_bytes)],
  ]);
  const queried = metricTable('health-queryable-store', [
    ['Destination', store.destination],
    ['Client health', state, clientHealth.scope, state === 'degraded' ? 'crit' : state === 'ok' ? '' : 'warn'],
    ['Client checked', stamp(clientHealth.checked_at, true)],
    ['Client last success', clientHealth.last_success_at === null ? 'No success yet' : stamp(clientHealth.last_success_at, true)],
    ['Stored rows (cached)', fmtN(measuredValue(volume, 'rows'))],
    ['Stored request rows (cached)', fmtN(measuredValue(volume, 'tables')?.requests), 'Rows in the requests history table, not events counted by the OTel receiver'],
    ['Stored bytes (cached)', fmtBytes(measuredValue(volume, 'bytes'))],
    ['Volume scope', volume?.scope],
    ['Volume status', measurementState(volume)],
    ['Last successful scan started', stamp(volume?.started_at, true)],
    ['Last successful scan finished', stamp(volume?.checked_at, true)],
    ['Last scan attempted', stamp(volume?.attempted_at, true)],
    ...(volume?.last_error ? [['Volume read error', volume.last_error, null, 'warn']] : []),
  ]);
  return html`<section aria-label="Collection / input details">
    <h2 class="bd-note">1. Collection / input — received and local buffers</h2>
    <${Table} def=${input} label="Collection input and local queues"/>
    <div class="bd-note"><a class="bd-link" href="#p-self">Collection and ingestion counters</a> · <a class="bd-link" href="#p-sources">Source health</a>. Samples and raw OTel rows are separate units; a local buffer is not DM pending data.</div>
  </section>
  <section aria-label="Queued ingestion / DM details">
    <h2 class="bd-note">2. Queued ingestion / DM — not confirmed queryable</h2>
    <div class="bd-note">Historical acknowledgements are submissions to queued ingestion, not a current count of unqueryable rows. Some may already be queryable.</div>
    <${Table} def=${modeTrafficTable(store, ['queued'])} label="Queued / DM client traffic — not confirmed queryable"/>
    <${Table} def=${metricTable('health-dm-pending', [
      ['Tracked history receipt rows awaiting visibility confirmation', fmtN(queued?.pending_history_rows), queued?.pending_scope || 'Only tracked history receipts; raw OTel post-submission visibility is not tracked'],
      ['Cluster ingestion slots', fmtN(measuredValue(capacity, 'total'))],
      ['Slots in use', fmtN(measuredValue(capacity, 'in_use'))], ['Slots available', fmtN(measuredValue(capacity, 'available'))],
      ['Capacity scope', capacity?.scope || store.capacity_scope],
      ['Capacity status', measurementState(capacity)], ['Capacity last measured', stamp(capacity?.checked_at, true)],
      ...(capacity?.last_error ? [['Capacity read error', capacity.last_error, null, 'warn']] : []),
    ])} label="Queued history receipts and ingestion capacity"/>
    <div class="bd-note">${queued?.pending_scope || 'Pending history receipts exclude untracked raw OTel visibility. Raw OTel local input queues are shown in Collection / input.'}</div>
    <${Table} def=${batchTable(store, ['queued'])} label="Queued acknowledged client uploads — not server-merged batches"/>
    <${Table} def=${modeGroupTable(store, ['queued'])} label="Queued / DM traffic by table group"/>
    ${showPolicies ? html`<${PolicyStatus} policy=${policy} nowS=${nowS} showError=${true}/><${Table} def=${ingestionDetailsTable(store.ingestion_details, 'queued')} label="Queued / DM batching policy and client limits"/>` : null}
    <div class="bd-note">Database batching policy is cached, not a per-table policy inspection. Observed uploads are not server-merged queued batches. Capacity and limits are not measured throughput.</div>
  </section>
  <section aria-label="Engine ingestion details">
    <h2 class="bd-note">3. Engine ingestion — streaming and inline traffic</h2>
    <div class="bd-note">These are physical client ingestion requests and acknowledged payloads, not stored-row counts.</div>
    <${Table} def=${modeTrafficTable(store, ['streaming', 'inline'])} label="Engine streaming and inline client traffic"/>
    <${Table} def=${batchTable(store, ['streaming', 'inline'])} label="Engine acknowledged client upload sizes"/>
    <${Table} def=${modeGroupTable(store, ['streaming', 'inline'])} label="Engine ingestion traffic by table group"/>
    ${showPolicies ? html`<${PolicyStatus} policy=${policy} nowS=${nowS}/><${Table} def=${ingestionDetailsTable(store.ingestion_details, 'engine')} label="Engine streaming policy and client limits"/>` : null}
    <div class="bd-note">Table overrides are client routing choices, not reported per-table Kusto policies.</div>
  </section>
  <section aria-label="Queryable store / reads details">
    <h2 class="bd-note">4. Queryable store / reads</h2>
    <${Table} def=${queried} label="Queryable store — cached stored volume and client health"/>
    <${Table} def=${requestTable(store, nowS)} label="Client requests since daemon start"/>
    <div class="bd-note">${store.measurement_scope || ''} ${store.commands_scope || ''}</div>
    <div class="bd-note">Stored volume is a cached observation at its check time. It does not confirm the visibility of every acknowledged ingestion request.</div>
    ${links.length ? html`<div class="bd-acts">${links.map(link => html`<a key=${link.label} class="bd-btn" href=${link.href}>${link.label}</a>`)}</div>` : null}
  </section>`;
}

const GROUPS = [
  ['otel', 'OTel'], ['hooks', 'Hooks'], ['live-session', 'Live sessions'],
  ['monitoring', 'Monitoring'], ['files-config', 'Files / configuration'], ['other', 'Other'],
];
const MODES = ['queued', 'streaming', 'inline'];

export function healthTrafficGroups(store) {
  const groups = new Map(GROUPS.map(([id, label]) => [id, { id, label, modes: {} }]));
  for (const mode of MODES) {
    const reported = store.ingestion_traffic?.[mode]?.groups;
    for (const group of Array.isArray(reported) ? reported : []) {
      if (!groups.has(group.id)) groups.set(group.id, { id: group.id, label: group.label || group.id, modes: {} });
      groups.get(group.id).modes[mode] = group;
    }
  }
  return [...groups.values()];
}

function Metrics({ items }) {
  return html`<dl class="bd-healthmetrics">${items.map(([label, value, title, cls]) => html`<div key=${label} title=${title || undefined}>
    <dt>${label}</dt><dd class=${cls ? 'bd-' + cls : undefined}>${value ?? NA}</dd>
  </div>`)}</dl>`;
}

function StageCards({ store, pipeline, nowS }) {
  const queued = store.ingestion_traffic?.queued;
  const streaming = store.ingestion_traffic?.streaming;
  const inline = store.ingestion_traffic?.inline;
  const state = clientState(store);
  const volume = store.volume;
  const capacity = store.ingestion_capacity;
  return html`<div class="bd-healthstages" id="health-stages">
    <section class="bd-healthcard" aria-label="Collection / input" data-stage="collection">
      <h2><span>1</span> Collection / input</h2>
      <${Metrics} items=${[
        ['Samples buffered', fmtN(pipeline?.sink?.buffered)],
        ['Drops since start', fmtN(pipeline?.sink?.dropped), null, pipeline?.sink?.flood ? 'crit' : null],
        ['OTel rows buffered', fmtN(store.otel_sink?.pending_rows), 'Local input queue; not DM pending data'],
        ['OTel bytes buffered', fmtBytes(store.otel_sink?.pending_bytes)],
      ]}/>
      <p>Local buffers · samples and rows are separate units.</p>
    </section>
    <section class="bd-healthcard" aria-label="Queued ingestion / DM — not confirmed queryable" data-stage="queued">
      <h2><span>2</span> Queued DM</h2>
      <${Metrics} items=${[
        ['Rows/s submitted', perSecond(queued?.rows_per_s)],
        ['Bytes/s submitted', fmtBps(queued?.bytes_per_s)],
        ['History pending rows', fmtN(queued?.pending_history_rows), queued?.pending_scope],
        ['Failures since start', fmtN(queued?.failed), queued?.last_error, operationFailing(queued) ? 'crit' : null],
      ]}/>
      <p>Not confirmed queryable. Some may already be queryable.</p>
      ${capacity ? html`<p>Cluster slots (${measurementState(capacity)}): ${fmtN(measuredValue(capacity, 'in_use'))} in use · ${fmtN(measuredValue(capacity, 'available'))} available · ${fmtN(measuredValue(capacity, 'total'))} total.</p>` : null}
    </section>
    <section class="bd-healthcard" aria-label="Engine ingestion" data-stage="engine">
      <h2><span>3</span> Engine ingestion</h2>
      <${Metrics} items=${[
        ['Streaming rows/s', perSecond(streaming?.rows_per_s)],
        ['Inline rows/s', perSecond(inline?.rows_per_s)],
        ['Streaming failures (total)', fmtN(streaming?.failed), streaming?.last_error, operationFailing(streaming) ? 'crit' : null],
        ['Inline failures (total)', fmtN(inline?.failed), inline?.last_error, operationFailing(inline) ? 'crit' : null],
      ]}/>
      <p>Streaming + inline client traffic · not stored rows.</p>
    </section>
    <section class="bd-healthcard" aria-label="Queryable store / reads" data-stage="store">
      <h2><span>4</span> Queryable store / reads</h2>
      <${Metrics} items=${[
        ['Client availability', state, store.health?.scope || 'aictl client, not whole-cluster health', state === 'degraded' ? 'crit' : state === 'ok' ? null : 'warn'],
        [['sqlite', 'memory'].includes(store.kind) ? 'HTTP GET/s' : 'Read requests/s', perSecond(store.reads?.rate_per_s)],
        ['Stored rows (cached)', fmtN(measuredValue(volume, 'rows')), volume?.scope],
        ['Failed reads (total)', fmtN(store.reads?.failed), store.reads?.last_error, operationFailing(store.reads) ? 'crit' : null],
      ]}/>
      <p title=${stamp(volume?.checked_at, true)}>Volume: ${measurementState(volume)}${volume?.checked_at ? ' · measured ' + ago(volume.checked_at, nowS) : ''}. Read latency: ${fmtMs(store.reads?.avg_ms)}.</p>
    </section>
  </div>`;
}

function TrafficCell({ metrics }) {
  return html`<span>${perSecond(metrics?.rows_per_s)}</span><small>${fmtBps(metrics?.bytes_per_s)}</small>`;
}

function TrafficMatrix({ store }) {
  return html`<section class="bd-healthcard bd-healthtraffic" aria-label="Destination traffic" id="health-traffic">
    <div class="bd-healthsectionhead"><h2>Destination traffic</h2><span>Client rows/s · bytes/s</span></div>
    <table class="bd-healthmatrix" aria-label="Destination traffic by physical ingestion mode">
      <thead><tr><th scope="col">Table group</th><th scope="col">Queued DM</th><th scope="col">Engine<br/>Streaming</th><th scope="col">Engine<br/>Inline</th><th scope="col">Pending rows<br/>DM / S / I</th><th scope="col">Failures since start<br/>DM / S / I</th></tr></thead>
      <tbody>${healthTrafficGroups(store).map(group => html`<tr key=${group.id} data-group=${group.id}>
        <th scope="row">${group.label}</th>
        ${MODES.map(mode => html`<td key=${mode} data-mode=${mode} data-label=${mode === 'queued' ? 'Queued DM' : 'Engine ' + mode}><${TrafficCell} metrics=${group.modes[mode]}/></td>`)}
        <td data-label="Pending rows (DM / S / I)">${MODES.map(mode => fmtN(group.modes[mode]?.pending)).join(' / ')}</td>
        <td data-label="Failures since start (DM / S / I)">${MODES.map(mode => fmtN(group.modes[mode]?.failed)).join(' / ')}</td>
      </tr>`)}</tbody>
    </table>
    <p>DM ≠ queryable storage. Pending covers local queues and tracked history receipts, not the DM service backlog. S = streaming; I = inline. n/a = not reported.</p>
  </section>`;
}

function Diagnostics({ health, status, nowS }) {
  const pipe = health?.pipeline;
  const collectors = (health?.monitor.collectors || []).map(c => ({ ...c, cls: ['failed', 'error'].includes(c.status) ? 'crit' : ['active', 'ok'].includes(c.status) ? null : 'warn' }));
  const ingesters = (pipe?.ingesters || []).map(i => ({ name: i.name, ...ingesterState(i), detail: [i.status === 'off' ? null : pollSuccess(i, nowS), i.error].filter(Boolean).join('. ') }));
  const sources = pipe ? healthSources(health).map(source => {
    const fresh = pipe.freshness.find(item => item.tool === source.tool);
    const config = otelConfig(pipe, source.tool, nowS);
    const activity = source.last_data_ts ? (nowS - source.last_data_ts > 3600 ? 'no recent activity' : 'active') : 'not observed';
    const toolErrors = fresh?.errors || fresh?.last_error ? `Tool/session errors: ${fmtN(fresh.errors)}` + (fresh.last_error ? ` — ${fresh.last_error}` : '') : null;
    return { name: source.label || source.tool, status: activity, cls: activity === 'no recent activity' ? 'warn' : null, detail: [config?.detail, toolErrors].filter(Boolean).join(' ') };
  }) : [];
  const lists = [['Sources', sources], ['Collectors', collectors], ['Ingesters', ingesters]];
  return html`<aside class="bd-healthcard bd-healthdiagnostics" aria-label="Collection health and issues" id="health-diagnostics">
    <h2>Needs attention <span class="bd-healthcount">${status.issues.length}</span></h2>
    ${status.issues.length ? html`<ul class="bd-healthissues">${status.issues.slice(0, 3).map(issue => html`<li key=${issue}>${issue}</li>`)}</ul>` : !status.pending?.length ? html`<p>No current health issues reported.</p>` : null}
    ${status.issues.length > 3 ? html`<details id="health-all-issues"><summary>All ${status.issues.length} issues</summary><ul class="bd-healthissues">${status.issues.map(issue => html`<li key=${issue}>${issue}</li>`)}</ul></details>` : null}
    ${status.pending?.length ? html`<p>${status.pending.join(' ')}</p>` : null}
    <div class="bd-healthstatuslist">${lists.map(([label, list]) => {
      const sorted = [...list].sort((a, b) => Number(!!b.cls) - Number(!!a.cls));
      const counts = new Map();
      for (const item of sorted) counts.set(item.status || 'unknown', (counts.get(item.status || 'unknown') || 0) + 1);
      return html`<details key=${label} class="bd-healthstatus">
        <summary>${label}<span>${Array.from(counts, ([state, count]) => `${count} ${state}`).join(' · ') || 'Not reported'}</span></summary>
        <ul>${sorted.map(item => html`<li key=${item.name}><b>${item.name}</b> <span class=${item.cls ? 'bd-' + item.cls : undefined}>${item.status || 'unknown'}</span>${item.detail ? html`<small>${item.detail}</small>` : null}</li>`)}</ul>
      </details>`;
    })}</div>
  </aside>`;
}

function StoreStages({ store, pipeline, nowS, links, health, status }) {
  return html`<${StageCards} store=${store} pipeline=${pipeline} nowS=${nowS}/>
    <div class="bd-healthmiddle"><${TrafficMatrix} store=${store}/>
      ${status ? html`<${Diagnostics} health=${health} status=${status} nowS=${nowS}/>` : null}
    </div>
    <details class="bd-healthdetails" id="health-store-details">
      <summary>Store details <span>All totals, request rates, upload sizes, table membership and policies</span></summary>
      <${StoreDetails} store=${store} pipeline=${pipeline} nowS=${nowS} links=${links}/>
      <h2>Reported table membership by mode</h2>
      <ul class="bd-healthmembers">${healthTrafficGroups(store).map(group => html`<li key=${group.id}><b>${group.label}</b>
        <ul>${MODES.map(mode => html`<li key=${mode}>${mode}: ${group.modes[mode]?.tables?.length ? group.modes[mode].tables.join(', ') : NA}</li>`)}</ul>
      </li>`)}</ul>
      <p class="bd-note">${store.measurement_scope || ''} Current aictl client counters, not cluster-wide statistics. No mixed-mode total is substituted for a missing physical-mode measurement.</p>
    </details>`;
}

export function HealthOverview({ health, status, error, nowS, children }) {
  const store = health?.store || {};
  const links = storeLinks(store);
  return html`<section class="bd-healthoverview" id="health-overview" aria-label="Health overview">
    <header class="bd-healthheader">
      <div><h1>aictl Health</h1><strong class=${'bd-' + status.cls} role="status">${status.label}</strong>
        <span title=${stamp(health?.generated_at, true)}>${health?.generated_at ? 'Updated ' + ago(health.generated_at, nowS) : 'No health timestamp'}</span>
      </div>
      <div class="bd-healthdestination"><span>${store.kind || 'Store not reported'} · ${store.cluster_url || store.destination || NA} · ${store.database || NA} · ${store.ingestion_mode || NA}</span>
        <nav aria-label="Store links">${links.map(link => html`<a key=${link.label} class="bd-link" href=${link.href}>${link.label}</a>`)}</nav>
      </div>
    </header>
    ${error ? html`<div class="bd-banner" role="alert">Could not read live health: ${error.status === 404 ? 'this daemon does not provide /api/board/health.' : error.message} ${health ? 'Showing the last response.' : 'Health is unavailable; history is not used as a substitute.'}</div>` : null}
    ${!health && !error && status.label !== 'Unavailable' ? html`<div class="bd-sk" role="status">Loading live health...</div>` : null}
    <${StoreStages} store=${store} pipeline=${health?.pipeline} nowS=${nowS} links=${links} health=${health} status=${status}/>
    ${health ? children : null}
    <p class="bd-healthscope">Client counters reset with this daemon; rates cover up to 60 s. Stored volume covers the selected history tables. Ingestion capacity is cluster-wide. Board filters do not apply.</p>
  </section>`;
}

export function panelStoreHealth(ctx) {
  const store = ctx.data.health?.store || {};
  return {
    sub: [store.kind || 'Store not reported', store.database, store.ingestion_mode].filter(Boolean).join(' · '),
    banner: store.health?.last_error || null,
    view: { C: StoreStages, props: { store, pipeline: ctx.data.health?.pipeline, nowS: ctx.nowS, links: storeLinks(store) } },
    note: [
      store.measurement_scope,
      'Current aictl client counters, not cluster-wide statistics. Rates use the server-reported rolling window (up to 60 s); counters reset with the daemon. n/a means not reported or not applicable. No mixed-mode total is substituted for a missing physical-mode measurement.',
    ].filter(Boolean).join(' '),
  };
}
