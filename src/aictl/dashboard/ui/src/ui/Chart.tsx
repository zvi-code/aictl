import { createEffect, createMemo, createUniqueId, For, Show, untrack } from 'solid-js'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { alignChartData, type ChartPoint } from './chartData'
import { PanelState } from './PanelState'
import styles from './Chart.module.css'

const colors = ['--color-chart-1', '--color-chart-2', '--color-chart-3', '--color-chart-4'] as const
const marks = [styles.first, styles.second, styles.third, styles.fourth]
type ChartSeries = { label: string; color?: 0 | 1 | 2 | 3; paths?: uPlot.Series.PathBuilder }
type YRange = readonly [number, number]

function Plot(props: { series: readonly ChartSeries[]; points: readonly ChartPoint[]; time: boolean; unit?: string; yRange?: YRange }) {
  let host!: HTMLDivElement
  let plot: uPlot | undefined
  const data = createMemo(() => alignChartData(props.points, props.series.length))
  createEffect(() => ({
    series: props.series, time: props.time, unit: props.unit, yRange: props.yRange,
  }), ({ series, time, unit, yRange }) => {
    let frame = 0
    let width = 0, height = 0
    let style = getComputedStyle(host)
    const color = (token: string) => style.getPropertyValue(token).trim()
    const resize = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const nextWidth = host.clientWidth, nextHeight = host.clientHeight
        if (!nextWidth || !nextHeight || (width === nextWidth && height === nextHeight)) return
        width = nextWidth
        height = nextHeight
        if (plot) plot.setSize({ width, height })
        else plot = new uPlot({
          width, height,
          scales: { x: { time }, y: yRange ? { range: [...yRange] } : {} },
          series: [{}, ...series.map((item, index) => ({
            label: item.label,
            stroke: () => color(colors[item.color ?? index % colors.length]),
            ...(item.paths ? { paths: item.paths } : {}),
          }))],
          axes: [0, 1].map(index => ({
            // uPlot needs the computed pixel size to scale text for the device.
            font: `${Math.round(parseFloat(style.fontSize))}px ${style.fontFamily}`,
            stroke: () => color('--color-muted'),
            grid: { stroke: () => color('--color-border') },
            ticks: { stroke: () => color('--color-border') },
            ...(index === 1 && unit ? { values: (_plot: uPlot, ticks: number[]) => ticks.map(tick => `${tick}${unit}`) } : {}),
          })),
          legend: { show: false },
          cursor: { drag: { x: false, y: false }, show: false },
        }, untrack(data), host)
      })
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    const theme = new MutationObserver(() => {
      style = getComputedStyle(host)
      plot?.redraw(true, true)
    })
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    resize()
    return () => {
      observer.disconnect()
      theme.disconnect()
      cancelAnimationFrame(frame)
      plot?.destroy()
      plot = undefined
    }
  })
  createEffect(data, next => plot?.setData(next))
  return <div ref={host} class={styles.plot} aria-hidden="true" />
}

export function Chart(props: {
  label: string
  description: string
  series: readonly ChartSeries[]
  points: readonly ChartPoint[]
  xAxis?: 'time' | 'number'
  unit?: string
  yRange?: YRange
}) {
  const caption = createUniqueId()
  return <Show when={props.points.length && props.series.length} fallback={<PanelState state="empty" />}>
    <figure class={styles.figure} aria-labelledby={caption}>
      <figcaption class={styles.caption} id={caption}><strong>{props.label}</strong> — {props.description}</figcaption>
      <Plot series={props.series} points={props.points} time={props.xAxis === 'time'} unit={props.unit} yRange={props.yRange} />
      <ul class={styles.legend} aria-label="Chart series">
        <For each={props.series}>{(item, index) =>
          <li><span class={marks[item.color ?? index() % marks.length]} aria-hidden="true" />{item.label}</li>
        }</For>
      </ul>
    </figure>
  </Show>
}
