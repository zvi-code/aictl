// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { metric, overviewB } from '../../src/panels/overview/b'
import { Processes, Traffic } from '../../src/panels/overview/b/Machine'
import { displayField } from '../../src/panels/overview/b/View'
import type { PanelContext, PanelDef, PanelProps } from '../../src/panels/types'
import { installDom, layoutHeaders, mount } from './dom'

const units: Record<string, { unit: string }> = {
  'procs.tool.cpu_pct': { unit: 'percent' }, 'procs.tool.mem_rss': { unit: 'bytes' },
  'events.tool.live.inbound_rate_bps': { unit: 'rate_bps' }, 'events.tool.live.outbound_rate_bps': { unit: 'rate_bps' },
  'self.memory_rss': { unit: 'bytes' }, 'self.uptime': { unit: 'seconds' }, 'self.cpu_percent': { unit: 'percent' },
}

/** A board context in the given scope whose detail routes answer from `routes` by path prefix. */
export function boardContext(scope: 'local' | 'fleet', routes: Record<string, unknown>, board: Record<string, unknown> = {}) {
  const openAgent = vi.fn()
  const detail = (path: () => string | undefined) => Object.assign(() => {
    const key = path()
    const match = key && Object.keys(routes).find(prefix => key.startsWith(prefix))
    return match ? { data: routes[match], status: 'ready' as const, error: null } : undefined
  }, { retry() {} })
  const ctx = {
    scope: () => scope, nodeId: () => null, tools: () => null, paused: () => false, revision: () => 0,
    filters: () => ({ project: 'all' }), refresh() {}, copy() {}, navigate() {}, openAgent, openDetail() {},
    metadata: (key: string) => units[key], board: (key: string) => board[key], detail,
    read: () => ({ state: 'unavailable' }), stopped: () => false,
  } as unknown as PanelContext
  return { ctx, openAgent }
}

const def = (id: string) => overviewB.find(panel => panel.id === id) as PanelDef
const node = 'win-01'
const runtimeNodes = {
  scope: 'fleet', view: 'runtime', generated_at: 1, read_only: true, fleet_available: true, local_node: {},
  rows: [
    { node_id: node, captured_at: 1000, status: 'reported', agents: { captured_at: 1000, total: 2, rows: [
      { session_id: 'copilot-desktop:90300:1795352502.287', native_session_id: null, tool: 'copilot-desktop', status: 'idle',
        running: true, cpu_percent: 3.5, mem_mb: 512, started_at: 900 },
      { session_id: 'aaaa-bbbb', native_session_id: 'aaaa-bbbb', tool: 'copilot-cli', status: 'running',
        running: true, cpu_percent: 12, mem_mb: 256, started_at: 950 },
    ] } },
    { node_id: 'old-node', captured_at: 1000, status: 'reported', agents: null },
  ],
}
const machine = {
  generated_at: 1, recorded_total: 3, node_scope: { kind: 'fleet', node_id: null }, hosts: [],
  recorded_processes: [
    { node_id: node, session_id: JSON.stringify([node, 'aaaa-bbbb']), pid: 4100, tool: 'copilot-cli', role: 'lead', joined_at: 1 },
    { node_id: node, session_id: JSON.stringify([node, 'aaaa-bbbb']), pid: 4101, tool: 'copilot-cli', role: 'lead', joined_at: 2 },
    { node_id: node, session_id: JSON.stringify([node, 'gone']), pid: 9, tool: 'copilot-cli', role: 'lead', joined_at: 3 },
  ],
}
const agents = [{ id: JSON.stringify([node, 'aaaa-bbbb']), session_id: JSON.stringify([node, 'aaaa-bbbb']), node_id: node,
  native_session_id: 'aaaa-bbbb', title: 'Fix the build', tool: 'copilot-cli', status: 'running' }]

beforeEach(() => { installDom(); layoutHeaders() })

describe('BOARD-MACHINE-01 · Processes in fleet scope lists the sessions each node runs now', () => {
  it('names each session as the board does, never as a raw id array, and opens it', () => {
    const { ctx, openAgent } = boardContext('fleet', { '/api/board/nodes?': runtimeNodes, '/api/board/machine?': machine }, { agents })
    const { host, dispose } = mount(() => <Processes ctx={ctx} def={def('procs')} {...({} as Omit<PanelProps, 'ctx' | 'def'>)} />)
    const text = host.textContent!
    expect(text).toContain('Fix the build')
    expect(text).toContain('Not in this board’s session list')
    expect(text).not.toMatch(/\["/)
    expect(text).not.toContain('lead')
    expect(text).toContain('4100, 4101')
    expect(text).toContain('None recorded')
    expect(text).toMatch(/Running sessions\s*2/)
    expect(text).not.toContain('Recorded process rows')
    expect(text).not.toContain('Not available from this source')
    expect(text).toContain('Not reported by old-node')
    const buttons = Array.from(host.querySelectorAll('button')).filter(button => /^Open /.test(button.textContent ?? ''))
    expect(buttons.map(button => button.textContent)).toEqual(['Open Fix the build', 'Open session'])
    buttons[1].click()
    expect(openAgent).toHaveBeenCalledWith(JSON.stringify([node, 'copilot-desktop:90300:1795352502.287']))
    dispose()
  })
})

describe('BOARD-MACHINE-02 · Network, tokens and files writes each unit once and only columns with values', () => {
  it('prints a rate with one unit', () => {
    const { ctx } = boardContext('fleet', {})
    expect(displayField(ctx, metric('inbound_bps', 'events.tool.live.inbound_rate_bps', 'Received')).format(11_700)).toBe('11.7 KB/s')
  })

  it('shows each node’s machine report without a repeated host label or empty columns', () => {
    const host = { node_id: node, status: 'reported', ts: 1000, host_cpu_percent: 51.5, host_memory_used_mb: 32768,
      host_memory_total_mb: 65536, live_sessions: 23, active_processes: 123, daemon_pid: 4, files: 9, live_in_rate: 11_700,
      live_out_rate: 51_200, ai_token_rate: null }
    const { ctx } = boardContext('fleet', { '/api/board/machine?': { ...machine, hosts: [host, { ...host, node_id: 'mac-02', status: 'stale' }] } })
    const { host: view, dispose } = mount(() => <Traffic ctx={ctx} def={def('traffic')} {...({} as Omit<PanelProps, 'ctx' | 'def'>)} />)
    const text = view.textContent!
    expect(text).toContain('11.7 KB/s')
    expect(text).toContain('51.2 KB/s')
    expect(text).not.toContain('B/s B/s')
    expect(text).not.toContain('Whole host')
    expect(text).toContain('34.4 GB of 68.7 GB')
    expect(text).toContain('Older than 5 minutes')
    const headers = Array.from(view.querySelectorAll('thead th')).map(cell => cell.textContent?.replace(/\s*↕$/, ''))
    expect(headers).not.toContain('Tokens per second (estimate)')
    expect(text).not.toContain('network estimates')
    dispose()
  })
})
