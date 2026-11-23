// The agents list as a tree: sessions with their subagents under them.
// Pure functions only, so naming, order and the parent summary are tested without a DOM.

export type TreeAgent = {
  id: string
  parent_id?: string | null
  kind?: 'main' | 'subagent' | string
  title?: string
  status?: string
  started_at?: number | null
  ended_at?: number | null
  last_activity_at?: number | null
  input?: number | null
  output?: number | null
  cost_usd?: number | null
  tool_calls?: number | null
  failures?: number | null
  subagent_count?: number
  subagents_running?: number
  [key: string]: unknown
}

export type TreeEntry<T extends TreeAgent = TreeAgent> = {
  row: T
  depth: number
  /** Listed subagents under this row (0 for a subagent). */
  children: number
  expanded: boolean
  /** The last listed child of its parent: the connector ends here. */
  last: boolean
  parent?: string
  /** 1-based position among its siblings, for aria-posinset. */
  position: number
  siblings: number
}

export type Summary = {
  count: number
  running: number
  live: number
  listed: number
  input: number | null
  output: number | null
  cost: number | null
}

/** Running rows first, then waiting and idle ones, then ended ones. A row moves only when its group changes. */
export const statusGroup = (status: unknown) => {
  switch (status) {
    case 'running': case 'looping': return 0
    case 'waiting': case 'idle': return 1
    case 'ended': case 'failed': case 'stopped': return 2
    default: return 3
  }
}
export const isActive = (status: unknown) => status === 'running' || status === 'looping' || status === 'waiting'
export const isLive = (status: unknown) => isActive(status) || status === 'idle'

const byId = (a: TreeAgent, b: TreeAgent) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0
const start = (row: TreeAgent) => typeof row.started_at === 'number' ? row.started_at : undefined

/** Sessions: status group, then newest start first, then id. Never the last activity, which changes on every refresh. */
export function compareRoots(a: TreeAgent, b: TreeAgent) {
  const group = statusGroup(a.status) - statusGroup(b.status)
  if (group) return group
  const sa = start(a) ?? -Infinity, sb = start(b) ?? -Infinity
  return sa !== sb ? sb - sa : byId(a, b)
}

/** Subagents under a session: spawn order (start time, then id). Their status does not move them. */
export function compareChildren(a: TreeAgent, b: TreeAgent) {
  const sa = start(a) ?? Infinity, sb = start(b) ?? Infinity
  return sa !== sb ? sa - sb : byId(a, b)
}

/** Whether a session starts unfolded: while it or one of its subagents is live. */
export const startsExpanded = (row: TreeAgent) => row.kind === 'group' || isLive(row.status) || (row.subagents_running ?? 0) > 0

/** The rows to show, in order, with depth and fold state. A child whose parent is not listed shows as a top row. */
export function buildTree<T extends TreeAgent>(rows: readonly T[], expanded: ReadonlyMap<string, boolean>): TreeEntry<T>[] {
  const ids = new Set(rows.map(row => row.id))
  const kids = new Map<string, T[]>()
  const roots: T[] = []
  for (const row of rows) {
    const parent = typeof row.parent_id === 'string' && row.parent_id !== row.id && ids.has(row.parent_id) ? row.parent_id : undefined
    if (parent) kids.set(parent, [...kids.get(parent) ?? [], row])
    else roots.push(row)
  }
  const out: TreeEntry<T>[] = []
  const groups = new Set(rows.filter(row => row.kind === 'group').map(row => row.id))
  const visit = (list: T[], depth: number, parent?: string) => {
    // Under a grouping row the members are sessions, ordered like top rows.
    list.sort(depth && !(parent && groups.has(parent)) ? compareChildren : compareRoots)
    list.forEach((row, index) => {
      const children = kids.get(row.id) ?? []
      const open = children.length > 0 && (expanded.get(row.id) ?? startsExpanded(row))
      out.push({ row, depth, children: children.length, expanded: open, last: index === list.length - 1, parent,
        position: index + 1, siblings: list.length })
      if (open) visit([...children], depth + 1, row.id)
    })
  }
  visit(roots, 0)
  return out
}

const sum = (values: readonly (number | null | undefined)[]) => {
  const known = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  return known.length ? known.reduce((a, b) => a + b, 0) : null
}

/** A session's subagents: counted by the server when it has them, else from the listed rows. */
export function summarize(parent: TreeAgent, children: readonly TreeAgent[]): Summary {
  return {
    count: parent.subagent_count ?? children.length,
    running: parent.subagents_running ?? children.filter(child => isActive(child.status)).length,
    live: children.filter(child => isLive(child.status)).length,
    listed: children.length,
    input: sum(children.map(child => child.input)),
    output: sum(children.map(child => child.output)),
    cost: sum(children.map(child => child.cost_usd)),
  }
}

export function childrenOf<T extends TreeAgent>(rows: readonly T[]) {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    if (typeof row.parent_id === 'string' && row.parent_id !== row.id) map.set(row.parent_id, [...map.get(row.parent_id) ?? [], row])
  }
  return map
}

/** "3 subagents · 1 running", or nothing for a session without subagents. */
export function subagentText(summary: Summary) {
  if (!summary.count) return ''
  const parts = [`${summary.count} subagent${summary.count === 1 ? '' : 's'}`]
  if (summary.running) parts.push(`${summary.running} running`)
  if (summary.listed < summary.count) parts.push(`${summary.listed} listed`)
  return parts.join(' · ')
}

/** A short age: "12 s", "4 min", "3 h", "2 d". */
export function ago(seconds: number) {
  const s = Math.max(0, seconds)
  if (s < 90) return `${Math.floor(s)} s`
  if (s < 90 * 60) return `${Math.floor(s / 60)} min`
  if (s < 48 * 3600) return `${Math.floor(s / 3600)} h`
  return `${Math.floor(s / 86400)} d`
}

/** Elapsed time as h:mm:ss or m:ss. */
export function elapsed(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`
}

/** A row's duration: live rows count up to now; ended rows run from start to their end or last line. */
export function duration(row: TreeAgent, now: number): number | undefined {
  const begin = start(row)
  if (begin === undefined) return undefined
  if (isLive(row.status)) return Math.max(0, now - begin)
  const end = typeof row.ended_at === 'number' ? row.ended_at : typeof row.last_activity_at === 'number' ? row.last_activity_at : undefined
  return end === undefined ? undefined : Math.max(0, end - begin)
}

const sourceWords: Record<string, string> = {
  description: 'the description its tool recorded for it',
  caller: 'the description its session gave the Agent call that started it',
  'agent type': 'its agent type and short id (no description was recorded)',
  id: 'its short id (no description or agent type was recorded)',
  user: 'the name you gave the session',
  tool: 'the name the tool gave the session',
  prompt: 'the session\'s first prompt, as the tool recorded it',
  'first prompt': 'the session\'s first prompt',
  'stored title': 'the stored session title',
  'tool and project': 'its tool and project (no title or prompt was recorded)',
}

/** Hover text for a row's name: what the row is and where its name comes from. */
export function nameHint(row: TreeAgent) {
  const kind = row.parent_id ? 'Subagent started by its session' : row.placeholder ? 'Tool process without a session record'
    : 'Session (main agent)'
  const source = typeof row.name_source === 'string' ? sourceWords[row.name_source] ?? row.name_source : undefined
  const lines = [`${kind}: ${row.title ?? row.id}`]
  if (source) lines.push(`Named by ${source}.`)
  if (typeof row.prompt_line === 'string' && row.prompt_line) lines.push(`Prompt: ${row.prompt_line}`)
  lines.push(`Id: ${row.id}`)
  return lines.join('\n')
}

/** Why a row has no duration. */
export function durationMissing(row: TreeAgent) {
  if (typeof row.started_at !== 'number') return 'No start time recorded'
  return 'No end time or last line recorded, and the status does not say it still runs'
}

/** Why a row has no last activity time. */
export function lastMissing(row: TreeAgent) {
  return Object.hasOwn(row, 'last_activity_at') ? 'No line or call recorded in the selected time'
    : 'Not reported by this data source'
}

/** Why a usage number is missing, for its hover text. A missing value is never shown as 0. */
export function missingReason(row: TreeAgent, field: 'tokens' | 'cost' | 'tool_calls' | 'requests') {
  if (row.placeholder) return 'Only a process was seen; no session record yet'
  if (row.queryable === false) return 'Seen in the runtime report only; no recorded history for this agent'
  if (field === 'cost' && (typeof row.input === 'number' || typeof row.output === 'number')) {
    return 'No list price is known for this model'
  }
  if (field === 'tool_calls') return 'This tool does not report tool calls, or none were imported yet'
  return row.parent_id ? 'No usage rows yet: the subagent\'s transcript has not been imported'
    : 'No usage rows for this session in the selected time'
}
