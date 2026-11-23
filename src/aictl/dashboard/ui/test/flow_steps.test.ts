import { describe, expect, it } from 'vitest'
import type { FlowEvent } from '../src/data/contract.gen'
import { flowModel } from '../src/drawer/flowModel'
import {
  BAR_PX, barLength, barScale, barsOf, callCount, callMetrics, callTitle, GAP_S, groupMetrics, hiddenCalls, lanesFor, layoutOf, rowsOf,
  stepsOf, stepTitle, toolMetrics, totalsOf, waitLabel,
} from '../src/drawer/flowSteps'

const event = (type: string, ts: number, extra: Partial<FlowEvent> = {}): FlowEvent =>
  ({ type, ts, source: 'store', rt_tokens: null, cum_tokens: null, ...extra })
const tokens = (input: number, output: number, cache_read = 0, cache_creation = 0) => ({ input, output, cache_read, cache_creation })
const placed = (events: FlowEvent[]) => flowModel(events).events

describe('DRW-FL-03 · Flow steps', () => {
  it('makes one step of a model round and the parallel tool calls it issued', () => {
    const steps = stepsOf(placed([
      event('user_message', 1, { message: 'Fix it' }),
      event('api_call', 2, { model: 'claude-opus-5-5', tokens: tokens(2, 380, 60000, 500), duration_ms: 2400 }),
      event('tool_use', 2, { to: 'Bash', target: 'ls', duration_ms: 50, output_bytes: 4000 }),
      event('tool_use', 2.5, { to: 'Read', target: 'a.py', duration_ms: 10, output_bytes: 800 }),
      event('tool_use', 2.6, { to: 'Bash', target: 'grep x', duration_ms: 30, success: false, exit_code: 1 }),
      event('api_call', 5, { model: 'claude-opus-5-5', tokens: tokens(2, 90) }),
    ]))
    expect(steps.map(step => [step.kind, step.tools.length])).toEqual([['prompt', 0], ['round', 3], ['round', 0]])
    expect(steps[1].model).toBe('claude-opus-5-5')
    expect(steps[1].failed).toBe(true)
    expect(steps[1].end).toBeCloseTo(2.63)
  })

  it('keeps the rounds of two agents apart and follows the server step numbers across windows', () => {
    const local = stepsOf(placed([
      event('api_call', 1, { model: 'm' }), event('api_call', 1.5, { model: 'sub', agent_id: 'a1' }),
      event('tool_use', 2, { to: 'Bash' }), event('tool_use', 2, { to: 'Grep', agent_id: 'a1' }),
    ]))
    expect(local.map(step => step.tools.map(tool => tool.to))).toEqual([['Bash'], ['Grep']])
    // A window that starts in the middle of step 7 still puts its tool calls under step 7.
    const paged = stepsOf(placed([
      event('tool_use', 3, { to: 'Read', step: 7 }), event('api_call', 4, { model: 'm', step: 8, request_n: 5 }),
      event('tool_use', 4, { to: 'Bash', step: 8 }), event('tool_use', 4.2, { to: 'Bash', step: 8 }),
    ]))
    expect(paged.map(step => [step.n, step.kind, step.tools.length])).toEqual([[7, 'tool', 1], [8, 'round', 2]])
    expect(callMetrics(paged[1].call!)[0]).toMatchObject({ key: 'request', text: 'req 5' })
  })

  it('marks a model change and leaves a repeated model quiet', () => {
    const steps = stepsOf(placed([
      event('api_call', 1, { model: 'claude-opus-5-5' }), event('api_call', 2, { model: 'claude-opus-5-5' }),
      event('api_call', 3, { model: 'claude-sonnet-5-5' }),
    ]))
    expect(steps.map(step => step.modelChanged)).toEqual([false, false, true])
  })

  it('puts a wait marker between steps more than GAP_S apart, measured from the last result', () => {
    const steps = stepsOf(placed([
      event('api_call', 0, { model: 'm' }), event('tool_use', 0, { to: 'Bash', duration_ms: 20_000 }),
      event('api_call', 20 + GAP_S - 1, { model: 'm' }),
      event('user_message', 20 + GAP_S - 1 + 175),
    ]))
    const rows = rowsOf(steps)
    expect(rows.map(row => row.type)).toEqual(['step', 'step', 'gap', 'step'])
    const gap = rows[2]
    expect(gap.type === 'gap' && [Math.round(gap.seconds), gap.before]).toEqual([175, 'prompt'])
    expect(waitLabel(175)).toBe('2 m 55 s')
    expect(waitLabel(42)).toBe('42 s')
    expect(waitLabel(3 * 3600 + 120)).toBe('3 h 2 m')
  })

  it('totals the loaded steps without counting an unpriced call as free', () => {
    const totals = totalsOf(stepsOf(placed([
      event('user_message', 0),
      event('api_call', 1, { tokens: tokens(10, 20, 300, 40), cost_usd: 0.5, duration_ms: 1000 }),
      event('tool_use', 1, { to: 'Bash', duration_ms: 200, success: false }),
      event('api_call', 9, { tokens: tokens(1, 2), is_error: true }),
    ])))
    expect(totals).toMatchObject({ steps: 3, requests: 2, tools: 1, failures: 2, prompts: 1, input: 11, output: 22,
      cacheRead: 300, cacheWrite: 40, cost: 0.5, costCalls: 1, toolMs: 200, wall: 9 })
  })
})

describe('DRW-FL-04 · Step numbers and lanes', () => {
  it('shows every reported number of a call and leaves absent ones out', () => {
    const call = event('api_call', 1, { request_n: 3, tokens: tokens(2, 383, 274575, 553), duration_ms: 4436, ttft_ms: 900,
      cost_usd: 0.065, finish_reason: 'tool_use', reasoning_tokens: 120 })
    expect(callMetrics(call).map(metric => metric.text)).toEqual(
      ['req 3', 'in 2', 'out 383', 'cache r 275 k', 'cache w 553', 'think 120 tok', '4.4 s', 'TTFT 900 ms', '$0.07', 'tool_use'])
    expect(callMetrics(event('api_call', 1)).map(metric => metric.key)).toEqual([])
    expect(callMetrics(call).every(metric => metric.title.length > 10)).toBe(true)
  })

  it('labels the result tokens of a tool call as an estimate from its size', () => {
    const metrics = toolMetrics(event('tool_use', 1, { input_bytes: 120, output_bytes: 30_000, duration_ms: 56, exit_code: 0, confirm: 'denied' }))
    expect(metrics.map(metric => metric.text)).toEqual(['120 B', '30 KB', '≈7.5 k tok est.', '56 ms', 'exit 0', 'denied'])
    expect(metrics.map(metric => metric.icon && metric.label)).toEqual(['Payload out', 'Payload in', undefined, undefined, undefined, 'Approval'])
    expect(metrics.find(metric => metric.key === 'resultTokens')?.title).toMatch(/estimate/i)
    expect(toolMetrics(event('tool_use', 1, { duration_ms: 3 })).map(metric => metric.text)).toEqual(['payload not reported', '3 ms'])
    expect(groupMetrics([event('tool_use', 1, { output_bytes: 100 }), event('tool_use', 2, { output_bytes: 300, success: false })])
      .map(metric => metric.text)).toEqual(['400 B', '≈100 tok est.', '1 of 2 failed'])
  })

  it('draws a round as one edge from the assistant to its farthest tool lane, labelled with the model', () => {
    const steps = stepsOf(placed([
      event('user_message', 0),
      event('api_call', 1, { model: 'claude-opus-5-5', request_n: 1 }),
      event('tool_use', 1, { to: 'Bash', target: 'ls', output_bytes: 10 }), event('tool_use', 1, { to: 'Read', target: 'a.py' }),
      event('tool_use', 1, { to: 'mcp__docs__search', target: 'q' }),
    ]))
    const layout = layoutOf(steps[1], false)
    expect(layout.edge).toMatchObject({ from: 'Assistant', dashed: false })
    expect(steps[1]).toMatchObject({ model: 'claude-opus-5-5', modelShown: true })
    expect(layout.chips.map(chip => [chip.lane, chip.title])).toEqual([['Assistant', 'req 1'], ['Tools · Bash', 'ls'],
      ['Tools · Read', 'Read'], ['Tools · docs › search', 'docs › search']])
    expect(layout.back?.map(metric => metric.key)).toEqual(['payloadIn', 'resultTokens'])
    expect(layoutOf(steps[1], true).chips.map(chip => [chip.lane, chip.title])).toEqual([['Assistant', 'req 1'],
      ['Tools', 'ls'], ['Tools', 'Read'], ['Tools', 'docs › search']])
    expect(layoutOf(steps[1], true).lines).toBe(3)
    expect(layoutOf(steps[0], false).edge).toMatchObject({ from: 'User', to: 'Assistant' })
    const lanes = lanesFor(steps, false)
    expect(lanes.map(lane => lane.id)).toEqual(['User', 'Assistant', 'Tools · Bash', 'Tools · Read', 'Tools · docs › search'])
    expect(lanes.every(lane => lane.width >= 12 && lane.width <= 30)).toBe(true)
  })

  it('gives a subagent its own lane and a dashed edge back when it ends', () => {
    const steps = stepsOf(placed([
      event('subagent', 1, { to: 'Explore', agent_id: 'a1', model: 'claude-sonnet-5-5' }),
      event('subagent_end', 9, { from: 'Explore', agent_id: 'a1', duration_ms: 8000 }),
    ]))
    expect(layoutOf(steps[0], false).edge).toMatchObject({ from: 'Assistant', to: 'Subagents' })
    expect(layoutOf(steps[1], false).edge).toMatchObject({ from: 'Subagents', to: 'Assistant', dashed: true })
    expect(lanesFor(steps, true).map(lane => lane.id)).toEqual(['Assistant', 'Subagents'])
  })
})

describe('DRW-FL-09 · Compact rows: one box per call, the program as title, bars for sizes', () => {
  const round = (...tools: FlowEvent[]) => stepsOf(placed([event('api_call', 1, { model: 'gpt-6.2-astra', request_n: 7 }), ...tools]))[0]

  it('shows each call of a round as its own box, one line each in a shared lane, titled by the program it ran', () => {
    const step = round(
      event('tool_use', 1, { to: 'powershell', target: "$ErrorActionPreference='Stop'; git status --short | Select-Object -First 5", output_bytes: 900 }),
      event('tool_use', 1.1, { to: 'powershell', target: 'python -m pytest -q', input_bytes: 40, output_bytes: 120_000 }),
      event('tool_use', 1.2, { to: 'Read', target: 'a.py' }),
      event('tool_use', 1.3, { to: 'Bash', target: '$x.Dispose()' }),
    )
    const layout = layoutOf(step)
    expect(layout.chips.map(chip => [chip.lane, chip.title, chip.line, chip.calls.length])).toEqual([
      ['Assistant', 'req 7', 0, 0], ['Tools · powershell', 'git +1', 0, 1], ['Tools · powershell', 'pytest', 1, 1],
      ['Tools · Read', 'Read', 0, 1], ['Tools · Bash', 'Bash', 0, 1]])
    expect(layout.lines).toBe(2)
    expect(layout.chips[1].full).toMatch(/^powershell ran git \+1\n/)
    expect(callTitle(step.tools[3])).toBe('Bash')
    expect(stepTitle(step)).toBe('git +1, pytest, Read, Bash')
    expect(JSON.stringify(layout)).not.toContain('×')
  })

  it('groups repeated calls only when asked, and then says how many calls the box holds', () => {
    const step = round(event('tool_use', 1, { to: 'Bash', target: 'git add -A', output_bytes: 10 }),
      event('tool_use', 1.1, { to: 'Bash', target: 'git commit -m x', output_bytes: 30 }))
    const grouped = layoutOf(step, { groupCalls: true })
    expect(grouped.chips.slice(1).map(chip => [chip.title, chip.calls.length, chip.line])).toEqual([['Bash · 2 calls', 2, 0]])
    expect(grouped.lines).toBe(1)
    expect(grouped.chips[1].detail).toBe('git add -A ; git commit -m x')
    expect(stepTitle(step)).toBe('git (2 calls)')
    expect(callCount(1)).toBe('1 call')
  })

  it('puts the result size and tokens coming back at the end of the line, marked as estimates, and says when sizes are partial', () => {
    const step = round(event('tool_use', 1, { to: 'Bash', target: 'ls', output_bytes: 4000 }), event('tool_use', 1, { to: 'Bash', target: 'pwd' }))
    const back = layoutOf(step).back!
    expect(back.map(metric => metric.text)).toEqual(['4 KB', '≈1.0 k tok est.'])
    expect(back[0].title).toMatch(/Only 1 of 2 calls reported a result size/)
  })

  it('scales bars by the square root of the largest value in view, caps them, and keeps "not reported" apart from zero', () => {
    const max = 120_000
    const small = barLength(1_000, max)!, large = barLength(100_000, max)!
    expect(large).toBeGreaterThan(small * 3)
    expect(barLength(500_000, max)).toBe(BAR_PX)
    expect(barLength(1, max)).toBe(2)
    expect(barLength(0, max)).toBe(0)
    expect(barLength(undefined, max)).toBeUndefined()
    expect(barsOf([event('tool_use', 1, { to: 'Bash' })])).toEqual({ out: undefined, back: undefined, tokens: undefined, estimated: false, reported: false })
    expect(barsOf([event('tool_use', 1, { to: 'Bash', input_bytes: 0, output_bytes: 0 })])).toMatchObject({ out: 0, back: 0, reported: true })
    const steps = [round(event('tool_use', 1, { to: 'Read', output_bytes: 50_000, input_bytes: 10 }))]
    expect(barScale(steps)).toEqual({ bytes: 50_000, tokens: 12_500 })
    expect(barScale([])).toEqual({ bytes: 1024, tokens: 256 })
  })

  it('labels the model where it starts or changes, not on every round', () => {
    const steps = stepsOf(placed([
      event('api_call', 1, { model: 'gpt-6.2-astra' }), event('api_call', 2, { model: 'gpt-6.2-astra' }),
      event('api_call', 3, { model: 'claude-opus-5-5' }), event('api_call', 4, { model: 'claude-opus-5-5' }),
      event('api_call', 5, { model: 'claude-opus-5-5', agent_id: 'sub' }),
    ]))
    expect(steps.map(step => step.modelShown)).toEqual([true, false, true, false, true])
  })

  it('counts the calls a step made in hidden lanes so hiding a lane does not hide what happened', () => {
    const layout = layoutOf(round(event('tool_use', 1, { to: 'Bash', target: 'ls' }), event('tool_use', 1, { to: 'Bash', target: 'pwd' }),
      event('tool_use', 1, { to: 'Read', target: 'a' })))
    expect(hiddenCalls(layout, new Set(['Tools · Bash']))).toEqual({ count: 2, lanes: ['Tools · Bash'] })
    expect(hiddenCalls(layoutOf(round(event('tool_use', 1, { to: 'Bash', target: 'ls' }), event('tool_use', 1, { to: 'Bash', target: 'pwd' })),
      { groupCalls: true }), new Set(['Tools · Bash'])).count).toBe(2)
    expect(hiddenCalls(layout, new Set())).toEqual({ count: 0, lanes: [] })
  })
})
