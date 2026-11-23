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

const entityId = (entity: Entity) =>
  [entity.data.session_id, entity.data.native_session_id, entity.data.id].find((id): id is string => typeof id === 'string' && !!id) ?? entity.id

/** Why a runtime record is not a session, or undefined when evidence links it to one. */
export function unlinkedReason(data: Values): string | undefined {
  return typeof data.unlinked_reason === 'string' && data.unlinked_reason ? data.unlinked_reason : undefined
}

export type UnlinkedProcess = {
  id: string; tool?: string; pids: number[]; started_at?: number; project?: string
  cpu_percent?: number; mem_mb?: number; reason: string
}

/** Processes that no evidence links to a session: they are not sessions and never become session rows. */
export function unlinkedProcesses(historical: readonly Agent[], entities: readonly Entity[],
  filters: Partial<Filters> = {}, tools: string[] | null = null): UnlinkedProcess[] {
  const known = new Set(historical.map(agent => agent.id))
  return entities.flatMap(entity => {
    const data = entity.data, id = entityId(entity), reason = unlinkedReason(data)
    if (!reason || known.has(id)) return []
    const project = typeof data.project_path === 'string' && data.project_path ? data.project_path
      : typeof data.project === 'string' ? data.project : undefined
    const row = { ...data, id, project, title: '', status: 'running' } as Agent
    if (!matchesAgent(row, { ...filters, status: 'all' }, tools)) return []
    const num = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined
    return [{
      id, reason, project, tool: typeof data.tool === 'string' ? data.tool : undefined,
      pids: Array.isArray(data.pids) ? data.pids.filter((pid): pid is number => typeof pid === 'number') : [],
      started_at: num(data.started_at), cpu_percent: num(data.cpu_percent), mem_mb: num(data.mem_mb),
    }]
  })
}

/** Whether a runtime record is a live session: running, not a subagent, and linked to a session by evidence.
 * Every count of live sessions uses this rule; a process with ``unlinked_reason`` is not a session. */
export function isRuntimeSession(data: Values): boolean {
  return data.running === true && !data.parent_id && typeof data.session_id === 'string' && !!data.session_id &&
    !unlinkedReason(data)
}

export type RuntimeSummary = {
  /** Live sessions, by session id. */
  sessions: number
  /** Live sessions per tool, most first. */
  tools: [string, number][]
  /** Processes of AI tools that no evidence links to a session: the same list the Agents panel shows below its table. */
  unlinked: number
  unlinkedTools: [string, number][]
  /** Activity of the live sessions of the selected tools. */
  running: number
  idle: number
  unknown: number
}

const byCount = (counts: Map<string, number>) => [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

/** One count of the live runtime for the Overview: its sessions, and apart from them the unlinked processes. */
export function runtimeSummary(entities: readonly Entity[], tools: string[] | null = null): RuntimeSummary {
  const sessions = new Map<string, string>()
  let running = 0, idle = 0, unknown = 0
  for (const { data } of entities) {
    if (!isRuntimeSession(data)) continue
    sessions.set(data.session_id as string, typeof data.tool === 'string' ? data.tool : '')
    if (tools && (typeof data.tool !== 'string' || !tools.includes(data.tool))) continue
    if (data.status === 'idle') idle++
    else if (data.native_activity === 'unknown') unknown++
    else if (data.status === 'running' || data.status === 'waiting' || data.status === 'looping') running++
  }
  const count = (values: Iterable<string>) => {
    const counts = new Map<string, number>()
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
    return byCount(counts)
  }
  const unlinked = unlinkedProcesses([], entities)
  return { sessions: sessions.size, tools: count(sessions.values()), unlinked: unlinked.length,
    unlinkedTools: count(unlinked.map(item => item.tool ?? '')), running, idle, unknown }
}

/** Only advertised runtime fields can replace fields on a historical row.
 *
 * A runtime record that no evidence links to a session (``unlinked_reason``) is left out:
 * it is a process, not a session. A linked session with no recorded history yet keeps its
 * row, named by tool and folder, with the reason its numbers are missing. */
export function overlayAgents(historical: readonly Agent[], entities: readonly Entity[], fields: readonly string[],
  filters: Partial<Filters> = {}, tools: string[] | null = null) {
  // The runtime report covers sessions, not subagents: a subagent keeps the status read from its own transcript.
  const rows = new Map<string, Agent>(historical.map(agent => [agent.id, {
    ...agent, queryable: true,
    status: nativeStatus(agent.status) && !agent.parent_id ? 'unknown' : agent.status,
    cpu_percent: null, mem_mb: null, pids: null,
  }]));
  for (const entity of entities) {
    const data = entity.data;
    const id = entityId(entity);
    const previous = rows.get(id);
    if (!previous && unlinkedReason(data)) continue;
    const runtime: Record<string, unknown> = {};
    for (const field of fields) {
      if (field !== 'activity' && Object.hasOwn(data, field)) runtime[field] = data[field];
    }
    const row: Agent & Record<string, unknown> = {
      title: '', short: id.slice(0, 8), parent_id: null, models: [],
      ...previous, ...runtime, id, runtime_present: true, queryable: !!previous,
    };
    if (!previous) {
      // The tool's own session file names it, so it is a session; the store has nothing for it in this time.
      row.no_history = 'No activity recorded in the selected time: its transcript lines are older or not imported yet';
    }
    if (typeof data.project_path === 'string' && data.project_path && !runtime.project) row.project = data.project_path;
    if (Array.isArray(row.pids)) { row.pid_list = row.pids; row.pids = row.pids.length; }
    if (!previous && !matchesAgent(row, filters, tools)) continue;
    rows.set(id, row);
  }
  return [...rows.values()].filter(agent => matchesStatus(agent, filters.status));
}
