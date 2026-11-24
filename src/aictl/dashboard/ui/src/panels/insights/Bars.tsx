import { For, Show } from 'solid-js'
import { Tooltip } from '../../ui/Tooltip'
import styles from './Bars.module.css'

/** One segment of a bar: its value sets its length, its text is written on it, its hover holds the figures behind it. */
export type BarPart = { key: string; label: string; value: number | null; text: string; hover: string; tone: number }
/** One bar: a label, the segments (one for a plain bar), and the value written beside it. */
export type BarRow = { key: string; label: string; title?: string; sub?: string; parts: BarPart[]; total: string }
export type LegendItem = { label: string; tone: number }

const TONES = 10
const toneClass = (tone: number) => styles[`t${((tone % TONES) + TONES) % TONES}`]
const amount = (row: BarRow) => row.parts.reduce((sum, part) => sum + Math.max(0, part.value ?? 0), 0)

/**
 * Labelled horizontal bars. `shared`: every bar on one linear scale from 0 to the largest row (the axis line says so);
 * `whole`: every bar is its row's whole, so its segments are the parts of 100%.
 */
export function Bars(props: {
  name: string; title: string; axis: string; rows: BarRow[]; legend?: LegendItem[]; scale?: 'shared' | 'whole'
}) {
  const largest = () => Math.max(0, ...props.rows.map(amount))
  const length = (row: BarRow) => props.scale === 'whole' ? (amount(row) > 0 ? 100 : 0)
    : largest() > 0 ? amount(row) / largest() * 100 : 0
  // No row to draw (every group below the card's minimum, or none in the period): no empty chart.
  return <Show when={props.rows.length}><figure class={styles.figure} data-chart={props.name}>
    <figcaption class={styles.caption}>
      <span class={styles.title}>{props.title}</span>
      <span class={styles.axis} data-axis>{props.axis}</span>
    </figcaption>
    <Show when={props.legend?.length}>
      <ul class={styles.legend} aria-label={`${props.title}: legend`}>
        <For each={props.legend}>{item => <li><span class={`${styles.swatch} ${toneClass(item.tone)}`} />{item.label}</li>}</For>
      </ul>
    </Show>
    <ol class={styles.rows} aria-label={props.title}>
      <For each={props.rows}>{row => <li class={styles.row} data-row={row.key}>
        <span class={styles.name} title={row.title}>{row.label}<Show when={row.sub}><small>{row.sub}</small></Show></span>
        <span class={styles.lane}>
          <span class={styles.stack} role="group" aria-label={`${row.label}: ${row.total}`} style={{ 'inline-size': `${length(row).toFixed(2)}%` }}>
            <For each={row.parts.filter(part => (part.value ?? 0) > 0)}>{part => <span class={`${styles.part} ${toneClass(part.tone)}`}
              style={{ 'flex-grow': String(part.value) }} data-part={part.key}>
              <Tooltip class={styles.partButton} label={`${row.label}, ${part.label}: ${part.text}`} text={part.hover}
                onClick={() => undefined}><span class={styles.partText}>{part.text}</span></Tooltip>
            </span>}</For>
          </span>
        </span>
        <span class={styles.total} data-total>{row.total}</span>
      </li>}</For>
    </ol>
  </figure></Show>
}
