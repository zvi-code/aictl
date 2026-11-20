import { createMemo, For, lazy, Show } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Meter, type MeterTone } from '../../ui/Meter'
import { Stat } from '../../ui/Stat'
import { at } from '../data'
import { presentation, scalar } from '../kinds/model'
import type { FieldRef, KeyedRow, PanelContext, Read } from '../types'
import styles from './Summary.module.css'

export const DailySummary = lazy(() => import('./DailySummary'))
export const measured = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined
export const usable = ({ state }: Read) => state === 'ready' || state === 'stale' || state === 'empty'
export const sum = (rows: readonly KeyedRow[] | undefined, path: string) => {
  if (!rows) return
  let total = 0
  for (const { row } of rows) {
    const value = measured(at(row, path))
    if (value == null) return
    total += value
  }
  return total
}

export function StatStrip(props: {
  label: string
  items: readonly { label: string; value?: number | string; tone?: 'neutral' | 'positive' | 'warning' }[]
}) {
  return <div class={styles.stats} role="group" aria-label={props.label} data-summary>
    <For each={props.items} keyed={item => item.label}>{item =>
      <Stat label={item().label} value={item().value} tone={item().tone} />
    }</For>
  </div>
}

type MetricProps = { ctx: PanelContext; columns: readonly FieldRef[]; value: unknown }
export function MetricItems(props: MetricProps & {
  numericOnly?: boolean; describe?: typeof presentation
}) {
  return <For each={props.columns}>{column => {
    const field = createMemo(() => (props.describe ?? presentation)(props.ctx, column))
    const value = () => (props.numericOnly ? measured : scalar)(at(props.value, column.path))
    return <Stat label={field().label} value={value() == null ? undefined : field().format(value()!)} />
  }}</For>
}

export function FieldStats(props: MetricProps & { label: string }) {
  return <div class={styles.stats} role="group" aria-label={props.label} data-summary>
    <MetricItems ctx={props.ctx} columns={props.columns} value={props.value} numericOnly />
  </div>
}

type BarItem = { id: string; label: string; value: number; tone?: MeterTone }
const count = new Intl.NumberFormat()
export function Bars(props: {
  label: string; items?: readonly BarItem[]; max?: number; limit?: number; format?: (value: number) => string
}) {
  const rows = createMemo(() => props.items?.slice(0, props.limit ?? 3))
  const max = () => props.max ?? Math.max(0, ...(rows() ?? []).map(row => row.value))
  return <div role="group" aria-label={props.label} class={styles.bars}>
    <div class={styles.caption}>{props.label}</div>
    <Show when={rows()?.length} fallback={<span class={styles.caption}>{rows()
      ? 'No entries' : 'Not available from this source'}</span>}>
      <For each={rows() ?? []} keyed={row => row.id}>{row =>
        <Meter compact label={row().label} value={row().value} max={max()}
          display={props.format?.(row().value) ?? count.format(row().value)} tone={row().tone} />
      }</For>
    </Show>
  </div>
}

export function Comparisons(props: { children: JSX.Element }) {
  return <div class={styles.comparisons}>{props.children}</div>
}

export function bins(values: Iterable<unknown>, display?: (key: string) => string, tone?: (key: string) => MeterTone) {
  const counts = new Map<string, number>()
  for (const value of values) {
    const key = typeof value === 'string' && value ? value : ''
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts].sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
    .map(([id, value]) => ({ id, label: id ? display?.(id) ?? id : 'Unreported', value, tone: tone?.(id) }))
}

export function topRows(rows: readonly KeyedRow[] | undefined, path: string, label: (entry: KeyedRow) => string) {
  if (!rows) return
  const items = rows.flatMap(entry => {
    const value = measured(at(entry.row, path))
    return value == null || value < 0 ? [] : [{ id: entry.id, label: label(entry), value }]
  })
  return items.length || !rows.length ? items.sort((a, b) => b.value - a.value || a.id.localeCompare(b.id)) : undefined
}

export const fileName = (path: unknown) => typeof path === 'string' ? path.split(/[\\/]/).at(-1) || path : 'Unreported'
export const severityTone = (key: string): MeterTone => ['crit', 'critical', 'error', 'danger'].includes(key) ? 'danger'
  : ['warn', 'warning'].includes(key) ? 'warning' : 'neutral'
export const severityLabel = (key: string) => ({ crit: 'Critical', warn: 'Warning', info: 'Info' })[key] ?? key
