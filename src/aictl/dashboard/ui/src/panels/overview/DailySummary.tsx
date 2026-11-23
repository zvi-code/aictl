import { createMemo, For, Show } from 'solid-js'
import { dayLabel, stamp } from '../../design/format'
import { BarPlot } from '../kinds/BarPlot'
import { at } from '../data'
import type { KeyedRow } from '../types'
import { measured } from './Summary'
import styles from './Summary.module.css'

const day = 86400
const days = 7

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

/** The plotted bars: the count in each bucket, padded by one empty step at each end. A count reads as
 *  "how many", where a share of the listed rows read as nothing (tiny bars on a 0-100% axis). */
export function countPoints(bins: readonly { x: number; count: number }[], step: number) {
  if (!bins.some(bin => bin.count > 0)) return []
  return [{ x: bins[0].x - step, values: [null] }, ...bins.map(({ x, count }) => ({ x, values: [count] })),
    { x: bins.at(-1)!.x + step, values: [null] }]
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
  const points = createMemo(() => countPoints(histogram().bins, props.range?.bucket_starts.length ? props.range.bucket_s : day))
  return <div class={styles.timeline}>
    <Show when={points().length} fallback={<span class={styles.caption}>
      {props.rows?.length === 0 ? 'No dated records' : 'Dates are not available from this source'}
    </span>}>
      <BarPlot label={props.label} description={props.range?.bucket_starts.length ? 'Count per bucket of the selected time' : 'Count per UTC day, up to 7 days ending at the latest dated row'}
        points={points()} seriesLabel="Count" xAxis="time" />
      <ul class={styles.accessibleValues} aria-label={`${props.label}, ${props.range?.bucket_starts.length ? "counts per bucket" : "daily counts"}`}>
        <For each={histogram().bins} keyed={row => row.x}>{row =>
          <li>{props.range?.bucket_starts.length ? stamp(row().x, true) : dayLabel(row().x)}: {row().count}</li>
        }</For>
      </ul>
    </Show>
  </div>
}
