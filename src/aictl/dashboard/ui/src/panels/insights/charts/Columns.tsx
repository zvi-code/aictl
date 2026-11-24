import { For, Show } from 'solid-js'
import { Tooltip } from '../../../ui/Tooltip'
import { repoClass, type BarPart, type LegendItem } from '../Bars'
import bars from '../Bars.module.css'
import styles from './Charts.module.css'

/** One column over an ordered axis (a bucket): its label under it, its value written over it, its segments stacked from 0. */
export type Column = { key: string; label: string; sub?: string; total: string; parts: BarPart[] }

const TONES = 10
export const toneClass = (tone: number) => bars[`t${((tone % TONES) + TONES) % TONES}`]
export const partClass = (part: BarPart) => part.repo == null ? toneClass(part.tone) : repoClass(part.repo)
const amount = (column: Column) => column.parts.reduce((sum, part) => sum + Math.max(0, part.value ?? 0), 0)
/** The largest column of several charts, for small multiples drawn on one scale. */
export const largestColumn = (columns: readonly Column[]) => Math.max(0, ...columns.map(amount))

/**
 * Columns over an ordered axis (a histogram of buckets). Every column on one linear scale from 0 to the largest column,
 * or to `max` when several charts share a scale. A segment per part (one per repository, or one coloured by its bucket);
 * every segment is a button whose hover holds its figures.
 */
export function Columns(props: { name: string; title: string; axis: string; columns: Column[]; legend?: LegendItem[]; max?: number }) {
  const top = () => props.max ?? largestColumn(props.columns)
  const height = (column: Column) => top() > 0 ? amount(column) / top() * 100 : 0
  return <Show when={props.columns.length}><figure class={styles.figure} data-chart={props.name}>
    <figcaption class={styles.caption}>
      <span class={styles.title}>{props.title}</span>
      <span class={styles.axis} data-axis>{props.axis}</span>
    </figcaption>
    <Show when={props.legend?.length}>
      <ul class={styles.legend} aria-label={`${props.title}: legend`}>
        <For each={props.legend}>{item => <li><span class={`${styles.swatch} ${toneClass(item.tone)}`} />{item.label}</li>}</For>
      </ul>
    </Show>
    <ol class={styles.columns} aria-label={props.title} style={{ 'grid-template-columns': `repeat(${props.columns.length}, minmax(0, 1fr))` }}>
      <For each={props.columns}>{column => <li class={styles.column} data-column={column.key}>
        <span class={styles.columnTotal} data-total>{column.total}</span>
        <span class={styles.well}>
          <span class={styles.columnStack} role="group" aria-label={`${column.label}: ${column.total}`}
            style={{ 'block-size': `${height(column).toFixed(2)}%` }}>
            <For each={column.parts.filter(part => (part.value ?? 0) > 0)}>{part => <span class={`${styles.columnPart} ${partClass(part)}`}
              style={{ 'flex-grow': String(part.value) }} data-part={part.key} data-repo={part.repo == null ? undefined : String(part.repo)}>
              <Tooltip class={styles.partButton} label={`${column.label}, ${part.label}: ${part.text}`} text={part.hover}
                onClick={() => undefined}><span /></Tooltip>
            </span>}</For>
          </span>
        </span>
        <span class={styles.columnLabel}>{column.label}<Show when={column.sub}><small>{column.sub}</small></Show></span>
      </li>}</For>
    </ol>
  </figure></Show>
}
