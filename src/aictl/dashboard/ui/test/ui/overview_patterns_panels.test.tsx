// @vitest-environment jsdom
// MCP servers and tools, and Convergence: no folded single row, a known age for stale data, and opening cells.
import { createSignal, flush } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'
import { Convergence, McpServers } from '../../src/panels/overview/b/Patterns'
import { bodyRows, installDom, layoutHeaders, mount } from './dom'
import { panel } from './overviewPanel'

beforeEach(() => { installDom(); layoutHeaders() })

describe('MCP servers and tools', () => {
  const figures = { calls: 409, failures: 11, fail_rate: 0.03, total_ms: null, p50_ms: null, p95_ms: null, output_bytes: null,
    est_tokens: null, time_share: null }
  const body = {
    groups: [{ id: 'builtin', kind: 'builtin', server: '', label: 'Built-in tools', sessions: 1, sessions_at_least: false, tool_count: 2,
      first_ts: 1, last_ts: 2, ...figures, tools: [{ name: 'powershell', sessions: 1, last_ts: 2, ...figures, calls: 400 },
        { name: 'view', sessions: 1, last_ts: 2, ...figures, calls: 9 }] }],
    totals: { calls: 409, failures: 11, sessions: 1, total_ms: null, tool_names: 2, tool_names_shown: 2 },
    definitions: {}, query: null,
  }

  it('lists the built-in tools directly and does not count zero servers', () => {
    const { props, opened } = panel('mcpServers', { detail: () => ({ data: body, status: 'ready', error: null }) })
    const { host, dispose } = mount(() => <McpServers {...props} />)
    expect(host.textContent).toContain('No MCP server used · 409 tool calls · 1 session')
    expect(host.textContent).not.toContain('0 MCP servers')
    expect(host.textContent).not.toContain('Expand a server')
    expect(bodyRows(host).map(row => row.querySelector('td')?.textContent)).toEqual(['powershell', 'view'])
    host.querySelector<HTMLButtonElement>('tbody button[aria-label="Open tool powershell"]')!.click()
    expect(opened).toEqual([{ type: 'tool', name: 'powershell' }])
    dispose()
  })
})

describe('Convergence', () => {
  const row = { session_id: 's-1', node_id: 'node-a', title: 'Fix the parser', requests: 9, tokens: 10, compactions: 0,
    tokens_per_change: null, score: 2, signals: [], verdict: '' }
  const body = { rows: [row], flagged: 1, checked: 3, checked_capped: false, signals: [], definitions: {}, query: null,
    node_scope: { kind: 'fleet', node_id: null } }

  it('says when a stale answer was received, and the session cell opens the session of its node', () => {
    const [status, setStatus] = createSignal<'ready' | 'refreshing'>('ready')
    const { props, agents } = panel('convergence', { scope: 'fleet', detail: () => ({ data: body, status: status(), error: null }) })
    const { host, dispose } = mount(() => <Convergence {...props} />)
    setStatus('refreshing'); flush()
    expect(host.textContent).toContain('Showing the last available data')
    expect(host.textContent).not.toContain('Last updated: unknown')
    expect(host.querySelector('time')).not.toBeNull()
    expect(Array.from(host.querySelectorAll('thead th')).map(th => th.getAttribute('data-col'))).not.toContain('@actions')
    host.querySelector<HTMLButtonElement>('tbody button[aria-label="Open session Fix the parser"]')!.click()
    expect(agents).toEqual([JSON.stringify(['node-a', 's-1'])])
    dispose()
    // Scrolled away and back: the cached answer, read again, still says when it arrived.
    const again = mount(() => <Convergence {...props} />)
    expect(again.host.querySelector('time')).not.toBeNull()
    again.dispose()
  })

  it('draws no stale line for an answer of unknown age that is being read again', () => {
    const { props } = panel('convergence', { detail: () => ({ data: { ...body, node_scope: undefined }, status: 'refreshing', error: null }) })
    const { host, dispose } = mount(() => <Convergence {...props} />)
    // The stale notice keeps its space but is hidden.
    expect(Array.from(host.querySelectorAll('[aria-hidden]')).filter(el => el.textContent?.includes('Last updated'))
      .map(el => el.getAttribute('aria-hidden'))).toEqual(['true'])
    expect(host.textContent).toContain('Fix the parser')
    dispose()
  })
})
