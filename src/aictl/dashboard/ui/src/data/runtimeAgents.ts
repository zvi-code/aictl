import { projectKey } from './projectKey';
import { isStoredToolSelected } from './toolScope';
import type { Filters } from './filters';

type Values = Readonly<Record<string, unknown>>;
type Entity = { id: string; data: Values };
type Agent = Values & { id: string; project?: string; tool?: string; models?: readonly string[] };

function matchesStatus(agent: Values, status = 'all') {
  const present = agent.running === true && agent.status === 'unknown';
  return status === 'active' ? agent.running === true || nativeStatus(agent.status)
    : status === 'all' || status === agent.status || (status === 'running' && present);
}

const nativeStatus = (status: unknown) => status === 'running' || status === 'idle' || status === 'waiting' || status === 'looping';

/** The status as shown: an end aictl only inferred from the idle window says so. */
export function statusText<T>(status: T, endReason: unknown): T | string {
  if ((status === 'ended' || status === 'failed') && endReason === 'idle') return `${status} (inferred)`;
  return status;
}

function matchesAgent(agent: Agent, filters: Partial<Filters>, tools: string[] | null) {
  if (!isStoredToolSelected(agent.tool, tools)) return false;
  if (filters?.project && filters.project !== 'all' && projectKey(filters.project) !== projectKey(agent.project)) return false;
  if (filters?.model && filters.model !== 'all' && !agent.models?.includes(filters.model)) return false;
  if (!matchesStatus(agent, filters?.status)) return false;
  const q = filters?.q?.toLowerCase();
  return !q || [agent.id, agent.title, agent.tool, agent.project].some(value => String(value || '').toLowerCase().includes(q));
}

/** Only advertised runtime fields can replace fields on a historical row. */
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
