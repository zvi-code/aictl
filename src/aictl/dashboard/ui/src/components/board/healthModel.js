import { ago, fmtAge } from './format.js';

export function writeWarning(writes, kind) {
  const longest = writes?.reduce((a, b) => !a || b.age_s > (a.age_s ?? -1) ? b : a, null);
  if (!(longest?.age_s >= 60) || kind === 'kusto') return null;
  return `History write (${longest.name}) has run for ${fmtAge(longest.age_s)}.`
    + (kind === 'sqlite' ? ' Other SQLite writers may be waiting.' : '');
}

export function ingesterState(i) {
  if (i.status === 'off') return { status: 'off', cls: null };
  if (['error', 'failed'].includes(i.status) || i.error && ['ok', 'running', 'waiting'].includes(i.status)) {
    return { status: i.status === 'running' ? 'retrying after error' : 'failed', cls: 'crit' };
  }
  if (i.status === 'running' || i.poll_in_flight && ['ok', 'waiting'].includes(i.status)) return { status: 'running', cls: null };
  if (i.status === 'ok' && !i.last_ok) return { status: 'awaiting success', cls: null };
  if (['ok', 'waiting'].includes(i.status)) return { status: i.status, cls: null };
  return { status: i.status || 'unknown', cls: 'warn' };
}

export const pollSuccess = (i, nowS) => i.last_ok ? 'Last success ' + ago(i.last_ok, nowS)
  : i.last_ok === null ? 'No successful poll yet' : 'Last success not reported';

export function qualityContext(q, ingesters) {
  const ingester = ingesters.find(i => q.component === `ingester:${i.name}` || q.component === i.name);
  if (ingester?.status === 'off' && ['source_missing', 'missing', 'no source'].includes(q.status)) return 'Ingester off';
  if (['ok', 'running'].includes(ingester?.status) && !ingester.error && q.ts && ingester.last_ok > q.ts
    && (!q.source || !ingester.source_path || q.source === ingester.source_path)) return 'A later poll succeeded';
  return null;
}

export function otelConfig(pipe, tool, nowS) {
  const setup = pipe.otel_setup?.[tool];
  if (!setup) return null;
  const last = pipe.otel_receiver?.by_tool?.[tool]?.last_at;
  const recent = last > 0 && nowS - last < 300;
  const status = setup.status || 'unknown';
  const detail = `Local OTel config: ${status}` + (setup.variable ? ` (${setup.variable})` : '')
    + (setup.source ? ` in ${setup.source}` : '') + (recent ? '. The receiver saw this tool in the last 5 min.' : '.');
  return { status, detail, warning: status !== 'ok' && !recent };
}

// SDK counters and last_error survive a successful retry. Compare within the same operation.
export function operationFailing(op) {
  if (op?.last_error_at != null) return op.last_success_at == null || op.last_error_at > op.last_success_at;
  return !!op?.last_error && op.last_success_at == null;
}

export function clientState(store) {
  const health = store.health;
  if (health?.state === 'degraded' || health?.last_error) return 'degraded';
  if (health?.last_success_at === null && ['ok', 'unknown'].includes(health.state)) return 'no success yet';
  return health?.state || 'unknown';
}

export function measurementState(metric) {
  return metric?.status || (metric?.checked_at ? 'cached' : 'not reported');
}

export function measuredValue(metric, key) {
  // An unsuccessful first measurement has no values. A failed refresh can retain a real sample.
  return metric?.status && !metric.checked_at && metric.status !== 'cached' ? null : metric?.[key];
}
