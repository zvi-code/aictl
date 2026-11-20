import { createMemo, createSignal, lazy, Show, untrack, type Accessor } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Menu } from '../../ui/Menu'
import { at } from '../data'
import type { FieldRef, KeyedRow, PanelProps, RowOptions } from '../types'
import { keyedRows, nodeColumn, presentation, rowAction, scalar } from './model'
import { States } from './States'
import styles from './kinds.module.css'

type PanelRow = ReturnType<typeof keyedRows>[number]
const Table = lazy(() => import('../../ui/Table').then(module => ({ default: module.Table<PanelRow> })))
const FoldTable = lazy(() => import('./FoldTable'))

export type VisualRowOptions = RowOptions & {
  summary?: (rows: Accessor<readonly KeyedRow[] | undefined>) => JSX.Element
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
    if (value.state !== 'ready') return value
    if (!Array.isArray(value.value) || (value.value.length && !keyed().length)) return { state: 'unavailable' } as const
    return rows().length ? value : { state: 'empty' } as const
  }
  const visualRows = () => {
    const source = read()
    return Array.isArray(source.value) && (!source.value.length || keyed().length)
      && (source.state === 'ready' || source.state === 'stale' || source.state === 'empty') ? rows() : undefined
  }
  return <>
    {setup?.summary?.(visualRows)}
    {setup?.controls}
    {setup?.description}
    <States result={result} empty={setup?.empty?.() ?? def.empty} retry={setup?.retry ?? ctx.refresh} reserveStaleSpace>
    <Show when={rows().length} fallback={<p>{setup?.empty?.() ?? def.empty ?? 'No results'}</p>}>
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
    </Show>
    </States>
  </>
}

export function RowTable(props: {
  panel: PanelProps; rows: readonly KeyedRow[]; columns?: readonly FieldRef[]; label?: string
  action?: (row: KeyedRow) => { label: string; run: () => void } | undefined
}) {
  const { ctx, def } = untrack(() => props.panel)
  const columns = () => props.columns ?? def.columns
  const fields = createMemo(() => [
    ...columns(),
    ...(nodeColumn(ctx.scope(), props.rows) && !columns().some(field => field.path === 'node_id')
      ? [{ path: 'node_id', label: 'Node' }] : []),
  ].map(field => {
    const { label, format } = presentation(ctx, field)
    return { id: field.path, label, read: ({ row }: KeyedRow) => scalar(at(row, field.path)), format }
  }))
  const action = (entry: KeyedRow) => props.action ? props.action(entry) : rowAction(def, ctx, entry.row)
  return <Show when={props.rows.some(row => row.folded !== undefined)}
    fallback={<Table label={props.label ?? def.title} fields={fields()} rows={props.rows} rowId={row => row.id}
      action={props.action || def.actions.length ? {
        label: entry => action(entry)?.label ?? '', run: entry => action(entry)?.run(),
      } : undefined} />}>
    <FoldTable label={props.label ?? def.title} fields={fields()} rows={props.rows} action={action} />
  </Show>
}
