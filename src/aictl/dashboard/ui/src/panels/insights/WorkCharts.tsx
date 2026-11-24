// The charts of the work cards (repositories, durations, changes). Each draws what workModel built: the value is
// written beside every bar or on every column, and hovering a mark shows the hover text the model wrote for it.
import { For, Show } from 'solid-js'
import { Tooltip } from '../../ui/Tooltip'
import type { BarChart, ColumnChart, RangeChart, Tone } from './workModel'
import styles from './Insights.module.css'
import own from './Work.module.css'

const width = (value: number | null, top: number) => `${top > 0 && value ? Math.max(0, Math.min(1, value / top)) * 100 : 0}%`
const noop = () => {}

function Legend(props: { items: { tone: Tone; label: string }[] }) {
  return <Show when={props.items.length}>
    <ul class={styles.legend}>
      <For each={props.items}>{item => <li><span class={`${styles.swatch} ${own[item.tone]}`} />{item.label}</li>}</For>
    </ul>
  </Show>
}

/** Horizontal bars: one row per item, one or more bars per row, each with its value written beside it. */
export function Bars(props: { chart: BarChart }) {
  return <Show when={props.chart.rows.length}>
    <figure class={own.figure} data-chart={props.chart.id}>
      <figcaption class={own.title}>{props.chart.title}</figcaption>
      <Legend items={props.chart.legend} />
      <ol class={own.list} aria-label={props.chart.title}>
        <For each={props.chart.rows}>{row => <li data-bar={row.key} data-small={row.small ? '' : undefined}>
          <Tooltip class={own.hit} text={row.hover} onClick={noop}
            label={`${row.name}: ${row.tracks.map(track => track.text).join('; ')}`}>
            <span class={own.label}>{row.name}<Show when={row.sub}><small>{row.sub}</small></Show></span>
            <span class={own.tracks}>
              <For each={row.tracks}>{(track, i) => <span class={own.bar}>
                <span class={own.track}>
                  <For each={track.parts}>{part => <span class={own[part.tone]} data-part={part.label}
                    style={{ 'inline-size': width(part.value, props.chart.tops[i()] ?? 0) }} />}</For>
                </span>
                <span class={own.value} data-value>{track.text}</span>
              </span>}</For>
            </span>
          </Tooltip>
        </li>}</For>
      </ol>
      <p class={styles.note}>{props.chart.axis}</p>
    </figure>
  </Show>
}

/** A distribution per row: a bar to the median, a line on to the upper percentile, a tick at the longest. */
export function Ranges(props: { chart: RangeChart }) {
  return <Show when={props.chart.rows.length}>
    <figure class={own.figure} data-chart={props.chart.id}>
      <figcaption class={own.title}>{props.chart.title}</figcaption>
      <p class={styles.note}>{props.chart.legend}</p>
      <ol class={own.list} aria-label={props.chart.title}>
        <For each={props.chart.rows}>{row => <li data-bar={row.key} data-small={row.small ? '' : undefined}>
          <Tooltip class={own.hit} text={row.hover} onClick={noop} label={`${row.name}: ${row.text}`}>
            <span class={own.label}>{row.name}<Show when={row.sub}><small>{row.sub}</small></Show></span>
            <span class={own.tracks}>
              <span class={own.bar}>
                <span class={own.range}>
                  <Show when={row.mid != null}>
                    <span class={own.mid} data-mid style={{ 'inline-size': width(row.mid, props.chart.top) }} />
                  </Show>
                  <Show when={row.mid != null && row.high != null && row.high > row.mid}>
                    <span class={own.high} data-high style={{ 'inset-inline-start': width(row.mid, props.chart.top),
                      'inline-size': width((row.high ?? 0) - (row.mid ?? 0), props.chart.top) }} />
                  </Show>
                  <Show when={row.max != null}>
                    <span class={own.max} data-max style={{ 'inset-inline-start': width(row.max, props.chart.top) }} />
                  </Show>
                </span>
                <span class={own.value} data-value>{row.text}</span>
              </span>
            </span>
          </Tooltip>
        </li>}</For>
      </ol>
      <p class={styles.note}>{props.chart.axis}</p>
    </figure>
  </Show>
}

const W = 360, H = 132, TOP = 16, BOTTOM = 34, SIDE = 4

/** Columns over time bins: the value on top of each, the bin's first day and a second figure under it. */
export function Columns(props: { chart: ColumnChart }) {
  const slot = () => (W - 2 * SIDE) / Math.max(1, props.chart.columns.length)
  const bar = () => Math.max(2, slot() * 0.7)
  const plot = H - TOP - BOTTOM
  // With many bins, every column keeps its value on hover, but only every k-th carries the day under it.
  const every = () => Math.max(1, Math.ceil(props.chart.columns.length / 8))
  const dense = () => props.chart.columns.length > 12
  return <Show when={props.chart.columns.length}>
    <figure class={own.figure} data-chart={props.chart.id}>
      <figcaption class={own.title}>{props.chart.title}</figcaption>
      <svg class={styles.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={props.chart.title}>
        <line class={styles.axis} x1={SIDE} x2={W - SIDE} y1={H - BOTTOM} y2={H - BOTTOM} />
        <For each={props.chart.columns}>{(column, i) => {
          const height = () => props.chart.top > 0 ? column.value / props.chart.top * plot : 0
          const x = () => SIDE + i() * slot() + (slot() - bar()) / 2
          return <g data-column={column.key}>
            <rect class={own.column} x={x()} width={bar()} y={H - BOTTOM - height()} height={Math.max(height(), column.value ? 1 : 0)}>
              <title>{column.hover}</title>
            </rect>
            <text class={dense() ? own.small : undefined} x={x() + bar() / 2} y={H - BOTTOM - height() - 3} text-anchor="middle">{column.text}</text>
            <Show when={i() % every() === 0}>
              <text class={styles.muted} x={x() + bar() / 2} y={H - BOTTOM + 13} text-anchor="middle">{column.label}</text>
              <Show when={!dense()}>
                <text class={styles.muted} x={x() + bar() / 2} y={H - BOTTOM + 27} text-anchor="middle">{column.under}</text>
              </Show>
            </Show>
          </g>
        }}</For>
      </svg>
      <p class={styles.note}>{props.chart.axis} Hover a column for its figures.</p>
    </figure>
  </Show>
}
