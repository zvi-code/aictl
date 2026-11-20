import { projectKey } from '../utils/paths.js';
import { isStoredToolSelected } from '../utils/toolScope.js';
import type { LiveCapabilities } from '../data/contract.gen';
import type { Filters } from '../data/filters';

type Values = Readonly<Record<string, unknown>>;
type Entity = { id: string; data: Values };
type SelectorState = {
  topics?: ReadonlyMap<string, ReadonlyMap<string, Entity>>;
  capabilities?: Pick<LiveCapabilities, 'topics'> | null;
};
type Agent = Values & { id: string; project?: string; tool?: string; models?: readonly string[] };

function topicEntities(state: SelectorState | null | undefined, topic: string): Entity[] {
  return [...(state?.topics?.get(topic)?.values() || [])];
}

function matchesStatus(agent: Values, status = 'all') {
  const present = agent.running === true && agent.status === 'unknown';
  return status === 'active' ? agent.running === true || nativeStatus(agent.status)
    : status === 'all' || status === agent.status || (status === 'running' && present);
}

const nativeStatus = (status: unknown) => status === 'running' || status === 'idle' || status === 'waiting' || status === 'looping';

function matchesAgent(agent: Agent, filters: Partial<Filters>, tools: string[] | null) {
  if (!isStoredToolSelected(agent.tool, tools)) return false;
  if (filters?.project && filters.project !== 'all' && projectKey(filters.project) !== projectKey(agent.project)) return false;
  if (filters?.model && filters.model !== 'all' && !agent.models?.includes(filters.model)) return false;
  if (!matchesStatus(agent, filters?.status)) return false;
  const q = filters?.q?.toLowerCase();
  return !q || [agent.id, agent.title, agent.tool, agent.project].some(value => String(value || '').toLowerCase().includes(q));
}

/** Only advertised runtime fields can replace fields on a historical row. */
export function mergeRuntimeAgents(historical: readonly Agent[], state: SelectorState, filters: Partial<Filters> = {}, tools: string[] | null = null) {
  return overlayAgents(historical, topicEntities(state, 'runtime.agent'), state.capabilities?.topics?.['runtime.agent']?.fields ?? [], filters, tools);
}

export function overlayAgents(historical: readonly Agent[], entities: readonly Entity[], fields: readonly string[],
  filters: Partial<Filters> = {}, tools: string[] | null = null) {
  const rows = new Map<string, Agent>(historical.map(agent => [agent.id, {
    ...agent, queryable: true,
    status: nativeStatus(agent.status) ? 'unknown' : agent.status,
    cpu_percent: null, mem_mb: null, pids: null,
  }]));
  for (const entity of entities) {
    const data = entity.data;
    const id = [data.session_id, data.native_session_id, data.id].find((id): id is string => typeof id === 'string' && !!id) ?? entity.id;
    const previous = rows.get(id);
    const runtime: Record<string, unknown> = {};
    for (const field of fields) {
      if (field !== 'activity' && Object.hasOwn(data, field)) runtime[field] = data[field];
    }
    const row: Agent & Record<string, unknown> = {
      title: id, short: id.slice(0, 8), parent_id: null, models: [],
      ...previous, ...runtime, id, runtime_present: true, queryable: !!previous,
    };
    if (typeof data.project_path === 'string' && data.project_path && !runtime.project) row.project = data.project_path;
    if (Array.isArray(row.pids)) { row.pid_list = row.pids; row.pids = row.pids.length; }
    if (!previous && !matchesAgent(row, filters, tools)) continue;
    rows.set(id, row);
  }
  return [...rows.values()].filter(agent => matchesStatus(agent, filters.status));
}

export function liveProcessTree(state: SelectorState, agent: Values) {
  const pidList = Array.isArray(agent.pid_list) ? agent.pid_list : [];
  const processes = topicEntities(state, 'runtime.process')
    .map(entity => entity.data)
    .filter(process => pidList.includes(process.pid) || process.session_id === (agent.session_id || agent.id));
  const byPid = new Map(processes.map(process => [process.pid, process]));
  return processes.map(process => {
    let parent = process.ppid;
    let depth = 0;
    const seen = new Set([process.pid]);
    while (byPid.has(parent) && !seen.has(parent)) {
      seen.add(parent); depth++; parent = byPid.get(parent)?.ppid;
    }
    return {
      ...process, depth,
      mem_mb: process.mem_mb ?? (typeof process.memory_rss_bytes === 'number' ? process.memory_rss_bytes / 1048576 : null),
    };
  });
}
