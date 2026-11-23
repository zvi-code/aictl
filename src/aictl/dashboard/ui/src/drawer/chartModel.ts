/**
 * The model of the Flow chart: one row per step, its time drawn as bars from the request to the last result, its
 * context, output and result size as bars to one scale per loaded flow, and one track per agent alive at the time.
 * Pure, so every rule of the drawing is tested without a browser.
 */
import type { FlowEvent } from '../data/contract.gen'
import { toolDisplayName } from '../design/format'
import { failedEvent } from './flowModel'
import { firstLine, stepTitle, toolName, type FlowRow, type Step } from './flowSteps'
import { commandText, isShellTool, programHeadline, programOf } from './shellCommand'

/** The kind of work a bar stands for; its colour. */
export type Work = 'model' | 'run' | 'read' | 'edit' | 'search' | 'web' | 'mcp' | 'agent' | 'context' | 'other'

export const WORK_ORDER: readonly Work[] = ['model', 'run', 'read', 'edit', 'search', 'web', 'mcp', 'agent', 'context', 'other']
export const workLabels: Record<Work, string> = {
  model: 'model reply', run: 'run a command', read: 'read', edit: 'edit or write', search: 'search', web: 'web',
  mcp: 'MCP tool', agent: 'subagent', context: 'context', other: 'other tool',
}

const READ = /^(read|view|cat|read_?file|notebook_?read|ls|list_?dir(ectory)?|read_?notifications?|readmanyfiles|read_many_files)$/
const EDIT = /^(edit|write|multi_?edit|create|create_?file|str_replace\w*|apply_?patch|notebook_?edit|edit_?file|write_?file|insert|replace)$/
const SEARCH = /^(grep|glob|rg|search|find|codebase_?search|file_?search|grep_?search|tool_?search|semantic_?search|list_?code_?usages)$/
const WEB = /^(web_?fetch|web_?search|fetch|fetch_?webpage|fetch_copilot_cli_documentation)$/
const AGENT = /^(agent|task|task_?complete|subagent\w*|subagent_?handback|send_?message|read_?agent|list_?agents)$/

/** The kind of work of a tool, by its name. MCP tools by their prefix; anything unknown is "other". */
export function workOf(name: string | null | undefined): Work {
  const raw = String(name ?? '')
  if (/^mcp__/.test(raw) || /^mcp_/.test(raw)) return 'mcp'
  if (isShellTool(raw)) return 'run'
  const key = raw.toLowerCase()
  if (READ.test(key)) return 'read'
  if (EDIT.test(key)) return 'edit'
  if (SEARCH.test(key)) return 'search'
  if (WEB.test(key)) return 'web'
  if (AGENT.test(key)) return 'agent'
  return 'other'
}

const rawName = (tool: FlowEvent) => tool.to || tool.name || ''

/** The last part of a path, or the text when it is not a path. */
function shortTarget(target: string) {
  const line = firstLine(target, 200)
  if (/^[a-z]+:\/\//i.test(line) || !/[\\/]/.test(line) || /\s/.test(line)) return line
  return line.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || line
}

/**
 * The title of one tool call: for a shell tool the program and its first meaningful argument ("python3 run.py",
 * "git status"), never a leading `cd` or variable; else the tool and the last part of what it worked on ("Read a.ts").
 */
export function callHeadline(tool: FlowEvent) {
  const name = rawName(tool)
  if (isShellTool(name)) {
    const program = programOf(commandText(tool.params, tool.target))
    if (program) return programHeadline(program)
  }
  const target = tool.target ? shortTarget(tool.target) : ''
  return target ? `${toolName(tool)} ${target}` : toolName(tool)
}

const programName = (tool: FlowEvent) => {
  if (!isShellTool(rawName(tool))) return toolName(tool)
  return programOf(commandText(tool.params, tool.target))?.program ?? toolName(tool)
}

/** What a row says a step did, and the kind of work it was. */
export interface Headline { text: string; work: Work }

/**
 * One call: its title. Several calls of one tool (or one program): "view ×12". Several tools: each with its count,
 * in call order ("Read ×2 · Bash"). The calls stay apart in the bars and in the hover card; this is only the title.
 */
export function stepHeadline(step: Step): Headline {
  const tools = step.tools
  if (tools.length === 1) return { text: callHeadline(tools[0]), work: workOf(rawName(tools[0])) }
  if (tools.length > 1) {
    const groups = new Map<string, number>()
    for (const tool of tools) groups.set(programName(tool), (groups.get(programName(tool)) ?? 0) + 1)
    const works = new Set(tools.map(tool => workOf(rawName(tool))))
    return {
      text: [...groups].map(([name, count]) => count > 1 ? `${name} ×${count}` : name).join(' · '),
      work: works.size === 1 ? [...works][0] : workOf(rawName(tools[0])),
    }
  }
  switch (step.kind) {
    case 'round': case 'reply': {
      const reply = step.reply?.response_preview ? firstLine(step.reply.response_preview, 160) : ''
      const reason = step.call?.finish_reason ? step.call.finish_reason.replaceAll('_', ' ') : ''
      return { text: reply ? `Reply: ${reply}` : reason ? `Reply · ${reason}` : 'Reply without tool calls', work: 'model' }
    }
    case 'agent': case 'agent_end': case 'task': return { text: stepTitle(step), work: 'agent' }
    case 'compaction': case 'context': return { text: stepTitle(step), work: 'context' }
    default: return { text: stepTitle(step), work: 'other' }
  }
}

/** One bar of a step's time, in seconds from the start of the step. `to` absent: the duration was not reported. */
export interface Segment { work: Work; from: number; to?: number; failed: boolean; event: FlowEvent; line: number }

export interface Timing {
  segments: Segment[]
  /** Seconds from the start of the step to its last result; absent when no part of it has a reported duration. */
  span?: number
  /** Lines the bars need: parallel calls whose times overlap take a line each. */
  lines: number
}

const seconds = (ms: number | null | undefined) => ms == null || !Number.isFinite(ms) ? undefined : Math.max(0, ms) / 1000

/**
 * The bars of a step. A model round: the reply from when the request was sent (its reply time less its duration) to
 * when it arrived, then each tool call from its start for its duration. A subagent end: the time the subagent ran. A
 * compaction: the time it took. A prompt and other instant steps have no bar.
 */
export function timingOf(step: Step): Timing {
  const segments: Segment[] = []
  const at = (ts: number) => Math.max(0, ts - step.start)
  if (step.call) {
    const call = step.call, duration = seconds(call.duration_ms || undefined)
    segments.push({ work: 'model', from: duration == null ? at(call.ts) : at(call.ts - duration), to: duration == null ? undefined : at(call.ts),
      failed: !!call.is_error, event: call, line: 0 })
  }
  for (const tool of step.tools) {
    const duration = seconds(tool.duration_ms)
    segments.push({ work: workOf(rawName(tool)), from: at(tool.ts), to: duration == null ? undefined : at(tool.ts) + duration,
      failed: failedEvent(tool), event: tool, line: 0 })
  }
  if (!step.call && !step.tools.length && (step.kind === 'agent_end' || step.kind === 'compaction')) {
    const duration = seconds(step.lead.duration_ms)
    if (duration != null) segments.push({ work: step.kind === 'agent_end' ? 'agent' : 'context', from: 0, to: duration, failed: step.failed, event: step.lead, line: 0 })
  }
  const lines = packLines(segments)
  const ends = segments.map(segment => segment.to).filter((value): value is number => value != null)
  return { segments, span: ends.length ? Math.max(...ends) : undefined, lines }
}

/**
 * Give each bar the first line where it does not overlap an earlier bar, so parallel calls show side by side in
 * time and stacked in lines. A bar with no reported duration takes no time. Returns the number of lines.
 */
export function packLines(segments: Segment[]) {
  const ends: number[] = []
  const order = segments.map((segment, index) => index).sort((a, b) => segments[a].from - segments[b].from || a - b)
  for (const index of order) {
    const segment = segments[index]
    const end = segment.to ?? segment.from
    let line = ends.findIndex(last => last <= segment.from + 1e-6)
    if (line < 0) { line = ends.length; ends.push(end) } else ends[line] = end
    segment.line = line
  }
  return Math.max(1, ends.length)
}

/**
 * The scale of one column of bars: the full width stands for `cap`. With `quantile`, `cap` is that quantile of the
 * values (at least `floor`), so a few huge values do not shrink every other bar to nothing; a bar above the cap is
 * drawn at full width and marked cut. Without it, the scale is linear to the largest value.
 */
export interface Scale { cap: number; max: number; cut: boolean; quantile?: number }

export function scaleOf(values: readonly (number | null | undefined)[], options: { quantile?: number; floor?: number } = {}): Scale {
  const sorted = values.filter((value): value is number => value != null && Number.isFinite(value) && value > 0).sort((a, b) => a - b)
  const max = sorted.at(-1) ?? 0
  const floor = options.floor ?? 0
  if (!options.quantile || !sorted.length) return { cap: Math.max(floor, max, Number.MIN_VALUE), max, cut: false }
  const quantile = sorted[Math.floor((sorted.length - 1) * options.quantile)]
  // When the largest value is close to the quantile, cutting it would hide nothing worth the mark.
  const cap = max <= quantile * 1.25 ? max : quantile
  return { cap: Math.max(floor, cap, Number.MIN_VALUE), max, cut: max > Math.max(floor, cap), quantile: options.quantile }
}

/** A bar's length as a share of its column: 0 for zero, capped at 1 and marked cut above the scale; undefined when unreported. */
export function barShare(value: number | null | undefined, scale: Scale) {
  if (value == null || !Number.isFinite(value)) return undefined
  if (value <= 0) return { share: 0, cut: false }
  return { share: Math.min(1, value / scale.cap), cut: value > scale.cap }
}

/** The smallest bar drawn for a value above zero, so a small value never vanishes. */
export const MIN_MARK = '2px'

/** The CSS length of a bar of this share: at least MIN_MARK for any value above zero, nothing for zero. */
export const barLength = (share: number) => share > 0 ? `max(${MIN_MARK}, ${+(share * 100).toFixed(3)}%)` : '0px'

/** Tokens the model read for this request: input, cache read and cache write. Undefined when none is reported. */
export function contextOf(call: FlowEvent | undefined) {
  const tokens = call?.tokens
  if (!tokens) return undefined
  const parts = [tokens.input, tokens.cache_read, tokens.cache_creation].filter((value): value is number => value != null)
  return parts.length ? parts.reduce((total, value) => total + value, 0) : undefined
}

/** The context of a step: what its request read, what a compaction left, or what the tool reported. */
export function stepContext(step: Step) {
  if (step.call) return contextOf(step.call)
  if (step.kind === 'compaction') return step.lead.after_tokens ?? undefined
  if (step.kind === 'context') return step.lead.context_tokens ?? undefined
  return undefined
}

/** Summed result bytes of a step's tool calls, and how many of its calls reported a size. */
export function resultOf(step: Step) {
  const sized = step.tools.filter(tool => tool.output_bytes != null)
  return { bytes: sized.length ? sized.reduce((total, tool) => total + (tool.output_bytes ?? 0), 0) : undefined, reported: sized.length, calls: step.tools.length }
}

export interface Scales { time: Scale; context: Scale; output: Scale; result: Scale }

/**
 * The scales of the loaded steps. Time is capped at the 90th percentile of the model rounds and tool calls (they span
 * four orders of magnitude: 20 ms calls and 18 min replies; a subagent's whole run, drawn on its end row, would set the
 * scale for nothing else); output and result size at their 95th percentile. Context is linear to its largest value, so
 * its trace shows growth and every compaction as they are.
 */
export function scalesOf(steps: readonly Step[]): Scales {
  const timed = steps.map(step => step.call || step.tools.length ? timingOf(step).span : undefined)
  return {
    time: scaleOf(timed, { quantile: 0.9, floor: 1 }),
    context: scaleOf([...steps.map(stepContext), ...steps.map(step => step.kind === 'compaction' ? step.lead.before_tokens : undefined)]),
    output: scaleOf(steps.map(step => step.call?.tokens?.output), { quantile: 0.95, floor: 100 }),
    result: scaleOf(steps.map(step => resultOf(step).bytes), { quantile: 0.95, floor: 1024 }),
  }
}

/** A call's identity for repeats: the tool and its arguments. */
const callKey = (tool: FlowEvent) => `${rawName(tool)}\u0000${tool.params ?? tool.target ?? tool.input_preview ?? ''}`

/**
 * Steps that repeat the calls of the previous step of the same agent exactly (same tools, same arguments):
 * `count` is the place in the run of repeats (2 for the first repeat), `retry` says the step before failed.
 */
export function repeatsOf(steps: readonly Step[]) {
  const last = new Map<string, { key: string; count: number; failed: boolean }>()
  const repeats = new Map<string, { count: number; retry: boolean }>()
  for (const step of steps) {
    if (!step.tools.length) continue
    const key = step.tools.map(callKey).sort().join('\u0001')
    const before = last.get(step.agent)
    const count = before?.key === key ? before.count + 1 : 1
    if (count > 1) repeats.set(step.id, { count, retry: !!before?.failed })
    last.set(step.agent, { key, count, failed: step.tools.some(failedEvent) })
  }
  return repeats
}

/** The track of each agent: the main agent on track 0, each subagent on the lowest track free while it runs. */
export interface Tracks { count: number; of: Map<string, number>; life: Map<string, { first: number; last: number }> }

export function tracksOf(steps: readonly Step[], scopeAgent = ''): Tracks {
  const life = new Map<string, { first: number; last: number }>()
  for (const step of steps) {
    const agent = step.agent === scopeAgent ? '' : step.agent
    const span = life.get(agent)
    if (!span) life.set(agent, { first: step.start, last: Math.max(step.end, step.ts) })
    else { span.first = Math.min(span.first, step.start); span.last = Math.max(span.last, step.end, step.ts) }
  }
  const of = new Map<string, number>()
  if (life.has('') || life.size > 1) of.set('', 0)
  const busy: number[] = [Infinity]
  const order = [...life].filter(([agent]) => agent).sort((a, b) => a[1].first - b[1].first || (a[0] < b[0] ? -1 : 1))
  for (const [agent, span] of order) {
    let track = busy.findIndex((until, index) => index > 0 && until < span.first)
    if (track < 0) { track = busy.length; busy.push(span.last) } else busy[track] = span.last
    of.set(agent, track)
  }
  if (scopeAgent) of.set(scopeAgent, 0)
  return { count: Math.max(1, busy.length), of, life }
}

/** The agents alive at a time, by track: the main agent all along, a subagent from its first step to its last. */
export function aliveAt(tracks: Tracks, ts: number) {
  const alive: number[] = tracks.of.has('') ? [0] : []
  for (const [agent, span] of tracks.life) {
    const track = tracks.of.get(agent)
    if (agent && track != null && span.first <= ts && ts <= span.last) alive.push(track)
  }
  return alive.sort((a, b) => a - b)
}

/** A run of similar steps shown as one row when the reader collapses runs. */
export interface Run { type: 'run'; id: string; steps: Step[]; title: string; work: Work; expanded: boolean; failed: number }
export type ChartRow = FlowRow | Run

const runKey = (step: Step) => step.tools.length === 1 ? `${step.agent}\u0000${programName(step.tools[0])}` : undefined

/**
 * Runs of at least `min` consecutive steps of one agent that each made one call of the same tool (or program) become
 * one row; an expanded run keeps its row and shows its steps under it. Pauses and subagent rows break a run.
 */
export function collapseRuns(rows: readonly FlowRow[], expanded: ReadonlySet<string>, min = 3): ChartRow[] {
  const out: ChartRow[] = []
  let index = 0
  while (index < rows.length) {
    const row = rows[index]
    const key = row.type === 'step' ? runKey(row.step) : undefined
    let end = index + 1
    while (key && end < rows.length) {
      const next = rows[end]
      if (next.type !== 'step' || runKey(next.step) !== key || next.span?.agent !== (row.type === 'step' ? row.span?.agent : undefined)) break
      end++
    }
    if (!key || end - index < min) { out.push(row); index++; continue }
    const members = rows.slice(index, end) as Extract<FlowRow, { type: 'step' }>[]
    const steps = members.map(member => member.step)
    const id = `run:${steps[0].id}`
    const first = steps[0].tools[0]
    out.push({ type: 'run', id, steps, title: `${programName(first)} ×${steps.length}`, work: workOf(rawName(first)),
      expanded: expanded.has(id), failed: steps.filter(step => step.failed).length })
    if (expanded.has(id)) out.push(...members)
    index = end
  }
  return out
}

/** Row heights in px: fixed per kind of row, so the list places rows without measuring them. */
export const ROW_PX = { step: 24, run: 24, span: 26, gap: 20 } as const

/** The top of each row and, last, the height of all rows. */
export function rowOffsets(rows: readonly { type: keyof typeof ROW_PX }[]) {
  const offsets = new Array<number>(rows.length + 1)
  offsets[0] = 0
  for (let index = 0; index < rows.length; index++) offsets[index + 1] = offsets[index] + ROW_PX[rows[index].type]
  return offsets
}

/** The first and last rows that a view from `top` of `height` px shows, widened by `overscan` rows each side. */
export function rowRange(offsets: readonly number[], top: number, height: number, overscan = 0): readonly [number, number] {
  const count = offsets.length - 1
  if (count <= 0) return [0, -1]
  const find = (y: number) => {
    let low = 0, high = count - 1
    while (low < high) {
      const middle = (low + high + 1) >> 1
      if (offsets[middle] <= y) low = middle; else high = middle - 1
    }
    return low
  }
  const first = find(Math.max(0, top)), last = find(Math.max(0, top + height - 1))
  return [Math.max(0, first - overscan), Math.min(count - 1, last + overscan)]
}

/** Calls per kind of work in these steps, for the key of the colours; model replies count requests. */
export function workCounts(steps: readonly Step[]) {
  const counts = new Map<Work, number>()
  const add = (work: Work) => counts.set(work, (counts.get(work) ?? 0) + 1)
  for (const step of steps) {
    if (step.call) add('model')
    for (const tool of step.tools) add(workOf(rawName(tool)))
  }
  return WORK_ORDER.filter(work => counts.has(work)).map(work => ({ work, count: counts.get(work)! }))
}

/** The share of a model reply spent waiting for its first token, when both times are reported. */
export function firstTokenShare(segment: Segment) {
  const ttft = segment.event.type === 'api_call' ? segment.event.ttft_ms : undefined
  if (!ttft || segment.to == null || segment.to <= segment.from) return undefined
  return Math.min(1, ttft / 1000 / (segment.to - segment.from))
}

/** Every number of one bar for its title. */
export function segmentTitle(segment: Segment, fmt: { ms: (ms: number) => string }) {
  const event = segment.event
  const took = segment.to == null ? 'duration not reported' : fmt.ms((segment.to - segment.from) * 1000)
  if (event.type === 'api_call') {
    const first = event.ttft_ms ? ` · first token after ${fmt.ms(event.ttft_ms)}` : ''
    return `Model reply${event.model ? ` · ${event.model}` : ''} · ${took}${first}${event.request_n != null ? ` · request ${event.request_n}` : ''}${event.is_error ? ' · failed' : ''}`
  }
  if (event.type === 'tool_use') return `${toolDisplayName(rawName(event) || 'tool name not reported')} · ${callHeadline(event)} · ${took}${segment.failed ? ' · failed' : ''}`
  return `${workLabels[segment.work]} · ${took}`
}
