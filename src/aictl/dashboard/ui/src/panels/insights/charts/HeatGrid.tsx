// ─── A heat grid: rows by columns, the value written in each cell, the cell shaded by its level ─
// Built for a matrix of counts or shares. Every cell carries its own hover text; a cell with nothing to show is blank,
// a cell the source cannot report is hatched. Shading mixes one chart token into the surface, so it reads in both themes.
import { For, Show } from 'solid-js'
import { Name, type Open } from './Open'
import styles from './HeatGrid.module.css'

/** `level`: 0 to 1, the shade; null leaves the cell unshaded. `hatched`: the source does not report this cell. */
export type HeatCell = { key: string; text: string; sub?: string; level: number | null; hover: string; hatched?: boolean }
export type HeatColumn = { key: string; name: string; sub?: string; title?: string; open?: Open }
export type HeatRow = { key: string; name: string; sub?: string; title?: string; cells: (HeatCell | null)[]; open?: Open }

/** The background of a cell at a level: the chart colour mixed into the surface, from faint to strong. */
export const heatFill = (level: number) => `color-mix(in srgb, var(--color-chart-1) ${Math.round(6 + Math.max(0, Math.min(1, level)) * 54)}%, var(--color-surface))`

export function HeatGrid(props: {
  name: string; title: string; axis: string; corner: string; columns: readonly HeatColumn[]; rows: readonly HeatRow[]
  /** What a blank cell means, for its hover. */
  blank: (row: HeatRow, column: HeatColumn) => string
  empty?: string
}) {
  return <figure class={styles.figure} data-heat={props.name}>
    <figcaption class={styles.title}>{props.title}</figcaption>
    <Show when={props.rows.length && props.columns.length} fallback={<p class={styles.note}>{props.empty ?? 'Nothing to draw in this period.'}</p>}>
      <div class={styles.scroll}>
        <div class={styles.grid} role="table" aria-label={props.title}
          style={{ 'grid-template-columns': `minmax(7rem, max-content) repeat(${props.columns.length}, minmax(4.5rem, 1fr))` }}>
          <div role="row" class={styles.line}>
            <span role="columnheader" class={`${styles.head} ${styles.corner}`}>{props.corner}</span>
            <For each={props.columns}>{column => <span role="columnheader" class={styles.head} title={column.title} data-column={column.key}>
              <Name text={column.name} open={column.open} /><Show when={column.sub}><small>{column.sub}</small></Show></span>}</For>
          </div>
          <For each={props.rows}>{row => <div role="row" class={styles.line} data-row={row.key}>
            <span role="rowheader" class={`${styles.head} ${styles.rowHead}`} title={row.title}>
              <Name text={row.name} open={row.open} /><Show when={row.sub}><small>{row.sub}</small></Show></span>
            <For each={row.cells}>{(cell, i) => <Show when={cell} fallback={<span role="cell" class={styles.blank}
              title={props.blank(row, props.columns[i()])} data-blank />}>{value =>
              <span role="cell" class={value().hatched ? `${styles.cell} ${styles.hatched}` : styles.cell} data-cell={value().key}
                style={value().level == null || value().hatched ? undefined : { background: heatFill(value().level!) }} title={value().hover}>
                <strong>{value().text}</strong><Show when={value().sub}><small>{value().sub}</small></Show>
              </span>}</Show>}</For>
          </div>}</For>
        </div>
      </div>
      <p class={styles.note}>{props.axis}</p>
    </Show>
  </figure>
}
