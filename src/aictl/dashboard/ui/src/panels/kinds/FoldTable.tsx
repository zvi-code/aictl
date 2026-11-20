import { createMemo, createSignal, Show } from 'solid-js'
import { Table } from '../../ui/Table'
import { compareFieldValues, type Field } from '../../ui/tableModel'
import type { KeyedRow } from '../types'
import table from '../../ui/Table.module.css'
import styles from './kinds.module.css'

type Entry = { row: KeyedRow; depth: number; folded: boolean }

export default function FoldTable(props: {
  label: string; fields: readonly Field<KeyedRow>[]; rows: readonly KeyedRow[]; pageSize?: number
  action: (row: KeyedRow) => { label: string; run: () => void } | undefined
}) {
  const [folds, setFolds] = createSignal<ReadonlyMap<string, boolean>>(new Map())
  const children = createMemo(() => {
    const byId = new Set(props.rows.map(row => row.id))
    const children = new Map<string | undefined, KeyedRow[]>()
    for (const row of props.rows) {
      const parent = row.parent && byId.has(row.parent) ? row.parent : undefined
      const list = children.get(parent) ?? []
      list.push(row)
      children.set(parent, list)
    }
    return children
  })
  const orderRows = (sort?: { id: string; desc: boolean }): Entry[] => {
    const field = props.fields.find(field => field.id === sort?.id)
    const folded = folds(), groups = children()
    const visible: Entry[] = []
    const visit = (parent: string | undefined, depth: number) => {
      const members = groups.get(parent) ?? []
      for (const row of field ? [...members].sort((a, b) => compareFieldValues(field.read(a), field.read(b), sort?.desc)) : members) {
        const closed = folded.get(row.id) ?? row.folded ?? false
        visible.push({ row, depth, folded: closed })
        if (!closed) visit(row.id, depth + 1)
      }
    }
    visit(undefined, 0)
    return visible
  }
  const fields = createMemo(() => props.fields.map(({ read, action, ...field }): Field<Entry> => ({
    ...field, read: entry => read(entry.row),
    action: action && { label: entry => action.label(entry.row), run: entry => action.run(entry.row) },
  })))
  const rows = createMemo(() => orderRows())
  return <Table label={props.label} pageSize={props.pageSize}
    minWidth={`calc(${props.fields.length} * var(--space-8) * 2)`}
    fields={fields()} rows={rows()} rowId={entry => entry.row.id}
    orderRows={sort => sort ? orderRows(sort) : rows()}
    primaryCell={(entry, text, content) =>
      <span class={styles.treeCell} style={{ 'padding-inline-start': `calc(${Math.min(entry().depth, 5)} * var(--space-4))` }}>
        <Show when={entry().row.folded !== undefined}>
          <button class={`${table.action} ${styles.foldButton}`} type="button" aria-expanded={entry().folded ? 'false' : 'true'}
            aria-label={`${entry().folded ? 'Unfold' : 'Fold'} ${text()}`}
            onClick={() => setFolds(old => new Map(old).set(entry().row.id, !entry().folded))}>
            {entry().folded ? '▸' : '▾'}
          </button>
        </Show>
        <Show when={props.action(entry().row)} fallback={content}>{action =>
          <button class={table.action} type="button" aria-label={action().label}
            onClick={() => action().run()}>{content}</button>
        }</Show>
      </span>} />
}
