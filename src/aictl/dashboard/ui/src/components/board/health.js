import { html } from 'htm/preact';
import { ago, fmtBps, fmtBytes, fmtMs, fmtN, NA, stamp } from './format.js';
import { STALE_AFTER_S } from './summary.js';
import Table from './Table.js';

export function healthStatus(data, error, nowS = Date.now() / 1000) {
  if (!data) return { label: error ? 'Unavailable' : 'Unknown', cls: error ? 'crit' : 'warn', issues: [error ? 'Could not read live health.' : 'Waiting for live health.'] };
  const pipe = data.pipeline;
  const store = data.store;
  const issues = [];
  let critical = false;
  const add = (text, severe = false) => { issues.push(text); critical ||= severe; };
  if (error) add('Could not update health; showing the last response.', true);
  if (!data.generated_at) add('The server does not report a health timestamp.');
  else if (nowS - data.generated_at > STALE_AFTER_S) add('Health response is stale.');
  if (pipe.stream.snapshot_age_s > STALE_AFTER_S) add('Collector snapshot is stale.');
  if ((pipe.self.writes || []).some(w => w.age_s >= 60)) add('A history write has run for over a minute.');
  if (pipe.sink?.flood || pipe.sink?.dropped > 0) add('Collector samples were dropped.', true);
  if (store.health.state === 'degraded' || store.health.last_error) add('Store client reports an error.', true);
  if (store.health.state !== 'ok' && store.health.state !== 'degraded') add('Store client health is not reported.');
  for (const [label, metrics] of [['Read', store.reads], ['Write', store.writes], ['Management', store.commands]]) {
    if (metrics?.last_error || metrics?.failed > 0) add(label + ' requests report failures.', true);
  }
  if (store.ingestion_details?.policies?.last_error) add('Kusto ingestion policies could not be read.');
  for (const collector of data.monitor.collectors) {
    if (!['active', 'ok'].includes(collector.status)) add(collector.name + ': ' + (collector.status || 'unknown'), ['failed', 'error'].includes(collector.status));
  }
  for (const ingester of pipe.ingesters) {
    if (ingester.status !== 'ok') add(ingester.name + ': ' + (ingester.status || 'unknown'), ['failed', 'error'].includes(ingester.status));
  }
  for (const [tool, setup] of Object.entries(pipe.otel_setup || {})) {
    if (setup?.status !== 'ok') add(tool + ': OTel ' + (setup?.status || 'unknown'));
  }
  const otel = pipe.otel_receiver;
  if (otel && !otel.active) add('OTel receiver is inactive or has no recent data.');
  if (otel?.errors > 0 || otel?.dropped > 0 || otel?.api_errors_total > 0) add('OTel reports rejected data or model API errors.');
  if (pipe.data_quality.some(q => q.severity === 'error' || q.severity === 'warning')) add('Data-quality events need attention.');
  if (pipe.freshness.some(f => f.errors > 0 || f.last_error)) add('A source reports errors.');
  if (pipe.freshness.some(f => f.last_seen && nowS - f.last_seen > 3600)) add('A source has not been seen for over an hour.');
  if (!data.monitor.collectors.length && !pipe.ingesters.length && !otel) add('No collection health is reported.');
  return { label: critical ? 'Degraded' : issues.length ? 'Needs attention' : 'OK', cls: critical ? 'crit' : issues.length ? 'warn' : 'good', issues };
}

/** Source names come from live health; querying session history is not required. */
export function healthSources(health) {
  const pipe = health.pipeline;
  const byTool = new Map(health.monitor.per_tool.map(t => [t.tool, t]));
  for (const f of pipe.freshness) byTool.set(f.tool, { ...byTool.get(f.tool), ...f });
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
      { k: 'failed', l: 'Failed', n: true }, { k: 'pending', l: 'Pending rows', n: true },
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
          failed: { v: fmtN(group.failed), cls: group.failed ? 'crit' : 'dim' },
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

function readRequestTable(store, nowS) {
  const reads = store.reads;
  return {
    key: 'health-read-requests',
    cols: [{ k: 'kind', l: 'Client operation' }, { k: 'total', l: 'Requests', n: true }, { k: 'rate', l: 'Requests/s', n: true }, { k: 'active', l: 'In flight', n: true }, { k: 'failed', l: 'Failed', n: true }, { k: 'latency', l: 'Average', n: true }, { k: 'success', l: 'Last success' }, { k: 'error', l: 'Last error' }],
    rows: [{
      id: 'reads', sort: {},
      cells: {
        kind: { v: 'Read queries' }, total: { v: fmtN(reads?.total) }, rate: { v: perSecond(reads?.rate_per_s) },
        active: { v: fmtN(reads?.in_flight) }, failed: { v: fmtN(reads?.failed), cls: reads?.failed ? 'crit' : 'dim' },
        latency: { v: fmtMs(reads?.avg_ms) }, success: { v: ago(reads?.last_success_at, nowS), title: stamp(reads?.last_success_at, true) },
        error: { v: reads?.last_error || (reads ? 'None reported' : NA), cls: reads?.last_error ? 'crit' : 'dim' },
      },
    }],
  };
}

function storeLinks(store) {
  const cluster = safeUrl(store.cluster_url);
  const explorer = cluster && store.database ? cluster.replace(/\/$/, '') + '/' + encodeURIComponent(store.database) + '?web=1' : null;
  return cluster ? [
    { label: 'Open Kusto cluster', href: cluster },
    ...(explorer ? [
      { label: 'Open Kusto Explorer', href: explorer },
      { label: 'Cluster capacity query', href: explorer + '&query=' + encodeURIComponent('.show capacity') + '&autorun=false' },
    ] : []),
  ] : [];
}

function StoreStages({ store, pipeline, nowS, links }) {
  const policy = store.ingestion_details?.policies;
  const queued = store.ingestion_traffic?.queued;
  const showPolicies = store.kind === 'kusto' || store.ingestion_details;
  const clientHealth = store.health || {};
  const capacity = store.ingestion_capacity;
  const input = metricTable('health-collection-input', [
    ['Collector samples received', fmtN(pipeline?.sink?.emitted), 'Received by this daemon; not rows stored'],
    ['Collector samples buffered', fmtN(pipeline?.sink?.buffered)],
    ['Raw OTel rows awaiting local flush', fmtN(store.otel_sink?.pending_rows), 'Local input queue, before an ingestion request'],
    ['Raw OTel bytes awaiting local flush', fmtBytes(store.otel_sink?.pending_bytes)],
  ]);
  const queried = metricTable('health-queryable-store', [
    ['Destination', store.destination],
    ['Client health', clientHealth.state || 'unknown', 'aictl client health, not whole-cluster health', clientHealth.state === 'degraded' ? 'crit' : clientHealth.state === 'ok' ? '' : 'warn'],
    ['Client checked', ago(clientHealth.checked_at, nowS), stamp(clientHealth.checked_at, true)],
    ['Client last success', ago(clientHealth.last_success_at, nowS), stamp(clientHealth.last_success_at, true)],
    ['Stored rows (cached)', fmtN(store.volume?.rows), store.volume?.scope || 'Cached stored-history count, not a current queryability check'],
    ['Stored bytes (cached)', fmtBytes(store.volume?.bytes)],
    ['Stored volume last checked', ago(store.volume?.checked_at, nowS), stamp(store.volume?.checked_at, true)],
  ]);
  return html`<section aria-label="Collection / input">
    <h4 class="bd-note">1. Collection / input — received and local buffers</h4>
    <${Table} def=${input} label="Collection input and local queues"/>
    <div class="bd-note"><a class="bd-link" href="#p-self">Collection and ingestion counters</a> · <a class="bd-link" href="#p-sources">Source health</a>. Samples and raw OTel rows are separate units; a local buffer is not DM pending data.</div>
  </section>
  <section aria-label="Queued ingestion / DM — not confirmed queryable">
    <h4 class="bd-note">2. Queued ingestion / DM — not confirmed queryable</h4>
    <div class="bd-note">Historical acknowledgements are submissions to queued ingestion, not a current count of unqueryable rows. Some may already be queryable.</div>
    <${Table} def=${modeTrafficTable(store, ['queued'])} label="Queued / DM client traffic — not confirmed queryable"/>
    <${Table} def=${metricTable('health-dm-pending', [
      ['Tracked history receipt rows awaiting visibility confirmation', fmtN(queued?.pending_history_rows), queued?.pending_scope || 'Only tracked history receipts; raw OTel post-submission visibility is not tracked'],
      ['Ingestion slots (capacity, not throughput)', fmtN(capacity?.total)],
      ['Slots in use', fmtN(capacity?.in_use)], ['Slots available', fmtN(capacity?.available)],
    ])} label="Queued history receipts and ingestion capacity"/>
    <div class="bd-note">${queued?.pending_scope || 'Pending history receipts exclude untracked raw OTel visibility. Raw OTel local input queues are shown in Collection / input.'}</div>
    <${Table} def=${batchTable(store, ['queued'])} label="Queued acknowledged client uploads — not server-merged batches"/>
    <${Table} def=${modeGroupTable(store, ['queued'])} label="Queued / DM traffic by table group"/>
    ${showPolicies ? html`<${PolicyStatus} policy=${policy} nowS=${nowS} showError=${true}/><${Table} def=${ingestionDetailsTable(store.ingestion_details, 'queued')} label="Queued / DM batching policy and client limits"/>` : null}
    <div class="bd-note">Database batching policy is cached, not a per-table policy inspection. Observed uploads are not server-merged queued batches. Capacity and limits are not measured throughput.</div>
  </section>
  <section aria-label="Engine ingestion">
    <h4 class="bd-note">3. Engine ingestion — streaming and inline traffic</h4>
    <div class="bd-note">These are physical client ingestion requests and acknowledged payloads, not stored-row counts.</div>
    <${Table} def=${modeTrafficTable(store, ['streaming', 'inline'])} label="Engine streaming and inline client traffic"/>
    <${Table} def=${batchTable(store, ['streaming', 'inline'])} label="Engine acknowledged client upload sizes"/>
    <${Table} def=${modeGroupTable(store, ['streaming', 'inline'])} label="Engine ingestion traffic by table group"/>
    ${showPolicies ? html`<${PolicyStatus} policy=${policy} nowS=${nowS}/><${Table} def=${ingestionDetailsTable(store.ingestion_details, 'engine')} label="Engine streaming policy and client limits"/>` : null}
    <div class="bd-note">Table overrides are client routing choices, not reported per-table Kusto policies.</div>
  </section>
  <section aria-label="Queryable store / reads">
    <h4 class="bd-note">4. Queryable store / reads</h4>
    <${Table} def=${queried} label="Queryable store — cached stored volume and client health"/>
    <${Table} def=${readRequestTable(store, nowS)} label="Store read queries"/>
    <div class="bd-note">Stored volume is a cached observation at its check time. It does not confirm the visibility of every acknowledged ingestion request.</div>
    ${links.length ? html`<div class="bd-acts">${links.map(link => html`<a key=${link.label} class="bd-btn" href=${link.href}>${link.label}</a>`)}</div>` : null}
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
