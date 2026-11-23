import { createMemo, For, Show } from 'solid-js'
import { BarPlot } from '../kinds/BarPlot'
import { at } from '../data'
import type { KeyedRow } from '../types'
import { measured } from './Summary'
import styles from './Summary.module.css'

const day = 86400
const days = 7
const date = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
const percentRange = [0, 100] as const

export type Buckets = { since: number; until: number; bucket_s: number; bucket_starts: readonly number[] }

/** Rows counted per bucket of the board's time range: the chart covers the selected time, no more. */
export function rangeBins(rows: readonly KeyedRow[], path: string, range: Buckets) {
  const starts = range.bucket_starts
  const counts = starts.map(() => 0)
  let total = 0
  for (const { row } of rows) {
    const ts = measured(at(row, path))
    if (ts == null || ts < range.since || ts >= range.until) continue
    let index = starts.length - 1
    while (index > 0 && starts[index] > ts) index--
    counts[index]++
    total++
  }
  return { bins: starts.map((x, i) => ({ x, count: counts[i] })), total }
}

export default function DailySummary(props: { label: string; rows?: readonly KeyedRow[]; path: string; range?: Buckets }) {
  const histogram = createMemo(() => {
    if (props.range?.bucket_starts.length) return rangeBins(props.rows ?? [], props.path, props.range)
    const counts = new Map<number, number>()
    let latest = -Infinity
    let earliest = Infinity
    let total = 0
    for (const { row } of props.rows ?? []) {
      const ts = measured(at(row, props.path))
      if (ts == null || !Number.isFinite(new Date(ts * 1000).getTime())) continue
      const start = Math.floor(ts / day) * day
      counts.set(start, (counts.get(start) ?? 0) + 1)
      total++
      latest = Math.max(latest, start)
      earliest = Math.min(earliest, start)
    }
    const start = Math.max(earliest, latest - (days - 1) * day)
    const bins = counts.size ? Array.from({ length: (latest - start) / day + 1 }, (_, i) => {
      const x = start + i * day
      return { x, count: counts.get(x) ?? 0 }
    }) : []
    return { bins, total }
  })
  const points = createMemo(() => {
    const { bins: rows, total } = histogram()
    const step = props.range?.bucket_starts.length ? props.range.bucket_s : day
    if (!total) return []
    // Pad the plot at each end without adding a count.
    return rows.length ? [
      { x: rows[0].x - step, values: [null] },
      ...rows.map(({ x, count }) => ({ x, values: [100 * count / total] })),
      { x: rows.at(-1)!.x + step, values: [null] },
    ] : []
  })
  return <div class={styles.timeline}>
    <Show when={points().length} fallback={<span class={styles.caption}>
      {props.rows?.length === 0 ? 'No dated records' : 'Dates are not available from this source'}
    </span>}>
      <BarPlot label={props.label} description={props.range?.bucket_starts.length ? 'Per bucket of the selected time' : 'Up to 7 UTC days, ending at the latest dated row'}
        points={points()} seriesLabel="Share of dated rows" xAxis="time" unit="%" yRange={percentRange} stack />
      <ul class={styles.accessibleValues} aria-label={`${props.label}, ${props.range?.bucket_starts.length ? "counts per bucket" : "daily counts"}`}>
        <For each={histogram().bins} keyed={row => row.x}>{row =>
          <li>{props.range?.bucket_starts.length ? new Date(row().x * 1000).toLocaleString() : date.format(row().x * 1000)}: {row().count}</li>
        }</For>
      </ul>
    </Show>
  </div>
}
