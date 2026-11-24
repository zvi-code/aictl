import { For, Show } from 'solid-js'
import { barTop, placeParts, tickAt, type BarLegend, type BarRow } from './flowBarModel'
import { Name } from './charts/Open'
import styles from './FlowsBars.module.css'
import { OTHER, repoColourVar } from './repoSplit'

/** The fill of a repository's part: its chart colour, lightened as the HTML bars of the other cards draw it. */
const repoFill = (colour: number) => colour === OTHER ? repoColourVar(colour)
  : `color-mix(in srgb, ${repoColourVar(colour)} 70%, var(--color-surface))`

/**
 * A titled chart of horizontal bars on one linear scale: the name and its counts on the left, the bar, and the value
 * written beside it. Every bar part and tick carries its own hover text (an SVG title); the row carries one too.
 */
export function BarChart(props: { title: string; axis: string; rows: readonly BarRow[]; legend?: BarLegend; data: string; empty?: string
  /** A fixed top of the scale (1 for shares); else the largest row. */
  top?: number
}) {
  const top = () => props.top ?? barTop(props.rows)
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
          <span class={styles.name}><Name text={row.name} open={row.open} /><Show when={row.sub}>{sub => <small>{sub()}</small>}</Show></span>
          <svg class={styles.track} viewBox="0 0 100 10" preserveAspectRatio="none" role="img" aria-label={row.hover}>
            <title>{row.hover}</title>
            <For each={placeParts(row, top())}>{part => <rect class={part.repo == null ? styles[part.tone] : styles.repo}
              style={part.repo == null ? undefined : { fill: repoFill(part.repo) }} x={part.x} y={1} height={8} width={part.width}
              data-part={part.key ?? part.tone} data-repo={part.repo == null ? undefined : String(part.repo)}>
              <title>{part.hover}</title></rect>}</For>
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
