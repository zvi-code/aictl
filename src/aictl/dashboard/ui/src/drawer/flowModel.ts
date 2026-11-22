import type { FlowEvent, FlowSummary } from '../data/contract.gen'
import { fmtMs, fmtN } from '../design/format'

const routes: Record<string, (event: FlowEvent) => [string, string]> = {
  user_message: () => ['User', 'Assistant'],
  api_call: () => ['Assistant', 'Model'],
  api_response: () => ['Model', 'Assistant'],
  error: () => ['Model', 'Assistant'],
  tool_use: event => ['Assistant', `Tools · ${event.to || 'Unknown'}`],
  subagent: event => ['Assistant', `Subagents · ${event.to || 'Unknown'}`],
  subagent_end: event => [`Subagents · ${event.from || 'Unknown'}`, 'Assistant'],
  hook: () => ['Assistant', 'Hooks'],
}

const tokens = (event: FlowEvent) => (event.tokens?.input ?? 0) + (event.tokens?.output ?? 0)
export type PlacedEvent = FlowEvent & { _turnIndex: number; _from: string; _to: string }

export type EventKind = 'prompt' | 'model' | 'reply' | 'tool' | 'agent' | 'hook' | 'skill' | 'context' | 'error' | 'other'
const kinds: Record<string, EventKind> = {
  user_message: 'prompt', api_call: 'model', api_response: 'reply', tool_use: 'tool', subagent: 'agent',
  subagent_end: 'agent', hook: 'hook', skill_event: 'skill', compaction: 'context', error: 'error',
}
export const kindLabels: Record<EventKind, string> = {
  prompt: 'Prompt', model: 'Model call', reply: 'Reply', tool: 'Tool use', agent: 'Subagent', hook: 'Hook',
  skill: 'Skill', context: 'Context', error: 'Failure', other: 'Event',
}
export const failedEvent = (event: FlowEvent) => event.type === 'error' || !!event.is_error || event.success === false
export const kindOf = (event: FlowEvent): EventKind => failedEvent(event) ? 'error' : kinds[event.type] ?? 'other'
export const eventTokens = (event: FlowEvent) => event.tokens ? tokens(event) : undefined
export function durationOf(event: FlowEvent) {
  const measured = event.duration_ms ?? event.wall_ms
  if (measured != null && measured > 0) return measured
  return event.end_ts != null && event.end_ts > event.ts ? (event.end_ts - event.ts) * 1000 : undefined
}
const pad = (value: number) => String(value).padStart(2, '0')
/** Local wall-clock time with seconds, for events that are seconds apart. */
export function clockTime(ts: number) {
  const date = new Date(ts * 1000)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function mergeSplitPrompts(events: readonly FlowEvent[]) {
  const merged: FlowEvent[] = []
  for (let index = 0; index < events.length; index++) {
    const first = events[index], second = events[index + 1]
    if (first.type === 'user_message' && second?.type === 'user_message'
        && first.step_key && first.step_key === second.step_key && !!first.redacted !== !!second.redacted) {
      const [metrics, retained] = first.redacted ? [first, second] : [second, first]
      merged.push({
        ...metrics, ...retained, redacted: false,
        tokens: tokens(metrics) >= tokens(retained) ? metrics.tokens : retained.tokens,
        api_calls: metrics.api_calls || retained.api_calls,
        duration_ms: metrics.duration_ms || retained.duration_ms,
        wall_ms: metrics.wall_ms || retained.wall_ms,
        end_ts: metrics.end_ts ?? retained.end_ts,
        model: metrics.model || retained.model,
      })
      index++
    } else merged.push(first)
  }
  return merged
}

export function flowModel(raw: readonly FlowEvent[], summary?: Pick<FlowSummary, 'total_turns' | 'omitted_events'>) {
  const merged = mergeSplitPrompts(raw)
  const prompts = merged.reduce((count, event) => count + Number(event.type === 'user_message'), 0)
  let turn = Math.max(0, (summary?.total_turns ?? prompts) - prompts)
  if (!turn && merged[0]?.type !== 'user_message' && (summary?.omitted_events ?? 0) > 0) turn = 1
  const events: PlacedEvent[] = merged.map(event => {
    if (event.type === 'user_message') turn++
    const [from, to] = routes[event.type]?.(event) ?? ['Session', 'Session']
    return { ...event, _turnIndex: event.turn_index ?? turn, _from: from, _to: to }
  })
  return { events, turnGroups: [...new Set(events.map(event => event._turnIndex))].filter(index => index > 0) }
}

export const skillPhase = (phase?: string | null) => ({
  loaded: 'Loaded', invoked: 'Invoked', reported: 'Reported in context', resolved: 'Resolved',
} as Record<string, string>)[phase ?? ''] ?? (phase || 'Not reported')

export function eventIdentity(event: FlowEvent) {
  return JSON.stringify([event.step_key, event.type, event.ts, event.source, event.phase, event.subtype,
    event.agent_id, event.turn_id, event.tool_call_id, event.name ?? event.to, event.span_id])
}

export function lanesOf(events: readonly PlacedEvent[], grouped: boolean) {
  return [...new Set(events.flatMap(event => [laneOf(event._from, grouped), laneOf(event._to, grouped)]))]
}

export const laneOf = (lane: string, grouped: boolean) => grouped ? lane.split(' · ', 1)[0] : lane

export function describe(event: FlowEvent) {
  switch (event.type) {
    case 'user_message': return event.redacted ? 'Prompt · text not retained' : event.preview || event.message || 'Prompt'
    case 'api_call': return `${event.model || 'Model call'} · ${fmtN(tokens(event))} tokens${event.ttft_ms != null ? ` · ${fmtMs(event.ttft_ms)} to first token` : ''}`
    case 'api_response': return event.response_preview ? `Reply · ${event.response_preview}` : 'Reply'
    case 'skill_event': return `Skill: ${event.name || 'Not reported'} · ${skillPhase(event.phase)}${event.reported_spans != null ? ` · ${event.reported_spans} distinct spans` : ''}`
    case 'error': return `Error: ${event.error_type || event.error_message || 'Not reported'}`
    default: return event.name || event.to || event.type.replaceAll('_', ' ')
  }
}

export function inputOf(event: FlowEvent) {
  if (event.type === 'user_message') return event.redacted ? undefined : event.message || event.preview
  return event.request_preview || event.params || event.input_preview || event.prompt || event.hook_input || event.target
}

export function outputOf(event: FlowEvent) {
  return event.response || event.response_preview || event.result_summary || event.result_preview || event.error_message || event.hook_output
}

export function flowBounds(range: string, end?: number | null, startInput = '', endInput = '') {
  if (range === 'whole') return {}
  if (range === 'custom') {
    const since = new Date(startInput).getTime() / 1000, until = new Date(endInput).getTime() / 1000
    if (!Number.isFinite(since) || !Number.isFinite(until) || since < 0 || since >= until) {
      return { error: 'Enter valid local times, with the end after the start.' }
    }
    return { since: Math.floor(since), until: Math.ceil(until) }
  }
  if (end == null) return { error: 'The session end time has not been reported.' }
  return { since: Math.max(0, Math.floor(end - Number(range))), until: Math.ceil(end) }
}
