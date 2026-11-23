import { createMemo, createSignal, lazy, Loading, Show, untrack, type Accessor } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Chart } from '../../ui/Chart'
import { PanelState } from '../../ui/PanelState'
import { at } from '../data'
import type { ChartOptions, FieldRef, PanelProps, Read } from '../types'
import { presentation } from './model'
import { States } from './States'
import { aggregateFor, axisNaming, rangeValues } from './seriesReadout'
import styles from './kinds.module.css'

type SeriesRow = { x: number; values: (number | null)[] }
const Table = lazy(() => import('../../ui/Table').then(module => ({ default: module.Table<SeriesRow> })))

export default function Series(props: PanelProps & { setup?: ChartOptions['setup'] }) {
  const { ctx, def } = untrack(() => props as PanelProps & { def: Extract<PanelProps['def'], { kind: 'chart' }> })
  const setup = untrack(() => (props.setup ?? def.chart.setup)?.(props))
  return <SeriesView panel={props} columns={setup?.columns ?? (() => def.columns)}
    source={setup?.read ?? (() => ctx.read(def.sources[0]))} axis={setup?.axis ?? (() => ctx.read(def.chart.x))}
    description={def.chart.description} time={def.chart.time} stack={def.chart.stack} select={def.chart.select}
    namedControls={def.chart.namedControls} compact={props.params.compact === true}
    controls={setup?.controls} summary={setup?.summary} table={setup?.table} retry={setup?.retry} />
}

export function SeriesView(props: {
  panel: PanelProps; columns: Accessor<readonly FieldRef[]>; source: Accessor<Read>; axis: Accessor<Read>
  description: string; label?: string; time?: boolean; stack?: boolean; select?: boolean
  controls?: JSX.Element; summary?: JSX.Element; table?: () => JSX.Element
  retry?: () => void; empty?: string; namedControls?: boolean; compact?: boolean
}) {
  const { ctx, def } = untrack(() => props.panel)
  const [table, setTable] = createSignal(false)
  // The bucket the user picked by hover or arrow keys; null shows the whole range.
  const [index, setIndex] = createSignal<number | null>(null)
  const [hidden, setHidden] = createSignal(new Set<string>())
  const source = createMemo(() => props.source())
  const axis = createMemo(() => props.axis())
  const columns = createMemo(() => props.columns())
  const data = createMemo(() => columns().map(column => at(source().value, column.path)))
  const rows = createMemo<SeriesRow[]>(() => {
    const ticks = axis().value
    return Array.isArray(ticks) ? ticks.flatMap((x, i) => typeof x === 'number' && Number.isFinite(x) ? [{
      x,
      values: data().map(column => Array.isArray(column) && typeof column[i] === 'number' && Number.isFinite(column[i])
        ? Number(column[i]) : null),
    }] : []) : []
  })
  const display = createMemo(() => columns().map(column => presentation(ctx, column)))
  const units = createMemo(() => new Set(display().map(field => field.unit)))
  const ratio = () => units().size === 1 && units().has('ratio')
  const unit = () => ratio() || (units().size === 1 && units().has('percent')) ? '%' : undefined
  const naming = createMemo(() => axisNaming(display().map(field => field.unit)))
  const visible = (i: number) => !hidden().has(columns()[i].path)
  const series = createMemo(() => display().map(({ label }, i) => ({ label, visible: visible(i) })), {
    equals: (a, b) => a.length === b.length && a.every((series, i) => series.label === b[i].label && series.visible === b[i].visible),
  })
  const points = createMemo(() => rows().map(row => {
    if (!props.stack) return ratio() ? { x: row.x, values: row.values.map(value => value === null ? null : value * 100) } : row
    let total = 0
    return { x: row.x, values: row.values.map((value, i) => value === null ? null : total += visible(i) ? value : 0) }
  }))
  const result = (): Read => {
    for (const value of [source(), axis()]) {
      if (value.state !== 'ready' && value.state !== 'stale') return value
    }
    if (!rows().some(row => row.values.some(value => value != null))) {
      if (props.table && columns().length && rows().length) return { state: 'stale', message: 'This measure is not available from this source' }
      return { state: !columns().length || data().some(Array.isArray) ? 'empty' : 'unavailable' }
    }
    return [source(), axis()].find(value => value.state === 'stale') ??
      (data().some(column => !Array.isArray(column))
        ? { state: 'stale', message: 'Some series are not available from this source' } : { state: 'ready' })
  }
  const formatX = (value: number) => props.time ? new Date(value * 1000).toLocaleString() : String(value)
  const label = () => props.label ?? def.title
  const active = () => index() == null ? null : Math.min(index()!, Math.max(rows().length - 1, 0))
  const bucketSeconds = () => ctx.board('range', true)?.bucket_s ?? 0
  const apply = (start: number, end: number) => {
    const data = rows(), since = data[Math.min(start, end)]?.x
    const last = data[Math.max(start, end)]?.x
    const until = data[Math.max(start, end) + 1]?.x ??
      (last == null ? undefined : last + bucketSeconds())
    if (since != null && until != null && until > since) ctx.select({ since, until })
  }
  const toggle = (i: number) => setHidden(old => {
    const next = new Set(old)
    const key = columns()[i].path
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })
  const picked = () => active() == null ? undefined : rows()[active()!]
  const rangeText = () => {
    const first = rows()[0], last = rows().at(-1)
    return first && last ? `${formatX(first.x)} – ${formatX(last.x + bucketSeconds())}` : ''
  }
  const bucketText = createMemo(() => picked() ? formatX(picked()!.x) : rangeText())
  // Until a bucket is picked the readout is the range: totals, or averages for shares and gauges.
  const reading = createMemo(() => {
    const row = picked()
    const values = row ? row.values : rangeValues(rows(), display().map(field => field.unit))
    return values.flatMap((value, i) => value == null || !visible(i) ? [] : [{
      label: row || aggregateFor(display()[i].unit) === 'sum' ? display()[i].label : `${display()[i].label} (avg)`,
      value: display()[i].format(value),
    }])
  })
  const plot = () => <Chart label={label()} description={props.description} series={series()} points={points()}
    xAxis={props.time ? 'time' : 'number'} stack={props.stack} unit={unit()} axisLabel={naming().label}
    ticks={naming().formatTicks ? values => values.map(display()[0].format) : undefined}
    onToggleSeries={toggle} onHover={props.select ? setIndex : undefined} onBrush={props.select ? apply : undefined} />
  return <>{props.controls}<States result={result} empty={props.empty ?? def.empty} retry={props.retry ?? ctx.refresh} reserveStaleSpace>
    <Show when={props.compact && !table()}><div class={styles.compactPlot}>{plot()}</div></Show>
    <div class={props.compact ? `${styles.chartTools} ${styles.compactChart}` : styles.chartTools}>
      <button class={styles.button} type="button" onClick={() => setTable(!table())}>{props.namedControls ?
        `Show ${label()} ${table() ? 'chart' : 'table'}` : table() ? 'Show chart' : 'Show data table'}</button>
      <Show when={props.select}>
        <button class={`${styles.button} ${styles.chartBucket}`} type="button"
          aria-label={`${props.namedControls ? `Select ${label()} time bucket` : 'Select chart bucket'}: ${bucketText()}`}
          onClick={() => { const at = active(); if (at != null) apply(at, at) }} onKeyDown={event => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault()
              const step = event.key === 'ArrowLeft' ? -1 : 1
              setIndex(Math.max(0, Math.min(rows().length - 1, (active() ?? (step < 0 ? rows().length : -1)) + step)))
            } else if (event.key === 'Escape') { event.preventDefault(); setIndex(null); ctx.select(null) }
          }}>{bucketText()}</button>
        <span>{picked() ? '' : 'Range · '}{reading().map(item => `${item.label}: ${item.value}`).join(' · ')}</span>
      </Show>
    </div>
    <Show when={!table()} fallback={
      <Loading fallback={<PanelState state="loading" inline />}>
        {props.table?.() ?? <Table label={`${label()} data`} rows={rows()} rowId={row => String(row.x)}
          fields={[
            { id: 'x', label: props.time ? 'Bucket start' : 'X', read: row => row.x, format: value => formatX(Number(value)) },
            ...display().map(({ label, format }, i) => ({ id: columns()[i].path, label, format,
              read: (row: SeriesRow) => row.values[i] })),
          ]} />}
      </Loading>}>
      <Show when={!props.compact}>{plot()}</Show>
    </Show>
  </States><Show when={source().value != null || result().state !== 'loading'}>{props.summary}</Show></>
}
