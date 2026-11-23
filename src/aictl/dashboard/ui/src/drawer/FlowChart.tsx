import { createEffect, createMemo, createSignal, For, Match, onCleanup, Show, Switch, untrack } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { fmtBytes, fmtMs, fmtN, fmtUsd } from '../design/format'
import { Icon } from '../ui/Icon'
import { clockTime } from './flowModel'
import {
  aliveAt, barLength, barShare, firstTokenShare, resultOf, rowOffsets, rowRange, segmentTitle, stepContext, stepHeadline, timingOf, workLabels,
  type ChartRow, type Run, type Scale, type Scales, type Segment, type Tracks, type Work,
} from './chartModel'
import { GapRow, SpanRow, StepPreview, stepColor, stepKindLabels, type GapRowData, type Hover, type SpanRowData } from './FlowParts'
import { stepTitle, type Step } from './flowSteps'
import { columnGrid, type Column } from './flowWidths'
import styles from './flow.module.css'

/** One column of the chart: what it shows, its default width, and what its header says on hover. */
export interface ChartColumn extends Column { name: string; label: string; title: string; fixed?: boolean }

/** Px per agent track. */
export const TRACK_PX = 7

const pct = (value: number) => `${+(Math.min(1, Math.max(0, value)) * 100).toFixed(3)}%`
const capText = (scale: Scale, format: (value: number) => string) => scale.cut
  ? `The full width is ${format(scale.cap)}, the ${Math.round((scale.quantile ?? 1) * 100)}th percentile of the loaded steps; longer ones (up to ${format(scale.max)}) are drawn full and cut, with their value beside them.`
  : `Linear: the full width is ${format(scale.cap)}, the largest value loaded.`
const seconds = (value: number) => fmtMs(value * 1000)

/** The columns of the chart for these scales; the agent column only when more than one agent ran. */
export function chartColumns(scales: Scales, tracks: number): ChartColumn[] {
  return [
    { id: 'time', name: 'Time', width: 8, min: 8, max: 12, label: 'Time', title: 'When the step was recorded: a model round when its reply arrived (its bar starts when the request was sent), any other step at its time. Hover a row for both.' },
    ...tracks > 1 ? [{ id: 'agents', name: 'Agents', width: Math.ceil((tracks * TRACK_PX + 10) / 7), fixed: true, label: '', title:
      'Agents: the main agent on the first track, each subagent on its own track from its first step to its handback. A dot marks the agent of the row.' }] : [],
    { id: 'step', name: 'Step', width: 30, min: 12, label: 'Step', title: 'What the step did: the program and its first argument, the tool and its target, the prompt, or the reply.' },
    { id: 'duration', name: 'Took', width: 22, min: 12, flex: true, label: `Took ≤ ${seconds(scales.time.cap)}`, title:
      `Time of the step: the model's reply from when the request was sent, then each tool call from its start, coloured by kind; calls that overlap take a line each. ${capText(scales.time, seconds)}` },
    { id: 'context', name: 'Context', width: 13, label: `Context ≤ ${fmtN(scales.context.cap)}`, title:
      `Context: the tokens the model read for the request (input, cache read and cache write), or what a compaction left. ${capText(scales.context, fmtN)}` },
    { id: 'output', name: 'Output', width: 10, label: 'Output', title: `Output tokens the model wrote. ${capText(scales.output, fmtN)}` },
    { id: 'result', name: 'Result', width: 10, label: 'Result', title: `Size of what the tool calls returned, in bytes. ${capText(scales.result, fmtBytes)}` },
    { id: 'cost', name: 'Cost', width: 7, label: 'Cost', title: 'Cost of the request in US dollars, as priced by aictl from the token counts.' },
  ]
}

/** A bar to a column's scale; a dashed box when the value was not reported (never a zero-length bar). */
function Bar(props: { value: number | null | undefined; scale: Scale; text: string; title: string; mark?: number; missing?: string }) {
  const share = () => barShare(props.value, props.scale)
  return <span class={styles.cellBar} title={props.title}>
    <span class={styles.barTrack}>
      <Show when={share()} fallback={<Show when={props.missing}><span class={styles.missing} /></Show>}>{bar =>
        <span class={styles.fill} data-cut={bar().cut ? 'true' : undefined} style={{ 'inline-size': barLength(bar().share) }} />}</Show>
      <Show when={props.mark != null && barShare(props.mark, props.scale)}>{mark =>
        <span class={styles.tick} style={{ 'inset-inline-start': pct(mark().share) }} />}</Show>
    </span>
    <span class={styles.value} data-missing={share() ? undefined : 'true'}>{share() ? props.text : props.missing ?? ''}</span>
  </span>
}

function TimeBars(props: { step: Step; scale: Scale }) {
  const timing = createMemo(() => timingOf(props.step))
  const lines = () => Math.min(4, timing().lines)
  const position = (segment: Segment): JSX.CSSProperties => {
    const left = Math.min(1, segment.from / props.scale.cap)
    const share = segment.to == null ? 0 : Math.max(0, Math.min(1 - left, (segment.to - segment.from) / props.scale.cap))
    // The reply comes before the calls it asks for, never beside them: it takes the whole height; parallel calls share it.
    const whole = segment.event.type === 'api_call' || lines() === 1
    const line = Math.min(lines() - 1, segment.line)
    return { 'inset-inline-start': pct(left), 'inline-size': segment.to == null ? undefined : barLength(share),
      'inset-block-start': whole ? '0%' : pct(line / lines()), 'block-size': whole ? '100%' : pct(1 / lines()) }
  }
  const total = () => timing().span
  const text = () => total() == null ? (timing().segments.length ? 'not reported' : '') : seconds(total()!)
  return <span class={styles.cellBar}>
    <span class={styles.barTrack} data-lines={lines()}>
      <For each={timing().segments}>{segment =>
        <span class={segment.to == null ? styles.segMissing : styles.seg} data-work={segment.work} data-failed={segment.failed ? 'true' : undefined}
          style={position(segment)} title={segmentTitle(segment, { ms: fmtMs })}>
          <Show when={firstTokenShare(segment)}>{share => <span class={styles.firstToken} style={{ 'inline-size': pct(share()) }} />}</Show>
        </span>
      }</For>
      <Show when={total() != null && total()! > props.scale.cap}><span class={styles.cut} title={`Cut: ${seconds(total()!)}, longer than the scale`} /></Show>
    </span>
    <span class={styles.value} data-missing={total() == null ? 'true' : undefined}
      title={total() == null ? 'The source did not report how long this step took.' : `From the start of the step to its last result: ${seconds(total()!)}${timing().lines > 1 ? `; ${timing().lines} calls overlapped at most` : ''}`}>{text()}</span>
  </span>
}

function Tracks(props: { tracks: Tracks; step: Step; scopeAgent: string }) {
  const own = () => props.tracks.of.get(props.step.agent === props.scopeAgent ? '' : props.step.agent)
  const alive = createMemo(() => aliveAt(props.tracks, props.step.ts))
  const edge = () => props.step.kind === 'agent' ? 'start' : props.step.kind === 'agent_end' ? 'end' : undefined
  return <span class={styles.tracks} aria-hidden="true">
    <For each={alive()}>{track =>
      <span class={styles.track} data-edge={track === own() ? edge() : undefined} style={{ 'inset-inline-start': `${track * TRACK_PX + 4}px` }} />
    }</For>
    <Show when={own() != null}><span class={styles.trackDot} data-main={own() === 0 ? 'true' : undefined} style={{ 'inset-inline-start': `${own()! * TRACK_PX + 4}px` }} /></Show>
  </span>
}

/** What the row says it did: a swatch of its kind of work, its title, and whether it failed, repeated or retried. */
function StepCell(props: { step: Step; repeat?: { count: number; retry: boolean } }) {
  const headline = createMemo(() => stepHeadline(props.step))
  return <span class={styles.stepCell} data-work={headline().work}>
    <span class={styles.swatch} data-work={headline().work} title={workLabels[headline().work]} />
    <Show when={props.step.failed}><span class={styles.failMark} role="img" aria-label="Failed" title="A call or the request of this step failed"><Icon glyph="warn" small /></span></Show>
    <Show when={props.repeat}>{repeat =>
      <span class={styles.repeat} title={repeat().retry ? 'Retry: the same calls as the step before, which failed'
        : `Repeat ${repeat().count}: the same calls with the same arguments as the step before`}>{repeat().retry ? 'retry' : `↻${repeat().count}`}</span>}</Show>
    <Show when={props.step.modelChanged}><span class={styles.modelLabel} data-changed="true" title={`Model changed to ${props.step.model}`}>{props.step.model}</span></Show>
    <span class={styles.headline}>{headline().text}</span>
  </span>
}

const costText = (step: Step) => step.call ? step.call.cost_usd == null ? '' : step.call.cost_usd < 0.01 ? '<$0.01' : fmtUsd(step.call.cost_usd) : ''

function stepCell(id: string, step: Step, props: ChartProps) {
  switch (id) {
    case 'time': return <time class={styles.clock} title={step.call?.duration_ms ? `Request sent ${clockTime(step.start)}, reply ${clockTime(step.call.ts)}` : `At ${clockTime(step.ts)}`}>{clockTime(step.ts)}</time>
    case 'agents': return <Tracks tracks={props.tracks} step={step} scopeAgent={props.scopeAgent} />
    case 'step': return <StepCell step={step} repeat={props.repeats.get(step.id)} />
    case 'duration': return <TimeBars step={step} scale={props.scales.time} />
    case 'context': {
      const value = stepContext(step)
      const compaction = step.kind === 'compaction'
      return <Bar value={value} scale={props.scales.context} mark={compaction ? step.lead.before_tokens ?? undefined : undefined}
        text={compaction && step.lead.before_tokens != null ? `↓${fmtN(value)}` : fmtN(value)}
        title={value == null ? '' : compaction ? `Compacted from ${fmtN(step.lead.before_tokens)} to ${fmtN(value)} tokens` : `Context ${value.toLocaleString('en-US')} tokens`}
        missing={step.call && value == null ? 'not reported' : undefined} />
    }
    case 'output': {
      const value = step.call?.tokens?.output
      return <Bar value={value} scale={props.scales.output} text={fmtN(value)} title={value == null ? '' : `Output ${value.toLocaleString('en-US')} tokens`}
        missing={step.call && value == null ? 'not reported' : undefined} />
    }
    case 'result': {
      const result = resultOf(step)
      const partial = result.reported && result.reported < result.calls ? ` (${result.reported} of ${result.calls} calls reported a size)` : ''
      return <Bar value={result.bytes} scale={props.scales.result} text={`${fmtBytes(result.bytes)}${partial ? '*' : ''}`}
        title={result.bytes == null ? '' : `Results returned: ${result.bytes.toLocaleString('en-US')} bytes${partial}`}
        missing={result.calls && result.bytes == null ? 'not reported' : undefined} />
    }
    case 'cost': return <span class={styles.cost} title={step.call ? step.call.cost_usd == null ? 'Not priced' : `$${step.call.cost_usd}` : ''}>{costText(step)}</span>
    default: return <span />
  }
}

function runCell(id: string, run: Run, props: ChartProps) {
  const sum = (read: (step: Step) => number | undefined) => {
    const values = run.steps.map(read).filter((value): value is number => value != null)
    return values.length ? values.reduce((total, value) => total + value, 0) : undefined
  }
  switch (id) {
    case 'time': return <time class={styles.clock}>{clockTime(run.steps[0].ts)}</time>
    case 'agents': return <Tracks tracks={props.tracks} step={run.steps[0]} scopeAgent={props.scopeAgent} />
    case 'step': return <span class={styles.stepCell}>
      <Icon glyph={run.expanded ? 'down' : 'chev'} small />
      <span class={styles.swatch} data-work={run.work} title={workLabels[run.work]} />
      <Show when={run.failed}><span class={styles.failMark} role="img" aria-label={`${run.failed} failed`} title={`${run.failed} of ${run.steps.length} steps failed`}><Icon glyph="warn" small /></span></Show>
      <span class={styles.headline}>{run.title}</span></span>
    case 'duration': {
      const total = sum(step => timingOf(step).span)
      return <Bar value={total} scale={props.scales.time} text={seconds(total ?? 0)} title={`Summed time of ${run.steps.length} steps`} missing="not reported" />
    }
    case 'context': { const value = stepContext(run.steps.at(-1)!); return <Bar value={value} scale={props.scales.context} text={fmtN(value)} title="Context of the last step of the run" /> }
    case 'output': { const value = sum(step => step.call?.tokens?.output ?? undefined); return <Bar value={value} scale={props.scales.output} text={fmtN(value)} title="Summed output tokens of the run" /> }
    case 'result': { const value = sum(step => resultOf(step).bytes); return <Bar value={value} scale={props.scales.result} text={fmtBytes(value)} title="Summed result bytes of the run" /> }
    case 'cost': { const value = sum(step => step.call?.cost_usd ?? undefined); return <span class={styles.cost}>{value == null ? '' : fmtUsd(value)}</span> }
    default: return <span />
  }
}

type StepItem = Extract<ChartRow, { type: 'step' }>

/** One row of the chart: a pause, a subagent summary, a collapsed run, or a step. */
function ChartLine(props: { row: ChartRow; chart: ChartProps; style: JSX.CSSProperties }) {
  const run = () => props.row.type === 'run' ? props.row : undefined
  const item = () => props.row.type === 'step' ? props.row : undefined
  return <Switch>
    <Match when={props.row.type === 'gap'}><GapRow row={props.row as GapRowData} /></Match>
    <Match when={props.row.type === 'span'}><SpanRow row={props.row as SpanRowData} toggle={props.chart.toggleSpan} /></Match>
    <Match when={run()}>{current => <RunLine run={current()} chart={props.chart} style={props.style} />}</Match>
    <Match when={item()}>{current => <StepLine item={current()} chart={props.chart} style={props.style} />}</Match>
  </Switch>
}

function RunLine(props: { run: Run; chart: ChartProps; style: JSX.CSSProperties }) {
  const run = () => props.run
  return <button type="button" class={styles.chartRow} data-step-row aria-expanded={run().expanded ? 'true' : 'false'}
    data-kind={run().failed ? 'error' : 'tool'} style={props.style}
    aria-label={`${run().title}: ${run().steps.length} similar steps from ${clockTime(run().steps[0].start)}${run().failed ? `, ${run().failed} failed` : ''}; ${run().expanded ? 'collapse' : 'expand'}`}
    onClick={() => props.chart.toggleRun(run().id)}>
    <For each={props.chart.columns}>{column => runCell(column.id, run(), props.chart)}</For>
  </button>
}

function StepLine(props: { item: StepItem; chart: ChartProps; style: JSX.CSSProperties }) {
  const step = () => props.item.step
  const request = () => step().call?.request_n
  return <button type="button" class={styles.chartRow} data-step-row data-kind={stepColor(step())} data-span={props.item.span?.place}
    aria-pressed={props.chart.selected === step().id ? 'true' : 'false'} style={props.style}
    aria-label={`Step ${step().n ?? ''}${request() != null ? `, request ${request()}` : ''} at ${clockTime(step().start)}: ${stepKindLabels[step().kind]}${props.item.span ? `, subagent ${props.item.span.agent}` : ''}, ${stepTitle(step())}`}
    {...props.chart.hover.bind(() => <StepPreview step={step()} />)} onClick={() => props.chart.select(step().id)}>
    <For each={props.chart.columns}>{column => stepCell(column.id, step(), props.chart)}</For>
  </button>
}

export interface ChartProps {
  rows: readonly ChartRow[]; columns: readonly ChartColumn[]; widths: Record<string, number>
  tracks: Tracks; scales: Scales; repeats: ReadonlyMap<string, { count: number; retry: boolean }>; scopeAgent: string
  selected?: string; select: (id: string) => void; hover: Hover; reveal?: { id: string }
  onStart: () => void; onRange: (first: number, last: number) => void; initial: (rows: readonly ChartRow[]) => number | undefined
  toggleSpan: (agent: string) => void; toggleRun: (id: string) => void; close: () => void
  moveColumn: (id: string, to: number) => void; hideColumn: (id: string) => void; resize: (id: string, width: number) => void
}

const COLUMN_DRAG = 'application/x-aictl-flow-column'

function Resizer(props: { column: ChartColumn; width: number; resize: (id: string, width: number) => void }) {
  return <span role="separator" tabindex={0} class={styles.resizer} aria-orientation="vertical" aria-label={`Resize ${props.column.label || props.column.id}`}
    aria-valuemin={props.column.min ?? 4} aria-valuemax={props.column.max ?? 80} aria-valuenow={props.width}
    onPointerDown={event => {
      const handle = event.currentTarget
      const ch = parseFloat(getComputedStyle(handle).fontSize) * 0.55 || 7
      const startX = event.clientX, startWidth = props.width
      handle.setPointerCapture(event.pointerId)
      const move = (next: PointerEvent) => props.resize(props.column.id, startWidth + (next.clientX - startX) / ch)
      const up = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up) }
      handle.addEventListener('pointermove', move)
      handle.addEventListener('pointerup', up)
      event.preventDefault()
    }}
    onKeyDown={event => {
      const delta = event.key === 'ArrowLeft' ? -2 : event.key === 'ArrowRight' ? 2 : 0
      if (!delta) return
      event.preventDefault()
      props.resize(props.column.id, props.width + delta * (event.shiftKey ? 4 : 1))
    }} />
}

/**
 * The Flow chart: one row per step at a fixed height, so 20,000 rows scroll without measuring any of them. The
 * columns move, hide and resize; the time bars, context, output and result are drawn to the scales in their headers.
 */
export function FlowChart(props: ChartProps) {
  let scroller!: HTMLDivElement
  const [top, setTop] = createSignal(0)
  const [height, setHeight] = createSignal(600)
  const offsets = createMemo(() => rowOffsets(props.rows))
  const range = createMemo(() => rowRange(offsets(), top(), height(), 6))
  const visible = createMemo(() => {
    const [first, last] = range()
    return props.rows.slice(first, last + 1).map((row, index) => ({ row, index: first + index }))
  })
  const grid = createMemo(() => columnGrid(props.columns, props.widths))
  const total = () => offsets()[offsets().length - 1] ?? 0

  // Scroll position: open at the given row, keep the rows in view when older rows arrive above, follow the end.
  let anchor: { id: string; delta: number } | undefined
  let started = false
  let atEnd = true
  let frame = 0
  const onScroll = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      const y = scroller.scrollTop
      const going = y < top()
      setTop(y)
      atEnd = y + height() >= total() - 4
      const [first] = rowRange(offsets(), y, 1)
      const row = props.rows[first]
      anchor = row && { id: row.id, delta: y - offsets()[first] }
      if (going && first <= 3) props.onStart()
    })
  }
  onCleanup(() => cancelAnimationFrame(frame))
  const scrollTo = (y: number) => {
    const next = Math.max(0, Math.min(y, total() - height()))
    scroller.scrollTop = next
    setTop(next)
  }
  createEffect(() => props.rows, rows => {
    if (!scroller) return
    if (!rows.length) { started = false; return }
    if (!started) {
      started = true
      const index = untrack(() => props.initial(rows))
      queueMicrotask(() => scrollTo(index == null ? total() : offsets()[index]))
      return
    }
    if (atEnd) { queueMicrotask(() => scrollTo(total())); return }
    if (anchor) {
      const index = rows.findIndex(row => row.id === anchor!.id)
      if (index >= 0) { const y = offsets()[index] + anchor.delta; queueMicrotask(() => scrollTo(y)) }
    }
  })
  let revealed: { id: string } | undefined
  createEffect(() => ({ reveal: props.reveal, rows: props.rows }), current => {
    if (!current.reveal || current.reveal === revealed || !scroller) return
    const index = current.rows.findIndex(row => row.id === current.reveal!.id)
    if (index < 0) return
    revealed = current.reveal
    queueMicrotask(() => scrollTo(offsets()[index] - height() / 2))
  })
  let shown = ''
  createEffect(() => rowRange(offsets(), top(), height()), ([first, last]) => {
    const key = `${first}:${last}`
    if (key !== shown && last >= first) { shown = key; props.onRange(first, last) }
  })

  const focusable = (row: ChartRow) => row.type === 'step' || row.type === 'run'
  const focusRow = (index: number) => {
    const row = props.rows[index]
    if (!row) return
    const y = offsets()[index]
    if (y < top() + 30 || y + 30 > top() + height()) scrollTo(y - height() / 2)
    const find = () => scroller.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(row.id)}"] [data-step-row]`)
    const now = find()
    if (now) now.focus()
    // A row scrolled into view is drawn on the next update or, at the latest, the next frame.
    else queueMicrotask(() => { const next = find(); if (next) next.focus(); else requestAnimationFrame(() => find()?.focus()) })
  }
  const keys = (event: KeyboardEvent) => {
    // Escape closes the step panel first; with nothing selected it goes on (to the drawer).
    if (event.key === 'Escape') { if (props.selected) { event.preventDefault(); event.stopPropagation(); props.close() } return }
    const from = (event.target as HTMLElement).closest<HTMLElement>('[data-row-index]')
    if (!from || event.altKey || event.ctrlKey || event.metaKey) return
    const index = Number(from.dataset.rowIndex)
    const page = Math.max(1, Math.floor(height() / 24) - 1)
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : event.key === 'PageDown' ? page : event.key === 'PageUp' ? -page : 0
    let target = event.key === 'Home' ? 0 : event.key === 'End' ? props.rows.length - 1 : step ? index + step : -1
    if (target < 0 && !step && event.key !== 'Home') return
    event.preventDefault()
    const direction = step < 0 || event.key === 'End' ? -1 : 1
    target = Math.max(0, Math.min(props.rows.length - 1, target))
    while (target >= 0 && target < props.rows.length && !focusable(props.rows[target])) target += direction
    if (target >= 0 && target < props.rows.length) focusRow(target)
  }

  const header = <div class={styles.chartHeader} style={{ 'grid-template-columns': grid().template, 'min-inline-size': grid().total }}>
    <For each={props.columns}>{(column, position) =>
      <span class={styles.colHead} title={column.title}
        onDragOver={event => { if (event.dataTransfer?.types.includes(COLUMN_DRAG)) { event.preventDefault(); event.dataTransfer.dropEffect = 'move' } }}
        onDrop={event => {
          const id = event.dataTransfer?.getData(COLUMN_DRAG)
          if (!id) return
          event.preventDefault()
          props.moveColumn(id, position())
        }}>
        <Show when={column.id !== 'time'}>
          <button type="button" class={styles.colGrip} draggable="true" aria-label={`Move column ${column.name}`}
            title={`Move column ${column.name}: drag it, or press the left and right arrow keys`}
            onDragStart={event => { event.dataTransfer?.setData(COLUMN_DRAG, column.id); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move' }}
            onKeyDown={event => {
              const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
              if (!step) return
              event.preventDefault()
              const target = event.currentTarget
              props.moveColumn(column.id, position() + step)
              queueMicrotask(() => target.isConnected && target.focus())
            }}><Icon glyph="grip" small /></button>
        </Show>
        <span class={styles.colName}>{column.label}</span>
        <Show when={column.id !== 'time' && column.id !== 'step'}>
          <button type="button" class={styles.colHide} aria-label={`Hide column ${column.name}`} title={`Hide column ${column.name}`}
            onClick={() => props.hideColumn(column.id)}><Icon glyph="eyeOff" small /></button>
        </Show>
        <Show when={!column.fixed && !column.flex}><Resizer column={column} width={props.widths[column.id] ?? column.width} resize={props.resize} /></Show>
      </span>
    }</For>
  </div>

  const rowStyle = () => ({ 'grid-template-columns': grid().template, 'min-inline-size': grid().total })
  return <div class={styles.chartBox} style={{ '--chart-width': grid().total }}>
    <div ref={node => {
      scroller = node
      setHeight(node.clientHeight || 600)
      if (typeof ResizeObserver === 'function') {
        const observer = new ResizeObserver(entries => { const box = entries[0]?.contentRect; if (box?.height) setHeight(box.height) })
        observer.observe(node)
        onCleanup(() => observer.disconnect())
      }
    }} class={styles.chartList} data-flow-scroll role="region" aria-label="Flow chart rows" tabindex={0} onScroll={onScroll} onKeyDown={keys}>
      {header}
      <div role="list" aria-label="Flow steps" class={styles.chartRows} style={{ 'block-size': `${total()}px` }}>
        <For each={visible()} keyed={item => item.row.id}>{item => {
          const row = () => item().row
          return <div role="listitem" class={styles.chartItem} data-row-id={row().id} data-row-index={item().index}
            aria-posinset={item().index + 1} aria-setsize={props.rows.length}
            style={{ transform: `translateY(${offsets()[item().index]}px)`, 'block-size': `${offsets()[item().index + 1] - offsets()[item().index]}px` }}>
            <ChartLine row={row()} chart={props} style={rowStyle()} />
          </div>
        }}</For>
      </div>
    </div>
  </div>
}

/** The colour key: each kind of work in view with its count of calls. */
export function WorkKey(props: { counts: readonly { work: Work; count: number }[]; failed: number }) {
  return <ul class={styles.workKey} aria-label="Kinds of work">
    <For each={props.counts}>{item =>
      <li title={item.work === 'model' ? 'Model requests: the time from sending a request to its reply' : `Tool calls: ${workLabels[item.work]}`}>
        <span class={styles.swatch} data-work={item.work} />{workLabels[item.work]} <strong>{fmtN(item.count)}</strong></li>
    }</For>
    <Show when={props.failed}><li title="Failed requests and tool calls"><span class={styles.swatch} data-work="failed" />failed <strong>{fmtN(props.failed)}</strong></li></Show>
  </ul>
}
