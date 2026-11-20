export function median(values: readonly (number | null | undefined)[]) {
  const sorted = values.filter((value): value is number => value != null && Number.isFinite(value)).sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return !sorted.length ? undefined : sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function runDelta(value?: number | null, base?: number | null) {
  if (value == null || !base) return undefined
  const delta = (value - base) / base
  return Math.abs(delta) < .05 ? 'Within 5% of median' : `${delta > 0 ? '+' : ''}${Math.round(delta * 100)}% vs median`
}

export function buckets(
  points: readonly { ts: number; value: number | null }[], since: number, until: number, sum: boolean,
) {
  const step = Math.max(1, (until - since) / 40)
  const values = new Array<number>(40).fill(0)
  const counts = new Array<number>(40).fill(0)
  for (const point of points) {
    if (point.value == null || point.ts < since || point.ts > until) continue
    const index = Math.min(39, Math.floor((point.ts - since) / step))
    values[index] += point.value
    counts[index]++
  }
  return { starts: values.map((_, index) => since + index * step),
    values: values.map((value, index) => !counts[index] ? null : sum ? value : value / counts[index]), step }
}
