// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flush, type Accessor } from 'solid-js'
import type { PanelContext } from '../../src/panels/types'
import type { DrawerProps } from '../../src/shell/drawerTypes'
import { installDom, mount } from './dom'

vi.mock('../../src/drawer/tabs/Flow', () => ({ default: () => <p>flow body</p> }))
const { default: DrawerView } = await import('../../src/drawer/DrawerView')

const ID = '1f4c8ec7-7a9a-44a9-b1b5-056b06402d35'
// A Copilot CLI session: first event 08:10:49Z, last 12:45:26Z, a process started 1 h 37 min before the end.
const detail = {
  agent: { id: ID, title: 'aictl-test-session', status: 'idle', tool: 'copilot-cli', project: '/work/aictl', models: ['gemini-4-argon'],
    started_at: 1795421449.764, ended_at: null, last_activity_at: 1795437926.225, tool_calls: 25 },
  turns: new Array(7).fill({}), tool_calls: new Array(25).fill({}), errors: [{}], loop: null, checkpoints: [], context_files: { loaded: [] },
}

/** A drawer shell that answers each detail route from `routes` and records what it was asked. */
function harness(tab: string, observations = 0) {
  const asked: string[] = []
  const ctx = {
    scope: () => 'local', nodeId: () => null, stopped: () => false, copy() {}, stopAgent() {},
    board: (name: string) => name === 'agents' ? [] : name === 'tool_labels' ? { 'copilot-cli': 'Copilot CLI' } : undefined,
    client: { store: { topic: (name: string) => name === 'configuration.loaded' && observations
      ? new Map([['x', { data: { native_session_id: ID, session_id: ID, effective_known: true, unknown: [],
        evidence: Array.from({ length: observations }, (_, index) => ({ key: `k${index}`, source: 'usage', value: 'v', observed_at: 1795437926 })) } }]])
      : undefined, meta: { capabilities: { topics: {} } } }, status: { error: null, connected: true }, resync() {} },
    detail: <T,>(target: Accessor<string | undefined>) => {
      const read = () => {
        const value = target()
        if (!value) return undefined
        if (!asked.includes(value)) asked.push(value)
        return { data: detail as T, status: 'ready' as const, error: null }
      }
      return Object.assign(read, { retry: () => {} })
    },
  } as unknown as PanelContext
  const shell = { ctx, stack: [{ type: 'agent', id: ID, tab }], open() {}, back() {}, close() {}, changeTab() {} } as unknown as DrawerProps
  return { asked, shell }
}

beforeEach(() => { installDom() })

describe('DRW-HDR-03 · The header does not depend on the tab', () => {
  it('reads the agent detail for a deep link to Flow and fills the header and the tab counts on first render', async () => {
    const { asked, shell } = harness('flow')
    const { host, dispose } = mount(() => <DrawerView {...shell} />)
    await new Promise(resolve => setTimeout(resolve, 0)); flush()
    expect(asked).toEqual([`/api/board/agent?id=${ID}`])
    const header = host.querySelector('aside')!.textContent!
    expect(header).toContain('aictl-test-session')
    expect(header).toContain('Copilot CLI')
    expect(header).toContain('gemini-4-argon')
    expect(header).toContain('aictl')
    const counts = Object.fromEntries(Array.from(host.querySelectorAll('[role=tab]')).map(tab =>
      [tab.getAttribute('aria-label'), tab.querySelector('span')?.textContent]))
    expect(counts).toMatchObject({ Turns: '7', 'Tool calls': '25', 'Failures and loops': '1' })
    dispose()
  })

  it('shows the session span from its own first and last activity, with the total, and no process exit time', async () => {
    const { shell } = harness('flow')
    const { host, dispose } = mount(() => <DrawerView {...shell} />)
    await new Promise(resolve => setTimeout(resolve, 0)); flush()
    const text = host.querySelector('aside')!.textContent!
    expect(text).toContain('→')
    expect(text).toContain('4 h 35 min')
    expect(text).not.toMatch(/Ended /)
    dispose()
  })

  it('counts the observations of the runtime settings in the singular and the plural', async () => {
    for (const [observations, word] of [[1, 'observation'], [2, 'observations']] as const) {
      const { shell } = harness('flow', observations)
      const { host, dispose } = mount(() => <DrawerView {...shell} />)
      await new Promise(resolve => setTimeout(resolve, 0)); flush()
      expect(host.querySelector('summary')?.textContent).toBe(`Effective runtime settings · ${observations} ${word}`)
      dispose()
    }
  })
})
