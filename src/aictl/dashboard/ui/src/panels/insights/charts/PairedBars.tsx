import { For, Show } from 'solid-js'
import { Tooltip } from '../../../ui/Tooltip'
import type { BarPart, LegendItem } from '../Bars'
import { partClass, toneClass } from './Columns'
import styles from './Charts.module.css'

/** One measure of one row: its segments and the value written beside them. */
export type PairedCell = { parts: BarPart[]; total: string }
export type PairedRow = { key: string; label: string; title?: string; sub?: string; cells: [PairedCell, PairedCell] }
/** A lane's heading; `estimate` marks a lane whose figures are not measured (its heading says so, its bars are hatched). */
export type Lane = { title: string; estimate?: boolean }

const amount = (cell: PairedCell) => cell.parts.reduce((sum, part) => sum + Math.max(0, part.value ?? 0), 0)

/**
 * Two measures of the same rows side by side, one lane each, so a row reads across: its name, then each measure as a
 * horizontal bar with its value. `scale`: 'shared' puts both lanes on one linear scale from 0 (the same unit), 'each'
 * gives each lane its own scale from 0 to its largest bar (different units or magnitudes; the axis line says so).
 */
export function PairedBars(props: {
  name: string; title: string; axis: string; lanes: [Lane, Lane]; rows: PairedRow[]; scale: 'shared' | 'each'; legend?: LegendItem[]
}) {
  const largest = (lane: number) => Math.max(0, ...props.rows.map(row => amount(row.cells[lane])))
  const top = (lane: number) => props.scale === 'shared' ? Math.max(largest(0), largest(1)) : largest(lane)
  const length = (row: PairedRow, lane: number) => top(lane) > 0 ? amount(row.cells[lane]) / top(lane) * 100 : 0
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
    <div class={styles.paired} role="table" aria-label={props.title}>
      <div class={styles.pairedRow} role="row" data-head>
        <span role="columnheader" />
        <For each={props.lanes}>{lane => <span role="columnheader" class={styles.laneHead} data-estimate={lane.estimate ? '' : undefined}>
          {lane.title}</span>}</For>
      </div>
      <For each={props.rows}>{row => <div class={styles.pairedRow} role="row" data-row={row.key}>
        <span role="rowheader" class={styles.name} title={row.title}>{row.label}<Show when={row.sub}><small>{row.sub}</small></Show></span>
        <For each={[0, 1] as const}>{lane => <span role="cell" class={styles.pairedCell} data-lane={lane}
          data-estimate={props.lanes[lane].estimate ? '' : undefined}>
          <span class={styles.pairedLane}>
            <span class={styles.stack} role="group" aria-label={`${row.label}, ${props.lanes[lane].title}: ${row.cells[lane].total}`}
              style={{ 'inline-size': `${length(row, lane).toFixed(2)}%` }}>
              <For each={row.cells[lane].parts.filter(part => (part.value ?? 0) > 0)}>{part => <span
                class={`${styles.rowPart} ${partClass(part)}`} style={{ 'flex-grow': String(part.value) }} data-part={part.key}
                data-repo={part.repo == null ? undefined : String(part.repo)}>
                <Tooltip class={styles.partButton} label={`${row.label}, ${part.label}: ${part.text}`} text={part.hover}
                  onClick={() => undefined}><span /></Tooltip>
              </span>}</For>
            </span>
          </span>
          <span class={styles.total} data-total>{row.cells[lane].total}</span>
        </span>}</For>
      </div>}</For>
    </div>
  </figure></Show>
}
