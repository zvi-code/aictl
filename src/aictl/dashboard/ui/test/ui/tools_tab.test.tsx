// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { DetailAgent } from '../../src/data/contract.gen'
import type { TabProps } from '../../src/drawer/shared'
import Tools from '../../src/drawer/tabs/Tools'
import type { DrawerProps } from '../../src/shell/drawerTypes'
import { bodyRows, installDom, layoutHeaders, mount } from './dom'

const cells = (row: Element) => Array.from(row.querySelectorAll('td')).map(td => td.textContent)
const heads = (host: Element) => Array.from(host.querySelectorAll('thead th')).map(th => th.textContent?.replace(/\s*↕$/, '').trim())
const section = (host: Element, title: string) => Array.from(host.querySelectorAll('section'))
  .find(item => item.querySelector('h3')?.textContent?.startsWith(title))!

const base = new Date(2026, 10, 16, 14, 51, 0).getTime() / 1000
const call = (extra: object) => ({ ts: base, name: 'Bash', target: 'ls', duration_ms: 121.99, failed: false, confirm: 'auto', input_bytes: 2221, output_bytes: 163,
  agent_id: 's', agent: 'Main agent', ...extra })
const detail = {
  agent: { id: 's', tool_calls: 833 },
  tool_calls: [call({ ts: base + 7 }), call({ ts: base + 8, agent_id: 's/a1', agent: 'Explore: map the allocator', duration_ms: 19000 }),
    call({ ts: base + 9, agent_id: 's/a2', agent: null, name: 'mcp__db__query' })],
  tool_totals: [
    { name: 'Bash', mcp_server: null, calls: 583, failed: 13, total_ms: 848488, p50_ms: 484, p95_ms: 19000, max_ms: 1, input_bytes: 345314,
      output_bytes: 1698668, avg_input_bytes: 1, avg_output_bytes: 1, max_output_bytes: 1 },
    { name: 'mcp__db__query', mcp_server: 'db', calls: 2, failed: 0, total_ms: 40, p50_ms: 20, p95_ms: 20, max_ms: 20, input_bytes: 10,
      output_bytes: 20, avg_input_bytes: 5, avg_output_bytes: 10, max_output_bytes: 20 }],
} as unknown as DetailAgent
const tab = { shell: { ctx: { copy() {}, scope: () => 'local', nodeId: () => null } } as unknown as DrawerProps,
  entry: { type: 'agent', id: 's', tab: 'tools' }, detail: Object.assign(() => ({ data: detail, status: 'ready', error: null }), { retry() {} }),
  agent: () => detail.agent, runtime: () => undefined, session: () => 's' } as unknown as TabProps

beforeEach(() => { installDom(); layoutHeaders() })

describe('DRW-TL-01 · The Tool calls tab', () => {
  it('names the agent of each call, shows times to the second and says how many calls are shown of the total', () => {
    const { host, dispose } = mount(() => <Tools {...tab} />)
    const calls = section(host, 'Individual calls')
    expect(calls.querySelector('h3')?.textContent).toBe('Individual calls · newest 3 of 833 shown')
    expect(heads(calls).slice(0, 4)).toEqual(['Time', 'Agent', 'Name', 'Target'])
    const rows = bodyRows(calls).map(cells)
    expect(rows.map(row => row.slice(0, 2))).toEqual([
      [expect.stringMatching(/:07$/), 'Main agent'], [expect.stringMatching(/:08$/), 'Explore: map the allocator'],
      [expect.stringMatching(/:09$/), 'n/aNot available from this source']])
    // The id of the agent is on hover.
    expect(bodyRows(calls)[1].querySelector('td[data-col="agent"]')?.getAttribute('title')).toBe('s/a1')
    dispose()
  })

  it('shows durations as durations and sizes as sizes', () => {
    const { host, dispose } = mount(() => <Tools {...tab} />)
    const bash = bodyRows(section(host, 'Tool calls')).map(cells).find(row => row[0] === 'Bash')!
    expect(bash.slice(0, 7)).toEqual(['Bash', 'built-in', '583', '13', '484 ms', '19 s', '345 KB'])
    expect(cells(bodyRows(host).find(row => row.textContent?.startsWith('mcp__db__query') && row.textContent.includes('db'))!)[1]).toBe('db')
    const individual = bodyRows(section(host, 'Individual calls')).map(cells)
    expect(individual[1][4]).toBe('19 s')
    dispose()
  })

  it('does not claim a cap when every call is listed', () => {
    const all = { ...detail, agent: { id: 's', tool_calls: 3 } } as unknown as DetailAgent
    const { host, dispose } = mount(() => <Tools {...tab} detail={Object.assign(() => ({ data: all, status: 'ready' as const, error: null }), { retry() {} })} />)
    expect(section(host, 'Individual calls').querySelector('h3')?.textContent).toBe('Individual calls')
    dispose()
  })
})
