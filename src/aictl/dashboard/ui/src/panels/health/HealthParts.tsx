import { createMemo, createSignal, For, Show, untrack, type Accessor } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { at } from '../data'
import type { FieldRef, PanelContext, Read, Row } from '../types'
import { presentation, scalar } from '../kinds/model'
import { States } from '../kinds/States'
import { PanelState } from '../../ui/PanelState'
import { Table } from '../../ui/Table'
import { Stat } from '../../ui/Stat'
import { fmtBps, fmtBytes, fmtMs } from '../../design/format'
import { MISSING, type HealthView } from './healthModel'
import { useHealth } from './healthData'
import styles from './Health.module.css'

type MetricField = FieldRef & { unit?: string }
type Fact = { field: MetricField; value: unknown }
export const field = (path: string, label?: string, unit?: string, datapoint?: string): MetricField => ({ path, label, unit, datapoint })
export const time = (path: string, label: string): MetricField => ({ path, label, format: 'timestamp' })
export const fact = (label: string, value: unknown, unit?: string, datapoint?: string): Fact => ({ field: field(label, label, unit, datapoint), value })
export const date = (label: string, value: unknown): Fact => ({ field: time(label, label), value })

function metric(ctx: PanelContext, ref: MetricField) {
  const display = presentation(ctx, ref)
  const unit = display.unit ?? ref.unit
  const format = (value: string | number | boolean) => {
    if (typeof value !== 'number') return display.format(value)
    if (unit === 'bytes') return fmtBytes(value)
    if (unit === 'rate_bps') return fmtBps(value)
    if (unit === 'ms') return fmtMs(value)
    const suffix = unit === 'per_s' ? '/s' : display.unit ? '' : unit === 'percent' ? '%' : unit === 'seconds' ? ' s' : ''
    return display.format(value) + suffix
  }
  return { label: display.label, format }
}

export function Facts(props: { ctx: PanelContext; items: readonly Fact[]; stats?: boolean }) {
  return <Show when={props.stats} fallback={
    <dl class={styles.facts}><For each={props.items} keyed={item => item.field.path}>{item => {
      const meta = () => metric(props.ctx, item().field)
      const value = () => scalar(item().value)
      return <div><dt>{meta().label}</dt><dd>{value() === undefined ? MISSING : meta().format(value()!)}</dd></div>
    }}</For></dl>
  }>
    <div class={styles.stats}><For each={props.items} keyed={item => item.field.path}>{item => {
      const value = () => scalar(item().value)
      return <Stat label={metric(props.ctx, item().field).label}
        value={value() === undefined ? undefined : metric(props.ctx, item().field).format(value()!)} />
    }}</For></div>
  </Show>
}

export function HealthTable<T extends object>(props: {
  ctx: PanelContext; label: string; fields: readonly MetricField[]; rows: readonly T[] | undefined | null;
  rowId: (row: T) => string; empty?: string; action?: { label: (row: T) => string; run: (row: T) => void }
}) {
  const fields = createMemo(() => props.fields.map(ref => {
    const meta = metric(props.ctx, ref)
    return { id: ref.path, label: meta.label, format: meta.format, read: (row: T) => scalar(at(row, ref.path)) }
  }))
  return <Show when={props.rows?.length}
    fallback={<PanelState state={props.rows == null ? 'unavailable' : 'empty'} inline message={props.rows != null ? props.empty : undefined} />}>
    <div class={styles.grid} data-columns={props.fields.length > 10 ? 'wide' : props.fields.length > 5 ? 'many' : undefined}>
      <Table label={props.label} fields={fields()} rows={props.rows!} rowId={props.rowId} action={props.action} />
    </div>
  </Show>
}

export function Detail(props: { label: string; open?: boolean; children: JSX.Element }) {
  const [open, setOpen] = createSignal(untrack(() => props.open === true))
  return <details open={untrack(open)} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{props.label}</summary>
    <Show when={open()}><div class={styles.flow}>{props.children}</div></Show>
  </details>
}

export function HealthBody(props: {
  ctx: PanelContext
  children: (data: Accessor<HealthView>) => JSX.Element
  select?: (data: HealthView) => unknown
}) {
  const health = useHealth()
  const result = createMemo<Read>(() => {
    const read = health.read()
    return read.value && props.select && props.select(read.value) == null ? { state: 'unavailable' } : read
  })
  return <States result={result} retry={props.ctx.refresh} reserveStaleSpace>
    <Show when={health.read().value}>{value => <div class={styles.flow}>{props.children(value)}</div>}</Show>
  </States>
}

export function rowId(row: Row, ...keys: string[]) {
  return JSON.stringify(keys.map(key => row[key]))
}
