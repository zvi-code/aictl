import type { TopicRuntimeProcess } from '../data/contract.gen'

export function treeOrder<T, K extends number | string>(
  rows: readonly T[], key: (row: T) => K, parent: (row: T) => K | null | undefined,
  roots?: ReadonlySet<K>,
) {
  const keys = new Set(rows.map(key))
  const children = new Map<K, T[]>()
  const base: T[] = []
  for (const row of rows) {
    const pid = parent(row)
    if (pid != null && keys.has(pid) && pid !== key(row)) {
      let group = children.get(pid)
      if (!group) children.set(pid, group = [])
      group.push(row)
    } else base.push(row)
  }
  const out: { row: T; depth: number }[] = []
  const seen = new Set<K>()
  const visit = (first: T) => {
    const pending = [{ row: first, depth: 0 }]
    while (pending.length) {
      const current = pending.pop()!
      const id = key(current.row)
      if (seen.has(id)) continue
      seen.add(id); out.push(current)
      const group = children.get(id)
      if (group) for (let index = group.length - 1; index >= 0; index--) {
        pending.push({ row: group[index], depth: current.depth + 1 })
      }
    }
  }
  if (roots) {
    // Visit the highest selected ancestor first, so an explicitly listed child retains its depth.
    for (const row of rows) if (roots.has(key(row)) && !roots.has(parent(row)!)) visit(row)
    for (const row of rows) if (roots.has(key(row))) visit(row)
  } else {
    for (const row of base) visit(row)
    for (const row of rows) visit(row)
  }
  return out
}

export const indent = (value: string | number, depth: number) => depth ? `${'\u00a0\u00a0'.repeat(Math.min(depth, 7))}↳ ${value}` : String(value)

export function sessionProcesses(rows: readonly TopicRuntimeProcess[], pids: readonly number[], nativeIds: ReadonlySet<string>) {
  const owned = rows.filter(row => row.present && (!row.session_id || nativeIds.has(row.session_id)))
  const byPid = new Map(owned.map(row => [row.pid, row]))
  const roots = new Set([...pids, ...owned.filter(row => row.session_id && nativeIds.has(row.session_id)).map(row => row.pid)])
  return treeOrder(owned, row => row.pid, row => {
    const parent = row.ppid == null ? undefined : byPid.get(row.ppid)
    return parent && (parent.created_at == null || row.created_at == null || parent.created_at <= row.created_at) ? parent.pid : undefined
  }, roots)
}
