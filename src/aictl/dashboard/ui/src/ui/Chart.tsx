import { createEffect, createMemo, createUniqueId, For, lazy, Loading, Show, untrack } from 'solid-js'
import type uPlot from 'uplot'
import { alignChartData, type ChartPoint } from './chartData'
import { PanelState } from './PanelState'
import styles from './Chart.module.css'

const colors = ['--color-chart-1', '--color-chart-2', '--color-chart-3', '--color-chart-4'] as const
const marks = [styles.first, styles.second, styles.third, styles.fourth]
type ChartSeries = { label: string; color?: 0 | 1 | 2 | 3; paths?: uPlot.Series.PathBuilder; visible?: boolean }
type YRange = readonly [number, number]

const Plot = lazy(() => Promise.all([import('uplot'), import('uplot/dist/uPlot.min.css')]).then(([{ default: UPlot }]) => ({
  default: (props: PlotProps) => PlotCanvas(props, UPlot),
})))

type PlotProps = {
  series: readonly ChartSeries[]; points: readonly ChartPoint[]; time: boolean; unit?: string; yRange?: YRange
  stack?: boolean; onBrush?: (start: number, end: number) => void; onHover?: (index: number) => void
}

// uPlot draws in microtasks after construction. Keep two cold draws from
// sharing the same frame; regular data updates and resizes need no queue.
const coldPlots = new Set<() => void>()
let coldFrame = 0
function scheduleColdPlot() {
  if (coldFrame || !coldPlots.size) return
  coldFrame = requestAnimationFrame(() => {
    coldFrame = 0
    const draw = coldPlots.values().next().value
    if (draw) {
      coldPlots.delete(draw)
      draw()
    }
    scheduleColdPlot()
  })
}

function PlotCanvas(props: PlotProps, UPlot: typeof uPlot) {
  let host!: HTMLDivElement
  let plot: uPlot | undefined
  const data = createMemo(() => alignChartData(props.points, props.series.length))
  createEffect(() => ({
    series: props.series, time: props.time, unit: props.unit, yRange: props.yRange,
  }), ({ series, time, unit, yRange }) => {
    let frame = 0
    let width = 0, height = 0
    let nextWidth = 0, nextHeight = 0
    let style = getComputedStyle(host)
    const color = (token: string) => style.getPropertyValue(token).trim()
    const draw = () => {
        frame = 0
        if (!nextWidth || !nextHeight || (width === nextWidth && height === nextHeight)) return
        width = nextWidth
        height = nextHeight
        if (plot) plot.setSize({ width, height })
        else plot = new UPlot({
          width, height,
          scales: { x: { time }, y: yRange ? { range: [...yRange] } : {} },
          series: [{}, ...series.map((item, index) => ({
            label: item.label,
            show: item.visible !== false,
            width: parseFloat(color('--chart-line-width')) || 1,
            stroke: () => color(colors[item.color ?? index % colors.length]),
            ...(props.stack && index === 0 ? { fill: () => `${color(colors[item.color ?? 0])}55` } : {}),
            ...(item.paths ? { paths: item.paths } : {}),
          }))],
          axes: [0, 1].map(index => ({
            // uPlot needs the computed pixel size to scale text for the device.
            font: `${Math.round(parseFloat(style.fontSize))}px ${style.fontFamily}`,
            stroke: () => color('--color-muted'),
            grid: { stroke: () => color('--chart-grid-color') || color('--color-border'), width: parseFloat(color('--chart-grid-width')) || 2 },
            ticks: { stroke: () => color('--color-border') },
            ...(index === 1 && unit ? { values: (_plot: uPlot, ticks: number[]) => ticks.map(tick => `${tick}${unit}`) } : {}),
          })),
          legend: { show: false },
          bands: props.stack ? series.slice(1).map((item, index) => ({
            series: [index + 2, index + 1], fill: () => `${color(colors[item.color ?? (index + 1) % colors.length])}55`,
          })) : undefined,
          cursor: { drag: { x: Boolean(props.onBrush), y: false, setScale: false }, show: Boolean(props.onBrush || props.onHover) },
          hooks: {
            setSelect: [chart => untrack(() => {
              const { left, width } = chart.select
              if (!width || !props.onBrush) return
              const a = chart.posToIdx(left), b = chart.posToIdx(left + width)
              chart.setSelect({ left: 0, top: 0, width: 0, height: 0 }, false)
              if (a != null && b != null) props.onBrush(a, b)
            })],
            setCursor: [chart => untrack(() => { if (chart.cursor.idx != null) props.onHover?.(chart.cursor.idx) })],
          },
        }, untrack(data), host)
    }
    const observer = new ResizeObserver(([{ contentRect }]) => {
      nextWidth = Math.round(contentRect.width)
      nextHeight = Math.round(contentRect.height)
      if (plot) {
        if (!frame) frame = requestAnimationFrame(draw)
      } else if (nextWidth && nextHeight) {
        coldPlots.add(draw)
        scheduleColdPlot()
      }
    })
    observer.observe(host)
    const theme = new MutationObserver(() => {
      style = getComputedStyle(host)
      plot?.redraw(true, true)
    })
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      observer.disconnect()
      theme.disconnect()
      cancelAnimationFrame(frame)
      coldPlots.delete(draw)
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
  stack?: boolean
  onBrush?: (start: number, end: number) => void
  onHover?: (index: number) => void
  onToggleSeries?: (index: number) => void
}) {
  const caption = createUniqueId()
  return <Show when={props.points.length && props.series.length} fallback={<PanelState state="empty" />}>
    <figure class={styles.figure} aria-labelledby={caption}>
      <figcaption class={styles.caption} id={caption}><strong>{props.label}</strong> — {props.description}</figcaption>
      <Loading fallback={<div class={styles.plot} aria-hidden="true" />}>
        <Plot series={props.series} points={props.points} time={props.xAxis === 'time'} unit={props.unit} yRange={props.yRange}
          stack={props.stack} onBrush={props.onBrush} onHover={props.onHover} />
      </Loading>
      <ul class={styles.legend} aria-label="Chart series">
        <For each={props.series}>{(item, index) =>
          <li><span class={marks[item.color ?? index() % marks.length]} aria-hidden="true" />
            <Show when={props.onToggleSeries} fallback={item.label}>
              <button type="button" class={styles.toggle} aria-pressed={item.visible === false ? 'false' : 'true'}
                onClick={() => props.onToggleSeries?.(index())}>{item.label}</button>
            </Show>
          </li>
        }</For>
      </ul>
    </figure>
  </Show>
}
