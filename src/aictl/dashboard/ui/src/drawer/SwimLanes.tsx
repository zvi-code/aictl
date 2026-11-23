import { createMemo, For, Show } from 'solid-js'
import { fmtBytes, fmtN } from '../design/format'
import { Icon, type Glyph } from '../ui/Icon'
import { clockTime } from './flowModel'
import {
  AgentTag, GapRow, Metrics, ModelLabel, Sign, SpanRow, StepPreview, stepColor, stepGlyph, stepKeys, stepKindLabels, stepLabel,
  stepOfRow, stepSpan, type GapRowData, type Hover, type SpanRowData,
} from './FlowParts'
import {
  barLength, hiddenCalls, layoutOf, stepMetrics, stepTitle, type BarScale, type Bars, type Chip, type FlowRow, type Lane,
} from './flowSteps'
import { COLLAPSED, GUTTER, GUTTER_MAX, GUTTER_MIN, LANE_MAX, LANE_MIN, laneGrid } from './flowWidths'
import { VirtualList } from './VirtualList'
import styles from './flow.module.css'

const laneGlyphs: Record<string, Glyph> = { User: 'prompts', Assistant: 'bot', Tools: 'tools', Subagents: 'agents', Hooks: 'hook' }
const laneMeaning: Record<string, string> = {
  User: 'User: the person who gives the prompts', Assistant: 'Assistant: the agent and its model requests',
  Tools: 'Tools: the tool calls', Subagents: 'Subagents: the subagents the assistant starts', Hooks: 'Hooks',
}
export const laneTitle = (lane: Lane) => lane.label ? `Tool lane: ${lane.label}` : laneMeaning[lane.group] ?? lane.id
const laneName = (lane: Lane) => lane.label || lane.group
const LANE_DRAG = 'application/x-aictl-lane'

/** One pixel size of `1ch` in this element's font, to turn a drag into a width in ch. */
export function chSize(element: HTMLElement) {
  const probe = document.createElement('span')
  probe.style.cssText = 'position:absolute;visibility:hidden;inline-size:10ch'
  element.append(probe)
  const size = probe.getBoundingClientRect().width / 10
  probe.remove()
  return size || 8
}

/** A column edge that resizes by drag, or by arrow keys when focused (Shift for bigger steps). */
function Resizer(props: { id: string; label: string; width: number; resize: (id: string, width: number) => void }) {
  const limits = () => props.id === GUTTER ? [GUTTER_MIN, GUTTER_MAX] : [LANE_MIN, LANE_MAX]
  return <span role="separator" tabindex={0} class={styles.resizer} aria-orientation="vertical" aria-label={`Resize ${props.label}`}
    aria-valuemin={limits()[0]} aria-valuemax={limits()[1]} aria-valuenow={props.width} title={`Drag or use the arrow keys to resize ${props.label}`}
    onPointerDown={event => {
      const handle = event.currentTarget
      const size = chSize(handle)
      const startX = event.clientX, startWidth = props.width
      const rtl = getComputedStyle(handle).direction === 'rtl'
      handle.setPointerCapture(event.pointerId)
      const move = (next: PointerEvent) => props.resize(props.id, startWidth + (rtl ? -1 : 1) * (next.clientX - startX) / size)
      const up = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up) }
      handle.addEventListener('pointermove', move)
      handle.addEventListener('pointerup', up)
      event.preventDefault()
    }}
    onKeyDown={event => {
      const step = event.shiftKey ? 8 : 2
      const delta = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
      if (event.key === 'Home') props.resize(props.id, limits()[0])
      else if (event.key === 'End') props.resize(props.id, limits()[1])
      else if (!delta) return
      else props.resize(props.id, props.width + delta)
      event.preventDefault()
    }} />
}

const barTitle = (bars: Bars) => [
  bars.out != null ? `Payload out ${fmtBytes(bars.out)}: arguments sent to the tool` : '',
  bars.back != null ? `Payload in ${fmtBytes(bars.back)}: result the tool returned` : '',
  bars.tokens != null ? `≈${fmtN(bars.tokens)} result tokens, estimated from the size` : '',
].filter(Boolean).join('\n')

/** Sizes as thin bars that continue the box on its right: out, in, and the estimated result tokens. */
function SizeBars(props: { bars: Bars; scale: BarScale }) {
  const length = (value: number | undefined, max: number) => barLength(value, max)
  return <Show when={props.bars.reported} fallback={
    <span class={styles.barsMissing} role="img" aria-label="Payload not reported" title="Payload not reported: the source gave no size for the arguments or the result. Not zero." />}>
    <span class={styles.bars} role="img" aria-label={barTitle(props.bars).replaceAll('\n', '; ')} title={barTitle(props.bars)}>
      <For each={[['out', props.bars.out, props.scale.bytes], ['back', props.bars.back, props.scale.bytes],
        ['tokens', props.bars.tokens, props.scale.tokens]] as const}>{([key, value, max]) =>
        <span class={styles.bar} data-bar={key} data-empty={value == null ? 'true' : undefined}
          style={{ 'inline-size': `${length(value ?? undefined, max) ?? 0}px` }} />
      }</For>
    </span>
  </Show>
}

/**
 * One compact row per step across lanes. A model round is one line from the assistant to the tools it
 * called, with one box per call in its lane; the step column at the end of the line names the model
 * where it changes, the size coming back and the step's numbers. Lanes resize, move and hide.
 */
export function SwimLanes(props: {
  rows: readonly FlowRow[]; lanes: readonly Lane[]; hidden: ReadonlySet<string>; columns: Record<string, number>; collapsed: ReadonlySet<string>
  grouped: boolean; groupCalls: boolean; compact: boolean; scale: BarScale; selected?: string
  select: (id: string) => void; hover: Hover; reveal?: { id: string }; onStart: () => void
  onRange: (first: number, last: number) => void; initial: (rows: readonly FlowRow[]) => number | undefined
  resize: (id: string, width: number) => void; moveLane: (id: string, to: number) => void; hideLane: (id: string) => void
  toggleSpan: (agent: string) => void
}) {
  const index = createMemo(() => new Map(props.lanes.map((lane, position) => [lane.id, position])))
  const width = (id: string) => props.columns[id] ?? COLLAPSED
  const grid = createMemo(() => laneGrid(props.lanes, props.columns))
  const column = (lane: string) => (index().get(lane) ?? 0) + 2
  const laneAt = (col: number) => props.lanes[col - 2]

  /** Grid placement of an edge from the centre of one shown lane to the centre of another. */
  const span = (lanes: readonly string[]) => {
    const columns = [...new Set(lanes.filter(lane => index().has(lane)).map(column))]
    if (columns.length < 2) return undefined
    const first = Math.min(...columns), last = Math.max(...columns)
    const half = (col: number) => width(laneAt(col).id) / 2
    return { 'grid-column': `${first} / ${last + 1}`, 'margin-inline-start': `${half(first)}ch`, 'margin-inline-end': `${half(last)}ch` }
  }

  const header = <div class={styles.laneHeader} style={{ 'grid-template-columns': grid().template, 'min-inline-size': grid().total }}>
    <span class={styles.laneCorner}><Sign glyph="events" label="Step number and time; hover a row for the step time" />
      <Resizer id={GUTTER} label="the step column" width={width(GUTTER)} resize={props.resize} /></span>
    <For each={props.lanes}>{(lane, position) => {
      const name = () => laneName(lane)
      return <span class={styles.laneHead} data-collapsed={props.collapsed.has(lane.id) ? 'true' : 'false'} title={laneTitle(lane)}
        onDragOver={event => { if (event.dataTransfer?.types.includes(LANE_DRAG)) { event.preventDefault(); event.dataTransfer.dropEffect = 'move' } }}
        onDrop={event => {
          const id = event.dataTransfer?.getData(LANE_DRAG)
          if (!id) return
          event.preventDefault()
          props.moveLane(id, position())
        }}>
        <button type="button" class={styles.laneGrip} draggable="true" aria-label={`Move lane ${name()}`}
          title={`Move lane ${name()}: drag it, or press the left and right arrow keys`}
          onDragStart={event => { event.dataTransfer?.setData(LANE_DRAG, lane.id); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move' }}
          onKeyDown={event => {
            const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
            if (!step) return
            event.preventDefault()
            const target = event.currentTarget
            props.moveLane(lane.id, position() + step)
            queueMicrotask(() => target.isConnected && target.focus())
          }}><Icon glyph="grip" small /></button>
        <Sign glyph={laneGlyphs[lane.group] ?? 'dots'} label={laneTitle(lane)} />
        <Show when={lane.label}><span class={styles.laneName}>{lane.label}</span></Show>
        <button type="button" class={styles.laneHide} aria-label={`Hide lane ${name()}`}
          title={`Hide lane ${name()}: its calls stay counted on each row; bring it back from Hidden lanes`}
          onClick={() => props.hideLane(lane.id)}><Icon glyph="eyeOff" small /></button>
        <Resizer id={lane.id} label={laneTitle(lane)} width={width(lane.id)} resize={props.resize} />
      </span>
    }}</For>
    <span class={styles.laneStepHead}><Sign glyph="detail" label="What happened: the model where it changes, the size coming back, the step and its numbers" /></span>
  </div>

  return <div class={styles.lanes} role="region" aria-label="Session streams" data-density={props.compact ? 'compact' : 'comfortable'}
    style={{ '--lanes-width': grid().total }}>
    <VirtualList label="Swim-lane steps" class={styles.laneList} rows={props.rows} identity={row => row.id} initial={props.initial}
      estimate={props.compact ? 26 : 44} end reveal={props.reveal} onStart={props.onStart} onRange={props.onRange} header={header}>
      {row => <Show when={stepOfRow(row())} fallback={row().type === 'gap' ? <GapRow row={row() as GapRowData} />
        : <SpanRow row={row() as SpanRowData} toggle={props.toggleSpan} />}>{item => {
        const step = () => item().step
        const layout = createMemo(() => layoutOf(step(), { grouped: props.grouped, groupCalls: props.groupCalls }))
        const chips = () => layout().chips.filter(chip => index().has(chip.lane))
        const away = createMemo(() => hiddenCalls(layout(), props.hidden))
        const edge = createMemo(() => {
          const line = layout().edge
          if (!line) return undefined
          const style = span([line.from, line.to, ...chips().filter(chip => chip.lane !== 'Assistant').map(chip => chip.lane)])
          return style && { style, direction: column(line.to) >= column(line.from) ? 'right' : 'left', dashed: line.dashed }
        })
        const metrics = () => stepMetrics(step()).filter(metric => metric.key !== 'request')
        return <button type="button" class={styles.laneRow} data-kind={stepColor(step())} data-step-row data-span={item().span?.place}
          style={{ 'grid-template-columns': grid().template, 'grid-template-rows': `repeat(${layout().lines}, var(--flow-line))` }}
          aria-pressed={props.selected === step().id ? 'true' : 'false'}
          aria-label={`Step ${step().n ?? ''} at ${clockTime(step().ts)}: ${stepKindLabels[step().kind]}${item().span ? `, subagent ${item().span!.agent}` : ''}, ${stepTitle(step())}${away().count ? `, ${away().count} in hidden lanes` : ''}`}
          onKeyDown={stepKeys} {...props.hover.bind(() => <StepPreview step={step()} />)} onClick={() => props.select(step().id)}>
          <span class={styles.laneGutter} title={stepSpan(step()) ? `Step time ${stepSpan(step())}: from the start of the step to its last result` : undefined}>
            <Sign glyph={stepGlyph(step())} label={stepKindLabels[step().kind]} /><strong>{stepLabel(step())}</strong>
            <time>{clockTime(step().ts)}</time></span>
          <For each={grid().guides}>{(_lane, position) => <span class={styles.laneGuide} data-lane-guide style={{ 'grid-column': position() + 2 }} aria-hidden="true" />}</For>
          <Show when={edge()}>{placed =>
            <span class={styles.laneEdge} aria-hidden="true" style={placed().style} data-direction={placed().direction}
              data-dashed={placed().dashed ? 'true' : 'false'} />
          }</Show>
          <For each={chips()}>{chip => <LaneChip chip={chip} step={step()} width={width(chip.lane)} column={column(chip.lane)}
            collapsed={props.collapsed.has(chip.lane)} scale={props.scale} />}</For>
          <span class={styles.laneStep}>
            <Show when={away().count}>
              <span class={styles.awayMark} role="img" aria-label={`${away().count} in hidden lanes`}
                title={`${fmtN(away().count)} ${away().count === 1 ? 'call' : 'calls'} of this step in hidden lanes: ${away().lanes.map(lane => lane.replace(/^Tools · /, '')).join(', ')}`}>
                <Icon glyph="eyeOff" small />{fmtN(away().count)}</span>
            </Show>
            <Show when={item().span}>{owner => <AgentTag agent={owner().agent} />}</Show>
            <Show when={step().modelShown}><ModelLabel step={step()} /></Show>
            <Show when={layout().back?.length}><Metrics items={layout().back!} class={styles.backMetrics} /></Show>
            <strong title={stepTitle(step())}>{stepTitle(step())}</strong>
            <Metrics items={metrics()} class={styles.stepMetrics} />
          </span>
        </button>
      }}</Show>}
    </VirtualList>
  </div>
}

/** A box in its lane: the program or tool on one line, the command after it, the size bars at its end. */
function LaneChip(props: { chip: Chip; step: { failed: boolean }; width: number; column: number; collapsed: boolean; scale: BarScale }) {
  const full = () => props.chip.full ?? [props.chip.title, props.chip.detail].filter(Boolean).join(' · ')
  return <span class={styles.laneChip} data-failed={props.chip.failed ? 'true' : 'false'} data-collapsed={props.collapsed ? 'true' : 'false'}
    data-narrow={props.width < 8 ? 'true' : 'false'}
    style={{ 'grid-column': props.column, 'grid-row': props.chip.line + 1 }} title={full()}>
    <span class={styles.chipBox}>
      <strong>{props.chip.title}</strong>
      <Show when={props.chip.detail}><span class={styles.target}>{props.chip.detail}</span></Show>
    </span>
    <Show when={props.chip.bars}>{bars => <SizeBars bars={bars()} scale={props.scale} />}</Show>
  </span>
}
