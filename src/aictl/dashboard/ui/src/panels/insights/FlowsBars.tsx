import { For, Show } from 'solid-js'
import { barTop, placeParts, tickAt, type BarLegend, type BarRow } from './flowBarModel'
import styles from './FlowsBars.module.css'

/**
 * A titled chart of horizontal bars on one linear scale: the name and its counts on the left, the bar, and the value
 * written beside it. Every bar part and tick carries its own hover text (an SVG title); the row carries one too.
 */
export function BarChart(props: { title: string; axis: string; rows: readonly BarRow[]; legend?: BarLegend; data: string; empty?: string }) {
  const top = () => barTop(props.rows)
  return <figure class={styles.figure} data-chart={props.data}>
    <figcaption class={styles.title}>{props.title}</figcaption>
    <Show when={props.rows.length} fallback={<p class={styles.empty}>{props.empty ?? 'Nothing to draw in this period.'}</p>}>
      <Show when={props.legend?.length}>
        <ul class={styles.legend}>
          <For each={props.legend}>{item => <li><span class={`${styles.swatch} ${styles[item.tone]}`} />{item.label}</li>}</For>
        </ul>
      </Show>
      <ol class={styles.rows}>
        <For each={props.rows}>{row => <li class={styles.row} data-row={row.key}>
          <span class={styles.name}>{row.name}<Show when={row.sub}>{sub => <small>{sub()}</small>}</Show></span>
          <svg class={styles.track} viewBox="0 0 100 10" preserveAspectRatio="none" role="img" aria-label={row.hover}>
            <title>{row.hover}</title>
            <For each={placeParts(row, top())}>{part => <rect class={styles[part.tone]} x={part.x} y={1} height={8} width={part.width}
              data-part={part.tone}><title>{part.hover}</title></rect>}</For>
            <Show when={row.tick}>{tick => <line class={styles.tick} x1={tickAt(row, top()) ?? 0} x2={tickAt(row, top()) ?? 0} y1={0} y2={10}
              data-tick><title>{tick().hover}</title></line>}</Show>
          </svg>
          <span class={styles.value} data-value>{row.text}</span>
        </li>}</For>
      </ol>
      <p class={styles.axis}>{props.axis}</p>
    </Show>
  </figure>
}
