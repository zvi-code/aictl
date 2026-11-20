import { projectKey } from '../utils/paths.js';
import { isStoredToolSelected } from '../utils/toolScope.js';

export function topicEntities(state, topic) {
  return [...(state?.topics?.get(topic)?.values() || [])];
}

export function topicData(state, topic, id = null) {
  const entries = state?.topics?.get(topic);
  return (id == null ? entries?.values().next().value : entries?.get(id))?.data ?? null;
}

function matchesStatus(agent, status = 'all') {
  const present = agent.running === true && agent.status === 'unknown';
  return status === 'active' ? agent.running === true || ['running', 'idle', 'waiting', 'looping'].includes(agent.status)
    : status === 'all' || status === agent.status || (status === 'running' && present);
}

function matchesAgent(agent, filters, tools) {
  if (!isStoredToolSelected(agent.tool, tools)) return false;
  if (filters?.project && filters.project !== 'all' && projectKey(filters.project) !== projectKey(agent.project)) return false;
  if (filters?.model && filters.model !== 'all' && !agent.models?.includes(filters.model)) return false;
  if (!matchesStatus(agent, filters?.status)) return false;
  const q = filters?.q?.toLowerCase();
  return !q || [agent.id, agent.title, agent.tool, agent.project].some(value => String(value || '').toLowerCase().includes(q));
}

/** Only advertised runtime fields can replace fields on a historical row. */
export function mergeRuntimeAgents(historical, state, filters = {}, tools = null) {
  const fields = state.capabilities?.topics?.['runtime.agent']?.fields || [];
  const rows = new Map(historical.map(agent => [agent.id, {
    ...agent, queryable: true,
    status: ['running', 'idle', 'waiting', 'looping'].includes(agent.status) ? 'unknown' : agent.status,
    cpu_percent: null, mem_mb: null, pids: null,
  }]));
  for (const entity of topicEntities(state, 'runtime.agent')) {
    const data = entity.data;
    const id = data.session_id || data.native_session_id || data.id || entity.id;
    const previous = rows.get(id);
    const runtime = {};
    for (const field of fields) {
      if (field !== 'activity' && Object.hasOwn(data, field)) runtime[field] = data[field];
    }
    const row = {
      id, title: id, short: id.slice(0, 8), parent_id: null, models: [],
      ...previous, ...runtime, id, runtime_present: true, queryable: !!previous,
    };
    if (data.project_path && !runtime.project) row.project = data.project_path;
    if (Array.isArray(row.pids)) { row.pid_list = row.pids; row.pids = row.pids.length; }
    if (!previous && !matchesAgent(row, filters, tools)) continue;
    rows.set(id, row);
  }
  return [...rows.values()].filter(agent => matchesStatus(agent, filters.status));
}

export function liveProcessTree(state, agent) {
  const processes = topicEntities(state, 'runtime.process')
    .map(entity => entity.data)
    .filter(process => agent.pid_list?.includes(process.pid) || process.session_id === (agent.session_id || agent.id));
  const byPid = new Map(processes.map(process => [process.pid, process]));
  return processes.map(process => {
    let parent = process.ppid;
    let depth = 0;
    const seen = new Set([process.pid]);
    while (byPid.has(parent) && !seen.has(parent)) {
      seen.add(parent); depth++; parent = byPid.get(parent).ppid;
    }
    return {
      ...process, depth,
      mem_mb: process.mem_mb ?? (process.memory_rss_bytes == null ? null : process.memory_rss_bytes / 1048576),
    };
  });
}

export function sourceStatuses(state) {
  return topicEntities(state, 'source.status')
    .filter(entity => !entity.data.scope || entity.data.scope === state.scope)
    .map(entity => ({ id: entity.id, ...entity.data }));
}

export function historyReady(state) {
  return sourceStatuses(state).some(source => source.id.startsWith('history:') && source.ready === true)
    || state.historyPresent;
}

export function historyFailure(state) {
  return sourceStatuses(state).find(source => source.component === 'history' && source.pending === false && source.error);
}

export function runtimeReady(state) {
  return sourceStatuses(state).some(source => source.producer === 'runtime-collector' && source.ready === true);
}
