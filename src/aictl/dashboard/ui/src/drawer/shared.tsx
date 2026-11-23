import { For, Show, type Accessor } from 'solid-js'
import type { JSX } from '@solidjs/web'
import type { BoardAgentRow, DetailAgent, TopicRuntimeAgent } from '../data/contract.gen'
import { fmtBytes, fmtMs, fmtN, fmtUsd, stamp, stampSec } from '../design/format'
import type { DetailResource, PanelContext, Row } from '../panels/types'
import type { DrawerEntry, DrawerProps } from '../shell/drawerTypes'
import { Chart } from '../ui/Chart'
import { PanelState } from '../ui/PanelState'
import { Stat } from '../ui/Stat'
import type { Field } from '../ui/tableModel'
import { Table, actionColumnId } from '../ui/Table'
import styles from './drawer.module.css'

export const NA = 'Not available from this source'
export const clip = (value: string | null | undefined, length: number) =>
  value && value.length > length ? `${value.slice(0, length)}…` : value ?? ''
export const slotColor = (index: number) => `var(--color-chart-${index % 4 + 1})`
export const labelOf = (name: string) => name.replaceAll('_', ' ').replace(/^./, c => c.toUpperCase())
export const rowId = (...parts: readonly unknown[]) => JSON.stringify(parts)
export const text = (value: unknown) => typeof value === 'string' ? value : undefined
export const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined
export const records = (value: unknown): Row[] | undefined => Array.isArray(value) ? value.filter(
  (item): item is Row => typeof item === 'object' && item !== null && !Array.isArray(item)) : undefined

export type Reference = { field: 'step_key' | 'turn_id' | 'request_id' | 'message_id' | 'tool_call_id' | 'span_id' | 'round_id' | 'trace_id'; id: string; traceId?: string }
/** `failedAt`: open Flow at the failed call or request that happened at this time (seconds), as the Failures tab lists it. */
export type AgentEntry = Extract<DrawerEntry, { type: 'agent' }> & { flowRef?: Reference; turnId?: string; failedAt?: number }
export type TabProps = {
  shell: DrawerProps
  entry: AgentEntry
  detail: DetailResource<DetailAgent>
  agent: Accessor<BoardAgentRow | undefined>
  runtime: Accessor<TopicRuntimeAgent | undefined>
  session: Accessor<string | undefined>
}

export function path(ctx: PanelContext, route: string, values: Record<string, string | number | boolean | null | undefined> = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) if (value != null && value !== '') params.set(key, String(value))
  if (ctx.scope() !== 'local') params.set('scope', ctx.scope())
  if (ctx.scope() === 'node') params.set('node_id', ctx.nodeId() ?? '')
  return params.size ? `${route}?${params}` : route
}

export function agentPath(props: TabProps, suffix = '', values: Parameters<typeof path>[2] = {}) {
  return path(props.shell.ctx, `/api/board/agent${suffix}`, { id: props.entry.id, ...values })
}

export function sessionPath(props: TabProps, route: string, values: Parameters<typeof path>[2] = {}) {
  const session_id = props.session()
  return session_id ? path(props.shell.ctx, route, { session_id, ...values }) : undefined
}

export function openAgent(props: TabProps, id: string, tab = 'flow', extra?: Partial<AgentEntry>) {
  if (id) props.shell.open({ ...extra, type: 'agent', id, tab } as AgentEntry)
}

/** `what` names the read in its error: "Could not load the file versions: …". */
export function Resource<T>(props: {
  read: DetailResource<T>; children: (data: Accessor<T>) => JSX.Element; unavailable?: string; what?: string
}) {
  const state = () => props.read()
  return <Show when={state()?.data != null} fallback={
    state()?.status === 'error'
      ? <PanelState state="error" message={`Could not load ${props.what ?? 'this'}: ${String(state()?.error ?? '').replace(/^Error: /, '')}`} onRetry={props.read.retry} />
      : state() ? <PanelState state="loading" /> : <PanelState state="unavailable" message={props.unavailable} />
  }>
    <Show when={state()?.status === 'stale' || state()?.status === 'refreshing'}>
      <PanelState state="stale" onRetry={props.read.retry} />
    </Show>
    {props.children(() => state()!.data!)}
  </Show>
}

export function Section(props: { title: string; children: JSX.Element }) {
  return <section class={styles.section}><h3>{props.title}</h3>{props.children}</section>
}

export type Measure = { label: string; value?: string | number | null; unit?: string; detail?: string }
export function Stats(props: { items: readonly Measure[] }) {
  return <div class={styles.stats}><For each={props.items} keyed={item => item.label}>{item =>
    <Stat label={item().label} value={item().value} unit={item().unit} detail={item().detail} />
  }</For></div>
}

// The drawer saved widths by position before every table had column controls.
const legacyWidths = (label: string, fields: readonly Field<never>[], action: boolean) => ({
  widths: `aictl.drawer.columns.v1:${JSON.stringify([label, fields.map(field => field.id), action])}`,
  widthIds: [...fields.map(field => field.id), ...(action ? [actionColumnId] : [])],
})

type ColumnFormat = 'number' | 'time' | 'timeSec' | 'bytes' | 'path' | 'usd' | 'ms' | 'id'
type Column = string | readonly [key: string, label: string, format?: ColumnFormat]

/** A column named for its unit shows that unit: a cost is money and a time in milliseconds is a duration, never a rounded count. */
const unitOf = (key: string): ColumnFormat | undefined => /_usd$/.test(key) ? 'usd' : /_ms$/.test(key) ? 'ms' : undefined
export function Rows<T extends object>(props: {
  label: string; rows?: readonly T[] | null; columns: readonly Column[]; identity: readonly string[];
  action?: { label: (row: T) => string; run: (row: T) => void }; empty?: string
  /** Run the action from this column's cell instead of a separate Actions column. */
  actionColumn?: string
  /** More cell actions, by column key, besides the one of `actionColumn`. */
  columnActions?: Readonly<Record<string, { label: (row: T) => string; run: (row: T) => void }>>
  /** Text shown on hover for a column's cell, by column key. */
  hints?: Readonly<Record<string, (row: T) => string | undefined>>
}) {
  const fields = (): Field<T>[] => props.columns.map(column => {
    const [key, label, explicit] = typeof column === 'string'
      ? [column, labelOf(column).replace(/ usd$/, ' (USD)').replace(/ ms$/, ''), undefined] : column
    const format = explicit ?? unitOf(key)
    return {
      id: key, label, read: row => {
        const value = (row as Row)[key]
        return number(value) ?? text(value) ?? (typeof value === 'boolean' ? value : undefined)
      },
      ...(format === 'path' ? { clip: 'start' as const } : format ? { format: (value: unknown) => {
        const n = number(value)
        return n == null ? NA : format === 'time' ? stamp(n, true) : format === 'timeSec' ? stampSec(n) : format === 'bytes' ? fmtBytes(n)
          : format === 'id' ? String(n) : format === 'usd' ? fmtUsd(n) : format === 'ms' ? fmtMs(n) : fmtN(n)
      } } : {}),
      ...(key === props.actionColumn ? { action: props.action } : {}),
      ...(props.columnActions?.[key] ? { action: props.columnActions[key] } : {}),
      ...(props.hints?.[key] ? { hint: props.hints[key] } : {}),
    }
  })
  return <Show when={props.rows != null} fallback={<PanelState state="unavailable" />}>
    <Show when={props.rows!.length} fallback={<PanelState state="empty" message={props.empty} />}>
      <Table label={props.label} fields={fields()} rows={props.rows!} rowId={row => rowId(...props.identity.map(key => (row as Row)[key]))}
        action={props.actionColumn ? undefined : props.action} legacyKeys={legacyWidths(props.label, fields(), !props.actionColumn && !!props.action)} />
    </Show>
  </Show>
}

export function Series(props: {
  label: string; values?: readonly (number | null | undefined)[]; x?: readonly number[]; time?: boolean; unit?: string
}) {
  const values = () => props.values?.map(v => v ?? null)
  // The axis appends the unit to each tick: "200K tokens", but "40%".
  const unit = () => props.unit && props.unit !== '%' ? ` ${props.unit}` : props.unit
  return <Show when={values()?.some(v => v != null)} fallback={<PanelState state="unavailable" />}>
    <Chart label={props.label} description={props.label} unit={unit()}
      xAxis={props.time ? 'time' : 'number'} series={[{ label: props.label }]}
      points={values()!.map((value, index) => ({ x: props.x?.[index] ?? index + 1, values: [value] }))} />
  </Show>
}
