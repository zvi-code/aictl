import type { FlowEvent } from '../data/contract.gen'
import { estTokensFromSize, fmtBytes, fmtMs, fmtN, fmtUsd, toolDisplayName } from '../design/format'
import type { Glyph } from '../ui/glyphs'
import { failedEvent, type PlacedEvent } from './flowModel'
import { commandText, isShellTool, programLabel, programOf } from './shellCommand'

/**
 * Steps of a session flow: one model round with the tool calls it issued, or one prompt, subagent task,
 * subagent start or end, compaction, skill, hook or error. The server numbers the steps of the whole
 * flow (`step`), so the numbering holds across loaded windows; without that number the same rule runs on
 * the loaded events.
 */
export type StepKind = 'round' | 'tool' | 'reply' | 'prompt' | 'task' | 'agent' | 'agent_end' | 'compaction' | 'skill'
  | 'context' | 'error' | 'hook' | 'lifecycle' | 'other'

export interface Step {
  id: string
  /** The step number in the whole flow, when the server reports it. */
  n?: number
  kind: StepKind
  agent: string
  ts: number
  /**
   * When the step's work began, in seconds: a model request is recorded when its reply arrived, so a round
   * starts its reported duration before that; any other step starts at its time.
   */
  start: number
  /** When the step's last result came back, in seconds. */
  end: number
  events: PlacedEvent[]
  lead: PlacedEvent
  call?: PlacedEvent
  reply?: PlacedEvent
  tools: PlacedEvent[]
  model?: string
  /** The model differs from the previous round of the same agent. */
  modelChanged: boolean
  /** The model label shows on this round: the first loaded round of its agent, or a change. */
  modelShown: boolean
  failed: boolean
}

/** A subagent's steps inside a session flow: from its start to its end. */
export interface Span {
  agent: string
  start?: Step
  end?: Step
  steps: Step[]
  /** What the subagent was asked: the first line of its task, else its type. */
  description: string
  model?: string
  outcome: 'completed' | 'failed' | 'running' | 'not reported'
  /** Milliseconds from start to end, when both are loaded or the end reports it. */
  duration?: number
  requests: number
  tools: number
  failures: number
}

export type FlowRow =
  | { type: 'step'; id: string; step: Step; span?: { agent: string; place: 'start' | 'inside' | 'end' } }
  | { type: 'gap'; id: string; seconds: number; before: StepKind }
  | { type: 'span'; id: string; span: Span; collapsed: boolean }

/** Labels for a name the source did not report: said as unknown, never made up. */
const NO_TOOL = 'tool name not reported'
const NO_AGENT = 'subagent type not reported'

/** A pause between two steps that is longer than this, in seconds, gets a marker of its own. */
export const GAP_S = 30
/** The longest first line of a prompt shown in a row; the side panel has the whole text. */
export const PROMPT_LINE = 160

const leadKinds: Record<string, StepKind> = {
  api_call: 'round', tool_use: 'tool', api_response: 'reply', user_message: 'prompt', task_prompt: 'task', subagent: 'agent',
  subagent_end: 'agent_end', compaction: 'compaction', skill_event: 'skill', context_update: 'context',
  error: 'error', hook: 'hook', session_start: 'lifecycle', session_end: 'lifecycle', session_command: 'lifecycle',
}
const joins = new Set(['tool_use', 'api_response'])

const agentOf = (event: FlowEvent) => event.agent_id || ''

/** When an event's work began: a model request's reply time less its duration; else the event's time. */
export function startOf(event: FlowEvent) {
  return event.type === 'api_call' && event.duration_ms ? event.ts - event.duration_ms / 1000 : event.ts
}

/** When an event's work ended: its end time, or its start plus the measured duration of a tool call. */
export function endOf(event: FlowEvent) {
  const measured = event.type === 'tool_use' && event.duration_ms ? event.ts + event.duration_ms / 1000 : event.ts
  return Math.max(event.ts, event.end_ts ?? event.ts, measured)
}

function newStep(event: PlacedEvent, id: string): Step {
  return {
    id, n: event.step ?? undefined, kind: leadKinds[event.type] ?? 'other', agent: agentOf(event), ts: event.ts,
    start: startOf(event), end: endOf(event), events: [], lead: event, tools: [], modelChanged: false, modelShown: false, failed: false,
  }
}

function add(step: Step, event: PlacedEvent) {
  step.events.push(event)
  step.start = Math.min(step.start, startOf(event))
  step.end = Math.max(step.end, endOf(event))
  step.failed ||= failedEvent(event)
  if (event.type === 'api_call' && !step.call) { step.call = event; step.kind = 'round'; step.model = event.model || undefined }
  else if (event.type === 'tool_use') step.tools.push(event)
  else if (event.type === 'api_response' && !step.reply) { step.reply = event; step.model ??= event.model || undefined }
}

/** Group events into steps, in the order given. */
export function stepsOf(events: readonly PlacedEvent[]): Step[] {
  const steps: Step[] = []
  const numbered = new Map<number, Step>()
  const open = new Map<string, Step>()
  const starting = new Map<string, Step>()
  for (const event of events) {
    let step: Step | undefined
    const agent = agentOf(event)
    if (event.step != null) {
      step = numbered.get(event.step)
      if (!step) { step = newStep(event, `step:${event.step}`); numbered.set(event.step, step); steps.push(step) }
    } else {
      if (joins.has(event.type)) step = open.get(agent)
      // A subagent's configuration right after its start belongs to the start, as the server numbers it.
      if (event.type === 'session_command') step = starting.get(agent)
      if (!step) {
        step = newStep(event, `step@${event.ts}:${event.type}:${agent}:${steps.length}`)
        steps.push(step)
        starting.delete(agent)
        if (event.type === 'subagent') starting.set(agent, step)
        if (event.type === 'api_call') open.set(agent, step)
        else if (event.type === 'user_message' || event.type === 'compaction' || event.type === 'subagent_end') open.delete(agent)
      }
    }
    add(step, event)
  }
  const lastModel = new Map<string, string>()
  for (const step of steps) {
    if (step.kind !== 'round' || !step.model) continue
    const before = lastModel.get(step.agent)
    step.modelChanged = before != null && before !== step.model
    step.modelShown = before !== step.model
    lastModel.set(step.agent, step.model)
  }
  return steps
}

/** The first line of a text, cut to `limit` characters with an ellipsis. */
export function firstLine(text: string | null | undefined, limit = PROMPT_LINE) {
  const line = (text ?? '').split(/\r?\n/).map(part => part.trim()).find(Boolean) ?? ''
  return line.length > limit ? `${line.slice(0, limit - 1)}…` : line
}

/** "Prompt, 116 chars, text not retained" when the text is gone; otherwise the first line of the text. */
export function promptLine(event: FlowEvent, noun = 'Prompt') {
  const text = event.redacted ? '' : event.message || event.preview || ''
  if (text) return firstLine(text)
  const length = event.prompt_length != null && Number(event.prompt_length) > 0 ? `, ${fmtN(Number(event.prompt_length))} chars` : ''
  return `${noun}${length}, text not retained`
}

/** The subagent spans of a flow, by agent id. The agent the flow is scoped to has no span. */
export function spansOf(steps: readonly Step[], scopeAgent = ''): Map<string, Span> {
  const spans = new Map<string, Span>()
  for (const step of steps) {
    if (!step.agent || step.agent === scopeAgent) continue
    let span = spans.get(step.agent)
    if (!span) {
      span = { agent: step.agent, steps: [], description: '', outcome: 'running', requests: 0, tools: 0, failures: 0 }
      spans.set(step.agent, span)
    }
    span.steps.push(step)
    if (step.kind === 'agent') span.start = step
    if (step.kind === 'agent_end') span.end = step
    span.requests += step.call ? 1 : 0
    span.tools += step.tools.length
    span.failures += step.kind === 'agent_end' ? 0 : step.events.filter(failedEvent).length
  }
  for (const span of spans.values()) {
    const start = span.start?.lead, end = span.end?.lead
    const task = span.steps.find(step => step.kind === 'task')?.lead
    span.description = firstLine(start?.prompt || (task && !task.redacted ? task.message : '') || '', 80) || start?.to || end?.from || NO_AGENT
    span.model = start?.model || span.steps.find(step => step.model)?.model
    span.outcome = !end ? 'running' : end.outcome === 'failed' || end.is_error ? 'failed'
      : end.outcome === 'completed' || (end.outcome == null && end.completed) ? 'completed' : 'not reported'
    span.duration = end?.duration_ms ?? (span.start && span.end ? (span.end.ts - span.start.ts) * 1000 : undefined)
  }
  return spans
}

/** "subagent ran 18.8 s, 3 requests, 2 tool calls, result: completed" */
export function spanSummary(span: Span) {
  const ran = span.duration != null ? `ran ${fmtMs(span.duration)}` : span.outcome === 'running' ? 'still running or its end is not loaded' : 'ran for an unreported time'
  return [`subagent ${ran}`, `${fmtN(span.requests)} ${span.requests === 1 ? 'request' : 'requests'}`,
    `${fmtN(span.tools)} ${span.tools === 1 ? 'tool call' : 'tool calls'}`, `result: ${span.outcome}`].join(', ')
}

/**
 * When a step stopped being active, for the pauses between steps. A prompt's recorded end is the end of its turn, which
 * runs over every step of the turn: it is not activity, so a pause inside a turn still shows.
 */
const activeEnd = (step: Step) => step.kind === 'prompt' ? step.ts : step.end

/**
 * Steps with a marker before each step whose work began more than GAP_S after the previous one ended (a model
 * request begins its reported duration before its reply arrived, so a long reply is work, not a wait),
 * and a summary row before each subagent span. A collapsed span shows its summary row only.
 */
export function rowsOf(steps: readonly Step[], options: { collapsed?: ReadonlySet<string>; scopeAgent?: string } = {}): FlowRow[] {
  const spans = spansOf(steps, options.scopeAgent)
  const rows: FlowRow[] = []
  const headed = new Set<string>()
  let end: number | undefined
  for (const step of steps) {
    const span = step.agent ? spans.get(step.agent) : undefined
    if (end != null && step.start - end > GAP_S) rows.push({ type: 'gap', id: `gap:${step.id}`, seconds: step.start - end, before: step.kind })
    end = Math.max(end ?? activeEnd(step), activeEnd(step))
    if (!span) { rows.push({ type: 'step', id: step.id, step }); continue }
    const collapsed = !!options.collapsed?.has(span.agent)
    if (!headed.has(span.agent)) {
      headed.add(span.agent)
      rows.push({ type: 'span', id: `span:${span.agent}`, span, collapsed })
    }
    if (collapsed) continue
    const place = step === span.start ? 'start' : step === span.end ? 'end' : 'inside'
    rows.push({ type: 'step', id: step.id, step, span: { agent: span.agent, place } })
  }
  return rows
}

/**
 * Where the flow opens: the deep-linked step when there is one, else the start of the latest turn
 * (its prompt, or a subagent's task), else the newest row.
 */
export function openingRow(rows: readonly FlowRow[], selected?: string) {
  if (selected) {
    const index = rows.findIndex(row => row.id === selected)
    if (index >= 0) return index
  }
  for (let index = rows.length - 1; index >= 0; index--) {
    const row = rows[index]
    if (row.type === 'step' && !row.span && (row.step.kind === 'prompt' || row.step.kind === 'task')) return index
  }
  return rows.length ? rows.length - 1 : undefined
}

/** "2 m 55 s": a wait people read at a glance, to the second below an hour. */
export function waitLabel(seconds: number) {
  const s = Math.round(seconds)
  if (s < 60) return `${s} s`
  if (s < 3600) return `${Math.floor(s / 60)} m ${String(s % 60).padStart(2, '0')} s`
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60)
  return m ? `${h} h ${m} m` : `${h} h`
}

export interface Totals {
  steps: number; requests: number; tools: number; failures: number; prompts: number
  input: number; output: number; cacheRead: number; cacheWrite: number
  /** Cost summed over the calls that report one; `costCalls` says how many did. */
  cost: number; costCalls: number
  modelMs: number; toolMs: number
  /** Seconds from the first step to the last result. */
  wall: number
}

/** Turn 0 holds what happened before the first prompt (the session start): it is a bar to select, not a turn. */
export const isPromptTurn = (mark: { turn: number }) => mark.turn > 0
export const turnName = (mark: { turn: number }) => isPromptTurn(mark) ? `Turn ${mark.turn}` : 'Before the first prompt'

/**
 * A failure as the server's summary counts it: a failed model request, a failed tool call, or an error event.
 * The end of a subagent whose task call failed is the same failure, so it does not count again.
 */
export const countsAsFailure = (event: FlowEvent) => event.type === 'error'
  || (event.type === 'api_call' && !!event.is_error)
  || (event.type === 'tool_use' && (!!event.is_error || event.success === false))

/**
 * Whether an event is what a reference from another tab names. `failed_at` is the time of a failure the Failures tab lists:
 * the failed call or request that happened then. `call_at` is the time of a model call a thinking search result names.
 */
export const matchesReference = (event: FlowEvent, reference: { field: string; id: string; traceId?: string }) =>
  reference.field === 'failed_at'
    ? countsAsFailure(event) && Math.abs(event.ts - Number(reference.id)) < 1e-3
    : reference.field === 'call_at'
    ? event.type === 'api_call' && Math.abs(event.ts - Number(reference.id)) < 1e-3
    : (event as unknown as Record<string, unknown>)[reference.field] === reference.id && (!reference.traceId || event.trace_id === reference.traceId)

export function totalsOf(steps: readonly Step[]): Totals {
  const totals: Totals = { steps: steps.length, requests: 0, tools: 0, failures: 0, prompts: 0, input: 0, output: 0,
    cacheRead: 0, cacheWrite: 0, cost: 0, costCalls: 0, modelMs: 0, toolMs: 0, wall: 0 }
  for (const step of steps) {
    for (const event of step.events) {
      if (countsAsFailure(event)) totals.failures++
      if (event.type === 'user_message') totals.prompts++
      if (event.type === 'tool_use') { totals.tools++; totals.toolMs += event.duration_ms ?? 0 }
      if (event.type !== 'api_call') continue
      totals.requests++
      totals.input += event.tokens?.input ?? 0
      totals.output += event.tokens?.output ?? 0
      totals.cacheRead += event.tokens?.cache_read ?? 0
      totals.cacheWrite += event.tokens?.cache_creation ?? 0
      totals.modelMs += event.duration_ms ?? 0
      if (event.cost_usd != null) { totals.cost += event.cost_usd; totals.costCalls++ }
    }
  }
  if (steps.length) totals.wall = Math.max(...steps.map(step => step.end)) - steps[0].ts
  return totals
}

/**
 * One number on a step: its value as text, and a definition shown on hover. `icon` and `label` say
 * what the value is when an icon stands in for a word; the label is the icon's accessible name.
 */
export interface Metric { key: string; text: string; title: string; tone?: 'danger' | 'muted'; icon?: Glyph; label?: string }

export const definitions = {
  request: 'The number of this model request among the requests of this flow, counted from the first.',
  input: 'Input tokens: prompt tokens the model read that were not served from the prompt cache.',
  output: 'Output tokens the model wrote, including tool calls.',
  cacheRead: 'Cache read: prompt tokens served from the prompt cache.',
  cacheWrite: 'Cache write: prompt tokens written to the prompt cache by this request.',
  duration: 'Time the model took to answer this request, as the source reports it.',
  ttft: 'Time to first token: from the request until the first token of the answer arrived.',
  cost: 'Cost of this request in US dollars, as priced by aictl from the token counts.',
  stop: 'Stop reason: why the model stopped (end of turn, tool use, length limit and so on), as the source reports it.',
  thinking: 'Thinking the model reported for this request.',
  payloadOut: 'Payload out: size of the arguments the agent sent to the tool, in UTF-8 bytes.',
  payloadIn: 'Payload in: size of the result the tool returned to the agent, in UTF-8 bytes.',
  resultTokens: 'Estimated tokens of the tool result: its size in bytes divided by 4. An estimate, not a count.',
  toolDuration: 'Time from the tool call to its result.',
  exit: 'Exit code of the command, when the tool reports one.',
  approval: 'Approval: whether the call ran without asking (auto), after a person approved it, or was denied.',
  wait: 'Waited: no step was recorded in this time; the agent waited for a person, a tool or the model.',
} as const

const approvals: Record<string, string> = {
  auto: 'auto', approved: 'asked · approved', denied: 'denied', pending: 'asked · pending', accept: 'auto', reject: 'denied',
}
export const approvalOf = (event: FlowEvent) => approvals[(event.confirm || event.decision || '').toLowerCase()]

/**
 * The numbers of a model request, in reading order. Absent values are left out, never shown as zero. The request
 * number is an identifier, not a measure: it is in the hover card and the step panel, not in the row.
 */
export function callMetrics(call: FlowEvent): Metric[] {
  const t = call.tokens
  const metrics: (Metric | undefined)[] = [
    t?.input != null ? { key: 'input', text: `in ${fmtN(t.input)}`, title: definitions.input } : undefined,
    t?.output != null ? { key: 'output', text: `out ${fmtN(t.output)}`, title: definitions.output } : undefined,
    t?.cache_read != null ? { key: 'cacheRead', text: `cache r ${fmtN(t.cache_read)}`, title: definitions.cacheRead } : undefined,
    t?.cache_creation != null ? { key: 'cacheWrite', text: `cache w ${fmtN(t.cache_creation)}`, title: definitions.cacheWrite } : undefined,
    call.reasoning_tokens ? { key: 'thinking', text: `think ${fmtN(call.reasoning_tokens)} tok`, title: definitions.thinking }
      : call.thinking_chars ? { key: 'thinking', text: `think ${fmtN(call.thinking_chars)} chars`, title: definitions.thinking } : undefined,
    call.duration_ms ? { key: 'duration', text: fmtMs(call.duration_ms), title: definitions.duration } : undefined,
    call.ttft_ms ? { key: 'ttft', text: `TTFT ${fmtMs(call.ttft_ms)}`, title: definitions.ttft } : undefined,
    call.cost_usd != null ? { key: 'cost', text: call.cost_usd < 0.01 ? '<$0.01' : fmtUsd(call.cost_usd), title: definitions.cost } : undefined,
    call.finish_reason ? { key: 'stop', text: call.finish_reason, title: definitions.stop, tone: 'muted', icon: 'stop', label: 'Stop reason' } : undefined,
    call.is_error ? { key: 'error', text: [call.error_type || 'failed', call.http_status ? `HTTP ${call.http_status}` : ''].filter(Boolean).join(' · '),
      title: 'The request failed.', tone: 'danger', icon: 'warn', label: 'Failed' } : undefined,
  ]
  return metrics.filter((metric): metric is Metric => !!metric)
}

/** Estimated tokens of a tool result, from the server's estimate or the result size. */
export const resultTokens = (tool: FlowEvent) => tool.result_tokens_est ?? (tool.output_bytes != null ? estTokensFromSize(tool.output_bytes) : null)

const payloadOut = (bytes: number, more = ''): Metric =>
  ({ key: 'payloadOut', text: fmtBytes(bytes), title: definitions.payloadOut + more, icon: 'up', label: 'Payload out' })
const payloadIn = (bytes: number, more = ''): Metric =>
  ({ key: 'payloadIn', text: fmtBytes(bytes), title: definitions.payloadIn + more, icon: 'dn', label: 'Payload in' })

export function toolMetrics(tool: FlowEvent): Metric[] {
  const tokens = resultTokens(tool)
  const approval = approvalOf(tool)
  const metrics: (Metric | undefined)[] = [
    tool.input_bytes == null && tool.output_bytes == null
      ? { key: 'payload', text: 'payload not reported', title: 'The source did not report the size of the arguments or of the result of this call.', tone: 'muted' } : undefined,
    tool.input_bytes != null ? payloadOut(tool.input_bytes) : undefined,
    tool.output_bytes != null ? payloadIn(tool.output_bytes) : undefined,
    tokens ? { key: 'resultTokens', text: `≈${fmtN(tokens)} tok est.`, title: definitions.resultTokens } : undefined,
    tool.duration_ms ? { key: 'duration', text: fmtMs(tool.duration_ms), title: definitions.toolDuration } : undefined,
    tool.exit_code != null ? { key: 'exit', text: `exit ${tool.exit_code}`, title: definitions.exit, tone: tool.exit_code ? 'danger' : undefined } : undefined,
    tool.success === false ? { key: 'error', text: 'failed', title: 'The tool call returned an error.', tone: 'danger', icon: 'warn', label: 'Failed' } : undefined,
    approval && approval !== 'auto' ? { key: 'approval', text: approval, title: definitions.approval, tone: approval === 'denied' ? 'danger' : undefined, icon: 'keys', label: 'Approval' } : undefined,
    tool.spawned_agent_id ? { key: 'spawned', text: `subagent ${shortAgent(tool.spawned_agent_id)}`, icon: 'agents', label: 'Started a subagent',
      title: `This call started subagent ${tool.spawned_agent_id}; select the step to open it.` } : undefined,
  ]
  return metrics.filter((metric): metric is Metric => !!metric)
}

export const shortAgent = (id: string) => id.slice(0, 8)

/** The tool and what it worked on: a file path, a command or an MCP server and tool. */
export function toolTarget(tool: FlowEvent) {
  return tool.target || ''
}
export const toolName = (tool: FlowEvent) => toolDisplayName(tool.to || tool.name || NO_TOOL)
/** The tool of a call by the name the store keeps (the key of its detail); '' when the call names none. */
export const toolKey = (tool: FlowEvent) => tool.to || tool.name || ''
/**
 * The skill a call of the Skill tool started, read from the call's own input (`skill`, or `name`); '' for any other
 * call, and when the input was not kept.
 */
export function skillOfCall(tool: FlowEvent) {
  if (toolKey(tool).toLowerCase() !== 'skill' || !tool.params) return ''
  try {
    const input = JSON.parse(tool.params) as { skill?: unknown; name?: unknown }
    const name = typeof input.skill === 'string' ? input.skill : typeof input.name === 'string' ? input.name : ''
    return name.trim()
  } catch { return '' }
}

/**
 * The title of one tool call: for a shell tool the program its command ran ("git", "git +2"), else
 * the tool name. When the program cannot be read from the command, the tool name stays.
 */
export function callTitle(tool: FlowEvent) {
  const name = tool.to || tool.name
  if (isShellTool(name)) {
    const program = programOf(commandText(tool.params, tool.target))
    if (program) return programLabel(program)
  }
  return toolName(tool)
}

/** "2 calls": how many calls a grouped box stands for. */
export const callCount = (count: number) => `${fmtN(count)} ${count === 1 ? 'call' : 'calls'}`

/** Calls of a round by title, in call order, for a summary such as "git (2 calls), Read". */
export function toolGroups(tools: readonly FlowEvent[]) {
  const groups = new Map<string, FlowEvent[]>()
  for (const tool of tools) {
    const name = callTitle(tool)
    groups.set(name, [...groups.get(name) ?? [], tool])
  }
  return [...groups].map(([name, calls]) => ({ name, calls }))
}

const groupText = (tools: readonly FlowEvent[]) =>
  toolGroups(tools).map(group => `${group.name}${group.calls.length > 1 ? ` (${callCount(group.calls.length)})` : ''}`).join(', ')

/** How a subagent ended: failed, completed, or not reported. */
export function outcomeOf(end: FlowEvent) {
  if (end.outcome === 'failed' || end.is_error) return 'failed'
  if (end.outcome === 'completed' || (end.outcome == null && end.completed)) return 'completed'
  return 'ended, outcome not reported'
}

/**
 * Said when a session has model requests and nothing else: no prompt and no tool call. A tool keeps its usage
 * records apart from the session's event file (Copilot: its usage database), and the usage records are read first.
 */
export function requestsOnlyNote(summary: { total_api_calls?: number | null; total_tool_uses?: number | null; total_turns?: number | null }): string | undefined {
  if (!summary.total_api_calls || summary.total_tool_uses || summary.total_turns) return undefined
  return 'Only the model requests of this session are stored: its prompts, tool calls and replies are not. They are read ' +
    "from the session's event file, which the node that ran it has not read. Either the file still waits while that node " +
    'reads its history (Health shows the progress per node), or it is no longer on that node.'
}

/** One line for a step, for screen readers and the list view. */
export function stepTitle(step: Step) {
  const lead = step.lead
  switch (step.kind) {
    case 'round': case 'tool': {
      const tools = groupText(step.tools)
      return tools ? `${tools}${step.tools.length === 1 && toolTarget(step.tools[0]) ? ` · ${toolTarget(step.tools[0])}` : ''}`
        : step.reply?.response_preview ? `Reply · ${step.reply.response_preview}`
          // The model stopped to call tools, and the store has none for this round: they were not read, not absent.
          : /tool/i.test(step.call?.finish_reason ?? '') ? 'Tool calls not recorded' : 'Answer without tool calls'
    }
    case 'reply': return lead.response_preview ? `Reply · ${lead.response_preview}` : 'Reply'
    case 'prompt': return promptLine(lead)
    case 'task': return `Task: ${promptLine(lead, 'task')}`
    case 'agent': return `Subagent started: ${firstLine(lead.prompt, 80) || lead.to || NO_AGENT}${lead.model ? ` (${lead.model})` : ''}`
    case 'agent_end': {
      const outcome = outcomeOf(lead)
      const took = lead.duration_ms != null ? `${outcome === 'failed' ? ' after' : ' in'} ${fmtMs(lead.duration_ms)}` : ''
      return `Subagent ${outcome}${took}`
    }
    case 'compaction': return `Context compacted${lead.before_tokens != null && lead.after_tokens != null ? ` · ${fmtN(lead.before_tokens)} → ${fmtN(lead.after_tokens)} tokens` : ''}`
    case 'skill': return `Skill · ${lead.name || 'Not reported'}`
    case 'error': return `Error · ${lead.error_type || lead.error_message || 'Not reported'}`
    case 'hook': return `Hook · ${lead.hook_name || 'Not reported'}`
    default: return [lead.type.replaceAll('_', ' '), lead.name, lead.phase].filter(Boolean).join(' · ')
  }
}

/** The numbers of a step that is not a model round. */
export function stepMetrics(step: Step): Metric[] {
  const lead = step.lead
  if (step.call) return callMetrics(step.call)
  if (step.kind === 'tool') return toolMetrics(lead)
  if ((step.kind === 'prompt' || step.kind === 'task') && lead.prompt_length && !lead.redacted) {
    return [{ key: 'length', text: `${fmtN(Number(lead.prompt_length))} chars`, title: 'Length of the prompt text.' }]
  }
  if (step.kind === 'agent_end' && lead.duration_ms) return [{ key: 'duration', text: fmtMs(lead.duration_ms), title: 'Time the subagent ran.' }]
  if (step.kind === 'compaction' && lead.duration_ms) return [{ key: 'duration', text: fmtMs(lead.duration_ms), title: 'Time the compaction took.' }]
  return []
}

/** The model family, for an edge label too narrow for the full name: "claude-opus-5-5" → "opus". */
export function modelFamily(model: string) {
  const parts = model.toLowerCase().split(/[-_/.:\s]+/).filter(Boolean)
  const known = parts.find(part => /^(opus|sonnet|haiku|fable|gpt|o\d|gemini|grok|llama|mistral|codex|deepseek|qwen)$/.test(part))
  return known ?? parts.find(part => /[a-z]/.test(part) && !/^(claude|models?|anthropic|openai|google)$/.test(part)) ?? model
}
