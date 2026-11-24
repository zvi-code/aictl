// ─── Two (or more) measures of the same items: one row per item, one dot per measure, each measure on its own axis ─
// Each measure column has its own linear scale from 0 to its largest value, written in its header. The value is written
// beside each dot; the dot carries the hover text. A value the source does not report has no dot.
import { For, Show } from 'solid-js'
import { Name, type Open } from './Open'
import styles from './DotRows.module.css'

export type DotMeasure = { key: string; name: string; top: number; topText: string }
/** `colour`: a CSS colour from the tokens; `swatch` marks the row's name with it (a repository's colour). */
export type DotValue = { value: number | null; text: string; hover: string }
export type DotRow = { key: string; name: string; sub?: string; title?: string; colour?: string; swatch?: boolean; values: DotValue[]; open?: Open }

/** Where a dot sits on its measure's axis, 0 to 100. */
export const dotAt = (value: number, top: number) => top > 0 ? Math.max(0, Math.min(1, value / top)) * 100 : 0

export function DotRows(props: { name: string; title: string; axis: string; measures: readonly DotMeasure[]; rows: readonly DotRow[]; empty?: string }) {
  return <figure class={styles.figure} data-dots={props.name}>
    <figcaption class={styles.title}>{props.title}</figcaption>
    <Show when={props.rows.length} fallback={<p class={styles.note}>{props.empty ?? 'Nothing to draw in this period.'}</p>}>
      <div class={styles.grid} role="table" aria-label={props.title}
        style={{ 'grid-template-columns': `minmax(7rem, 14rem) repeat(${props.measures.length}, minmax(9rem, 1fr))` }}>
        <div role="row" class={styles.line}>
          <span role="columnheader" class={styles.head} />
          <For each={props.measures}>{measure => <span role="columnheader" class={styles.head} data-measure={measure.key}>
            {measure.name}<small>0 to {measure.topText}</small></span>}</For>
        </div>
        <For each={props.rows}>{row => <div role="row" class={styles.line} data-row={row.key}>
          <span role="rowheader" class={styles.name} title={row.title}>
            <Show when={row.swatch && row.colour}><span class={styles.swatch} style={{ background: row.colour }} data-swatch /></Show>
            <Name text={row.name} open={row.open} /><Show when={row.sub}><small>{row.sub}</small></Show></span>
          <For each={row.values}>{(item, i) => <span role="cell" class={styles.cell}>
            <span class={styles.track}>
              <Show when={item.value != null}>
                <span class={styles.dot} title={item.hover} data-dot={props.measures[i()]?.key}
                  style={{ 'inset-inline-start': `${dotAt(item.value!, props.measures[i()]?.top ?? 0).toFixed(2)}%`,
                    ...(row.colour ? { background: row.colour } : {}) }} />
              </Show>
            </span>
            <span class={styles.value} title={item.hover} data-value>{item.text}</span>
          </span>}</For>
        </div>}</For>
      </div>
      <p class={styles.note}>{props.axis}</p>
    </Show>
  </figure>
}
