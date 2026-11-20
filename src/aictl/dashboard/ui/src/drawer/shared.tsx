import { For, Show, type Accessor } from 'solid-js'
import type { JSX } from '@solidjs/web'
import type { BoardAgentRow, DetailAgent, TopicRuntimeAgent } from '../data/contract.gen'
import { fmtN, stamp } from '../design/format'
import type { DetailResource, PanelContext, Row } from '../panels/types'
import type { DrawerEntry, DrawerProps } from '../shell/islandTypes'
import { Chart } from '../ui/Chart'
import { PanelState } from '../ui/PanelState'
import { Stat } from '../ui/Stat'
import { Table } from '../ui/Table'
import type { Field } from '../ui/tableModel'
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
export type AgentEntry = Extract<DrawerEntry, { type: 'agent' }> & { flowRef?: Reference; turnId?: string }
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

export function Resource<T>(props: {
  read: DetailResource<T>; children: (data: Accessor<T>) => JSX.Element; unavailable?: string
}) {
  const state = () => props.read()
  return <Show when={state()?.data != null} fallback={
    state()?.status === 'error'
      ? <PanelState state="error" message={`Could not load this: ${String(state()?.error ?? '').replace(/^Error: /, '')}`} onRetry={props.read.retry} />
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

type Column = string | readonly [key: string, label: string, format?: 'number' | 'time']
export function Rows<T extends object>(props: {
  label: string; rows?: readonly T[] | null; columns: readonly Column[]; identity: readonly string[];
  action?: { label: (row: T) => string; run: (row: T) => void }; empty?: string
}) {
  const fields = (): Field<T>[] => props.columns.map(column => {
    const [key, label, format] = typeof column === 'string' ? [column, labelOf(column), undefined] : column
    return {
      id: key, label, read: row => {
        const value = (row as Row)[key]
        return number(value) ?? text(value) ?? (typeof value === 'boolean' ? value : undefined)
      },
      ...(format === 'time' ? { format: (value: unknown) => number(value) == null ? NA : stamp(number(value), true) }
        : format === 'number' ? { format: (value: unknown) => number(value) == null ? NA : fmtN(number(value)) } : {}),
    }
  })
  return <Show when={props.rows != null} fallback={<PanelState state="unavailable" />}>
    <Show when={props.rows!.length} fallback={<PanelState state="empty" message={props.empty} />}>
      <Table label={props.label} fields={fields()} rows={props.rows!} rowId={row => rowId(...props.identity.map(key => (row as Row)[key]))}
        action={props.action} />
    </Show>
  </Show>
}

export function Series(props: {
  label: string; values?: readonly (number | null | undefined)[]; x?: readonly number[]; time?: boolean; unit?: string
}) {
  const values = () => props.values?.map(v => v ?? null)
  return <Show when={values()?.some(v => v != null)} fallback={<PanelState state="unavailable" />}>
    <Chart label={props.label} description={props.label} unit={props.unit}
      xAxis={props.time ? 'time' : 'number'} series={[{ label: props.label }]}
      points={values()!.map((value, index) => ({ x: props.x?.[index] ?? index + 1, values: [value] }))} />
  </Show>
}
