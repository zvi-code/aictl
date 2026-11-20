import { createMemo, createSignal, lazy, Show, untrack, type Accessor } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Menu } from '../../ui/Menu'
import { fmtN, fmtUsd } from '../../design/format'
import { at } from '../data'
import type { FieldRef, KeyedRow, PanelProps, Read, RowOptions } from '../types'
import { keyedRows, nodeColumn, presentation, rowAction, scalar } from './model'
import { States } from './States'
import styles from './kinds.module.css'

type PanelRow = ReturnType<typeof keyedRows>[number]
const Table = lazy(() => import('../../ui/Table').then(module => ({ default: module.Table<PanelRow> })))
const FoldTable = lazy(() => import('./FoldTable'))
const ColumnChooser = lazy(() => import('./TableColumns'))
const pageSize = 10
const numericUnits = new Set(['bytes', 'count', 'epoch_s', 'ms', 'percent', 'ratio', 'seconds', 'tokens', 'usd'])

export type VisualRowOptions = RowOptions & {
  summary?: (rows: Accessor<readonly KeyedRow[] | undefined>) => JSX.Element
  status?: (read: Accessor<Read>) => JSX.Element
  flowColumns?: readonly string[]
}

export default function Rows(props: PanelProps & { setup?: (props: PanelProps) => VisualRowOptions }) {
  const { ctx, def } = untrack(() => props)
  const identity = 'rowIdentity' in def ? def.rowIdentity : undefined
  const setup: VisualRowOptions | undefined = untrack(() => (props.setup ?? ('setup' in def ? def.setup : undefined))?.(props))
  const read = createMemo(() => setup?.result() ?? ctx.read(def.sources[0]))
  const keyed = createMemo(() => setup?.rows?.() ?? keyedRows(read(), identity))
  const rows = createMemo(() => keyed().filter(({ row }) =>
    !def.actions.some(action => action.kind === 'agent' && action.excludeStopped && ctx.stopped(String(at(row, action.field))))))
  const key = `aictl-panel-columns-${def.id}`
  const [hidden, setHidden] = createSignal<ReadonlySet<string>>((() => {
    try {
      const data: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
      return new Set(Array.isArray(data) ? data.filter((id): id is string => typeof id === 'string') : [])
    } catch { return new Set<string>() }
  })())
  const toggle = (id: string) => {
    const next = new Set(hidden())
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setHidden(next)
    try { localStorage.setItem(key, JSON.stringify([...next])) } catch { /* No storage. */ }
  }
  const result = () => {
    const value = read()
    if (value.state !== 'ready' && !(setup?.status && value.state === 'stale')) return value
    if (!Array.isArray(value.value) || (value.value.length && !keyed().length)) {
      return { ...value, state: 'unavailable' } as const
    }
    return rows().length || value.state === 'stale' ? value : { ...value, state: 'empty' } as const
  }
  const visualRows = () => {
    const source = read()
    return Array.isArray(source.value) && (!source.value.length || keyed().length)
      && (source.state === 'ready' || source.state === 'stale' || source.state === 'empty') ? rows() : undefined
  }
  const contents = () => <Show when={rows().length} fallback={
    setup?.status ? undefined : <p>{setup?.empty?.() ?? def.empty ?? 'No results'}</p>}>
    <Show when={setup?.flowColumns} fallback={<>
      <Show when={def.kind === 'table' && def.columns.length > 1}>
        <div class={styles.chartTools}><Menu label={`${def.title} columns`} items={def.columns.map(field => ({
          id: field.path,
          label: `${hidden().has(field.path) ? 'Show' : 'Hide'} ${presentation(ctx, field).label}`,
          disabled: (rows().some(row => row.folded !== undefined) && field === def.columns[0]) ||
            (!hidden().has(field.path) && def.columns.filter(item => !hidden().has(item.path)).length <= 1),
          onSelect: () => toggle(field.path),
        }))} /></div>
      </Show>
      <RowTable panel={props} rows={rows()} columns={def.columns.filter(field => !hidden().has(field.path))} />
    </>}>{defaults =>
      <ColumnChooser id={def.id} title={def.title} columns={def.columns} defaults={defaults()}
        label={field => presentation(ctx, field).label}>
        {columns => <RowTable panel={props} rows={rows()} columns={columns()} pageSize={pageSize} />}
      </ColumnChooser>
    }</Show>
  </Show>
  return <>
    {setup?.status?.(result)}
    {setup?.summary?.(visualRows)}
    {setup?.controls}
    {setup?.description}
    {setup?.status ? <Show when={result().state === 'ready' || result().state === 'stale'}>{contents()}</Show> :
      <States result={result} empty={setup?.empty?.() ?? def.empty} retry={setup?.retry ?? ctx.refresh}
        reserveStaleSpace={!setup?.flowColumns}>{contents()}</States>}
  </>
}

export function RowTable(props: {
  panel: PanelProps; rows: readonly KeyedRow[]; columns?: readonly FieldRef[]; label?: string; pageSize?: number
  action?: (row: KeyedRow) => { label: string; run: () => void } | undefined
}) {
  const { ctx, def } = untrack(() => props.panel)
  const columns = () => props.columns ?? def.columns
  const fields = createMemo(() => [
    ...columns(),
    ...(nodeColumn(ctx.scope(), props.rows) && !columns().some(field => field.path === 'node_id')
      ? [{ path: 'node_id', label: 'Node' }] : []),
  ].map((field, index) => {
    const { label, format, unit } = presentation(ctx, field)
    const read = ({ row }: KeyedRow) => scalar(at(row, field.path))
    let numeric: boolean | undefined
    if (props.pageSize && unit !== undefined && numericUnits.has(unit)) {
      const sample = props.rows.find(entry => read(entry) != null)
      numeric = !sample || typeof read(sample) === 'number'
    }
    return {
      id: field.path, label, read, numeric, format,
      compact: unit === 'count' || unit === 'tokens' || unit === 'usd' ? (value: number) => {
        if (Math.abs(value) >= 1000) return unit === 'usd' ? fmtUsd(value) : fmtN(value)
      } : undefined,
      action: props.pageSize && index === 0 && (props.action || def.actions.length)
        ? { label: (entry: KeyedRow) => action(entry)?.label, run: (entry: KeyedRow) => action(entry)?.run() } : undefined,
    }
  }))
  const action = (entry: KeyedRow) => props.action ? props.action(entry) : rowAction(def, ctx, entry.row)
  return <Show when={props.rows.some(row => row.folded !== undefined)}
    fallback={<Table label={props.label ?? def.title} pageSize={props.pageSize} fields={fields()} rows={props.rows} rowId={row => row.id}
      action={!props.pageSize && (props.action || def.actions.length) ? {
        label: entry => action(entry)?.label ?? '', run: entry => action(entry)?.run(),
      } : undefined} />}>
    <FoldTable label={props.label ?? def.title} pageSize={props.pageSize} fields={fields()} rows={props.rows} action={action} />
  </Show>
}
