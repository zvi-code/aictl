// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { DetailAgent } from '../../src/data/contract.gen'
import Otel from '../../src/drawer/tabs/Otel'
import { cell, harness } from './drawer_harness'
import { bodyRows, installDom, layoutHeaders, mount } from './dom'

beforeEach(() => { installDom(); layoutHeaders() })

const HASH = '36f6aa30aaaabbbbccccddddeeeeffff00001111222233334444555566667777'
const detail = (lifecycle: object[], extra: object = {}) => ({
  sources: { session_file: 54, otel_spans: 27, otel_span_events: 65, otel_last_ts: 1000, hooks: 0, hooks_last_ts: null },
  otel: { spans: { count: 27 }, span_events: { count: 65 }, logs: { count: 0 }, calls: [], totals: { calls: 0 }, mcp_lifecycle: lifecycle,
    in_context: { skills: [], custom_agents: [], mcp_servers: [{ hash: HASH, name: null, state: 'initialized' }] }, ...extra },
}) as unknown as Partial<DetailAgent>
const stat = (host: Element, label: string) => Array.from(host.querySelectorAll('dl')).find(dl => dl.querySelector('dt')?.textContent === label)?.textContent?.slice(label.length)

describe('OTEL-UI · OTel tab', () => {
  it('says what a server hash is, and shows it in the lifecycle rows instead of "Not available"', () => {
    const lifecycle = [{ ts: 1, state: 'discovered', hash: HASH, name: null, source: 'plugin' }]
    const { tab } = harness({}, { detail: detail(lifecycle) })
    const { host, dispose } = mount(() => <Otel {...tab} />)
    expect(host.textContent).toContain('server id hash 36f6aa30')
    expect(host.textContent).not.toContain('Server 36f6aa30')
    const row = bodyRows(host).find(item => cell(item, 'hash'))!
    expect(cell(row, 'hash')?.textContent).toBe(HASH)
    expect(cell(row, 'state')?.textContent).toBe('discovered')
    expect(host.querySelector('th[data-col="name"]')).toBeNull()
    dispose()
  })

  it('shows the name column when a span carries a name', () => {
    const { tab } = harness({}, { detail: detail([{ ts: 1, state: 'initialized', hash: HASH, name: 'computer-use', source: 'plugin' }]) })
    const { host, dispose } = mount(() => <Otel {...tab} />)
    expect(host.querySelector('th[data-col="name"]')).not.toBeNull()
    dispose()
  })

  it('labels the counts by what they count', () => {
    const { tab } = harness({}, { detail: detail([]) })
    const { host, dispose } = mount(() => <Otel {...tab} />)
    expect(stat(host, 'aictl hook events')).toContain('0')
    expect(host.textContent).not.toMatch(/Hooks0/)
    expect(stat(host, 'Session file rows')).toContain('54')
    expect(stat(host, 'Session file rows')).toContain('model calls, tool calls and prompts')
    dispose()
  })
})
