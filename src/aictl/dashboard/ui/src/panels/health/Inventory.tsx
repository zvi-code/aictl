import { createMemo, createSignal, Show } from 'solid-js'
import type { PanelProps, Read, RowOptions } from '../types'
import { useHealth } from './healthData'
import { date, Detail, fact, Facts } from './HealthParts'
import { StatTiles } from './HealthVisuals'
import styles from './Health.module.css'

export function setupInventory(props: PanelProps): RowOptions {
  const health = useHealth()
  const [query, setQuery] = createSignal('')
  const result = createMemo<Read>(() => {
    const read = health.readInventory()
    const term = query().trim().toLowerCase()
    if (!term || !Array.isArray(read.value)) return read
    const value = read.value.filter(table => typeof table?.name === 'string' && table.name.toLowerCase().includes(term))
    return { ...read, value, state: read.state === 'ready' && !value.length ? 'empty' : read.state }
  })
  return {
    result,
    empty: () => query().trim() ? 'No matching table.' : undefined,
    controls: <Show when={health.inventory()?.checked_at}>
      <label class={styles.line}>Find a table
        <input class={styles.input} type="search" value={query()} onInput={event => setQuery(event.currentTarget.value)} />
      </label>
    </Show>,
    description: <Show when={health.inventory()}>{inventory => <>
      <StatTiles items={[
        { label: 'Tables measured', value: inventory().checked_at ? inventory().tables?.length : undefined,
          detail: result().state === 'stale' ? 'Last available inventory' : undefined },
        { label: 'Tables listed', value: Array.isArray(result().value) ? (result().value as unknown[]).length : undefined },
      ]} />
      <Detail label="Inventory details"><Facts ctx={props.ctx} items={[
        date('Inventory measured', inventory().checked_at), fact('Inventory scope', inventory().scope),
        fact('Size scope', inventory().size_scope), fact('Inventory status', inventory().status),
        fact('Retention', undefined),
      ]} /></Detail>
    </>}</Show>,
  }
}
