import { createMemo, createSignal, For, Show, untrack, type Accessor } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { at } from '../data'
import type { FieldRef, PanelContext, PanelDef, Read, Row } from '../types'
import { presentation, scalar } from '../kinds/model'
import { States } from '../kinds/States'
import { PanelState } from '../../ui/PanelState'
import { Table } from '../../ui/Table'
import { Stat } from '../../ui/Stat'
import { fmtBps, fmtBytes, fmtMs } from '../../design/format'
import { NA, NA_REASON, NONE, type HealthView, type StatusReason } from './healthModel'
import { useHealth } from './healthData'
import { Box } from '../../ui/Box'
import { nodeCell } from '../../data/nodeNames'
import styles from './Health.module.css'

type MetricField = FieldRef & { unit?: string }
type Fact = { field: MetricField; value: unknown; title?: string }
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
      return <div><dt title={item().title}>{meta().label}</dt><dd title={value() === undefined ? `${meta().label}: ${NA_REASON}` : undefined}>
        {value() === undefined ? NA : value() === '' ? NONE : meta().format(value()!)}</dd></div>
    }}</For></dl>
  }>
    <div class={styles.stats}><For each={props.items} keyed={item => item.field.path}>{item => {
      const value = () => scalar(item().value)
      return <Stat label={metric(props.ctx, item().field).label}
        value={value() === undefined ? undefined : metric(props.ctx, item().field).format(value()!)} />
    }}</For></div>
  </Show>
}

/** A cell says "n/a" when the source does not report the value and "none" when it reported an empty one; zero stays "0". */
export const cellText = (value: string | number | boolean | undefined) => value === undefined ? NA : value === '' ? NONE : value

export function HealthTable<T extends object>(props: {
  ctx: PanelContext; label: string; fields: readonly MetricField[]; rows: readonly T[] | undefined | null;
  rowId: (row: T) => string; empty?: string; action?: { label: (row: T) => string; run: (row: T) => void }
}) {
  // A column that no row reports says nothing, so it is not shown.
  const reported = createMemo(() => props.fields.filter(ref => (props.rows ?? []).some(row => scalar(at(row, ref.path)) !== undefined)))
  const fields = createMemo(() => reported().map(ref => {
    const meta = metric(props.ctx, ref)
    const raw = (row: T) => scalar(at(row, ref.path))
    const node = ref.path === 'node_id' ? nodeCell<T>(row => at(row, ref.path)) : undefined
    return { id: ref.path, label: meta.label, format: meta.format, read: (row: T) => cellText(node && raw(row) ? node.read(row) : raw(row)),
      hint: (row: T) => raw(row) === undefined ? `${meta.label}: ${NA_REASON}` : node?.hint(row) }
  }))
  return <Show when={props.rows?.length}
    fallback={<PanelState state={props.rows == null ? 'unavailable' : 'empty'} inline message={props.rows != null ? props.empty : undefined} />}>
    <div class={styles.grid} data-columns={fields().length > 10 ? 'wide' : fields().length > 5 ? 'many' : undefined}>
      <Table label={props.label} fields={fields()} rows={props.rows!} rowId={props.rowId} action={props.action} />
    </div>
  </Show>
}

export function Detail(props: { label: string; open?: boolean; hint?: string; children: JSX.Element }) {
  const [open, setOpen] = createSignal(untrack(() => props.open === true))
  return <details open={untrack(open)} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary title={props.hint}>{props.label}</summary>
    <Show when={open()}><div class={styles.flow}>{props.children}</div></Show>
  </details>
}

export function HealthBody(props: {
  ctx: PanelContext
  def: PanelDef
  children: (data: Accessor<HealthView>) => JSX.Element
  select?: (data: HealthView) => unknown
}) {
  const health = useHealth()
  const result = createMemo<Read>(() => {
    const read = health.read()
    return read.value && props.select && props.select(read.value) == null ? { state: 'unavailable' } : read
  })
  return <HealthBox def={props.def}>
    <States result={result} retry={props.ctx.refresh} reserveStaleSpace>
      <Show when={health.read().value}>{value => <div class={styles.flow}>{props.children(value)}</div>}</Show>
    </States>
  </HealthBox>
}

/** The fold, expand, full screen and hide controls of one Health panel, kept for the whole screen under one key. */
export function HealthBox(props: { def: PanelDef; children: JSX.Element }) {
  const { boxes } = useHealth()
  const id = untrack(() => props.def.id), title = untrack(() => props.def.title)
  return <>
    <Show when={boxes.is('hide', id)}>
      <button type="button" class={styles.restore} onClick={() => boxes.send({ type: 'restore', id })}>Show {title}</button>
    </Show>
    <Box boxes={boxes} id={id} label={title} corner head={<span hidden />}>{props.children}</Box>
  </>
}

export function rowId(row: Row, ...keys: string[]) {
  return JSON.stringify(keys.map(key => row[key]))
}

const levelName = { critical: 'Failing', warning: 'Warning', pending: 'Pending', limitation: 'Limited' } as const

/** The reasons of a health status, one compact row each. */
export function Reasons(props: { reasons: readonly StatusReason[] }) {
  return <Show when={props.reasons.length}>
    <ul class={styles.reasons} aria-label="Reasons for the health status">
      <For each={props.reasons} keyed={reason => reason.text}>{reason =>
        <li><span data-level={reason().level}>{levelName[reason().level]}</span> {reason().text}</li>}</For>
    </ul>
  </Show>
}
