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
