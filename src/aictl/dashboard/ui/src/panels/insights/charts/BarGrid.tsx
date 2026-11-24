// A table-like grid: one row per item, one column per measure, and in each cell a small bar on that column's own linear
// scale from 0 with its value written beside it. It shows several measures of the same items side by side, which
// separate bar lists hide. A bar may be split into parts (a composition, or one part per repository); every part has
// its own hover. A CSS grid with table roles (data tables proper use the shared Table); folds to one block per item
// when narrow.
import { For, Show } from 'solid-js'
import { Tooltip } from '../../../ui/Tooltip'
import { Name, type Open } from './Open'
import styles from './BarGrid.module.css'

/** One part of a cell's bar: `value` sets its share of the bar, `fill` is a CSS colour built from tokens, `hatch` stripes it. */
export type GridPart = {
  key: string; value: number; fill: string; hatch?: boolean; label: string; hover: string; repo?: number
  /** The part's own value in words, for its accessible name; the cell's text when absent. */
  text?: string
}
/** `length`: the bar's length as a share of its column (0 to 1). `lines`: short muted lines under the value. */
export type GridCell = { length: number; parts: GridPart[]; text: string; muted?: boolean; lines?: string[] }
/** `scale`: the column's unit and scale, written under its name; `text`: a column of text only, with no bars. */
export type GridColumn = { id: string; label: string; scale: string; text?: boolean }
/** `mark`: a CSS colour for a swatch before the name; `faded`: too little data, drawn faint; `tag`: a word after the name. */
export type GridRow = {
  key: string; label: string; sub?: string; title?: string; mark?: string; faded?: boolean; tag?: string
  cells: Record<string, GridCell | null | undefined>
  /** What the row's name opens when clicked. */
  open?: Open
}

/** A bar's length on a linear scale from 0 to the largest value of its column, as a share (0 to 1). */
export const gridLength = (value: number | null | undefined, top: number) =>
  value != null && top > 0 ? Math.max(0, Math.min(1, value / top)) : 0

/** The background of a part: its fill, or its fill striped with the raised surface. */
const background = (part: GridPart) => part.hatch
  ? `repeating-linear-gradient(45deg, ${part.fill} 0 3px, var(--color-raised) 3px 5px)` : part.fill

/** A part's flex-grow: its share of the bar in percent. Raw values below 1 would leave the bar part empty (flex-grow
 * values that sum to less than 1 fill only that fraction of the free space). */
export const grow = (part: GridPart, parts: readonly GridPart[]) => {
  const total = parts.reduce((sum, item) => sum + Math.max(0, item.value), 0)
  return (total > 0 ? part.value / total * 100 : 0).toFixed(4)
}

function Cell(props: { row: GridRow; column: GridColumn; cell: GridCell | null | undefined; foot?: boolean }) {
  return <div role="cell" class={styles.cell} data-col={props.column.id} data-label={props.column.label}>
    <Show when={props.cell}>{cell => <>
      {/* The totals row is text only: no lane. */}
      <Show when={!props.foot && !props.column.text}><span class={styles.lane}>
        <Show when={cell().length > 0 && cell().parts.some(part => part.value > 0)}>
          <span class={styles.bar} style={{ 'inline-size': `${(cell().length * 100).toFixed(2)}%` }}>
            <For each={cell().parts.filter(part => part.value > 0)}>{part => <span class={styles.part} data-part={part.key}
              data-repo={part.repo == null ? undefined : String(part.repo)}
              style={{ 'flex-grow': grow(part, cell().parts), background: background(part) }}>
              <Tooltip class={styles.hit} label={`${props.row.label}, ${props.column.label}, ${part.label}: ${part.text ?? cell().text}`}
                text={part.hover} onClick={() => undefined}><span /></Tooltip>
            </span>}</For>
          </span>
        </Show>
      </span></Show>
      <span class={cell().muted ? styles.muted : styles.value} data-value>{cell().text}</span>
      <Show when={cell().lines?.length}>
        <span class={styles.lines} data-lines><For each={cell().lines}>{line => <span>{line}</span>}</For></span>
      </Show>
    </>}</Show>
  </div>
}

function Row(props: { row: GridRow; columns: GridColumn[]; foot?: boolean }) {
  return <div role="row" class={`${styles.row} ${props.foot ? styles.foot : ''} ${props.row.faded ? styles.faded : ''}`}
    data-row={props.row.key} data-faded={props.row.faded ? '' : undefined}>
    <div role="rowheader" class={styles.name} title={props.row.title}>
      <span>
        <Show when={props.row.mark}>{mark => <span class={styles.swatch} style={{ background: mark() }} data-mark />}</Show>
        <Name text={props.row.label} open={props.foot ? undefined : props.row.open} />
        <Show when={props.row.tag}><span class={styles.tag} data-tag>{props.row.tag}</span></Show>
      </span>
      <Show when={props.row.sub}><small>{props.row.sub}</small></Show>
    </div>
    <For each={props.columns}>{column => <Cell row={props.row} column={column} cell={props.row.cells[column.id]} foot={props.foot} />}</For>
  </div>
}

/** The grid. `name` marks it for tests (`data-grid`); `head` names the row column; `foot`, a totals row in text. */
export function BarGrid(props: { name: string; label: string; head: string; columns: GridColumn[]; rows: GridRow[]; foot?: GridRow }) {
  return <Show when={props.rows.length}>
    <div class={styles.wrap} data-grid={props.name}>
      <div role="table" class={styles.grid} aria-label={props.label}
        style={{ '--grid-columns': `minmax(7rem, 13rem) ${props.columns
          .map(column => column.text ? 'minmax(8rem, 1.4fr)' : 'minmax(6rem, 1fr)').join(' ')}` }}>
        <div role="row" class={`${styles.row} ${styles.head}`} data-head>
          <div role="columnheader" class={styles.name}>{props.head}</div>
          <For each={props.columns}>{column => <div role="columnheader" class={styles.cell} data-col={column.id}>
            {column.label}<small>{column.scale}</small></div>}</For>
        </div>
        <For each={props.rows}>{row => <Row row={row} columns={props.columns} />}</For>
        <Show when={props.foot}>{foot => <Row row={foot()} columns={props.columns} foot />}</Show>
      </div>
    </div>
  </Show>
}
