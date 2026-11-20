import { createSignal, For, untrack, type Accessor } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Popover } from '../../ui/Popover'
import type { FieldRef } from '../types'
import styles from './kinds.module.css'

export default function TableColumns(props: {
  id: string; title: string; columns: readonly FieldRef[]; defaults: readonly string[]
  label: (column: FieldRef) => string
  children: (columns: Accessor<readonly FieldRef[]>) => JSX.Element
}) {
  const key = untrack(() => `aictl-panel-visible-columns-v1-${props.id}`)
  const [selected, setSelected] = createSignal<ReadonlySet<string>>((() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
      if (Array.isArray(saved)) return new Set(saved.filter((id): id is string => typeof id === 'string'))
    } catch { /* No storage. */ }
    return new Set(props.defaults)
  })())
  const save = (next: ReadonlySet<string>) => {
    setSelected(next)
    try { localStorage.setItem(key, JSON.stringify([...next])) } catch { /* No storage. */ }
  }
  const visible = (column: FieldRef) => column === props.columns[0] || selected().has(column.path)
  return <>
    <div class={styles.tableTools}>
      <Popover label="Columns" title={`${props.title} columns`}>
        <div class={styles.columnChoices}>
          <For each={props.columns.slice(1)}>{column =>
            <label>
              <input type="checkbox" checked={visible(column)} onChange={event => {
                const next = new Set(selected())
                if (event.currentTarget.checked) next.add(column.path)
                else next.delete(column.path)
                save(next)
              }} />
              {props.label(column)}
            </label>
          }</For>
        </div>
        <button type="button" class={styles.button} onClick={() => save(new Set(props.defaults))}>Reset columns</button>
      </Popover>
    </div>
    {props.children(() => props.columns.filter(visible))}
  </>
}
