// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { DetailAgent } from '../../src/data/contract.gen'
import type { TabProps } from '../../src/drawer/shared'
import Turns from '../../src/drawer/tabs/Turns'
import { numberedTurns } from '../../src/drawer/turnModel'
import type { DrawerProps } from '../../src/shell/drawerTypes'
import { bodyRows, installDom, layoutHeaders, mount } from './dom'

const cells = (row: Element) => Array.from(row.querySelectorAll('td')).map(td => td.textContent)
const heads = (host: Element) => Array.from(host.querySelectorAll('thead th')).map(th => th.textContent?.replace(/\s*↕$/, '').trim())

const base = new Date(2026, 10, 16, 14, 51, 0).getTime() / 1000
const long = 'answering your 4 questions: for now, either the database takes care of writing to a new location, or we use fork so the freeze happens on the source'
const turn = (extra: object) => ({ ts: base, text: 'prompt', tools: 3, model: 'gemini-4-argon', input: 4833, output: 582, cache_read: 142453, cache_write: 0,
  cost_usd: 0.029731, subagent_calls: 0, reply_ms: 15733, ...extra })
const detail = { agent: { id: 's', msgs: { user: 7 } }, turns: [turn({ ts: base + 40, text: long, cost_usd: 8.744495, subagent_calls: 155, reply_ms: 2468517 }),
  turn({ ts: base + 20, reply_ms: null, cost_usd: null })] } as unknown as DetailAgent
const props = (data: DetailAgent) => ({ shell: { ctx: { copy() {}, scope: () => 'local', nodeId: () => null } } as unknown as DrawerProps,
  entry: { type: 'agent', id: 's', tab: 'turns' }, detail: Object.assign(() => ({ data, status: 'ready' as const, error: null }), { retry() {} }),
  agent: () => data.agent, runtime: () => undefined, session: () => 's' } as unknown as TabProps)

beforeEach(() => { installDom(); layoutHeaders() })

describe('DRW-TN-01 · The Turns tab', () => {
  it('numbers the turns, counted back from the total of the session when only the newest are listed', () => {
    expect(numberedTurns([{}, {}], 7)?.map(row => row.n)).toEqual([7, 6])
    expect(numberedTurns([{}, {}], undefined)?.map(row => row.n)).toEqual([2, 1])
    expect(numberedTurns(null, 3)).toBeUndefined()
  })

  it('shows the turn number, the time to the second, the reply time as a duration and the subagent calls', () => {
    const { host, dispose } = mount(() => <Turns {...props(detail)} />)
    expect(heads(host).slice(0, 7)).toEqual(['Turn', 'Time', 'Prompt', 'Model', 'Reply time', 'Subagent calls', 'Tool calls'])
    const rows = bodyRows(host).map(cells)
    expect(rows[0].slice(0, 2)[0]).toBe('7')
    expect(rows[0][1]).toMatch(/:40$/)
    expect(rows[0].slice(3, 6)).toEqual(['gemini-4-argon', '41 min', '155'])
    expect(rows[1].at(-1)).toBe('n/aNot available from this source')
    expect(rows[1][4]).toBe('n/aNot available from this source')
    expect(rows[0].at(-1)).toBe('$8.74')
    dispose()
  })

  it('gives the whole prompt and the whole model name on hover', () => {
    const { host, dispose } = mount(() => <Turns {...props(detail)} />)
    const first = bodyRows(host)[0]
    expect(first.querySelector('td[data-col="text"]')?.getAttribute('title')).toBe(long)
    expect(first.querySelector('td[data-col="model"]')?.getAttribute('title')).toBe('gemini-4-argon')
    dispose()
  })
})
