// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { flush } from 'solid-js'
import type { DetailAgent, FlowEvent } from '../../src/data/contract.gen'
import { matchesReference } from '../../src/drawer/flowSteps'
import type { TabProps } from '../../src/drawer/shared'
import Errors from '../../src/drawer/tabs/Errors'
import type { DrawerEntry, DrawerProps } from '../../src/shell/drawerTypes'
import { bodyRows, installDom, layoutHeaders, mount } from './dom'

const cells = (row: Element) => Array.from(row.querySelectorAll('td')).map(td => td.textContent)
const base = new Date(2026, 10, 16, 14, 51, 0).getTime() / 1000

const detail = { errors: [
  { ts: base + 5, key: 'tool:task:Model "claude-opus-#" is not available.', detail: 'Model "claude-opus-5" is not available.' },
  { ts: base + 2, key: 'api:invalid_request:', detail: 'invalid_request' },
  { ts: base + 1, key: 'tool:mcp__db__query:Timeout after #s', detail: 'Timeout after 30s' }], loop: null } as unknown as DetailAgent

function harness() {
  const opened: DrawerEntry[] = []
  const tab = { shell: { ctx: { copy() {}, scope: () => 'local', nodeId: () => null }, open: (entry: DrawerEntry) => opened.push(entry), changeTab() {} } as unknown as DrawerProps,
    entry: { type: 'agent', id: 's', tab: 'errors' }, detail: Object.assign(() => ({ data: detail, status: 'ready' as const, error: null }), { retry() {} }),
    agent: () => undefined, runtime: () => undefined, session: () => 's' } as unknown as TabProps
  return { opened, tab }
}

beforeEach(() => { installDom(); layoutHeaders() })

describe('DRW-ER-01 · The Failures tab', () => {
  it('shows the tool and the message as text, and keeps the grouping key out of sight', () => {
    const { tab } = harness()
    const { host, dispose } = mount(() => <Errors {...tab} />)
    const rows = bodyRows(host).map(cells)
    expect(rows.map(row => row.slice(1))).toEqual([['task', 'Model "claude-opus-5" is not available.'], ['Model request', 'invalid_request'],
      ['db › query', 'Timeout after 30s']])
    expect(host.textContent).not.toMatch(/tool:|api:|#/)
    dispose()
  })

  it('opens the Flow step of a failure from its time, and the group of failures from its message', () => {
    const { opened, tab } = harness()
    const { host, dispose } = mount(() => <Errors {...tab} />)
    const first = bodyRows(host)[0]
    first.querySelector<HTMLButtonElement>('td[data-col="ts"] button')!.click(); flush()
    first.querySelector<HTMLButtonElement>('td[data-col="message"] button')!.click(); flush()
    expect(opened).toEqual([
      { type: 'agent', id: 's', tab: 'flow', failedAt: base + 5 },
      { type: 'error', key: 'tool:task:Model "claude-opus-#" is not available.' }])
    dispose()
  })
})

describe('DRW-ER-02 · A failure time names a Flow event', () => {
  const event = (type: string, ts: number, extra: Partial<FlowEvent> = {}): FlowEvent => ({ type, ts, source: 'store', rt_tokens: null, cum_tokens: null, ...extra })
  const ref = { field: 'failed_at', id: String(base + 5) }
  it('matches the failed call at that time, not a successful call or the end of a subagent at the same second', () => {
    expect(matchesReference(event('tool_use', base + 5.0004, { success: false }), ref)).toBe(true)
    expect(matchesReference(event('tool_use', base + 5, { success: true }), ref)).toBe(false)
    expect(matchesReference(event('subagent_end', base + 5, { is_error: true }), ref)).toBe(false)
    expect(matchesReference(event('tool_use', base + 6, { success: false }), ref)).toBe(false)
  })
  it('still matches an event by a plain reference field', () => {
    expect(matchesReference(event('tool_use', 1, { tool_call_id: 'tc1' }), { field: 'tool_call_id', id: 'tc1' })).toBe(true)
    expect(matchesReference(event('tool_use', 1, { tool_call_id: 'tc2' }), { field: 'tool_call_id', id: 'tc1' })).toBe(false)
  })
})
