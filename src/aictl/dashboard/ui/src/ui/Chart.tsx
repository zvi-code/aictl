import { createEffect, createMemo, createUniqueId, For, lazy, Loading, Show, untrack } from 'solid-js'
import type uPlot from 'uplot'
import { alignChartData, categoryLabels, flatRange, isolatedIndices, tickLabels, type ChartPoint } from './chartData'
import { PanelState } from './PanelState'
import styles from './Chart.module.css'

const colors = ['--color-chart-1', '--color-chart-2', '--color-chart-3', '--color-chart-4'] as const
const marks = [styles.first, styles.second, styles.third, styles.fourth]
// uPlot's default value-axis width in CSS pixels.
const AXIS_SIZE = 50
type ChartSeries = { label: string; color?: 0 | 1 | 2 | 3; paths?: uPlot.Series.PathBuilder; visible?: boolean }
type YRange = readonly [number, number]

const Plot = lazy(() => Promise.all([import('uplot'), import('uplot/dist/uPlot.min.css')]).then(([{ default: UPlot }]) => ({
  default: (props: PlotProps) => PlotCanvas(props, UPlot),
})))

type PlotProps = {
  series: readonly ChartSeries[]; points: readonly ChartPoint[]; time: boolean; unit?: string; axisLabel?: string; yRange?: YRange; categories?: readonly string[]
  ticks?: (values: readonly number[]) => string[]
  stack?: boolean; sync?: string; onBrush?: (start: number, end: number) => void; onHover?: (index: number) => void
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

// Callers often rebuild equal series arrays on each live update. Rebuilding
// the uPlot instance for them clears the canvas, so compare the plot shape by
// value and apply series visibility in place.
type Shape = { series: readonly ChartSeries[]; time: boolean; categorical: boolean; unit?: string; axisLabel?: string; yRange?: YRange; stack?: boolean }
const sameShape = (a: Shape, b: Shape) => a.time === b.time && a.categorical === b.categorical && a.unit === b.unit && a.axisLabel === b.axisLabel && a.stack === b.stack &&
  a.yRange?.[0] === b.yRange?.[0] && a.yRange?.[1] === b.yRange?.[1] && a.series.length === b.series.length &&
  a.series.every((item, i) => item.label === b.series[i].label && item.color === b.series[i].color && item.paths === b.series[i].paths)

function PlotCanvas(props: PlotProps, UPlot: typeof uPlot) {
  // `host` is the box that is measured. uPlot draws into `canvas`, which is out of flow,
  // so the plot never adds to the height of the box it is sized from.
  let host!: HTMLDivElement
  let canvas!: HTMLDivElement
  let plot: uPlot | undefined
  const data = createMemo(() => alignChartData(props.points, props.series.length))
  const shape = createMemo<Shape>(() => ({
    series: props.series, time: props.time, categorical: props.categories != null, unit: props.unit, axisLabel: props.axisLabel, yRange: props.yRange, stack: props.stack,
  }), { equals: sameShape })
  const shown = createMemo(() => props.series.map(item => item.visible !== false),
    { equals: (a, b) => a.length === b.length && a.every((value, i) => value === b[i]) })
  createEffect(shape, ({ series, time, categorical, unit, axisLabel, yRange, stack }) => {
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
          scales: { x: categorical ? { time, range: (_chart: uPlot, min: number, max: number) => [min - 0.5, max + 0.5] } : { time }, y: { range: yRange ? [...yRange] : (_chart: uPlot, min: number, max: number) =>
            flatRange(min, max) ?? UPlot.rangeNum(min, max, 0.1, true) } },
          series: [{}, ...series.map((item, index) => ({
            label: item.label,
            show: untrack(shown)[index] ?? true,
            width: parseFloat(color('--chart-line-width')) || 2,
            stroke: () => color(colors[item.color ?? index % colors.length]),
            ...(stack && index === 0 ? { fill: () => `${color(colors[item.color ?? 0])}55` } : {}),
            ...(item.paths ? { paths: item.paths } : {}),
            // A value with no neighbour draws no line, so it is drawn as a filled point.
            points: { fill: () => color(colors[item.color ?? index % colors.length]),
              filter: (chart: uPlot, seriesIndex: number, show: boolean) =>
                show ? null : isolatedIndices(chart.data[seriesIndex] as (number | null)[]) },
          }))],
          axes: [0, 1].map(index => ({
            // uPlot needs the computed pixel size to scale text for the device.
            font: `${Math.round(parseFloat(style.fontSize))}px ${style.fontFamily}`,
            stroke: () => color('--color-muted'),
            grid: { stroke: () => color('--chart-grid-color'), width: parseFloat(color('--chart-grid-width')) || 1 },
            ticks: { stroke: () => color('--color-border') },
            ...(index === 0 && categorical ? {
              // One tick per category, named; the width of a category's slot sets how much of the name shows.
              splits: (chart: uPlot) => chart.data[0] as number[],
              values: (chart: uPlot, splits: number[]) => categoryLabels(untrack(() => props.categories) ?? [], splits,
                chart.bbox.width / devicePixelRatio / Math.max(splits.length, 1), parseFloat(style.fontSize) * 0.6 || 7),
            } : {}),
            ...(index === 1 ? {
              ...(axisLabel ? { label: axisLabel, labelFont: `${Math.round(parseFloat(style.fontSize))}px ${style.fontFamily}` } : {}),
              values: (_plot: uPlot, ticks: number[]) => untrack(() => props.ticks)?.(ticks) ?? tickLabels(ticks, unit),
              // Widen the value axis for long labels such as "30 GiB"; uPlot's fixed default clips them.
              size: (chart: uPlot, values: string[] | null, axis: number, cycle: number) => {
                const current = chart.axes[axis] as uPlot.Axis & { _size?: number }
                if (cycle > 1 && current._size) return current._size
                const longest = (values ?? []).reduce((wide, value) => value.length > wide.length ? value : wide, '')
                chart.ctx.font = (current.font as unknown as string[])[0]
                const gap = (current.ticks?.size ?? 10) + (current.gap ?? 5)
                return Math.max(AXIS_SIZE, Math.ceil(gap + chart.ctx.measureText(longest).width / devicePixelRatio))
              },
            } : {}),
          })),
          legend: { show: false },
          bands: stack ? series.slice(1).map((item, index) => ({
            series: [index + 2, index + 1], fill: () => `${color(colors[item.color ?? (index + 1) % colors.length])}55`,
          })) : undefined,
          cursor: { drag: { x: Boolean(props.onBrush), y: false, setScale: false }, show: Boolean(props.onBrush || props.onHover || props.categories),
            ...(props.sync ? { sync: { key: props.sync, setSeries: false } } : {}) },
          hooks: {
            setSelect: [chart => untrack(() => {
              const { left, width } = chart.select
              if (!width || !props.onBrush) return
              const a = chart.posToIdx(left), b = chart.posToIdx(left + width)
              chart.setSelect({ left: 0, top: 0, width: 0, height: 0 }, false)
              if (a != null && b != null) props.onBrush(a, b)
            })],
            setCursor: [chart => untrack(() => {
              if (chart.cursor.idx == null) return
              props.onHover?.(chart.cursor.idx)
              // The axis shows a shortened name; the full one is the title under the pointer.
              if (props.categories) host.title = props.categories[chart.cursor.idx] ?? ''
            })],
          },
        }, untrack(data), canvas)
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
  createEffect(shown, next => next.forEach((show, index) => {
    if (plot && plot.series[index + 1]?.show !== show) plot.setSeries(index + 1, { show })
  }))
  // When the series count changes, this effect can run before the shape effect
  // replaces the plot. The new plot takes the current data when it is built.
  createEffect(data, next => { if (plot && plot.series.length === next.length) plot.setData(next) })
  return <div ref={host} class={styles.plot} aria-hidden="true">
    <div ref={canvas} class={styles.canvas} style={{ position: 'absolute', inset: 0 }} />
  </div>
}

export function Chart(props: {
  label: string
  description: string
  series: readonly ChartSeries[]
  points: readonly ChartPoint[]
  xAxis?: 'time' | 'number'
  unit?: string
  // Names of the x values 1, 2, 3 ... of a category chart, one tick per category.
  categories?: readonly string[]
  // Names the value axis when its ticks carry no unit ("tokens").
  axisLabel?: string
  // Formats the value-axis ticks together; replaces the compact number and unit suffix.
  ticks?: (values: readonly number[]) => string[]
  yRange?: YRange
  stack?: boolean
  // Plots with the same key move their cursors together.
  sync?: string
  // A formatted value per series, shown in the legend.
  readout?: readonly (string | undefined)[]
  onBrush?: (start: number, end: number) => void
  onHover?: (index: number) => void
  onToggleSeries?: (index: number) => void
}) {
  const caption = createUniqueId()
  return <Show when={props.points.length && props.series.length} fallback={<PanelState state="empty" />}>
    <figure class={styles.figure} aria-labelledby={caption}>
      <figcaption class={styles.caption} id={caption}><span class={styles.srOnly}>{props.label} — </span>{props.description}</figcaption>
      <Loading fallback={<div class={styles.plot} aria-hidden="true" />}>
        <Plot series={props.series} points={props.points} time={props.xAxis === 'time'} unit={props.unit} axisLabel={props.axisLabel} categories={props.categories} ticks={props.ticks} yRange={props.yRange}
          stack={props.stack} sync={props.sync} onBrush={props.onBrush} onHover={props.onHover} />
      </Loading>
      <ul class={styles.legend} aria-label="Chart series">
        <For each={props.series}>{(item, index) =>
          <li><span class={marks[item.color ?? index() % marks.length]} aria-hidden="true" />
            <Show when={props.onToggleSeries} fallback={item.label}>
              <button type="button" class={styles.toggle} aria-pressed={item.visible === false ? 'false' : 'true'}
                onClick={() => props.onToggleSeries?.(index())}>{item.label}</button>
            </Show>
            <Show when={props.readout}>{readout => <strong class={styles.reading}>{readout()[index()] ?? 'n/a'}</strong>}</Show>
          </li>
        }</For>
      </ul>
    </figure>
  </Show>
}
