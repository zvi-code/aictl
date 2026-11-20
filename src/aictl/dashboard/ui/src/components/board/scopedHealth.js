import { getBoardNodeView } from '../../api.js';

const modes = ['streaming', 'inline', 'queued'];
const sums = ['total', 'successful_requests', 'failed', 'recent_failures', 'in_flight', 'rate_per_s',
  'rows', 'bytes', 'rows_per_s', 'bytes_per_s', 'requests', 'pending', 'pending_history_rows'];

function sum(rows, field) {
  const values = rows.map(r => r?.[field]).filter(Number.isFinite);
  return values.length ? values.reduce((a, b) => a + b, 0) : null;
}

function combine(rows) {
  const reported = rows.filter(Boolean);
  if (!reported.length) return null;
  if (reported.length === 1) return reported[0];
  const out = Object.fromEntries(sums.map(k => [k, sum(reported, k)]));
  if (out.successful_requests > 0) {
    for (const [field, mean] of [['rows', 'avg_rows'], ['bytes', 'avg_bytes']]) {
      if (reported.every(r => Number.isFinite(r[field]) && Number.isFinite(r.successful_requests)))
        out[mean] = out[field] / out.successful_requests;
    }
  }
  if (reported.every(r => Number.isFinite(r.successful_requests) && Number.isFinite(r.failed)
    && ((!r.successful_requests && !r.failed) || Number.isFinite(r.avg_ms)))) {
    const n = out.successful_requests + out.failed;
    out.avg_ms = n ? reported.reduce((v, r) => v + (r.avg_ms || 0) * (r.successful_requests + r.failed), 0) / n : null;
  }
  // Latency is per completed read, not per host. Older clients did not send the denominator.
  if (reported.every(r => Number.isFinite(r.recent_completed) && (!r.recent_completed || Number.isFinite(r.recent_avg_ms)))) {
    const n = sum(reported, 'recent_completed');
    out.recent_avg_ms = n ? reported.reduce((v, r) => v + (r.recent_avg_ms || 0) * r.recent_completed, 0) / n : null;
  }
  for (const k of ['last_success_at', 'last_error_at']) out[k] = Math.max(0, ...reported.map(r => r[k] || 0)) || null;
  return out;
}

function modeTraffic(stores, mode) {
  const samples = stores.map(s => s.ingestion_traffic?.[mode]).filter(Boolean);
  if (!samples.length) return null;
  const groups = new Map();
  for (const sample of samples) for (const g of sample.groups || []) {
    if (!groups.has(g.id)) groups.set(g.id, []);
    groups.get(g.id).push({ ...g, requests: g.requests ?? g.total });
  }
  return { ...combine(samples), groups: [...groups].map(([id, rows]) => ({ ...combine(rows), id, label: rows[0].label || id })) };
}

function sameStore(report, live) {
  try {
    return live?.store?.kind === 'kusto' && live.store.database === report.shared_kusto?.database
      && new URL(live.store.cluster_url).hostname === report.shared_kusto.cluster;
  } catch { return false; }
}

/** Project only measurements with the requested provenance; an absent node counter is not zero. */
export function scopedHealth(report, localRuntime, supplementError = null) {
  const shared = report.shared_kusto;
  const own = report.local_node?.node_id;
  const live = sameStore(report, localRuntime) ? localRuntime : null;
  const rows = report.rows;
  const liveFor = row => row.node_id === own && live && row.daemon_pid != null && row.daemon_pid === live.pipeline?.self?.pid;
  const samples = rows.flatMap(row => {
    if (liveFor(row)) return [{ id: own, store: live.store, runtime: {
      daemon: live.resources?.daemon, sink: live.pipeline?.sink, otel_receiver: live.pipeline?.otel_receiver,
      collectors: live.monitor?.collectors, ingesters: live.pipeline?.ingesters,
    } }];
    const sample = row.client_sample;
    return row.status === 'reported' && sample?.store && sample.pid === row.daemon_pid
      && sample.at >= report.generated_at - 300 && sample.at <= report.generated_at + 60
      ? [{ id: row.node_id, store: sample.store, runtime: sample.runtime || {} }] : [];
  });
  const contributors = samples.filter(s => s.store.reads || s.store.writes || s.store.ingestion_traffic);
  const namedLocal = report.scope === 'node' && rows.length === 1 && liveFor(rows[0]);
  const provenance = { scope: report.scope, nodeId: report.scope === 'node' ? rows[0]?.node_id : null, localNode: own, servingOnly: !!namedLocal,
    rows: rows.map(r => {
      const host = liveFor(r) ? live.resources?.host : null;
      const at = host?.activity_at;
      const current = Number.isFinite(at) && at >= (r.activity_at ?? r.captured_at ?? 0)
        && at >= report.generated_at - 300 && at <= report.generated_at + 60;
      return { ...r, ...(current ? { active_sessions: host.active_sessions, active_processes: host.active_processes,
        inbound_bps: host.inbound_bps, outbound_bps: host.outbound_bps,
        activity_at: at, status: 'reported' } : {}), daemon: samples.find(s => s.id === r.node_id)?.runtime.daemon };
    }),
    contributors: contributors.map(c => c.id),
    metricNodes: Object.fromEntries([...modes, 'read'].map(m => [m, contributors.filter(c => m === 'read'
      ? Number.isFinite(c.store.reads?.recent_avg_ms) : Number.isFinite(c.store.ingestion_traffic?.[m]?.rows_per_s)).length])),
    truncated: report.truncated, supplementError };
  if (namedLocal) return { ...live, node_report: provenance };

  const stores = contributors.map(c => c.store);
  const reads = combine(stores.map(s => s.reads));
  const writes = combine(stores.map(s => s.writes));
  const commands = combine(stores.map(s => s.commands));
  const traffic = Object.fromEntries(modes.map(mode => [mode, modeTraffic(stores, mode)]).filter(([, m]) => m));
  const capacity = shared && {
    total: shared.capacity_total, available: shared.capacity_available, checked_at: shared.capacity_checked_at,
    status: shared.capacity_status, in_use: Number.isFinite(shared.capacity_total) && Number.isFinite(shared.capacity_available)
      ? shared.capacity_total - shared.capacity_available : null,
  };
  const policies = shared?.policies ?? live?.store.ingestion_details?.policies;
  const scopedList = field => samples.flatMap(s => (s.runtime[field] || []).map(item =>
    ({ name: report.scope === 'fleet' ? `${s.id} · ${item.name}` : item.name, source_name: item.name, mode: item.mode, status: item.status,
      last_ok: item.last_ok, last_poll: item.last_poll })));
  const counters = (field, keys) => {
    const records = samples.map(s => s.runtime[field]).filter(Boolean);
    return records.length ? Object.fromEntries(keys.map(k => [k, sum(records, k)])) : null;
  };
  return {
    generated_at: report.generated_at, node_report: provenance,
    resources: { cluster: shared?.cluster_resources ?? live?.resources?.cluster },
    monitor: { collectors: scopedList('collectors') },
    pipeline: { sink: counters('sink', ['emitted', 'flushed', 'dropped', 'buffered']),
      otel_receiver: counters('otel_receiver', ['metrics_received', 'events_received', 'dropped', 'errors']),
      ingesters: scopedList('ingesters') },
    store: {
      kind: shared ? 'kusto' : null, database: shared?.database, cluster_url: live?.store.cluster_url || (shared?.cluster ? 'https://' + shared.cluster : null),
      reads, writes, commands, ingestion_traffic: traffic, ingestion_capacity: capacity,
      table_inventory: shared?.table_inventory ?? live?.store.table_inventory,
      ingestion_details: policies ? { policies } : null,
      health: { state: stores.some(s => [s.reads, s.writes, s.commands].some(op => op?.last_error_at > (op?.last_success_at || 0))) ? 'degraded'
        : [reads, writes, commands].some(s => s?.last_success_at) ? 'ok' : 'unknown',
        scope: 'Selected reporting clients; database and cluster measurements are shared.' },
    },
  };
}

export async function readScopedHealth(scope, nodeId, opts) {
  const report = await getBoardNodeView({ view: 'health', scope, nodeId }, opts);
  const includesLocal = report.rows.some(r => r.node_id === report.local_node?.node_id);
  // Older daemons attach shared table/cluster metadata only to their full local health result.
  let live = null, supplementError = null;
  if (includesLocal || (report.shared_kusto && !Object.hasOwn(report.shared_kusto, 'table_inventory'))) {
    try {
      const local = await getBoardNodeView({ view: 'health', scope: 'local' }, opts);
      if (local.local_node?.node_id === report.local_node?.node_id) live = local.local_runtime;
    } catch (e) {
      if (opts.signal.aborted) throw e;
      supplementError = 'Could not refresh the supplemental health measurements.';
    }
  }
  return scopedHealth(report, live, supplementError);
}
