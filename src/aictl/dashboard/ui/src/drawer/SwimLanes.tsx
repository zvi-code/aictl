import { createMemo, For, Show } from 'solid-js'
import { Icon, type Glyph } from '../ui/Icon'
import { clockTime } from './flowModel'
import {
  GapRow, Metrics, ModelLabel, StepPreview, stepColor, stepKeys, stepKindLabels, stepLabel, stepOfRow, stepSpan,
  type GapRowData, type Hover,
} from './FlowParts'
import { layoutOf, stepMetrics, stepTitle, type FlowRow, type Lane } from './flowSteps'
import { VirtualList } from './VirtualList'
import styles from './flow.module.css'

const laneGlyphs: Record<string, Glyph> = { User: 'prompts', Assistant: 'bot', Tools: 'tools', Subagents: 'agents', Hooks: 'hook' }

/**
 * One row per step across lanes. A model round is one edge from the assistant to the tools it
 * called, labelled with the model, the tool calls in their lanes, and a dashed edge for the
 * results coming back. The step column on the right gives its title and numbers.
 */
export function SwimLanes(props: {
  rows: readonly FlowRow[]; lanes: readonly Lane[]; grouped: boolean; compact: boolean; selected?: string
  select: (id: string) => void; hover: Hover; reveal?: { id: string }; onStart: () => void
  onRange: (first: number, last: number) => void
}) {
  const index = createMemo(() => new Map(props.lanes.map((lane, position) => [lane.id, position])))
  const template = () => `var(--gutter) ${props.lanes.map(lane => `${lane.width}ch`).join(' ')} minmax(20rem, 1fr)`
  const width = () => `calc(var(--gutter) + ${props.lanes.reduce((total, lane) => total + lane.width, 0)}ch + 20rem)`
  const column = (lane: string) => (index().get(lane) ?? index().get('Assistant') ?? 0) + 2

  /** Grid placement of an edge from the centre of one lane to the centre of another. */
  const span = (lanes: readonly string[]) => {
    const columns = lanes.map(column)
    const first = Math.min(...columns), last = Math.max(...columns)
    const half = (col: number) => `${props.lanes[col - 2].width / 2}ch`
    return { 'grid-column': `${first} / ${last + 1}`, 'margin-inline-start': half(first), 'margin-inline-end': half(last) }
  }

  const header = <div class={styles.laneHeader} style={{ 'grid-template-columns': template() }} aria-hidden="true">
    <span class={styles.laneCorner}>Step · time</span>
    <For each={props.lanes}>{lane =>
      <span title={lane.id}><Icon glyph={laneGlyphs[lane.group] ?? 'dots'} small /><span>{lane.label}</span></span>
    }</For>
    <span class={styles.laneStepHead}>What happened · numbers</span>
  </div>

  return <div class={styles.lanes} role="region" aria-label="Session streams" data-density={props.compact ? 'compact' : 'comfortable'}
    style={{ '--lanes-width': width() }}>
    <VirtualList label="Swim-lane steps" class={styles.laneList} rows={props.rows} identity={row => row.id}
      estimate={props.compact ? 48 : 92} end reveal={props.reveal} onStart={props.onStart} onRange={props.onRange} header={header}>
      {row => <Show when={stepOfRow(row())} fallback={<GapRow row={row() as GapRowData} />}>{step => {
        const layout = createMemo(() => layoutOf(step(), props.grouped))
        const lanesOfEdge = () => {
          const edge = layout().edge
          if (!edge) return undefined
          return [edge.from, edge.to, ...layout().chips.filter(chip => chip.lane !== 'Assistant').map(chip => chip.lane)]
        }
        return <button type="button" class={styles.laneRow} data-kind={stepColor(step())} data-step-row
          style={{ 'grid-template-columns': template() }} aria-pressed={props.selected === step().id ? 'true' : 'false'}
          aria-label={`Step ${step().n ?? ''} at ${clockTime(step().ts)}: ${stepKindLabels[step().kind]}, ${stepTitle(step())}`}
          onKeyDown={stepKeys} {...props.hover.bind(() => <StepPreview step={step()} />)} onClick={() => props.select(step().id)}>
          <span class={styles.laneGutter}><strong>{stepLabel(step())}</strong><time>{clockTime(step().ts)}</time>
            <Show when={stepSpan(step())}><span title="Step time: from the start of the step to its last result.">{stepSpan(step())}</span></Show></span>
          <For each={props.lanes}>{(_lane, position) => <span class={styles.laneGuide} style={{ 'grid-column': position() + 2 }} aria-hidden="true" />}</For>
          <Show when={lanesOfEdge()}>{lanes =>
            <span class={styles.laneEdge} aria-hidden="true" style={span(lanes())}
              data-direction={column(layout().edge!.to) >= column(layout().edge!.from) ? 'right' : 'left'}
              data-dashed={layout().edge!.dashed ? 'true' : 'false'}>
              <Show when={layout().edge!.label}><ModelLabel step={step()} /></Show>
            </span>
          }</Show>
          <Show when={!layout().edge && step().model}>
            <span class={styles.laneSoloLabel} style={{ 'grid-column': column('Assistant') }}><ModelLabel step={step()} /></span>
          </Show>
          <For each={layout().chips}>{chip =>
            <span class={styles.laneChip} data-failed={chip.failed ? 'true' : 'false'} style={{ 'grid-column': column(chip.lane) }}>
              <strong>{chip.title}</strong>
              <Show when={chip.detail}><span class={styles.target}>{chip.detail}</span></Show>
              <Show when={chip.metrics.length && !props.compact}><Metrics items={chip.metrics} class={styles.chipMetrics} /></Show>
            </span>
          }</For>
          <Show when={!props.compact ? layout().back : undefined}>{back =>
            <span class={styles.laneBack} aria-hidden="true" style={span(['Assistant', back().from, ...layout().chips.filter(chip => chip.lane !== 'Assistant').map(chip => chip.lane)])}>
              <Metrics items={back().metrics} class={styles.backMetrics} />
            </span>
          }</Show>
          <span class={styles.laneStep}>
            <strong>{stepTitle(step())}</strong>
            <Metrics items={stepMetrics(step())} />
          </span>
        </button>
      }}</Show>}
    </VirtualList>
  </div>
}
