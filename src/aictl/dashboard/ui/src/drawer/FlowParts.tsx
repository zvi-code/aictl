import { createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import type { JSX } from '@solidjs/web'
import type { TurnMark } from '../data/contract.gen'
import { fmtBytes, fmtMs, fmtN, fmtUsd, stamp } from '../design/format'
import { CodeView } from '../ui/CodeView'
import { Icon, type Glyph } from '../ui/Icon'
import { moveFocus } from '../ui/keyboard'
import { clockTime, durationOf, eventTokens, failedEvent, inputOf, outputOf, type EventKind, type PlacedEvent } from './flowModel'
import {
  approvalOf, definitions, stepMetrics, stepTitle, toolMetrics, toolName, toolTarget, waitLabel,
  type FlowRow, type Metric, type Step, type StepKind,
} from './flowSteps'
import { clip } from './shared'
import { VirtualList } from './VirtualList'
import styles from './flow.module.css'

type HoverState = { source: HTMLElement; content: () => JSX.Element }
export type Hover = ReturnType<typeof createHover>

/** One hover card for a list of events: it opens after the pointer rests on a row and follows it. */
export function createHover(delay = 300) {
  const [current, setCurrent] = createSignal<HoverState>()
  let opening: ReturnType<typeof setTimeout> | undefined
  let closing: ReturnType<typeof setTimeout> | undefined
  const cancel = () => { clearTimeout(opening); clearTimeout(closing) }
  const hide = () => { cancel(); setCurrent(undefined) }
  // A short grace period lets the card move straight to the next row instead of waiting again.
  const leave = () => { cancel(); closing = setTimeout(() => setCurrent(undefined), delay / 3) }
  const show = (source: HTMLElement, content: () => JSX.Element) => {
    cancel()
    opening = setTimeout(() => setCurrent({ source, content }), current() ? 0 : delay)
  }
  const bind = (content: () => JSX.Element) => ({
    onPointerEnter: (event: PointerEvent) => {
      if (event.pointerType !== 'touch') show(event.currentTarget as HTMLElement, content)
    },
    onPointerLeave: leave,
    onPointerDown: hide,
  })
  return { current, show, hide, bind }
}

export function HoverCard(props: { hover: Hover }) {
  let card!: HTMLDivElement
  createEffect(() => props.hover.current(), value => {
    if (card.matches(':popover-open')) card.hidePopover()
    if (!value?.source.isConnected) return
    card.showPopover({ source: value.source })
    const close = () => props.hover.hide()
    document.addEventListener('scroll', close, true)
    return () => document.removeEventListener('scroll', close, true)
  })
  return <div ref={card} popover="manual" aria-hidden="true" class={styles.hover}>
    {props.hover.current()?.content()}
  </div>
}

/**
 * A bar per turn: its width follows the number of events and its height the tokens of the turn.
 * `visible` is the time range, in seconds, of the events in view.
 */
export function TurnScrubber(props: {
  marks: readonly TurnMark[]; loadedFrom: number; visible?: readonly [number, number]
  hover: Hover; pick: (mark: TurnMark) => void
}) {
  const largest = createMemo(() => Math.max(1, ...props.marks.map(mark => mark.tokens)))
  const [focus, setFocus] = createSignal(0)
  const shown = (mark: TurnMark) => !!props.visible && mark.ts <= props.visible[1] && Math.max(mark.ts, mark.end_ts) >= props.visible[0]
  const count = (value: number, one: string, many: string) => `${fmtN(value)} ${value === 1 ? one : many}`
  const label = (mark: TurnMark) => [`Turn ${mark.turn}`, count(mark.events, 'event', 'events'), count(mark.tokens, 'token', 'tokens'),
    mark.tools ? count(mark.tools, 'tool use', 'tool uses') : '', mark.errors ? `${fmtN(mark.errors)} failed` : ''].filter(Boolean).join(' · ')
  return <section class={styles.scrubber} aria-label="Turn overview">
    <header>
      <span><strong>{fmtN(props.marks.length)} turns</strong> · bar height shows turn tokens</span>
      <span>{stamp(props.marks[0]?.ts, true)} – {stamp(props.marks.at(-1)?.end_ts, true)}</span>
    </header>
    <div class={styles.marks} role="group" aria-label="Turns" onKeyDown={event => {
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'))
      const next = moveFocus(event, buttons, 'ArrowLeft', 'ArrowRight')
      if (next) setFocus(buttons.indexOf(next as HTMLButtonElement))
    }}>
      <For each={props.marks} keyed={mark => `${mark.turn}:${mark.offset}`}>{(mark, index) =>
        <button type="button" class={styles.mark} tabindex={index() === focus() ? 0 : -1} aria-label={label(mark())}
          style={{ '--grow': Math.max(1, mark().events), '--level': mark().tokens / largest() }}
          data-loaded={mark().offset + mark().events > props.loadedFrom ? 'true' : 'false'}
          data-visible={shown(mark()) ? 'true' : 'false'} data-errors={mark().errors ? 'true' : 'false'}
          {...props.hover.bind(() => <>
            <div class={styles.hoverHead}><strong>Turn {mark().turn}</strong><time>{clockTime(mark().ts)}</time></div>
            <Show when={mark().prompt}><p class={styles.hoverTitle}>{mark().prompt}</p></Show>
            <span class={styles.hoverHint}>{label(mark()).split(' · ').slice(1).join(' · ')}</span>
            <span class={styles.hoverHint}>Select to show this turn</span>
          </>)}
          onFocus={() => setFocus(index())} onClick={() => props.pick(mark())} />
      }</For>
    </div>
  </section>
}

const stepGlyphs: Record<StepKind, Glyph> = {
  round: 'bot', tool: 'tools', reply: 'reply', prompt: 'prompts', agent: 'agents', agent_end: 'agents',
  compaction: 'context', skill: 'spark', context: 'context', error: 'warn', hook: 'hook', lifecycle: 'clock', other: 'dots',
}
const stepColors: Record<StepKind, EventKind> = {
  round: 'model', tool: 'tool', reply: 'reply', prompt: 'prompt', agent: 'agent', agent_end: 'agent', compaction: 'context',
  skill: 'skill', context: 'context', error: 'error', hook: 'hook', lifecycle: 'other', other: 'other',
}
export const stepKindLabels: Record<StepKind, string> = {
  round: 'Model round', tool: 'Tool call', reply: 'Reply', prompt: 'Prompt', agent: 'Subagent start', agent_end: 'Subagent end',
  compaction: 'Compaction', skill: 'Skill', context: 'Context', error: 'Failure', hook: 'Hook', lifecycle: 'Session', other: 'Event',
}
export const stepGlyph = (step: Step) => stepGlyphs[step.kind]
export const stepColor = (step: Step): EventKind => step.failed ? 'error' : stepColors[step.kind]
export const stepLabel = (step: Step) => step.n != null ? `#${step.n}` : '#–'
export const stepSpan = (step: Step) => step.end > step.ts ? fmtMs((step.end - step.ts) * 1000) : ''
export type StepRow = Extract<FlowRow, { type: 'step' }>
export type GapRowData = Extract<FlowRow, { type: 'gap' }>
export const stepOfRow = (row: FlowRow) => row.type === 'step' ? row.step : undefined

/** Numbers of a step, each with its definition on hover. */
export function Metrics(props: { items: readonly Metric[]; class?: string }) {
  return <span class={props.class ?? styles.metrics}><For each={props.items}>{metric =>
    <span class={styles.metric} data-key={metric.key} data-tone={metric.tone} title={metric.title}>{metric.text}</span>
  }</For></span>
}

/** The model of a round, shown as the label of the edge from the assistant to its tools. */
export function ModelLabel(props: { step: Step }) {
  return <Show when={props.step.model}>{model =>
    <span class={styles.modelLabel} data-changed={props.step.modelChanged ? 'true' : 'false'}
      title={props.step.modelChanged ? 'Model of this request: it changed from the previous round of this agent.' : 'Model of this request.'}>
      {model()}</span>
  }</Show>
}

export function GapRow(props: { row: GapRowData }) {
  return <div class={styles.gap} title={definitions.wait}>
    <Icon glyph="clock" small />
    <span>waited <strong>{waitLabel(props.row.seconds)}</strong>{props.row.before === 'prompt' ? ' before the next prompt' : ' with no recorded step'}</span>
  </div>
}

/** Move focus between step rows with the arrow keys, Home and End. */
export function stepKeys(event: KeyboardEvent) {
  const list = (event.currentTarget as HTMLElement).closest('[role="list"]')
  if (list) moveFocus(event, Array.from(list.querySelectorAll<HTMLElement>('[data-step-row]')), 'ArrowUp', 'ArrowDown')
}

const TOOL_LINES = 5

export function StepPreview(props: { step: Step }) {
  const step = () => props.step
  return <>
    <div class={styles.hoverHead} data-kind={stepColor(step())}>
      <span class={styles.kindLabel}><Icon glyph={stepGlyph(step())} small />{stepLabel(step())} · {stepKindLabels[step().kind]}</span>
      <time>{clockTime(step().ts)}</time>
    </div>
    <p class={styles.hoverTitle}>{stepTitle(step())}</p>
    <Show when={step().model}><span class={styles.hoverHint}>Model {step().model}{step().agent ? ` · agent ${step().agent}` : ''}</span></Show>
    <Metrics items={stepMetrics(step())} />
    <For each={step().tools.slice(0, TOOL_LINES)}>{tool =>
      <span class={styles.hoverTool}><strong>{toolName(tool)}</strong> {clip(toolTarget(tool), 80)} <Metrics items={toolMetrics(tool)} /></span>
    }</For>
    <Show when={step().tools.length > TOOL_LINES}><span class={styles.hoverHint}>{TOOL_LINES} of {step().tools.length} tool calls shown</span></Show>
    <span class={styles.hoverHint}>Select to inspect</span>
  </>
}

/** The steps in time order, newest at the end: one row per step, with its numbers. */
export function StepList(props: {
  rows: readonly FlowRow[]; selected?: string; select: (id: string) => void; hover: Hover; compact: boolean
  reveal?: { id: string }; onStart: () => void; onRange: (first: number, last: number) => void; empty: string
}) {
  return <Show when={props.rows.length} fallback={<div class={styles.list}><p class={styles.empty}>{props.empty}</p></div>}>
    <VirtualList label="Flow steps" class={styles.list} rows={props.rows} identity={row => row.id} estimate={props.compact ? 40 : 76} end
      reveal={props.reveal} onStart={props.onStart} onRange={props.onRange}>
      {row => <Show when={stepOfRow(row())} fallback={<GapRow row={row() as GapRowData} />}>{step => {
        const tools = () => props.compact ? [] : step().tools.slice(0, TOOL_LINES)
        return <button type="button" class={styles.step} data-kind={stepColor(step())} data-density={props.compact ? 'compact' : 'comfortable'}
          data-step-row aria-pressed={props.selected === step().id ? 'true' : 'false'} onKeyDown={stepKeys}
          aria-label={`Step ${step().n ?? ''} at ${clockTime(step().ts)}: ${stepKindLabels[step().kind]}, ${stepTitle(step())}`}
          {...props.hover.bind(() => <StepPreview step={step()} />)} onClick={() => props.select(step().id)}>
          <span class={styles.stepGutter}><strong>{stepLabel(step())}</strong><time>{clockTime(step().ts)}</time></span>
          <span class={styles.chip}><Icon glyph={stepGlyph(step())} small label={stepKindLabels[step().kind]} /></span>
          <span class={styles.stepMain}>
            <span class={styles.stepTitle}><ModelLabel step={step()} />
              <Show when={step().model && step().tools.length}><span class={styles.edge} aria-hidden="true">→</span></Show>
              <strong>{clip(stepTitle(step()), 200)}</strong></span>
            <Metrics items={stepMetrics(step())} />
            <For each={tools()}>{tool =>
              <span class={styles.toolLine} data-failed={failedEvent(tool) ? 'true' : 'false'}>
                <strong>{toolName(tool)}</strong><span class={styles.target}>{toolTarget(tool)}</span>
                <Metrics items={toolMetrics(tool)} />
              </span>
            }</For>
            <Show when={!props.compact && step().tools.length > TOOL_LINES}>
              <span class={styles.moreNote}>{TOOL_LINES} of {step().tools.length} tool calls shown · select the step for all</span>
            </Show>
          </span>
          <span class={styles.side} title="Step time: from the start of the step to its last result.">{stepSpan(step())}</span>
        </button>
      }}</Show>}
    </VirtualList>
  </Show>
}

type Fact = readonly [label: string, value: string | undefined, definition?: string]

function Facts(props: { items: readonly Fact[] }) {
  const shown = () => props.items.filter(fact => fact[1] != null && fact[1] !== '')
  return <dl class={styles.facts}><For each={shown()}>{fact => <><dt title={fact[2]}>{fact[0]}</dt><dd>{fact[1]}</dd></>}</For></dl>
}

const TOOLS_SHOWN = 12

function requestFacts(request: PlacedEvent): Fact[] {
  const tokens = request.tokens
  const count = (value: number | null | undefined) => value == null ? undefined : fmtN(value)
  return [
    ['Model', request.model || undefined],
    ['Request', request.request_n != null ? `#${request.request_n}` : undefined, definitions.request],
    ['Input tokens', count(tokens?.input), definitions.input],
    ['Output tokens', count(tokens?.output), definitions.output],
    ['Cache read', count(tokens?.cache_read), definitions.cacheRead],
    ['Cache write', count(tokens?.cache_creation), definitions.cacheWrite],
    ['Thinking', request.reasoning_tokens ? `${fmtN(request.reasoning_tokens)} tokens`
      : request.thinking_chars ? `${fmtN(request.thinking_chars)} characters` : undefined, definitions.thinking],
    ['Request size', request.request_bytes ? fmtBytes(request.request_bytes) : undefined, 'Size of the request body the agent sent to the model.'],
    ['Duration', request.duration_ms ? fmtMs(request.duration_ms) : undefined, definitions.duration],
    ['First token', request.ttft_ms ? fmtMs(request.ttft_ms) : undefined, definitions.ttft],
    ['Cost', request.cost_usd != null ? fmtUsd(request.cost_usd) : undefined, definitions.cost],
    ['Stop reason', request.finish_reason || undefined, definitions.stop],
    ['Result', request.is_error ? ['Failed', request.error_type, request.http_status ? `HTTP ${request.http_status}` : ''].filter(Boolean).join(' · ') : 'Succeeded'],
    ['Tokens so far', count(request.cum_tokens), 'Input and output tokens of this flow up to and including this request.'],
    ['Source', request.source],
  ]
}

function toolFacts(tool: PlacedEvent): Fact[] {
  return [
    ['Payload out', tool.input_bytes == null ? undefined : fmtBytes(tool.input_bytes), definitions.payloadOut],
    ['Payload in', tool.output_bytes == null ? undefined : fmtBytes(tool.output_bytes), definitions.payloadIn],
    ['Result tokens (est.)', tool.result_tokens_est == null ? undefined : fmtN(tool.result_tokens_est), definitions.resultTokens],
    ['Duration', tool.duration_ms ? fmtMs(tool.duration_ms) : undefined, definitions.toolDuration],
    ['Exit code', tool.exit_code == null ? undefined : String(tool.exit_code), definitions.exit],
    ['Approval', approvalOf(tool), definitions.approval],
    ['Result', tool.success === false ? 'Failed' : tool.success ? 'Succeeded' : undefined],
  ]
}

/** The selected step: the model request, every tool call it issued with its input and result, and its reply. */
export function StepInspector(props: { step: Step; close: () => void; evidence?: (event: PlacedEvent) => void }) {
  const step = () => props.step
  const sourced = (event: PlacedEvent) => !!props.evidence && !!(event.step_key || event.turn_id)
  return <section class={styles.inspector} aria-label="Step inspector" data-kind={stepColor(step())}>
    <div class={styles.inspectorHead}>
      <h3>Step {stepLabel(step())}</h3>
      <span class={styles.kindLabel}><Icon glyph={stepGlyph(step())} small />{stepKindLabels[step().kind]}</span>
      <button type="button" class={styles.iconButton} aria-label="Close step inspector" onClick={() => props.close()}>
        <Icon glyph="close" small /></button>
    </div>
    <p class={styles.summary}>{stepTitle(step())}</p>
    <Facts items={[
      ['Time', stamp(step().ts, true)],
      ['Step time', stepSpan(step()), 'From the start of the step to its last result.'],
      ['Agent', step().agent || 'Main agent'],
      ['Turn', step().lead._turnIndex ? String(step().lead._turnIndex) : undefined],
    ]} />
    <Show when={step().call}>{request => <>
      <h4 class={styles.inspectorSection}>Model request</h4>
      <Facts items={requestFacts(request())} />
    </>}</Show>
    <Show when={step().tools.length}>
      <h4 class={styles.inspectorSection}>Tool calls · {step().tools.length}</h4>
      <For each={step().tools.slice(0, TOOLS_SHOWN)}>{tool =>
        <details class={styles.toolDetail} open={step().tools.length === 1}>
          <summary><strong>{toolName(tool)}</strong> <span class={styles.target}>{toolTarget(tool)}</span></summary>
          <Facts items={toolFacts(tool)} />
          <Show when={inputOf(tool)}>{value => <CodeView label={`${toolName(tool)} input`} text={value()} wrap />}</Show>
          <Show when={outputOf(tool)}>{value => <CodeView label={`${toolName(tool)} result`} text={value()} wrap />}</Show>
          <Show when={sourced(tool)}>
            <button class={styles.button} type="button" onClick={() => props.evidence?.(tool)}><Icon glyph="file" small />Open source evidence</button>
          </Show>
        </details>
      }</For>
      <Show when={step().tools.length > TOOLS_SHOWN}><p class={styles.moreNote}>{TOOLS_SHOWN} of {step().tools.length} tool calls shown</p></Show>
    </Show>
    <Show when={!step().call && !step().tools.length}>
      <Facts items={[
        ['Tokens', eventTokens(step().lead) ? fmtN(eventTokens(step().lead)) : undefined],
        ['Duration', durationOf(step().lead) == null ? undefined : fmtMs(durationOf(step().lead))],
        ['Model', step().lead.model || undefined],
        ['Source', step().lead.source],
      ]} />
      <Show when={inputOf(step().lead)}>{value => <CodeView label="Step input" text={value()} wrap />}</Show>
      <Show when={outputOf(step().lead)}>{value => <CodeView label="Step output" text={value()} wrap />}</Show>
    </Show>
    <Show when={step().reply && outputOf(step().reply!)}>{value => <>
      <h4 class={styles.inspectorSection}>Reply</h4><CodeView label="Reply" text={value()} wrap /></>}</Show>
    <Show when={sourced(step().lead)}>
      <button class={styles.button} type="button" onClick={() => props.evidence?.(step().lead)}><Icon glyph="file" small />Open source evidence</button>
    </Show>
  </section>
}
