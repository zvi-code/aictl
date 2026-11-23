import type { FlowEvent } from '../data/contract.gen'
import { estTokensFromSize, fmtBytes, fmtMs, fmtN, fmtUsd, toolDisplayName } from '../design/format'
import { failedEvent, type PlacedEvent } from './flowModel'

/**
 * Steps of a session flow: one model round with the tool calls it issued, or one prompt, subagent,
 * compaction, skill, hook or error. The server numbers the steps of the whole flow (`step`), so the
 * numbering holds across loaded windows; without that number the same rule runs on the loaded events.
 */
export type StepKind = 'round' | 'tool' | 'reply' | 'prompt' | 'agent' | 'agent_end' | 'compaction' | 'skill'
  | 'context' | 'error' | 'hook' | 'lifecycle' | 'other'

export interface Step {
  id: string
  /** The step number in the whole flow, when the server reports it. */
  n?: number
  kind: StepKind
  agent: string
  ts: number
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
  failed: boolean
}

export type FlowRow = { type: 'step'; id: string; step: Step } | { type: 'gap'; id: string; seconds: number; before: StepKind }

/** Labels for a name the source did not report: said as unknown, never made up. */
const NO_TOOL = 'tool name not reported'
const NO_AGENT = 'subagent name not reported'

/** A pause between two steps that is longer than this, in seconds, gets a marker of its own. */
export const GAP_S = 30

const leadKinds: Record<string, StepKind> = {
  api_call: 'round', tool_use: 'tool', api_response: 'reply', user_message: 'prompt', subagent: 'agent',
  subagent_end: 'agent_end', compaction: 'compaction', skill_event: 'skill', context_update: 'context',
  error: 'error', hook: 'hook', session_start: 'lifecycle', session_end: 'lifecycle', session_command: 'lifecycle',
}
const joins = new Set(['tool_use', 'api_response'])

const agentOf = (event: FlowEvent) => event.agent_id || ''

/** When an event's work ended: its end time, or its start plus the measured duration of a tool call. */
export function endOf(event: FlowEvent) {
  const measured = event.type === 'tool_use' && event.duration_ms ? event.ts + event.duration_ms / 1000 : event.ts
  return Math.max(event.ts, event.end_ts ?? event.ts, measured)
}

function newStep(event: PlacedEvent, id: string): Step {
  return {
    id, n: event.step ?? undefined, kind: leadKinds[event.type] ?? 'other', agent: agentOf(event), ts: event.ts,
    end: endOf(event), events: [], lead: event, tools: [], modelChanged: false, failed: false,
  }
}

function add(step: Step, event: PlacedEvent) {
  step.events.push(event)
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
  for (const event of events) {
    let step: Step | undefined
    if (event.step != null) {
      step = numbered.get(event.step)
      if (!step) { step = newStep(event, `step:${event.step}`); numbered.set(event.step, step); steps.push(step) }
    } else {
      const agent = agentOf(event)
      if (joins.has(event.type)) step = open.get(agent)
      if (!step) {
        step = newStep(event, `step@${event.ts}:${event.type}:${agent}:${steps.length}`)
        steps.push(step)
        if (event.type === 'api_call') open.set(agent, step)
        else if (event.type === 'user_message' || event.type === 'compaction') open.delete(agent)
      }
    }
    add(step, event)
  }
  const lastModel = new Map<string, string>()
  for (const step of steps) {
    if (step.kind !== 'round' || !step.model) continue
    const before = lastModel.get(step.agent)
    step.modelChanged = before != null && before !== step.model
    lastModel.set(step.agent, step.model)
  }
  return steps
}

/** Steps with a marker before each step that started more than GAP_S after the previous one ended. */
export function rowsOf(steps: readonly Step[]): FlowRow[] {
  const rows: FlowRow[] = []
  let end: number | undefined
  for (const step of steps) {
    if (end != null && step.ts - end > GAP_S) rows.push({ type: 'gap', id: `gap:${step.id}`, seconds: step.ts - end, before: step.kind })
    rows.push({ type: 'step', id: step.id, step })
    end = Math.max(end ?? step.end, step.end)
  }
  return rows
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

export function totalsOf(steps: readonly Step[]): Totals {
  const totals: Totals = { steps: steps.length, requests: 0, tools: 0, failures: 0, prompts: 0, input: 0, output: 0,
    cacheRead: 0, cacheWrite: 0, cost: 0, costCalls: 0, modelMs: 0, toolMs: 0, wall: 0 }
  for (const step of steps) {
    for (const event of step.events) {
      if (failedEvent(event)) totals.failures++
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

/** One number on a step: its short text, and a definition shown on hover. */
export interface Metric { key: string; text: string; title: string; tone?: 'danger' | 'muted' }

export const definitions = {
  request: 'The number of this model request among the requests of this flow, counted from the first.',
  input: 'Input tokens: prompt tokens the model read that were not served from the prompt cache.',
  output: 'Output tokens the model wrote, including tool calls.',
  cacheRead: 'Cache read: prompt tokens served from the prompt cache.',
  cacheWrite: 'Cache write: prompt tokens written to the prompt cache by this request.',
  duration: 'Time the model took to answer this request, as the source reports it.',
  ttft: 'Time to first token: from the request until the first token of the answer arrived.',
  cost: 'Cost of this request in US dollars, as priced by aictl from the token counts.',
  stop: 'Why the model stopped: end of turn, tool use, length limit and so on, as the source reports it.',
  thinking: 'Thinking the model reported for this request.',
  payloadOut: 'Payload out: size of the arguments the agent sent to the tool, in UTF-8 bytes.',
  payloadIn: 'Payload in: size of the result the tool returned to the agent, in UTF-8 bytes.',
  resultTokens: 'Estimated tokens of the tool result: its size in bytes divided by 4. An estimate, not a count.',
  toolDuration: 'Time from the tool call to its result.',
  exit: 'Exit code of the command, when the tool reports one.',
  approval: 'Whether the call ran without asking (auto), after a person approved it, or was denied.',
  wait: 'No step was recorded in this time: the agent waited for a person, a tool or the model.',
} as const

const approvals: Record<string, string> = {
  auto: 'auto', approved: 'asked · approved', denied: 'denied', pending: 'asked · pending', accept: 'auto', reject: 'denied',
}
export const approvalOf = (event: FlowEvent) => approvals[(event.confirm || event.decision || '').toLowerCase()]

/** The numbers of a model request, in reading order. Absent values are left out, never shown as zero. */
export function callMetrics(call: FlowEvent): Metric[] {
  const t = call.tokens
  const metrics: (Metric | undefined)[] = [
    call.request_n != null ? { key: 'request', text: `req ${call.request_n}`, title: definitions.request } : undefined,
    t?.input != null ? { key: 'input', text: `in ${fmtN(t.input)}`, title: definitions.input } : undefined,
    t?.output != null ? { key: 'output', text: `out ${fmtN(t.output)}`, title: definitions.output } : undefined,
    t?.cache_read != null ? { key: 'cacheRead', text: `cache r ${fmtN(t.cache_read)}`, title: definitions.cacheRead } : undefined,
    t?.cache_creation != null ? { key: 'cacheWrite', text: `cache w ${fmtN(t.cache_creation)}`, title: definitions.cacheWrite } : undefined,
    call.reasoning_tokens ? { key: 'thinking', text: `think ${fmtN(call.reasoning_tokens)} tok`, title: definitions.thinking }
      : call.thinking_chars ? { key: 'thinking', text: `think ${fmtN(call.thinking_chars)} chars`, title: definitions.thinking } : undefined,
    call.duration_ms ? { key: 'duration', text: fmtMs(call.duration_ms), title: definitions.duration } : undefined,
    call.ttft_ms ? { key: 'ttft', text: `TTFT ${fmtMs(call.ttft_ms)}`, title: definitions.ttft } : undefined,
    call.cost_usd != null ? { key: 'cost', text: call.cost_usd < 0.01 ? '<$0.01' : fmtUsd(call.cost_usd), title: definitions.cost } : undefined,
    call.finish_reason ? { key: 'stop', text: call.finish_reason, title: definitions.stop, tone: 'muted' } : undefined,
    call.is_error ? { key: 'error', text: [call.error_type || 'failed', call.http_status ? `HTTP ${call.http_status}` : ''].filter(Boolean).join(' · '),
      title: 'The request failed.', tone: 'danger' } : undefined,
  ]
  return metrics.filter((metric): metric is Metric => !!metric)
}

/** Estimated tokens of a tool result, from the server's estimate or the result size. */
export const resultTokens = (tool: FlowEvent) => tool.result_tokens_est ?? (tool.output_bytes != null ? estTokensFromSize(tool.output_bytes) : null)

export function toolMetrics(tool: FlowEvent): Metric[] {
  const tokens = resultTokens(tool)
  const approval = approvalOf(tool)
  const metrics: (Metric | undefined)[] = [
    tool.input_bytes == null && tool.output_bytes == null
      ? { key: 'payload', text: 'payload not reported', title: 'The source did not report the size of the arguments or of the result of this call.', tone: 'muted' } : undefined,
    tool.input_bytes != null ? { key: 'payloadOut', text: `↑ ${fmtBytes(tool.input_bytes)}`, title: definitions.payloadOut } : undefined,
    tool.output_bytes != null ? { key: 'payloadIn', text: `↓ ${fmtBytes(tool.output_bytes)}`, title: definitions.payloadIn } : undefined,
    tokens ? { key: 'resultTokens', text: `≈${fmtN(tokens)} tok est.`, title: definitions.resultTokens } : undefined,
    tool.duration_ms ? { key: 'duration', text: fmtMs(tool.duration_ms), title: definitions.toolDuration } : undefined,
    tool.exit_code != null ? { key: 'exit', text: `exit ${tool.exit_code}`, title: definitions.exit, tone: tool.exit_code ? 'danger' : undefined } : undefined,
    tool.success === false ? { key: 'error', text: 'failed', title: 'The tool call returned an error.', tone: 'danger' } : undefined,
    approval && approval !== 'auto' ? { key: 'approval', text: approval, title: definitions.approval, tone: approval === 'denied' ? 'danger' : undefined } : undefined,
  ]
  return metrics.filter((metric): metric is Metric => !!metric)
}

/** The tool and what it worked on: a file path, a command or an MCP server and tool. */
export function toolTarget(tool: FlowEvent) {
  return tool.target || ''
}
export const toolName = (tool: FlowEvent) => toolDisplayName(tool.to || tool.name || NO_TOOL)

/** Tools of a round by name, in call order, for a compact "Bash ×3" summary. */
export function toolGroups(tools: readonly FlowEvent[]) {
  const groups = new Map<string, FlowEvent[]>()
  for (const tool of tools) {
    const name = tool.to || tool.name || NO_TOOL
    groups.set(name, [...groups.get(name) ?? [], tool])
  }
  return [...groups].map(([name, calls]) => ({ name, calls }))
}

/** Summed numbers of several calls to one tool in a round, for its lane chip. */
export function groupMetrics(calls: readonly FlowEvent[]): Metric[] {
  const sum = (read: (tool: FlowEvent) => number | null | undefined) => {
    const values = calls.map(read).filter((value): value is number => value != null)
    return values.length ? values.reduce((total, value) => total + value, 0) : undefined
  }
  const out = sum(tool => tool.input_bytes), back = sum(tool => tool.output_bytes), tokens = sum(resultTokens)
  const duration = sum(tool => tool.duration_ms || undefined)
  const failed = calls.filter(failedEvent).length
  const many = calls.length > 1 ? ' (sum of the calls in this round)' : ''
  const metrics: (Metric | undefined)[] = [
    out == null && back == null ? { key: 'payload', text: 'payload not reported', tone: 'muted',
      title: 'The source did not report the size of the arguments or of the results of these calls.' } : undefined,
    out != null ? { key: 'payloadOut', text: `↑ ${fmtBytes(out)}`, title: definitions.payloadOut + many } : undefined,
    back != null ? { key: 'payloadIn', text: `↓ ${fmtBytes(back)}`, title: definitions.payloadIn + many } : undefined,
    tokens ? { key: 'resultTokens', text: `≈${fmtN(tokens)} tok est.`, title: definitions.resultTokens + many } : undefined,
    duration ? { key: 'duration', text: fmtMs(duration), title: definitions.toolDuration + many } : undefined,
    failed ? { key: 'error', text: calls.length > 1 ? `${failed} of ${calls.length} failed` : 'failed', title: 'Tool calls that returned an error.', tone: 'danger' } : undefined,
  ]
  return metrics.filter((metric): metric is Metric => !!metric)
}

export interface Lane { id: string; label: string; group: string; width: number }

const LANE_MIN = 12, LANE_MAX = 30

/** The lane of a tool call: one lane per tool, or one lane for all tools when grouped. */
export const toolLane = (tool: FlowEvent, grouped: boolean) => grouped ? 'Tools' : `Tools · ${toolDisplayName(tool.to || tool.name || NO_TOOL)}`

/** The lane a step's lead event goes to; the Assistant lane is where every step starts. */
export function targetLane(step: Step, grouped: boolean) {
  switch (step.kind) {
    case 'prompt': return 'Assistant'
    case 'agent': case 'agent_end': return 'Subagents'
    case 'hook': return 'Hooks'
    case 'tool': return toolLane(step.lead, grouped)
    default: return step.tools[0] ? toolLane(step.tools[0], grouped) : 'Assistant'
  }
}

/** Lanes for these steps, each as wide as the longest text it shows, between LANE_MIN and LANE_MAX characters. */
export function lanesFor(steps: readonly Step[], grouped: boolean): Lane[] {
  const widths = new Map<string, number>([['User', LANE_MIN], ['Assistant', 16]])
  const fit = (lane: string, text: string) => widths.set(lane, Math.min(LANE_MAX, Math.max(widths.get(lane) ?? LANE_MIN, text.length + 6)))
  let user = false
  for (const step of steps) {
    if (step.kind === 'prompt') user = true
    for (const tool of step.tools) {
      const lane = toolLane(tool, grouped)
      fit(lane, lane.replace(/^Tools · /, ''))
      fit(lane, toolTarget(tool).slice(0, LANE_MAX))
    }
    if (step.kind === 'agent' || step.kind === 'agent_end') fit('Subagents', step.lead.to || step.lead.from || NO_AGENT)
    if (step.kind === 'hook') fit('Hooks', step.lead.hook_name || 'hook name not reported')
  }
  const order = (id: string) => id === 'User' ? 0 : id === 'Assistant' ? 1 : id.startsWith('Tools') ? 2 : id === 'Subagents' ? 3 : 4
  return [...widths].filter(([id]) => id !== 'User' || user)
    .sort((a, b) => order(a[0]) - order(b[0]))
    .map(([id, width]) => ({ id, label: id, group: id.split(' · ', 1)[0], width }))
}

export interface Chip { lane: string; title: string; detail: string; metrics: Metric[]; failed: boolean; calls: number }
export interface Layout {
  /** The edge of the step, from lane to lane; absent when the step stays in one lane. */
  edge?: { from: string; to: string; label?: string; dashed: boolean }
  chips: Chip[]
  /** The results coming back to the assistant, with their summed size. */
  back?: { from: string; metrics: Metric[] }
}

/** Where a step sits in the lanes: its edge, the chips in each lane and the results that come back. */
export function layoutOf(step: Step, grouped: boolean): Layout {
  const lead = step.lead
  const chip = (lane: string, title: string, detail = '', metrics: Metric[] = []): Chip =>
    ({ lane, title, detail, metrics, failed: step.failed, calls: 1 })
  if (step.tools.length) {
    const byLane = new Map<string, FlowEvent[]>()
    for (const tool of step.tools) byLane.set(toolLane(tool, grouped), [...byLane.get(toolLane(tool, grouped)) ?? [], tool])
    const chips = [...byLane].map(([lane, calls]): Chip => ({
      lane, calls: calls.length, failed: calls.some(failedEvent), metrics: groupMetrics(calls),
      title: grouped ? toolGroups(calls).map(group => `${toolDisplayName(group.name)}${group.calls.length > 1 ? ` ×${group.calls.length}` : ''}`).join(', ')
        : `${toolDisplayName(calls[0].to || calls[0].name || NO_TOOL)}${calls.length > 1 ? ` ×${calls.length}` : ''}`,
      detail: toolTarget(calls[0]),
    }))
    const far = chips.at(-1)!.lane
    return {
      edge: { from: 'Assistant', to: far, label: step.model, dashed: false },
      chips: step.call ? [chip('Assistant', step.call.request_n != null ? `req ${step.call.request_n}` : 'request'), ...chips] : chips,
      back: { from: far, metrics: groupMetrics(step.tools).filter(metric => metric.key !== 'payloadOut' && metric.key !== 'duration') },
    }
  }
  switch (step.kind) {
    case 'prompt': return { edge: { from: 'User', to: 'Assistant', dashed: false }, chips: [chip('User', 'prompt')] }
    case 'agent': return { edge: { from: 'Assistant', to: 'Subagents', label: lead.model || undefined, dashed: false },
      chips: [chip('Subagents', lead.to || NO_AGENT, 'started')] }
    case 'agent_end': return { edge: { from: 'Subagents', to: 'Assistant', dashed: true },
      chips: [chip('Subagents', lead.from || NO_AGENT, lead.completed === false ? 'stopped' : 'finished')] }
    case 'hook': return { edge: { from: 'Assistant', to: 'Hooks', dashed: false }, chips: [chip('Hooks', lead.hook_name || 'hook name not reported')] }
    case 'round': return { chips: [chip('Assistant', step.call?.request_n != null ? `req ${step.call.request_n}` : 'request', step.reply ? 'reply' : 'answer')] }
    default: return { chips: [chip('Assistant', stepTitle(step))] }
  }
}

/** One line for a step, for screen readers and the list view. */
export function stepTitle(step: Step) {
  const lead = step.lead
  switch (step.kind) {
    case 'round': case 'tool': {
      const groups = toolGroups(step.tools)
      const tools = groups.map(group => `${toolDisplayName(group.name)}${group.calls.length > 1 ? ` ×${group.calls.length}` : ''}`).join(', ')
      return tools ? `${tools}${step.tools.length === 1 && toolTarget(step.tools[0]) ? ` · ${toolTarget(step.tools[0])}` : ''}`
        : step.reply?.response_preview ? `Reply · ${step.reply.response_preview}` : 'Answer without tool calls'
    }
    case 'reply': return lead.response_preview ? `Reply · ${lead.response_preview}` : 'Reply'
    case 'prompt': return lead.redacted ? 'Prompt · text not retained' : lead.preview || lead.message || 'Prompt'
    case 'agent': return `Subagent started · ${lead.to || NO_AGENT}`
    case 'agent_end': return `Subagent ${lead.completed === false ? 'stopped' : 'finished'} · ${lead.from || NO_AGENT}`
    case 'compaction': return `Context compacted${lead.before_tokens != null && lead.after_tokens != null ? ` · ${fmtN(lead.before_tokens)} → ${fmtN(lead.after_tokens)} tokens` : ''}`
    case 'skill': return `Skill · ${lead.name || 'Not reported'}`
    case 'error': return `Error · ${lead.error_type || lead.error_message || 'Not reported'}`
    case 'hook': return `Hook · ${lead.hook_name || 'Not reported'}`
    default: return lead.name || lead.to || lead.type.replaceAll('_', ' ')
  }
}

/** The numbers of a step that is not a model round. */
export function stepMetrics(step: Step): Metric[] {
  const lead = step.lead
  if (step.call) return callMetrics(step.call)
  if (step.kind === 'tool') return toolMetrics(lead)
  if (step.kind === 'prompt' && lead.prompt_length) return [{ key: 'length', text: `${fmtN(Number(lead.prompt_length))} chars`, title: 'Length of the prompt text.' }]
  if (step.kind === 'agent_end' && lead.duration_ms) return [{ key: 'duration', text: fmtMs(lead.duration_ms), title: 'Time the subagent ran.' }]
  if (step.kind === 'compaction' && lead.duration_ms) return [{ key: 'duration', text: fmtMs(lead.duration_ms), title: 'Time the compaction took.' }]
  return []
}
