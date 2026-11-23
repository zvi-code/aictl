import { createMemo, lazy, Show, untrack, type Accessor } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { fmtN, fmtUsd } from '../../design/format'
import { at } from '../data'
import type { FieldRef, KeyedRow, PanelProps, Read, RowOptions } from '../types'
import { keyedRows, nodeColumn, presentation, presentFields, rowAction, scalar } from './model'
import { States } from './States'
import type { TableProps } from '../../ui/Table'

type PanelRow = ReturnType<typeof keyedRows>[number]
const Table = lazy(() => import('../../ui/Table').then(module => ({ default: module.Table<PanelRow> })))
const FoldTable = lazy(() => import('./FoldTable'))
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
    <RowTable panel={props} rows={rows()} tableId={def.id} pageSize={setup?.flowColumns ? pageSize : undefined}
      defaultHidden={setup?.flowColumns && def.columns.slice(1).flatMap(field => setup.flowColumns!.includes(field.path) ? [] : [field.path])}
      legacyKeys={setup?.flowColumns ? { visible: `aictl-panel-visible-columns-v1-${def.id}` } : { hidden: `aictl-panel-columns-${def.id}` }} />
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
  /** Rows sorted by the caller (the server); only the listed columns can be sorted. */
  sorted?: { sort: { id: string; desc: boolean } | undefined; onSort: (column: string) => void; columns: ReadonlySet<string> }
  /** The narrowest the table may get before its region scrolls sideways. */
  minWidth?: string
} & Pick<TableProps<KeyedRow>, 'tableId' | 'defaultHidden' | 'legacyKeys'>) {
  const { ctx, def } = untrack(() => props.panel)
  const columns = () => props.columns ?? def.columns
  const fields = createMemo(() => presentFields([
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
    const hint = field.hint
    return {
      id: field.path, label, read, numeric, format,
      sortable: props.sorted ? props.sorted.columns.has(field.path) : undefined,
      hint: hint ? ({ row }: KeyedRow) => { const text = at(row, hint); return typeof text === 'string' && text ? text : undefined } : undefined,
      compact: unit === 'count' || unit === 'tokens' || unit === 'usd' ? (value: number) => {
        if (Math.abs(value) >= 1000) return unit === 'usd' ? fmtUsd(value) : fmtN(value)
      } : undefined,
      action: index === 0 && (props.action || def.actions.length)
        ? { label: (entry: KeyedRow) => action(entry)?.label, run: (entry: KeyedRow) => action(entry)?.run() } : undefined,
    }
  }), props.rows.filter(row => row.row.kind !== 'group')))
  const action = (entry: KeyedRow) => props.action ? props.action(entry) : rowAction(def, ctx, entry.row)
  return <Show when={props.rows.some(row => row.folded !== undefined)}
    fallback={<Table label={props.label ?? def.title} pageSize={props.pageSize} fields={fields()} rows={props.rows} rowId={row => row.id}
      sorted={props.sorted ? { sort: props.sorted.sort, onSort: field => props.sorted?.onSort(field.id) } : undefined}
      minWidth={props.minWidth} tableId={props.tableId} defaultHidden={props.defaultHidden} legacyKeys={props.legacyKeys} />}>
    <FoldTable label={props.label ?? def.title} pageSize={props.pageSize} fields={fields()} rows={props.rows} action={action}
      tableId={props.tableId} defaultHidden={props.defaultHidden} legacyKeys={props.legacyKeys} />
  </Show>
}
