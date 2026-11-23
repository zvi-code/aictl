import { describe, expect, it } from 'vitest'
import type { FlowEvent } from '../src/data/contract.gen'
import { flowModel } from '../src/drawer/flowModel'
import {
  aliveAt, barLength, barShare, callHeadline, collapseRuns, contextOf, MIN_MARK, packLines, repeatsOf, resultOf, ROW_PX, rowOffsets, rowRange,
  scaleOf, scalesOf, stepHeadline, timingOf, tracksOf, workCounts, workOf, type Segment,
} from '../src/drawer/chartModel'
import { GAP_S, rowsOf, stepsOf } from '../src/drawer/flowSteps'

const event = (type: string, ts: number, extra: Partial<FlowEvent> = {}): FlowEvent =>
  ({ type, ts, source: 'store', rt_tokens: null, cum_tokens: null, ...extra })
const steps = (events: FlowEvent[]) => stepsOf(flowModel(events).events)
const bash = (ts: number, command: string, extra: Partial<FlowEvent> = {}) =>
  event('tool_use', ts, { to: 'Bash', params: JSON.stringify({ command }), target: command, duration_ms: 100, ...extra })

describe('DRW-FL-10 · Titles say what ran, not how the shell got there', () => {
  it('names a shell call by its program and first meaningful argument, never a leading cd', () => {
    expect(callHeadline(bash(1, 'cd /Users/zvi/Projects/aictl && python3 scripts/check.py --all | tail'))).toBe('python3 check.py +1')
    expect(callHeadline(bash(1, 'git -C /repo status'))).toBe('git status')
    expect(callHeadline(event('tool_use', 1, { to: 'Read', target: '/Users/zvi/Projects/aictl/src/a.ts' }))).toBe('Read a.ts')
    expect(callHeadline(event('tool_use', 1, { to: 'mcp__docs__search', target: 'virtual list' }))).toBe('docs › search virtual list')
    // A command that does not name a program plainly keeps the tool name.
    expect(callHeadline(bash(1, 'for f in *; do echo $f; done'))).toBe('Bash for f in *; do echo $f; done')
  })

  it('titles parallel calls by tool and count, and a round without calls by its reply', () => {
    const [round, reply] = steps([
      event('api_call', 1, { step: 1, model: 'm', request_n: 41 }),
      event('tool_use', 1, { step: 1, to: 'view', target: 'a' }), event('tool_use', 1, { step: 1, to: 'view', target: 'b' }),
      event('tool_use', 1, { step: 1, to: 'rg', target: 'x' }),
      event('api_call', 3, { step: 2, model: 'm', request_n: 42, finish_reason: 'end_turn' }),
    ])
    expect(stepHeadline(round)).toEqual({ text: 'view ×2 · rg', work: 'read' })
    expect(stepHeadline(reply)).toEqual({ text: 'Reply · end turn', work: 'model' })
    // No running request number in what the row shows.
    expect(stepHeadline(round).text + stepHeadline(reply).text).not.toMatch(/req|41|42/)
  })

  it('sorts tools into kinds of work by name', () => {
    expect(['Bash', 'powershell', 'Read', 'view', 'Edit', 'create', 'Grep', 'rg', 'WebFetch', 'mcp__x__y', 'Agent', 'task', 'TodoWrite']
      .map(workOf)).toEqual(['run', 'run', 'read', 'read', 'edit', 'edit', 'search', 'search', 'web', 'mcp', 'agent', 'agent', 'other'])
  })
})

describe('DRW-FL-11 · Time bars: a request from when it was sent, its calls from when they started', () => {
  it('draws the reply before the calls and stacks calls that overlap in time', () => {
    // The reply arrived at 10 s after 4 s; three calls start at 10.2, two of them overlap.
    const [round] = steps([
      event('api_call', 10, { model: 'm', duration_ms: 4000 }),
      bash(10.2, 'ls', { duration_ms: 2000 }), bash(10.3, 'pwd', { duration_ms: 500 }), bash(12.5, 'date', { duration_ms: 100 }),
    ])
    expect(round.start).toBe(6)
    const timing = timingOf(round)
    expect(timing.segments.map(segment => [segment.work, segment.from, segment.to, segment.line])).toEqual([
      ['model', 0, 4, 0], ['run', expect.closeTo(4.2), expect.closeTo(6.2), 0], ['run', expect.closeTo(4.3), expect.closeTo(4.8), 1], ['run', 6.5, expect.closeTo(6.6), 0]])
    expect(timing.lines).toBe(2)
    expect(timing.span).toBeCloseTo(6.6)
  })

  it('keeps an unreported duration apart from zero and from the step time', () => {
    const [round] = steps([event('api_call', 5, { model: 'm' }), event('tool_use', 5, { to: 'Read', duration_ms: 0 })])
    const timing = timingOf(round)
    expect(timing.segments[0].to).toBeUndefined()
    expect(timing.segments[1]).toMatchObject({ from: 0, to: 0 })
    expect(timingOf(steps([event('user_message', 1, { duration_ms: 90_000 })])[0])).toMatchObject({ segments: [], span: undefined })
  })

  it('packs any number of parallel calls into the fewest lines', () => {
    const make = (from: number, to?: number): Segment => ({ work: 'run', from, to, failed: false, event: event('tool_use', 0), line: -1 })
    const list = [make(0, 5), make(1, 2), make(2, 3), make(2.5, 4), make(5, 6), make(3)]
    expect(packLines(list)).toBe(3)
    expect(list.map(segment => segment.line)).toEqual([0, 1, 1, 2, 0, 1])
  })
})

describe('DRW-FL-12 · Scales: honest about their cap, never zero for unreported', () => {
  it('caps a long-tailed column at its 95th percentile and marks what is cut', () => {
    const values = [...Array.from({ length: 99 }, (_, index) => index + 1), 100_000]
    const scale = scaleOf(values, { quantile: 0.95, floor: 1 })
    expect(scale).toMatchObject({ cap: 95, max: 100_000, cut: true })
    expect(barShare(100_000, scale)).toEqual({ share: 1, cut: true })
    expect(barShare(47.5, scale)).toEqual({ share: 0.5, cut: false })
    // A largest value near the quantile is not cut.
    expect(scaleOf([10, 11, 12], { quantile: 0.95 })).toMatchObject({ cap: 12, cut: false })
    // Without a quantile the scale is linear to the largest value.
    expect(scaleOf([3, 9, 6])).toMatchObject({ cap: 9, cut: false })
  })

  it('draws any value above zero at least MIN_MARK long, zero as nothing, unreported as undefined', () => {
    const scale = scaleOf([1_000_000])
    expect(barShare(1, scale)?.share).toBeGreaterThan(0)
    expect(barLength(barShare(1, scale)!.share)).toBe(`max(${MIN_MARK}, 0%)`)
    expect(barLength(0)).toBe('0px')
    expect(barShare(0, scale)).toEqual({ share: 0, cut: false })
    expect(barShare(undefined, scale)).toBeUndefined()
    expect(barShare(null, scale)).toBeUndefined()
  })

  it('is monotonic: a larger value never draws a shorter bar', () => {
    const scale = scaleOf([5, 50, 500, 5000], { quantile: 0.5 })
    const shares = [0, 1, 5, 20, 50, 51, 400, 5000, 9999].map(value => barShare(value, scale)!.share)
    expect(shares).toEqual([...shares].sort((a, b) => a - b))
  })

  it('reads the context of a request as everything the model read, and says which sizes were reported', () => {
    expect(contextOf(event('api_call', 1, { tokens: { input: 2, output: 400, cache_read: 225_000, cache_creation: 1_200 } }))).toBe(226_202)
    expect(contextOf(event('api_call', 1, { tokens: { input: null, output: 3, cache_read: null, cache_creation: null } }))).toBeUndefined()
    expect(contextOf(event('api_call', 1))).toBeUndefined()
    const [round] = steps([event('api_call', 1), event('tool_use', 1, { to: 'Read', output_bytes: 300 }), event('tool_use', 1, { to: 'Read' })])
    expect(resultOf(round)).toEqual({ bytes: 300, reported: 1, calls: 2 })
    const scales = scalesOf(steps([event('api_call', 1, { tokens: { input: 1, output: 10, cache_read: 99, cache_creation: 0 } }),
      event('compaction', 2, { before_tokens: 500, after_tokens: 50 })]))
    expect(scales.context.cap).toBe(500)
  })
})

describe('DRW-FL-13 · Agents on tracks', () => {
  const flow = steps([
    event('api_call', 1, { model: 'm' }),
    event('subagent', 2, { agent_id: 'a1' }), event('api_call', 3, { agent_id: 'a1' }),
    event('subagent', 4, { agent_id: 'a2' }), event('api_call', 5, { agent_id: 'a2' }),
    event('subagent_end', 6, { agent_id: 'a1' }),
    event('subagent', 7, { agent_id: 'a3', parent_agent_id: 'a2' }), event('subagent_end', 8, { agent_id: 'a3' }),
    event('subagent_end', 9, { agent_id: 'a2' }),
  ])

  it('keeps the main agent on track 0 and reuses a track once its subagent handed back, nested ones included', () => {
    const tracks = tracksOf(flow)
    expect([...tracks.of]).toEqual([['', 0], ['a1', 1], ['a2', 2], ['a3', 1]])
    expect(tracks.count).toBe(3)
    expect(aliveAt(tracks, 4.5)).toEqual([0, 1, 2])
    expect(aliveAt(tracks, 7.5)).toEqual([0, 1, 2])
    expect(aliveAt(tracks, 8.5)).toEqual([0, 2])
  })

  it('needs one track for a session of one agent, and one for a subagent scoped to itself', () => {
    expect(tracksOf(steps([event('api_call', 1), event('tool_use', 1, { to: 'Read' })])).count).toBe(1)
    expect(tracksOf(steps([event('api_call', 1, { agent_id: 'a1' }), event('api_call', 2, { agent_id: 'a1' })]), 'a1').count).toBe(1)
  })
})

describe('DRW-FL-14 · Repeats, runs and rows', () => {
  it('marks a step that repeats the calls of the previous step of its agent, and a retry after a failure', () => {
    const flow = steps([
      event('api_call', 1), bash(1, 'make test', { success: false }),
      event('api_call', 2), bash(2, 'make test'),
      event('api_call', 3), bash(3, 'make test'),
      event('api_call', 4), bash(4, 'make lint'),
    ])
    expect([...repeatsOf(flow).values()]).toEqual([{ count: 2, retry: true }, { count: 3, retry: false }])
  })

  it('collapses runs of one tool only when asked, and expands one run on its own', () => {
    const flow = steps([
      event('user_message', 0),
      ...[1, 2, 3, 4].flatMap(ts => [event('api_call', ts), bash(ts, `git log -${ts}`)]),
      event('api_call', 5), event('tool_use', 5, { to: 'Read', target: 'a' }),
    ])
    const rows = rowsOf(flow)
    const collapsed = collapseRuns(rows, new Set())
    expect(collapsed.map(row => row.type)).toEqual(['step', 'run', 'step'])
    const run = collapsed[1]
    expect(run.type === 'run' && [run.title, run.steps.length]).toEqual(['git ×4', 4])
    expect(collapseRuns(rows, new Set([run.id])).map(row => row.type)).toEqual(['step', 'run', 'step', 'step', 'step', 'step', 'step'])
    expect(collapseRuns(rows, new Set(), 5).map(row => row.type)).toEqual(rows.map(row => row.type))
  })

  it('places rows at fixed heights without measuring them, and finds the rows in view', () => {
    const flow = steps([event('api_call', 0), event('api_call', 1), event('user_message', 1 + GAP_S + 10)])
    const rows = rowsOf(flow)
    expect(rows.map(row => row.type)).toEqual(['step', 'step', 'gap', 'step'])
    const offsets = rowOffsets(rows)
    expect(offsets).toEqual([0, ROW_PX.step, 2 * ROW_PX.step, 2 * ROW_PX.step + ROW_PX.gap, 3 * ROW_PX.step + ROW_PX.gap])
    // The same rows give the same offsets: nothing depends on what was drawn before.
    expect(rowOffsets(rows)).toEqual(offsets)
    expect(rowRange(offsets, 0, ROW_PX.step)).toEqual([0, 0])
    expect(rowRange(offsets, ROW_PX.step, ROW_PX.step + ROW_PX.gap)).toEqual([1, 2])
    expect(rowRange(offsets, 0, 10_000, 2)).toEqual([0, 3])
    expect(rowRange([0], 0, 100)).toEqual([0, -1])
    const many = rowOffsets(Array.from({ length: 20_000 }, () => ({ type: 'step' as const })))
    expect(rowRange(many, 240_000, 480, 3)).toEqual([9997, 10_022])
  })

  it('counts calls by kind of work for the colour key', () => {
    const flow = steps([event('api_call', 1), bash(1, 'ls'), event('tool_use', 1, { to: 'Read' }), event('api_call', 2), bash(2, 'pwd')])
    expect(workCounts(flow)).toEqual([{ work: 'model', count: 2 }, { work: 'run', count: 2 }, { work: 'read', count: 1 }])
  })
})
