import { describe, expect, it } from 'vitest'
import type { FlowEvent } from '../src/data/contract.gen'
import { flowModel } from '../src/drawer/flowModel'
import {
  layoutOf, modelFamily, openingRow, promptLine, rowsOf, spansOf, spanSummary, stepsOf, stepTitle, toolMetrics,
} from '../src/drawer/flowSteps'
import {
  clampWidth, COLLAPSED, fitWidths, GUTTER, GUTTER_DEFAULT, GUTTER_MAX, LANE_MAX, LANE_MIN, readWidths, resolveWidths,
  STEP_MIN, textFit, writeWidths,
} from '../src/drawer/flowWidths'

const event = (type: string, ts: number, extra: Partial<FlowEvent> = {}): FlowEvent =>
  ({ type, ts, source: 'store', rt_tokens: null, cum_tokens: null, ...extra })
const placed = (events: FlowEvent[]) => flowModel(events).events

// The shape of a turn that starts two subagents with a task tool: the first fails at once, the second runs.
const FAILED = '5288277c-817e-4356-8190-d50d9584b4fe', RAN = '58f1831d-d969-4e91-b8b5-8b239bbb7a1b'
const turn = () => stepsOf(placed([
  event('user_message', 1, { step: 1, message: 'Earlier prompt' }),
  event('api_call', 2, { step: 2, model: 'gemini-4-argon', request_n: 1 }),
  event('user_message', 10, { step: 3, message: 'launch a sub agent and have it check\nif open telemetry is on', prompt_length: 116 }),
  event('api_call', 11, { step: 4, model: 'gemini-4-argon', request_n: 2 }),
  event('tool_use', 11, { step: 4, to: 'task', success: false, spawned_agent_id: FAILED }),
  event('subagent', 11.1, { step: 5, to: 'task', model: 'claude-opus-5', agent_id: FAILED }),
  event('session_command', 11.1, { step: 5, name: 'model_change', agent_id: FAILED }),
  event('subagent_end', 11.2, { step: 6, from: 'task', agent_id: FAILED, outcome: 'failed', is_error: true, completed: false, duration_ms: 87 }),
  event('api_call', 12, { step: 7, model: 'gemini-4-argon', request_n: 3 }),
  event('tool_use', 12, { step: 7, to: 'task', spawned_agent_id: RAN, duration_ms: 18763 }),
  event('subagent', 12.1, { step: 8, to: 'task', model: 'claude-opus-5.5', agent_id: RAN, prompt: 'Check if OpenTelemetry is enabled\nfor Copilot CLI' }),
  event('session_command', 12.1, { step: 8, name: 'model_change', agent_id: RAN }),
  event('task_prompt', 12.2, { step: 9, agent_id: RAN, message: 'Check if OpenTelemetry is enabled\nfor Copilot CLI', prompt_length: 287 }),
  event('api_call', 20, { step: 10, model: 'claude-opus-5.5', agent_id: RAN, request_n: 4 }),
  event('tool_use', 20, { step: 10, to: 'bash', agent_id: RAN, target: 'env | grep OTEL' }),
  event('api_call', 25, { step: 11, model: 'claude-opus-5.5', agent_id: RAN, request_n: 5 }),
  event('subagent_end', 30.9, { step: 12, from: 'task', agent_id: RAN, outcome: 'completed', completed: true, duration_ms: 18756 }),
  event('api_call', 31, { step: 13, model: 'gemini-4-argon', request_n: 6 }),
]))

describe('DRW-FL-05 · Opening position and prompt text', () => {
  it('opens at the latest prompt, not at the newest step, and at a deep-linked step when one is named', () => {
    const rows = rowsOf(turn())
    const at = openingRow(rows)!
    expect(rows[at]).toMatchObject({ type: 'step', step: { n: 3, kind: 'prompt' } })
    expect(openingRow(rows, 'step:10')).toBe(rows.findIndex(row => row.id === 'step:10'))
    expect(openingRow(rowsOf(stepsOf(placed([event('api_call', 1), event('api_call', 2)]))))).toBe(1)
    expect(openingRow([])).toBeUndefined()
  })

  it('shows the first line of a prompt, or its length when the text was not retained', () => {
    const steps = turn()
    expect(stepTitle(steps[2])).toBe('launch a sub agent and have it check')
    expect(layoutOf(steps[2], false).chips[0]).toMatchObject({ lane: 'User', title: 'launch a sub agent and have it check' })
    expect(promptLine(event('user_message', 1, { redacted: true, prompt_length: 116 }))).toBe('Prompt, 116 chars, text not retained')
    expect(promptLine(event('user_message', 1, { redacted: true }))).toBe('Prompt, text not retained')
    expect(promptLine(event('user_message', 1, { message: 'x'.repeat(400) }))).toHaveLength(160)
    const task = steps.find(step => step.kind === 'task')!
    expect(stepTitle(task)).toBe('Task: Check if OpenTelemetry is enabled')
    expect(stepTitle(stepsOf(placed([event('task_prompt', 1, { agent_id: RAN, redacted: true, prompt_length: 287 })]))[0]))
      .toBe('Task: task, 287 chars, text not retained')
  })
})

describe('DRW-FL-06 · Subagent spans', () => {
  it('puts a subagent task, its rounds and its end inside its span, with the start labelled and the model change folded in', () => {
    const steps = turn()
    const spans = spansOf(steps)
    const ran = spans.get(RAN)!
    expect(ran.steps.map(step => step.n)).toEqual([8, 9, 10, 11, 12])
    expect(stepTitle(ran.start!)).toBe('Subagent started: Check if OpenTelemetry is enabled (claude-opus-5.5)')
    expect(ran.start!.events.map(item => item.type)).toEqual(['subagent', 'session_command'])
    expect(stepTitle(ran.end!)).toBe('Subagent completed in 18.8 s')
    expect(spanSummary(ran)).toBe('subagent ran 18.8 s, 2 requests, 1 tool call, result: completed')
    const rows = rowsOf(steps)
    const inside = rows.filter(row => row.type === 'step' && row.span?.agent === RAN)
    expect(inside.map(row => row.type === 'step' && row.span?.place)).toEqual(['start', 'inside', 'inside', 'inside', 'end'])
    expect(rows.findIndex(row => row.id === `span:${RAN}`)).toBe(rows.findIndex(row => row.id === 'step:8') - 1)
    // The main agent's steps are outside every span, and a subagent's own flow draws none.
    expect(rows.filter(row => row.type === 'step' && !row.span).map(row => row.type === 'step' && row.step.n)).toEqual([1, 2, 3, 4, 7, 13])
    expect(spansOf(steps.filter(step => step.agent === RAN), RAN).size).toBe(0)
  })

  it('collapses a span to its summary row', () => {
    const rows = rowsOf(turn(), { collapsed: new Set([RAN]) })
    expect(rows.some(row => row.type === 'step' && row.step.agent === RAN)).toBe(false)
    expect(rows.find(row => row.id === `span:${RAN}`)).toMatchObject({ type: 'span', collapsed: true })
  })

  it('says a failed subagent failed, how fast, and links the task call that started it', () => {
    const steps = turn()
    const failed = spansOf(steps).get(FAILED)!
    expect(failed.outcome).toBe('failed')
    expect(stepTitle(failed.end!)).toBe('Subagent failed after 87 ms')
    expect(failed.end!.failed).toBe(true)
    expect(stepTitle(failed.start!)).toBe('Subagent started: task (claude-opus-5)')
    const call = steps.find(step => step.n === 4)!.tools[0]
    expect(toolMetrics(call).find(metric => metric.key === 'spawned')).toMatchObject({ text: 'subagent 5288277c', icon: 'agents' })
    expect(stepTitle(stepsOf(placed([event('subagent_end', 1, { from: 'task', agent_id: 'a', completed: false })]))[0]))
      .toBe('Subagent ended, outcome not reported')
  })

  it('shortens a model label to its family', () => {
    expect(['claude-opus-5-5', 'claude-sonnet-5-5', 'gemini-4-argon', 'gpt-5.1-codex', 'mystery'].map(modelFamily))
      .toEqual(['opus', 'sonnet', 'gemini', 'gpt', 'mystery'])
  })
})

describe('DRW-FL-07 · Lane widths', () => {
  const lanes = [{ id: 'User', width: 12 }, { id: 'Assistant', width: 16 }, { id: 'Tools · Bash', width: 30 }, { id: 'Tools · Read', width: 24 }]

  it('keeps every width between its minimum and maximum', () => {
    expect([clampWidth('Tools · Bash', 1), clampWidth('Tools · Bash', 999), clampWidth(GUTTER, 2), clampWidth(GUTTER, 99), clampWidth('x', Number.NaN)])
      .toEqual([LANE_MIN, LANE_MAX, 7, GUTTER_MAX, LANE_MIN])
    expect(resolveWidths(lanes, { widths: { 'Tools · Bash': 2 }, collapsed: ['User'] }))
      .toEqual({ [GUTTER]: GUTTER_DEFAULT, User: COLLAPSED, Assistant: 16, 'Tools · Bash': LANE_MIN, 'Tools · Read': 24 })
  })

  it('fits the lanes into the visible width, collapsing lanes with nothing in view', () => {
    const fitted = fitWidths(lanes, { widths: {}, collapsed: [] }, 100, new Set(['Assistant', 'Tools · Bash']))
    const columns = resolveWidths(lanes, fitted)
    expect(fitted.collapsed).toEqual(['User', 'Tools · Read'])
    const total = Object.values(columns).reduce((sum, width) => sum + width, 0) + STEP_MIN
    expect(total).toBeLessThanOrEqual(100)
    expect(columns['Tools · Bash'] / columns.Assistant).toBeCloseTo(30 / 16, 0)
    // Too little room for the minimums: every shown lane is at its minimum, never below.
    const tight = resolveWidths(lanes, fitWidths(lanes, { widths: {}, collapsed: [] }, 20))
    expect(lanes.map(lane => tight[lane.id])).toEqual([LANE_MIN, LANE_MIN, LANE_MIN, LANE_MIN])
  })

  it('reads persisted widths back and drops anything malformed', () => {
    const store = new Map<string, string>()
    const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value) },
      removeItem: (key: string) => { store.delete(key) } }
    writeWidths(storage, 'k', { widths: { 'Tools · Bash': 9, [GUTTER]: 12 }, collapsed: ['User'] })
    expect(readWidths(storage, 'k')).toEqual({ widths: { 'Tools · Bash': 9, [GUTTER]: 12 }, collapsed: ['User'] })
    store.set('k', '{"widths":{"a":"wide","b":500},"collapsed":[1,"c"]}')
    expect(readWidths(storage, 'k')).toEqual({ widths: { b: LANE_MAX }, collapsed: ['c'] })
    store.set('k', 'not json')
    expect(readWidths(storage, 'k')).toEqual({ widths: {}, collapsed: [] })
    writeWidths(storage, 'k', { widths: {}, collapsed: [] })
    expect(store.has('k')).toBe(false)
    const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => undefined }
    expect(readWidths(broken, 'k')).toEqual({ widths: {}, collapsed: [] })
    expect(() => writeWidths(broken, 'k', { widths: { a: 5 }, collapsed: [] })).not.toThrow()
  })

  it('keeps a text on one line, wraps it to a second, or clips it after two', () => {
    expect([textFit(10, 14), textFit(20, 14), textFit(40, 14), textFit(5, LANE_MIN)]).toEqual(['line', 'wrap', 'clip', 'clip'])
  })
})
