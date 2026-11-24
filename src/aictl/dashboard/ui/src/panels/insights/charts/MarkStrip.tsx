import { For, Show } from 'solid-js'
import { Tooltip } from '../../../ui/Tooltip'
import styles from './Charts.module.css'

/** One mark on a row's axis: a median, a 90th percentile, an average. `shape` tells them apart on the strip and in the legend. */
export type StripMark = { key: string; label: string; value: number | null; text: string; hover: string; shape: 'dot' | 'tick' | 'ring' }
/** `total`: the marks' values written at the row's end, so close marks never overlap their labels. */
export type StripRow = { key: string; label: string; sub?: string; marks: StripMark[]; total: string }
/** A labelled line across every row (a bucket boundary), so a mark can be read against it. */
export type StripRef = { value: number; label: string }

const SHAPES: Record<StripMark['shape'], string> = { dot: styles.dot, tick: styles.tick, ring: styles.ring }

/**
 * A percentile strip: per row, its marks on one linear axis from 0 to the largest mark, a band from the lowest mark to
 * the highest, the marks' values at the row's end, and the reference lines (within the axis) across every row.
 */
export function MarkStrip(props: {
  name: string; title: string; axis: string; rows: StripRow[]; refs?: StripRef[]; legend: { label: string; shape: StripMark['shape'] }[]
  format: (value: number) => string
}) {
  const top = () => Math.max(0, ...props.rows.flatMap(row => row.marks.map(mark => mark.value ?? 0)))
  const at = (value: number) => top() > 0 ? Math.min(100, value / top() * 100) : 0
  const shown = (row: StripRow) => row.marks.filter(mark => mark.value != null)
  const refs = () => (props.refs ?? []).filter(ref => ref.value <= top())
  return <Show when={props.rows.length}><figure class={styles.figure} data-chart={props.name}>
    <figcaption class={styles.caption}>
      <span class={styles.title}>{props.title}</span>
      <span class={styles.axis} data-axis>{props.axis}</span>
    </figcaption>
    <ul class={styles.legend} aria-label={`${props.title}: legend`}>
      <For each={props.legend}>{item => <li><span class={`${styles.markSwatch} ${SHAPES[item.shape]}`} />{item.label}</li>}</For>
    </ul>
    <ol class={styles.strip} aria-label={props.title}>
      <For each={props.rows}>{row => <li class={styles.stripRow} data-row={row.key}>
        <span class={styles.name}>{row.label}<Show when={row.sub}><small>{row.sub}</small></Show></span>
        <span class={styles.stripLane}>
          <For each={refs()}>{ref => <span class={styles.refLine} style={{ 'inset-inline-start': `${at(ref.value).toFixed(2)}%` }} />}</For>
          <Show when={shown(row).length > 1}>
            <span class={styles.band} style={{
              'inset-inline-start': `${at(Math.min(...shown(row).map(mark => mark.value!))).toFixed(2)}%`,
              'inline-size': `${(at(Math.max(...shown(row).map(mark => mark.value!))) - at(Math.min(...shown(row).map(mark => mark.value!)))).toFixed(2)}%`,
            }} />
          </Show>
          <For each={shown(row)}>{mark => <span class={styles.mark} data-mark={mark.key}
            style={{ 'inset-inline-start': `${at(mark.value!).toFixed(2)}%` }}>
            <Tooltip class={`${styles.markButton} ${SHAPES[mark.shape]}`} label={`${row.label}, ${mark.label}: ${mark.text}`} text={mark.hover}
              onClick={() => undefined}><span /></Tooltip>
          </span>}</For>
        </span>
        <span class={styles.total} data-total>{row.total}</span>
      </li>}</For>
      <li class={styles.stripRow} aria-hidden="true" data-scale>
        <span />
        <span class={styles.stripScale}>
          <span style={{ 'inset-inline-start': '0%' }}>0</span>
          <For each={refs()}>{ref => <span style={{ 'inset-inline-start': `${at(ref.value).toFixed(2)}%` }}>{ref.label}</span>}</For>
          <span style={{ 'inset-inline-end': '0%' }}>{props.format(top())}</span>
        </span>
        <span />
      </li>
    </ol>
  </figure></Show>
}
