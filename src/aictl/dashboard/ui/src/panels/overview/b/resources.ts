export function completeSum(values: readonly unknown[]) {
  if (!values.length) return undefined
  let total = 0
  for (const value of values) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
    total += value
  }
  return total
}

export function latestTotal(series: Record<string, readonly (number | null)[]>) {
  const values = Object.values(series)
  // Use one bucket for the total. Do not mix samples from different times.
  for (let i = (values[0]?.length ?? 0) - 1; i >= 0; i--) {
    const total = completeSum(values.map(column => column[i]))
    if (total != null) return total
  }
}

/** List each process once, including cycles and processes without a reported parent. */
export function procTree<T>(items: readonly T[], pidOf: (item: T) => number, ppidOf: (item: T) => number | null | undefined) {
  const byPid = new Set(items.map(pidOf))
  const kids = new Map<number, T[]>()
  const roots: T[] = []
  for (const item of items) {
    const parent = ppidOf(item)
    if (parent == null || parent === pidOf(item) || !byPid.has(parent)) { roots.push(item); continue }
    const siblings = kids.get(parent)
    if (siblings) siblings.push(item)
    else kids.set(parent, [item])
  }
  const out: { x: T; depth: number; root: T; children: boolean; parent?: number }[] = []
  const seen = new Set<number>()
  for (const root of [...roots, ...items]) {
    const pending: { x: T; depth: number; parent?: number }[] = [{ x: root, depth: 0 }]
    while (pending.length) {
      const current = pending.pop()!
      const pid = pidOf(current.x)
      if (seen.has(pid)) continue
      seen.add(pid)
      const descendants = kids.get(pid)
      out.push({ ...current, root, children: Boolean(descendants?.some(child => !seen.has(pidOf(child)))) })
      if (descendants) {
        for (let i = descendants.length - 1; i >= 0; i--) {
          pending.push({ x: descendants[i], depth: current.depth + 1, parent: pid })
        }
      }
    }
  }
  return out
}

/** Core samples are percentages on a 0–100 scale. Keep gaps at their reported indexes. */
export function coreBars(perCore: readonly (number | null)[] | null | undefined) {
  const values = perCore ?? []
  const known = values.filter((value): value is number => value != null && Number.isFinite(value))
  if (!known.length) return null
  const avg = known.reduce((sum, value) => sum + value, 0) / known.length
  const busy = known.filter(value => value > 80).length
  return {
    label: `${values.length} cores, ${Math.round(avg)}% ${known.length === values.length ? 'on average' : 'average for reported cores'}${busy ? `, ${busy} over 80%` : ''}`,
    list: values.map((value, i) => ({
      i, value, h: Math.max(2, Math.min(100, value ?? 0)),
      level: value != null && value > 80 ? 'crit' : value != null && value > 50 ? 'warn' : 'ok',
      title: `Core ${i}: ${value == null ? 'not available from this source' : `${Math.round(value)}% busy. Whole machine, every program.`}`,
    })),
  }
}

type RuntimeNode = {
  node_id: string
  agents?: { total: number; rows: readonly Record<string, unknown>[] } | null
}
type RecordedProcess = { node_id: string; session_id: string; pid: number }
type KnownSession = { id: string; title: string; node_id?: string; session_id?: string; native_session_id?: string; placeholder?: boolean }

const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined
const word = (value: unknown) => typeof value === 'string' && value ? value : undefined
/** The id the board, the agent drawer and the session-process records give one session of one node. */
export const sessionKey = (node: string, session: string) => JSON.stringify([node, session])
export const UNLISTED_SESSION = 'Not in this board’s session list'

/**
 * The sessions each reporting node runs now, named as the board names them, with the process ids
 * recorded for them. A node that sends no session list is named, never counted as zero sessions.
 */
export function runningSessions(nodes: readonly RuntimeNode[], processes: readonly RecordedProcess[],
  known: readonly KnownSession[], selected: (tool: string) => boolean) {
  const byKey = new Map<string, KnownSession>()
  for (const agent of known) {
    if (agent.placeholder) continue
    for (const id of [agent.id, agent.session_id]) if (id) byKey.set(id, agent)
    if (agent.node_id && agent.native_session_id) byKey.set(sessionKey(agent.node_id, agent.native_session_id), agent)
  }
  const pids = new Map<string, Set<number>>()
  for (const process of processes) {
    const list = pids.get(process.session_id) ?? new Set<number>()
    list.add(process.pid)
    pids.set(process.session_id, list)
  }
  const silent: string[] = []
  const rows = nodes.flatMap(node => {
    if (!node.agents) { silent.push(node.node_id); return [] }
    return node.agents.rows.flatMap(agent => {
      const session = word(agent.native_session_id) ?? word(agent.session_id)
      const tool = word(agent.tool) ?? 'unknown'
      if (!session || agent.running !== true || !selected(tool)) return []
      const keys = [...new Set([session, word(agent.session_id)].filter(Boolean).map(id => sessionKey(node.node_id, id!)))]
      const board = keys.map(key => byKey.get(key)).find(Boolean)
      const list = [...keys, board?.id].flatMap(key => key ? [...pids.get(key) ?? []] : [])
      return [{
        node_id: node.node_id, open_id: board?.id ?? keys[0], tool,
        title: board?.title || UNLISTED_SESSION,
        status: word(agent.status) ?? word(agent.native_activity),
        started_at: finite(agent.started_at), cpu_percent: finite(agent.cpu_percent), mem_mb: finite(agent.mem_mb),
        pid_list: list.length ? [...new Set(list)].sort((a, b) => a - b).join(', ') : undefined,
      }]
    })
  })
  rows.sort((a, b) => (b.cpu_percent ?? -1) - (a.cpu_percent ?? -1) || (b.started_at ?? 0) - (a.started_at ?? 0) ||
    a.node_id.localeCompare(b.node_id) || a.open_id.localeCompare(b.open_id))
  const capped = nodes.filter(node => node.agents && node.agents.total > node.agents.rows.length).map(node => node.node_id)
  return { rows, silent, capped }
}

const record = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined

/** What each node's last health report says about its aictl daemon and its writes to the store. */
export function daemonReports(nodes: readonly object[]) {
  return nodes.flatMap(entry => {
    const node = entry as Record<string, unknown>
    const id = word(node.node_id)
    if (!id) return []
    const sample = record(node.client_sample)
    const daemon = record(record(sample?.runtime)?.daemon)
    const writer = record(record(sample?.store)?.writer)
    const tables = Object.values(record(writer?.tables) ?? {}).map(record)
    const total = (key: string) => {
      const values = tables.map(table => finite(table?.[key]))
      return values.length && values.every(value => value != null) ? values.reduce<number>((sum, value) => sum + value!, 0) : undefined
    }
    return [{
      node_id: id, captured_at: finite(node.captured_at),
      reporting: node.status === 'reported' ? 'Yes' : node.status === 'stale' ? 'No, last report older than 5 minutes' : 'No report',
      cpu: finite(daemon?.cpu_percent), rss: finite(daemon?.rss_bytes), threads: finite(daemon?.threads),
      uptime_s: finite(daemon?.uptime_s), writer: word(writer?.status),
      rows_sent: total('rows_sent'), rows_dropped: total('rows_dropped'), ingest_failures: total('ingest_failures'),
    }]
  })
}
