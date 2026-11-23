import { describe, expect, it } from 'vitest'
import type { FlowEvent } from '../src/data/contract.gen'
import { eventIdentity, flowModel } from '../src/drawer/flowModel'
import { stepsOf, totalsOf } from '../src/drawer/flowSteps'

const event = (type: string, ts: number, extra: Partial<FlowEvent> = {}): FlowEvent =>
  ({ type, ts, source: 'store', rt_tokens: null, cum_tokens: null, ...extra })
const tokens = (input: number, output: number) => ({ input, output, cache_read: 0, cache_creation: 0 })
const totals = (events: FlowEvent[]) => totalsOf(stepsOf(flowModel(events).events))

describe('DRW-FL-05 · One counting rule for the totals of a flow', () => {
  // The shape of a Copilot session whose subagent could not start: the task call failed, then the subagent row and its end.
  const failedTask = () => [
    event('user_message', 1, { step: 1 }),
    event('api_call', 2, { step: 2, tokens: tokens(10, 5), request_n: 1 }),
    event('tool_use', 2.1, { step: 2, to: 'task', success: false, target: 'Check if OTel is enabled' }),
    event('subagent', 2.11, { step: 3, to: 'task', agent_id: 'a1' }),
    event('subagent_end', 2.2, { step: 4, agent_id: 'a1', is_error: true, outcome: 'failed', completed: false }),
    event('tool_use', 3, { step: 5, to: 'view', target: '/a', params: '{"path":"/a"}' }),
    event('tool_use', 3, { step: 5, to: 'view', target: '/b', params: '{"path":"/b"}' }),
  ]

  it('counts a failed subagent task once: the failed call, not also the end of the subagent it never started', () => {
    expect(totals(failedTask()).failures).toBe(1)
  })

  it('still counts a failed request, a failed tool call and an error event', () => {
    expect(totals([
      event('api_call', 1, { is_error: true }), event('tool_use', 2, { to: 'Bash', success: false }), event('error', 3, { error_type: 'x' }),
      event('tool_use', 4, { to: 'Bash', is_error: true }),
    ]).failures).toBe(4)
  })

  it('keeps two parallel calls of one tool in the same instant apart', () => {
    const calls = failedTask().filter(item => item.type === 'tool_use' && item.to === 'view')
    expect(new Set(calls.map(eventIdentity)).size).toBe(2)
  })
})
