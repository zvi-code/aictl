import { useEffect, useState } from 'preact/hooks';
import { getBoardNodeView } from '../../api.js';
import { isStoredToolSelected } from '../../utils/toolScope.js';

const STALE_S = 300;
const REFRESH_MS = 30000;
const validCount = n => Number.isSafeInteger(n) && n >= 0;
const fresh = (at, now) => Number.isFinite(at) && at > 0 && now - at <= STALE_S && at <= now + 60;

export function useNodeRuntime(scope, nodeId, live, enabled = true) {
  const key = JSON.stringify([scope, nodeId]);
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let ctrl;
    const load = () => {
      if (!active || ctrl || document.hidden) return;
      ctrl = new AbortController();
      getBoardNodeView({ view: 'runtime', scope, nodeId }, { signal: ctrl.signal }).then(
        data => { if (active) setResult({ key, data, error: null }); },
        error => { if (active) setResult(previous => ({ key, data: previous?.key === key ? previous.data : null, error })); },
      ).finally(() => { ctrl = null; });
    };
    load();
    const timer = live ? setInterval(load, REFRESH_MS) : null;
    if (live) document.addEventListener('visibilitychange', load);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
      ctrl?.abort();
    };
  }, [scope, nodeId, key, live, enabled]);
  return enabled && result?.key === key ? result : null;
}

export function nodeActivity(report, localHost, now) {
  const rows = (report?.rows || []).map(r => ({
    ...r,
    active_sessions: fresh(r.activity_at, now) && validCount(r.active_sessions) ? r.active_sessions : null,
    active_processes: fresh(r.activity_at, now) && validCount(r.active_processes) ? r.active_processes : null,
    agents: fresh(r.agents?.captured_at, now) && Array.isArray(r.agents.rows) ? r.agents : null,
  }));
  if (localHost && fresh(localHost.activity_at, now)) {
    const nodeId = localHost.node_id || report?.local_node?.node_id || 'This node';
    const i = rows.findIndex(r => r.node_id === nodeId);
    const row = { ...rows[i], ...localHost, node_id: nodeId, agents: rows[i]?.agents || null };
    if (i < 0) rows.push(row);
    else rows[i] = row;
  }
  const measured = rows.filter(r => validCount(r.active_sessions));
  return {
    rows,
    sessions: measured.length ? measured.reduce((n, r) => n + r.active_sessions, 0) : null,
    hosts: measured.length,
  };
}

/** Match only exact native session identities within the reported node. */
export function overlayReportedAgents(historical, activity, filters, tools) {
  const agents = new Map(historical.map(a => [a.id, {
    ...a, running: false, runtime_present: false,
    cpu_percent: null, mem_mb: null, pids: null,
    status: ['running', 'waiting', 'looping', 'idle'].includes(a.status) ? 'unknown' : a.status,
  }]));
  for (const host of activity.rows) {
    for (const item of host.agents?.rows || []) {
      const raw = item.native_session_id || item.session_id;
      if (typeof raw !== 'string' || !raw || !isStoredToolSelected(item.tool, tools)) continue;
      const id = JSON.stringify([host.node_id, raw]);
      const record = agents.get(id);
      // These filters need historical metadata or prompt content. An unmatched
      // process observation does not prove that it matches them.
      if (!record && (filters.project !== 'all' || filters.model !== 'all' || filters.q)) continue;
      const status = item.status || 'unknown';
      const present = item.running === true;
      if (filters.status !== 'all') {
        const effective = present && status === 'unknown' ? 'running' : status;
        if (filters.status === 'active' ? !present : filters.status !== effective) continue;
      }
      agents.set(id, {
        id, short: raw.slice(0, 8), title: 'Monitored session', parent_id: null, models: [],
        ...record, node_id: host.node_id, tool: item.tool, status, running: present,
        runtime_present: true, queryable: !!record, native_activity: item.native_activity,
        cpu_percent: item.cpu_percent, mem_mb: item.mem_mb, started_at: item.started_at ?? record?.started_at,
      });
    }
  }
  return [...agents.values()].filter(a => filters.status === 'active' ? a.running === true
    : filters.status === 'running' ? a.running === true && ['running', 'unknown'].includes(a.status)
      : filters.status === 'idle' || filters.status === 'waiting' || filters.status === 'looping' ? a.runtime_present && a.status === filters.status
        : true);
}
