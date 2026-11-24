// @vitest-environment jsdom
import { flush } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'
import type { DetailAgentFlow, FlowEvent } from '../../src/data/contract.gen'
import { StepInspector } from '../../src/drawer/FlowParts'
import { flowModel } from '../../src/drawer/flowModel'
import { readDownTo } from '../../src/drawer/flowPages'
import { stepsOf } from '../../src/drawer/flowSteps'
import { ThinkingBlocks } from '../../src/drawer/ThinkingBlocks'
import { harness } from './drawer_harness'
import { installDom, mount } from './dom'

beforeEach(() => { installDom() })

const event = (type: string, ts: number, extra: Partial<FlowEvent> = {}): FlowEvent =>
  ({ type, ts, source: 'store', rt_tokens: null, cum_tokens: null, ...extra })
const block = (index: number, text: string) => ({
  thinking_key: `k${index}`, request_key: 'r', ts: 1700000000, agent_id: '', model: 'm', turn_index: 1, block_index: index,
  chars: text.length, tool: 'claude-code', text, text_state: text ? 'kept' : 'not_kept',
})

function inspect(call: Partial<FlowEvent>, blocks: ReturnType<typeof block>[]) {
  const { asked, shell } = harness({ '/api/board/thinking': () => ({ ts: 1700000000.5, agent_id: '', blocks }) })
  const steps = stepsOf(flowModel([event('api_call', 1700000000.5, { model: 'm', ...call })]).events)
  const view = mount(() => <StepInspector step={steps[0]} close={() => {}}
    thinking={c => <ThinkingBlocks ctx={shell.ctx} session="sess-1" call={c} />} />)
  return { asked, ...view }
}

describe('THINK-PANEL · the thinking text of a model call in the step inspector', () => {
  it('reads and shows the blocks of a call that reported thinking, under Model request', () => {
    const { asked, host, dispose } = inspect({ thinking_chars: 20, agent_id: 'sub-1' }, [block(0, 'first invented block'), block(1, '')])
    const headings = [...host.querySelectorAll('h4')].map(h => h.textContent)
    expect(headings.slice(0, 2)).toEqual(['Model request', 'Thinking'])
    expect(asked).toEqual(['/api/board/thinking?session_id=sess-1&ts=1700000000.5&agent=sub-1'])
    expect(host.textContent).toContain('Block 1 of 2 · 20 characters')
    expect(host.textContent).toContain('first invented block')
    expect(host.textContent).toContain('Text not kept: this node does not keep text (0 characters reported).')
    dispose()
  })

  it('offers a closed lookup for a call that reported none, and reads only when it is opened', () => {
    const { asked, host, dispose } = inspect({}, [block(0, 'stored without a reported size')])
    expect(asked).toEqual([])
    const details = [...host.querySelectorAll('details')].find(d => d.textContent?.startsWith('Look up thinking text'))!
    expect(details).toBeTruthy()
    details.open = true
    details.dispatchEvent(new Event('toggle'))
    flush()
    expect(asked).toEqual(['/api/board/thinking?session_id=sess-1&ts=1700000000.5'])
    expect(host.textContent).toContain('stored without a reported size')
    dispose()
  })
})

describe('THINK-LINK · a search result opens the flow at its model call', () => {
  const answer = (at_offset: number | null, flow_epoch = 'e1') => ({ summary: { at_offset, flow_epoch } }) as unknown as DetailAgentFlow

  it('reads down to the position the server states for the call, in one go', async () => {
    const asked: number[] = []
    const done = await readDownTo('e1', () => Promise.resolve(answer(-4321)), target => { asked.push(target); return Promise.resolve() })
    expect(done).toBe(true)
    expect(asked).toEqual([-4321])
  })

  it('uses no position of another epoch, none when the call is unknown, and none after a failed read', async () => {
    const asked: number[] = []
    const load = (target: number) => { asked.push(target); return Promise.resolve() }
    expect(await readDownTo('e1', () => Promise.resolve(answer(-10, 'e2')), load)).toBe(false)
    expect(await readDownTo('e1', () => Promise.resolve(answer(null)), load)).toBe(false)
    expect(await readDownTo('e1', () => Promise.reject(new Error('down')), load)).toBe(false)
    expect(asked).toEqual([])
  })
})
