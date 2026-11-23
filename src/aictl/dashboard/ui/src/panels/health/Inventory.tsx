import { createMemo, createSignal, Show, untrack } from 'solid-js'
import type { PanelProps, Read } from '../types'
import { States } from '../kinds/States'
import { useHealth } from './healthData'
import { date, Detail, fact, Facts, field, HealthBox, HealthTable } from './HealthParts'
import { StatTiles } from './HealthVisuals'
import { inventoryCounts } from './windowFacts'
import styles from './Health.module.css'

const fields = [
  field('name', 'Table'), field('rows', 'Extent rows'), field('extent_count', 'Extents'), field('extent_bytes', 'Extent size', 'bytes'),
  field('compressed_bytes', 'Compressed size', 'bytes'), field('original_bytes', 'Original size', 'bytes'), field('hot_bytes', 'Hot size', 'bytes'),
]

/** The physical tables of the database. A size no row reports is not shown as a column. */
export default function Inventory(props: PanelProps) {
  const ctx = untrack(() => props.ctx)
  const health = useHealth()
  const [query, setQuery] = createSignal('')
  const result = createMemo<Read>(() => {
    const read = health.readInventory()
    const term = query().trim().toLowerCase()
    if (!term || !Array.isArray(read.value)) return read
    const value = read.value.filter(table => typeof table?.name === 'string' && table.name.toLowerCase().includes(term))
    return { ...read, value, state: read.state === 'ready' && !value.length ? 'empty' : read.state }
  })
  const tables = () => Array.isArray(result().value) ? result().value as { name: string }[] : undefined
  const counts = createMemo(() => {
    const all = health.inventory()
    return all?.checked_at ? inventoryCounts(all.tables?.map(table => table.name)) : undefined
  })
  return <HealthBox def={props.def}>
    <States result={result} retry={ctx.refresh} reserveStaleSpace
      empty={query().trim() ? 'No matching table.' : 'No table rows reported.'}>
      <div class={styles.flow}>
        <Show when={health.inventory()?.checked_at}>
          <label class={styles.line}>Find a table
            <input class={styles.input} type="search" value={query()} onInput={event => setQuery(event.currentTarget.value)} />
          </label>
        </Show>
        <Show when={health.inventory()}>{inventory => <>
          <StatTiles items={[
            { label: 'Logical tables', value: counts()?.logical, detail: 'one per kind of record, all nodes' },
            { label: 'Physical tables', value: counts()?.physical, detail: 'per-node copies and legacy tables in the database' },
            ...(query().trim() ? [{ label: 'Shown', value: tables()?.length }] : []),
          ]} />
          <HealthTable ctx={ctx} label="Table inventory" fields={fields} rows={tables()} rowId={row => row.name} empty="No table rows reported." />
          <Detail label="Inventory details"><Facts ctx={ctx} items={[
            date('Inventory measured', inventory().checked_at), fact('Inventory scope', inventory().scope),
            fact('Size scope', inventory().size_scope), fact('Inventory status', inventory().status),
          ]} /></Detail>
        </>}</Show>
      </div>
    </States>
  </HealthBox>
}
