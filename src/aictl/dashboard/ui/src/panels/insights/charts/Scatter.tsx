// A scatter of two measures over the same items: one dot per item, its name written beside it, both axes linear from 0
// to the largest value with the end written at the axis. A hollow dot marks a value that is a floor. Every dot has a
// <title> with its exact figures.
import { For, Show } from 'solid-js'
import type { Open } from './Open'
import styles from './Scatter.module.css'

export type ScatterAxis = { label: string; format: (value: number) => string }
export type ScatterPoint = { key: string; x: number; y: number; label: string; hover: string; hollow?: boolean; open?: Open }

const W = 520, H = 300, LEFT = 56, RIGHT = 24, TOP = 16, BOTTOM = 40

export function Scatter(props: { name: string; title: string; x: ScatterAxis; y: ScatterAxis; points: ScatterPoint[]; note?: string }) {
  const xTop = () => Math.max(0, ...props.points.map(point => point.x))
  const yTop = () => Math.max(0, ...props.points.map(point => point.y))
  const px = (value: number) => LEFT + (xTop() > 0 ? value / xTop() : 0) * (W - LEFT - RIGHT)
  const py = (value: number) => H - BOTTOM - (yTop() > 0 ? value / yTop() : 0) * (H - TOP - BOTTOM)
  // A name on the right half of the plot is written to the dot's left, so it stays inside.
  const right = (point: ScatterPoint) => px(point.x) > (LEFT + W - RIGHT) / 2
  return <Show when={props.points.length}>
    <figure class={styles.figure} data-scatter={props.name}>
      <figcaption class={styles.title}>{props.title}</figcaption>
      <svg class={styles.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${props.title}: ${props.points
        .map(point => `${point.label} ${props.x.format(point.x)}, ${props.y.format(point.y)}`).join('; ')}`}>
        <line class={styles.axis} x1={LEFT} x2={W - RIGHT} y1={H - BOTTOM} y2={H - BOTTOM} />
        <line class={styles.axis} x1={LEFT} x2={LEFT} y1={TOP} y2={H - BOTTOM} />
        <line class={styles.grid} x1={LEFT} x2={W - RIGHT} y1={TOP} y2={TOP} />
        <line class={styles.grid} x1={W - RIGHT} x2={W - RIGHT} y1={TOP} y2={H - BOTTOM} />
        <text class={styles.tick} x={LEFT} y={H - BOTTOM + 14} text-anchor="middle" data-tick="x0">{props.x.format(0)}</text>
        <text class={styles.tick} x={W - RIGHT} y={H - BOTTOM + 14} text-anchor="end" data-tick="x1">{props.x.format(xTop())}</text>
        <text class={styles.tick} x={LEFT - 6} y={H - BOTTOM} text-anchor="end" data-tick="y0">{props.y.format(0)}</text>
        <text class={styles.tick} x={LEFT - 6} y={TOP + 4} text-anchor="end" data-tick="y1">{props.y.format(yTop())}</text>
        <text class={styles.axisLabel} x={(LEFT + W - RIGHT) / 2} y={H - 6} text-anchor="middle">{props.x.label}</text>
        <text class={styles.axisLabel} x={12} y={(TOP + H - BOTTOM) / 2} text-anchor="middle"
          transform={`rotate(-90 12 ${(TOP + H - BOTTOM) / 2})`}>{props.y.label}</text>
        <For each={props.points}>{point => <g data-point={point.key}>
          <circle class={point.hollow ? styles.hollow : styles.dot} cx={px(point.x)} cy={py(point.y)} r={5}><title>{point.hover}</title></circle>
          <Show when={point.open} fallback={<text class={styles.name} x={px(point.x) + (right(point) ? -9 : 9)} y={py(point.y) + 4}
            text-anchor={right(point) ? 'end' : 'start'}>{point.label}</text>}>{open =>
            <text class={`${styles.name} ${styles.open}`} x={px(point.x) + (right(point) ? -9 : 9)} y={py(point.y) + 4}
              text-anchor={right(point) ? 'end' : 'start'} role="button" tabindex="0" aria-label={open().label} data-open
              onClick={() => open().run()} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open().run() } }}>
              <title>{open().label}</title>{point.label}</text>}</Show>
        </g>}</For>
      </svg>
      <Show when={props.note}><p class={styles.note}>{props.note}</p></Show>
    </figure>
  </Show>
}
