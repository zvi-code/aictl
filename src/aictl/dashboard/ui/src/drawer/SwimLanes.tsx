import { createMemo, For, Show } from 'solid-js'
import { Icon, type Glyph } from '../ui/Icon'
import { clockTime } from './flowModel'
import {
  AgentTag, GapRow, Metrics, ModelLabel, Sign, SpanRow, StepPreview, stepColor, stepGlyph, stepKeys, stepKindLabels, stepLabel,
  stepOfRow, stepSpan, type GapRowData, type Hover, type SpanRowData,
} from './FlowParts'
import { layoutOf, modelFamily, stepMetrics, stepTitle, type FlowRow, type Lane } from './flowSteps'
import { COLLAPSED, GUTTER, GUTTER_MAX, GUTTER_MIN, LANE_MAX, LANE_MIN, STEP_MIN, textFit } from './flowWidths'
import { VirtualList } from './VirtualList'
import styles from './flow.module.css'

/** Below this width (ch) a chip drops its target and numbers; they stay on hover and in the side panel. */
const NARROW = 14

const laneGlyphs: Record<string, Glyph> = { User: 'prompts', Assistant: 'bot', Tools: 'tools', Subagents: 'agents', Hooks: 'hook' }
const laneMeaning: Record<string, string> = {
  User: 'User: the person who gives the prompts', Assistant: 'Assistant: the agent and its model requests',
  Tools: 'Tools: the tool calls', Subagents: 'Subagents: the subagents the assistant starts', Hooks: 'Hooks',
}
export const laneTitle = (lane: Lane) => lane.label ? `Tool lane: ${lane.label}` : laneMeaning[lane.group] ?? lane.id

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

/**
 * One row per step across lanes. A model round is one edge from the assistant to the tools it
 * called, labelled with the model, the tool calls in their lanes, and a dashed edge for the results
 * coming back. The step column on the right gives its title and numbers. Every column resizes; a
 * lane can collapse to an icon strip.
 */
export function SwimLanes(props: {
  rows: readonly FlowRow[]; lanes: readonly Lane[]; columns: Record<string, number>; collapsed: ReadonlySet<string>
  grouped: boolean; compact: boolean; selected?: string
  select: (id: string) => void; hover: Hover; reveal?: { id: string }; onStart: () => void
  onRange: (first: number, last: number) => void; initial: (rows: readonly FlowRow[]) => number | undefined
  resize: (id: string, width: number) => void; toggleLane: (id: string) => void; toggleSpan: (agent: string) => void
}) {
  const index = createMemo(() => new Map(props.lanes.map((lane, position) => [lane.id, position])))
  const width = (id: string) => props.columns[id] ?? COLLAPSED
  const template = () => `${width(GUTTER)}ch ${props.lanes.map(lane => `${width(lane.id)}ch`).join(' ')} minmax(${STEP_MIN}ch, 1fr)`
  const total = () => {
    let sum = width(GUTTER) + STEP_MIN
    for (const lane of props.lanes) sum += width(lane.id)
    return `${sum}ch`
  }
  const column = (lane: string) => (index().get(lane) ?? index().get('Assistant') ?? 0) + 2
  const laneAt = (col: number) => props.lanes[col - 2]

  /** Grid placement of an edge from the centre of one lane to the centre of another, and its length in ch. */
  const span = (lanes: readonly string[]) => {
    const columns = lanes.map(column)
    const first = Math.min(...columns), last = Math.max(...columns)
    const half = (col: number) => width(laneAt(col).id) / 2
    let length = half(first) + (first === last ? 0 : half(last))
    for (let col = first + 1; col < last; col++) length += width(laneAt(col).id)
    return { style: { 'grid-column': `${first} / ${last + 1}`, 'margin-inline-start': `${half(first)}ch`, 'margin-inline-end': `${half(last)}ch` }, length }
  }

  const header = <div class={styles.laneHeader} style={{ 'grid-template-columns': template(), 'min-inline-size': total() }}>
    <span class={styles.laneCorner}><Sign glyph="events" label="Step number and time" /><span>Step · time</span>
      <Resizer id={GUTTER} label="the step column" width={width(GUTTER)} resize={props.resize} /></span>
    <For each={props.lanes}>{lane => {
      const shut = () => props.collapsed.has(lane.id)
      return <span class={styles.laneHead} data-collapsed={shut() ? 'true' : 'false'} title={laneTitle(lane)}>
        <Sign glyph={laneGlyphs[lane.group] ?? 'dots'} label={laneTitle(lane)} />
        <Show when={lane.label && !shut()}><span class={styles.laneName}>{lane.label}</span></Show>
        <button type="button" class={styles.laneCollapse} aria-pressed={shut() ? 'true' : 'false'}
          aria-label={`${shut() ? 'Expand' : 'Collapse'} ${laneTitle(lane)}`} title={shut() ? 'Expand this lane' : 'Collapse this lane to its icon'}
          onClick={() => props.toggleLane(lane.id)}><Icon glyph={shut() ? 'next' : 'prev'} small /></button>
        <Show when={!shut()}><Resizer id={lane.id} label={laneTitle(lane)} width={width(lane.id)} resize={props.resize} /></Show>
      </span>
    }}</For>
    <span class={styles.laneStepHead}>What happened · numbers</span>
  </div>

  return <div class={styles.lanes} role="region" aria-label="Session streams" data-density={props.compact ? 'compact' : 'comfortable'}
    style={{ '--lanes-width': total() }}>
    <VirtualList label="Swim-lane steps" class={styles.laneList} rows={props.rows} identity={row => row.id} initial={props.initial}
      estimate={props.compact ? 48 : 92} end reveal={props.reveal} onStart={props.onStart} onRange={props.onRange} header={header}>
      {row => <Show when={stepOfRow(row())} fallback={row().type === 'gap' ? <GapRow row={row() as GapRowData} />
        : <SpanRow row={row() as SpanRowData} toggle={props.toggleSpan} />}>{item => {
        const step = () => item().step
        const layout = createMemo(() => layoutOf(step(), props.grouped))
        const edgeLanes = () => {
          const edge = layout().edge
          if (!edge) return undefined
          return [edge.from, edge.to, ...layout().chips.filter(chip => chip.lane !== 'Assistant').map(chip => chip.lane)]
        }
        const edge = createMemo(() => edgeLanes() && span(edgeLanes()!))
        // The model label shortens to its family when the edge is shorter than the full name.
        const label = () => {
          const model = step().model
          return model && edge() && edge()!.length < model.length + 3 ? modelFamily(model) : undefined
        }
        return <button type="button" class={styles.laneRow} data-kind={stepColor(step())} data-step-row data-span={item().span?.place}
          style={{ 'grid-template-columns': template() }} aria-pressed={props.selected === step().id ? 'true' : 'false'}
          aria-label={`Step ${step().n ?? ''} at ${clockTime(step().ts)}: ${stepKindLabels[step().kind]}${item().span ? `, subagent ${item().span!.agent}` : ''}, ${stepTitle(step())}`}
          onKeyDown={stepKeys} {...props.hover.bind(() => <StepPreview step={step()} />)} onClick={() => props.select(step().id)}>
          <span class={styles.laneGutter}>
            <span class={styles.gutterHead}><Sign glyph={stepGlyph(step())} label={stepKindLabels[step().kind]} /><strong>{stepLabel(step())}</strong></span>
            <time>{clockTime(step().ts)}</time>
            <Show when={stepSpan(step())}><span title="Step time: from the start of the step to its last result.">{stepSpan(step())}</span></Show></span>
          <For each={props.lanes}>{(_lane, position) => <span class={styles.laneGuide} style={{ 'grid-column': position() + 2 }} aria-hidden="true" />}</For>
          <Show when={edge()}>{placed =>
            <span class={styles.laneEdge} aria-hidden="true" style={placed().style}
              data-direction={column(layout().edge!.to) >= column(layout().edge!.from) ? 'right' : 'left'}
              data-dashed={layout().edge!.dashed ? 'true' : 'false'}>
              <Show when={layout().edge!.label}><ModelLabel step={step()} text={label()} /></Show>
            </span>
          }</Show>
          <Show when={!layout().edge && step().model}>
            <span class={styles.laneSoloLabel} style={{ 'grid-column': column('Assistant') }}><ModelLabel step={step()} text={
              step().model!.length + 2 > width('Assistant') ? modelFamily(step().model!) : undefined} /></span>
          </Show>
          <For each={layout().chips}>{chip => {
            const shut = () => props.collapsed.has(chip.lane)
            const fit = () => textFit(Math.max(chip.title.length, chip.detail.length), width(chip.lane))
            const full = () => [chip.full ?? chip.title, chip.detail].filter(Boolean).join(' · ')
            return <span class={styles.laneChip} data-failed={chip.failed ? 'true' : 'false'} data-fit={fit()} data-collapsed={shut() ? 'true' : 'false'}
              data-narrow={width(chip.lane) < NARROW ? 'true' : 'false'}
              style={{ 'grid-column': column(chip.lane) }} title={full()}>
              <Show when={!shut()} fallback={<Sign glyph={stepGlyph(step())} label={full()} />}>
                <strong>{chip.title}</strong>
                <Show when={chip.detail}><span class={styles.target}>{chip.detail}</span></Show>
                <Show when={chip.metrics.length && !props.compact}><Metrics items={chip.metrics} class={styles.chipMetrics} /></Show>
              </Show>
            </span>
          }}</For>
          <Show when={!props.compact ? layout().back : undefined}>{back =>
            <span class={styles.laneBack} aria-hidden="true"
              style={span(['Assistant', back().from, ...layout().chips.filter(chip => chip.lane !== 'Assistant').map(chip => chip.lane)]).style}>
              <Metrics items={back().metrics} class={styles.backMetrics} />
            </span>
          }</Show>
          <span class={styles.laneStep}>
            <Show when={item().span}>{owner => <AgentTag agent={owner().agent} />}</Show>
            <strong title={stepTitle(step())}>{stepTitle(step())}</strong>
            <Metrics items={stepMetrics(step())} />
          </span>
        </button>
      }}</Show>}
    </VirtualList>
  </div>
}
