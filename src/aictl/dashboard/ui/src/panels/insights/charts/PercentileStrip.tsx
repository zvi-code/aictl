// ─── A percentile strip: a distribution per row as marks on one linear axis ─
// Each row is one item (a tool, a repository, a program); its marks are figures of one distribution (median, 90th or
// 95th percentile, the longest), drawn as a dot or a tick at their value on an axis shared by every row, with a thin
// line from the lowest mark to the highest. The figures are written at the end of the row; each mark holds its hover.
import { For, Show } from 'solid-js'
import { Tooltip } from '../../../ui/Tooltip'
import { repoClass } from '../Bars'
import { Name, type Open } from './Open'
import styles from './PercentileStrip.module.css'

/** `mid`: a filled dot (the median); `high`: a hollow dot (an upper percentile); `max`: a tick (the longest). */
export type StripShape = 'mid' | 'high' | 'max'
export type StripMark = { key: string; shape: StripShape; label: string; value: number; text: string; hover: string }
/** `muted`: the row is below the evidence rule or drawn from a fallback; its marks are grey. `repo`: a swatch of the
 * repository's colour before the name (repoSplit.ts). */
export type StripRow = {
  key: string; label: string; sub?: string; title?: string; marks: StripMark[]; text: string; muted?: boolean; repo?: number
  open?: Open
}
export type StripChart = {
  name: string; title: string; axis: string; rows: StripRow[]; top: number; start: string; end: string
  legend?: { shape: StripShape; label: string }[]
}

const at = (value: number, top: number) => `${(top > 0 ? Math.max(0, Math.min(1, value / top)) : 0) * 100}%`
const SHAPES: Record<StripShape, string> = { mid: styles.mid, high: styles.high, max: styles.max }

export function PercentileStrip(props: { chart: StripChart }) {
  return <Show when={props.chart.rows.length}><figure class={styles.figure} data-chart={props.chart.name}>
    <figcaption class={styles.caption}>
      <span class={styles.title}>{props.chart.title}</span>
      <span class={styles.axisText} data-axis>{props.chart.axis}</span>
    </figcaption>
    <Show when={props.chart.legend?.length}>
      <ul class={styles.legend} aria-label={`${props.chart.title}: legend`}>
        <For each={props.chart.legend}>{item => <li><span class={`${styles.key} ${SHAPES[item.shape]}`} />{item.label}</li>}</For>
      </ul>
    </Show>
    <ol class={styles.rows} aria-label={props.chart.title}>
      <For each={props.chart.rows}>{row => {
        const values = () => row.marks.map(mark => mark.value)
        const low = () => Math.min(...values()), high = () => Math.max(...values())
        return <li class={styles.row} data-row={row.key} data-muted={row.muted ? '' : undefined}>
          <span class={styles.name} title={row.title}>
            <Show when={row.repo != null}><span class={`${styles.swatch} ${repoClass(row.repo!)}`} data-repo-mark={String(row.repo)} /></Show>
            <Name text={row.label} open={row.open} /><Show when={row.sub}><small>{row.sub}</small></Show>
          </span>
          <span class={styles.lane} role="group" aria-label={`${row.label}: ${row.text}`}>
            <Show when={row.marks.length > 1 && high() > low()}>
              <span class={styles.span} data-span style={{ 'inset-inline-start': at(low(), props.chart.top),
                'inline-size': `calc(${at(high(), props.chart.top)} - ${at(low(), props.chart.top)})` }} />
            </Show>
            <For each={row.marks}>{mark => <span class={`${styles.mark} ${SHAPES[mark.shape]}`} data-mark={mark.key}
              style={{ 'inset-inline-start': at(mark.value, props.chart.top) }}>
              <Tooltip class={styles.hit} label={`${row.label}, ${mark.label}: ${mark.text}`} text={mark.hover} onClick={() => undefined}>
                <span class={styles.dot} />
              </Tooltip>
            </span>}</For>
          </span>
          <span class={styles.text} data-text>{row.text}</span>
        </li>
      }}</For>
    </ol>
    <div class={styles.scale} aria-hidden="true" data-scale><span /><span class={styles.ends}><span>{props.chart.start}</span>
      <span>{props.chart.end}</span></span><span /></div>
  </figure></Show>
}
