import { createEffect, createMemo, createSignal, type ParentProps } from 'solid-js'
import { createResourceCache } from '../../../data/resource'
import { at } from '../../data'
import { keyedRows, nodeColumn, presentation, presentFields, scalar } from '../../kinds/model'
import { States } from '../../kinds/States'
import type { DetailState, FieldRef, PanelContext, Read, Row } from '../../types'
import { Table } from '../../../ui/Table'
import { measured, MetricItems } from '../Summary'
import type { Field } from '../../../ui/tableModel'
import styles from './boardB.module.css'

export { styles }
export type Entry = ReturnType<typeof keyedRows>[number]
export const entries = keyedRows
export { measured as number }
export const text = (value: unknown) => typeof value === 'string' && value ? value : undefined
export const join = (value: unknown) => Array.isArray(value) ? value.map(scalar).filter(x => x != null).join(', ') : undefined
export const identity = (...values: unknown[]) => JSON.stringify(values)
export const toolName = (ctx: PanelContext, id: string) => ctx.board('tool_labels')?.[id] ?? id

export function withRows(read: Read, rows: readonly unknown[]): Read {
  if (read.state !== 'ready') return read
  return rows.length ? read : { state: 'empty' }
}

export function detailRead<T>(detail: DetailState<T> | undefined, value: unknown, paused = false): Read {
  if (!detail || detail.status === 'loading') return { state: 'loading' }
  const message = detail.error instanceof Error ? detail.error.message : detail.error ? String(detail.error) : undefined
  if (value == null) return { state: detail.status === 'error' ? 'error' : 'unavailable', message }
  if (paused || detail.status === 'refreshing' || detail.status === 'stale') return { state: 'stale', value, message }
  return { state: Array.isArray(value) && !value.length ? 'empty' : 'ready', value }
}

export function scopedPath(ctx: PanelContext, view: string, extra?: URLSearchParams) {
  const query = new URLSearchParams(extra)
  query.set('scope', ctx.scope())
  if (ctx.scope() === 'node') query.set('node_id', ctx.nodeId() ?? '')
  return `/api/board/${view}?${query}`
}

export function scopeMatches(ctx: PanelContext, value: { node_scope?: { kind: string; node_id: string | null } }) {
  return value.node_scope?.kind === ctx.scope() && (ctx.scope() !== 'node' || value.node_scope.node_id === ctx.nodeId())
}

export function View(props: ParentProps<{ result: () => Read; empty?: string; retry: () => void; reserveStaleSpace?: boolean }>) {
  return <States result={props.result} empty={props.empty} retry={props.retry} reserveStaleSpace={props.reserveStaleSpace ?? true}>
    <div class={styles.stack}>{props.children}</div>
  </States>
}

export function displayField(ctx: PanelContext, field: FieldRef) {
  const p = presentation(ctx, field)
  const unit = p.unit
  const format = (value: string | number | boolean) => {
    if (typeof value !== 'number') return p.format(value)
    if (unit === 'bytes/s' || unit === 'rate_bps') return `${p.format(value)} B/s`
    if (unit === 'ms') return `${p.format(value)} ms`
    return p.format(value)
  }
  return { ...p, format }
}

export function useCached<T>(cache: ReturnType<typeof createResourceCache<string, T>>, path: () => string | undefined, revision: () => number) {
  const [handle, setHandle] = createSignal<{ path: string; resource: ReturnType<typeof cache.acquire> }>()
  createEffect(path, key => {
    if (!key) { setHandle(undefined); return }
    const resource = cache.acquire(key)
    setHandle({ path: key, resource })
    return () => resource.release()
  })
  const current = () => handle()?.path === path() ? handle()?.resource : undefined
  createEffect(revision, value => { if (value) void current()?.refetch() })
  return () => current()?.state
}

export function Metrics(props: { ctx: PanelContext; columns: readonly FieldRef[]; value: unknown; fixed?: boolean }) {
  return <div class={props.fixed ? styles.fixedMetrics : styles.metrics}>
    <MetricItems ctx={props.ctx} columns={props.columns} value={props.value} describe={displayField} />
  </div>
}

type Action = { label: (entry: Entry) => string; run: (entry: Entry) => void }
export function DataTable(props: {
  ctx: PanelContext; label: string; columns: readonly FieldRef[]; rows: readonly Entry[]
  action?: Action; fields?: readonly Field<Entry>[]
}) {
  const node = createMemo(() => nodeColumn(props.ctx.scope(), props.rows))
  const fields = createMemo(() => presentFields([
    ...(node() ? [{ path: 'node_id', label: 'Node' }] : []),
    ...props.columns,
  ].map<Field<Entry>>(column => {
    const { label, format } = displayField(props.ctx, column)
    return { id: column.path, label, read: ({ row }: Entry) => scalar(at(row, column.path)), format }
  }).concat(props.fields ?? []), props.rows))
  // Hidden columns from the earlier per-panel menu carry over once.
  return <Table label={props.label} fields={fields()} rows={props.rows} rowId={entry => entry.id} action={props.action}
    legacyKeys={{ hidden: `aictl-panel-columns-${props.label}` }} />
}

export function rowsFrom<T extends Row>(values: readonly T[], key: (value: T) => string) {
  const seen = new Set<string>()
  return values.flatMap(row => {
    const id = key(row)
    if (seen.has(id)) return []
    seen.add(id)
    return [{ id, row }]
  })
}
