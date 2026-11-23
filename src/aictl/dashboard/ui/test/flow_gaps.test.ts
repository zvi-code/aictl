import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { FlowEvent } from '../src/data/contract.gen'
import { flowModel } from '../src/drawer/flowModel'
import { GAP_S, rowsOf, stepsOf } from '../src/drawer/flowSteps'

const event = (type: string, ts: number, extra: Partial<FlowEvent> = {}): FlowEvent =>
  ({ type, ts, source: 'store', rt_tokens: null, cum_tokens: null, ...extra })
const rows = (events: FlowEvent[]) => rowsOf(stepsOf(flowModel(events).events))

describe('DRW-FL-07 · One rule for the pauses between steps', () => {
  // Copilot CLI: prompt 5 ran from 08:42 to 14:44 (its end is the end of the turn), and nothing happened from 11:43 to 14:44.
  const turn = [
    event('user_message', 1000, { step: 1, end_ts: 1000 + 10910 }),
    event('api_call', 1010, { step: 2, duration_ms: 2000 }),
    event('tool_use', 1012, { step: 2, to: 'task_complete', duration_ms: 4 }),
    event('context_update', 1000 + 10910, { step: 3, name: 'snapshot', phase: 'shutdown' }),
  ]

  it('shows a pause inside a turn although the prompt of the turn is recorded as ending at the end of the turn', () => {
    const list = rows(turn)
    expect(list.map(row => row.type)).toEqual(['step', 'step', 'gap', 'step'])
    const gap = list[2]
    expect(gap.type === 'gap' && Math.round(gap.seconds)).toBe(10910 - 12)
  })

  it('shows every pause longer than the limit and none shorter, whatever the kind of the step before it', () => {
    const list = rows([
      event('user_message', 0, { end_ts: 5000 }), event('api_call', 1), event('api_call', 1 + GAP_S + 1), event('api_call', 1 + GAP_S + 1 + GAP_S),
    ])
    expect(list.map(row => row.type)).toEqual(['step', 'step', 'gap', 'step', 'step'])
  })
})

describe('DRW-FL-08 · Rows of the chart stay in the visible part when it scrolls sideways', () => {
  const css = readFileSync(new URL('../src/drawer/flow.module.css', import.meta.url), 'utf8')
  it.each(['gap', 'spanRow'])('keeps the %s row at the left edge of the scroll box, as wide as the box', name => {
    const rule = new RegExp(`\\.chartItem > \\.${name}[,\\s][^{]*\\{([^}]*)\\}`).exec(css)?.[1] ?? ''
    expect(rule).toContain('position: sticky')
    expect(rule).toContain('inline-size: min(100%, 100cqi)')
  })
})
