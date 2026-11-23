// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { DetailAgent } from '../../src/data/contract.gen'
import { modelCalls, TOKENS_IO, TOKENS_WITH_CACHE, tokensInOut, tokensWithCache } from '../../src/drawer/figures'
import { Rows, type TabProps } from '../../src/drawer/shared'
import Overview from '../../src/drawer/tabs/Overview'
import type { DrawerProps } from '../../src/shell/drawerTypes'
import { bodyRows, installDom, layoutHeaders, mount } from './dom'

const cells = (row: Element) => Array.from(row.querySelectorAll('td')).map(td => td.textContent)

beforeEach(() => { installDom(); layoutHeaders() })

describe('DRW-OV-01 · Figures with a unit are shown in it', () => {
  it('shows a cost as money and a time in milliseconds as a duration, whatever the table', () => {
    const rows = [{ id: 'a', cost_usd: 0.196315, wait_ms: 15733 }, { id: 'b', cost_usd: 0.699522, wait_ms: 480 }, { id: 'c', cost_usd: null, wait_ms: null }]
    const { host, dispose } = mount(() => <Rows label="T" rows={rows} identity={['id']} columns={['id', 'cost_usd', 'wait_ms']} />)
    expect(Array.from(host.querySelectorAll('thead th')).map(th => th.textContent?.replace(/\s*↕$/, '').trim())).toEqual(['Id', 'Cost (USD)', 'Wait'])
    expect(bodyRows(host).map(cells)).toEqual([
      ['a', '$0.20', '15.7 s'], ['b', '$0.70', '480 ms'], ['c', 'Not available from this source', 'Not available from this source']])
    dispose()
  })
})

describe('DRW-OV-02 · Figures on one scope are named for it', () => {
  it('names the two token figures for what they count', () => {
    const usage = { input: 291481, output: 3392, cache_read: 936392, cache_write: 34863 }
    expect([TOKENS_IO, tokensInOut(usage)]).toEqual(['Tokens in+out', 294873])
    expect([TOKENS_WITH_CACHE, tokensWithCache(usage)]).toEqual(['Tokens incl. cache', 1266128])
    expect(tokensInOut({})).toBeUndefined()
  })

  it('counts the model calls of the main agent and its subagents, and says how many the main agent made', () => {
    expect(modelCalls({ msgs: { assistant: 21 }, includes_subagents: true }, 18)).toEqual({ label: 'Model calls', value: 21, detail: '18 by the main agent' })
    expect(modelCalls({ msgs: { assistant: 18 }, includes_subagents: false }, 18)).toEqual({ label: 'Model calls', value: 18, detail: undefined })
    expect(modelCalls(undefined, undefined)).toEqual({ label: 'Model calls', value: undefined })
  })
})

describe('DRW-OV-03 · The Overview tab', () => {
  const detail = {
    agent: { id: 's', started_at: 1000, last_activity_at: 1000 + 16476, ended_at: 1000 + 99999, status: 'idle', includes_subagents: true,
      input: 291481, output: 3392, cache_read: 936392, cache_write: 34863, cost_usd: 0.895837, tool_calls: 25, failures: 1,
      msgs: { user: 7, assistant: 21, tool: 25 } },
    context: { calls: 18, series: [] }, by_model: [
      { model: 'claude-opus-5.5', msgs: 3, input: 8, output: 414, cache_read: 68444, cache_write: 34863, cost_usd: 0.196315 },
      { model: 'gemini-4-argon', msgs: 18, input: 291473, output: 2978, cache_read: 867948, cache_write: 0, cost_usd: 0.699522 }],
    turns: [], errors: [], subagents: [], skills: [], runs: [], loop: null, tool_calls: [], tool_totals: [],
  } as unknown as DetailAgent
  const tab = { shell: { ctx: { copy() {}, scope: () => 'local', nodeId: () => null, detail: () => Object.assign(() => undefined, { retry() {} }) } } as unknown as DrawerProps,
    entry: { type: 'agent', id: 's', tab: 'overview' }, detail: Object.assign(() => ({ data: detail, status: 'ready', error: null }), { retry() {} }),
    agent: () => detail.agent, runtime: () => undefined, session: () => 's' } as unknown as TabProps

  it('shows the cost of each model in dollars, one scope for the model calls and a name for each token figure', () => {
    const { host, dispose } = mount(() => <Overview {...tab} />)
    const text = host.textContent!
    const usage = Array.from(host.querySelectorAll('section')).find(section => section.querySelector('h3')?.textContent === 'Usage by model')!
    expect(bodyRows(usage).map(cells).map(row => [row[0], row.at(-1)])).toEqual([['claude-opus-5.5', '$0.20'], ['gemini-4-argon', '$0.70']])
    expect(text).toContain('Tokens in+out')
    expect(text).toContain('Tokens incl. cache')
    expect(text).toMatch(/Model calls\s*21/)
    expect(text).toContain('18 by the main agent')
    // The span is first to last recorded activity (4 h 34 min), not the process exit time.
    expect(text).toContain('4 h 35 min')
    dispose()
  })
})
