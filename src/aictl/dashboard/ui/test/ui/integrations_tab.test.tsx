// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import Integrations from '../../src/drawer/tabs/Integrations'
import { harness } from './drawer_harness'
import { bodyRows, installDom, layoutHeaders, mount } from './dom'

beforeEach(() => { installDom(); layoutHeaders() })

const summary = (extra: object = {}) => ({ total_calls: 3, total_errors: 0, by_model: { m1: 3 }, avg_latency_ms: null, p95_latency_ms: null, ...extra })
const mcp = (servers: object[] = [], extra: object = {}) => ({ session_id: 'sess-1', servers, total_calls: servers.length, configured_servers: [], ...extra })
const routes = (calls: object, servers: object) => ({ '/api/api-calls': () => calls, '/api/session-mcp-usage': () => servers })
const stat = (host: Element, label: string) => {
  const dl = Array.from(host.querySelectorAll('dl')).find(item => item.querySelector('dt')?.textContent === label)
  return dl?.textContent?.slice(label.length)
}

describe('INT-UI · Integrations tab', () => {
  it('says "not available" for a latency nobody recorded, never 0 ms', () => {
    const { tab } = harness(routes({ calls: [{ session_id: 's', ts: 1, model: 'm1', input_tokens: 1, output_tokens: 1, duration_ms: null, status: 'ok' }],
      summary: summary({ source: 'stored requests' }) }, mcp()), { agent: { tool: 'copilot-cli' } })
    const { host, dispose } = mount(() => <Integrations {...tab} />)
    expect(stat(host, 'Calls')).toContain('3')
    expect(stat(host, 'Calls')).toContain('stored requests')
    expect(stat(host, 'Mean latency')).toContain('Not available')
    expect(stat(host, 'P95 latency')).toContain('Not available')
    expect(host.textContent).not.toContain('0 ms')
    dispose()
  })

  it('says no model calls were recorded instead of a row of zeros', () => {
    const { tab } = harness(routes({ calls: [], summary: summary({ total_calls: 0, by_model: {}, source: null }) }, mcp()), { agent: { tool: 'copilot-cli' } })
    const { host, dispose } = mount(() => <Integrations {...tab} />)
    expect(host.textContent).toContain('No model calls recorded for this session.')
    expect(stat(host, 'Mean latency')).toBeUndefined()
    dispose()
  })

  it('lists the servers the session used apart from the configured ones, and no "Servers 0" for none', () => {
    const used = [{ server_name: 'computer-use', call_count: 5, err_count: 1, total_duration_ms: null, last_ts: 50 }]
    const { tab } = harness(routes({ calls: [], summary: summary() }, mcp(used, { total_calls: 5, configured_servers: ['github'] })), { agent: { tool: 'copilot-cli' } })
    const first = mount(() => <Integrations {...tab} />)
    expect(first.host.textContent).toContain('MCP servers used')
    expect(stat(first.host, 'Servers used')).toBe('1')
    expect(stat(first.host, 'Configured in project files')).toBe('github')
    expect(bodyRows(first.host).some(row => row.textContent?.includes('computer-use'))).toBe(true)
    first.dispose()

    const none = harness(routes({ calls: [], summary: summary() }, mcp()), { agent: { tool: 'copilot-cli' } })
    const second = mount(() => <Integrations {...none.tab} />)
    expect(second.host.textContent).toContain('No MCP tool calls recorded for this session.')
    expect(stat(second.host, 'Servers used')).toBeUndefined()
    expect(stat(second.host, 'Configured in project files')).toBe('none found')
    second.dispose()
  })

  it('shows only the panels that can apply to the session tool', () => {
    const empty = routes({ calls: [], summary: summary() }, mcp())
    const cli = mount(() => <Integrations {...harness(empty, { agent: { tool: 'copilot-cli' } }).tab} />)
    expect(cli.host.textContent).not.toContain('Rate limits')
    expect(cli.host.textContent).not.toContain('VS Code language models')
    cli.dispose()
    const claude = mount(() => <Integrations {...harness(empty, { agent: { tool: 'claude-code' } }).tab} />)
    expect(claude.host.textContent).toContain('Rate limits')
    claude.dispose()
    const vscode = mount(() => <Integrations {...harness(empty, { agent: { tool: 'copilot-vscode' } }).tab} />)
    expect(vscode.host.textContent).toContain('VS Code language models')
    vscode.dispose()
  })

  it('keeps the session files in Artifacts and links there', () => {
    const { tab, asked } = harness(routes({ calls: [], summary: summary() }, mcp()), { agent: { tool: 'copilot-cli' }, detail: { artifacts_total: 4 } })
    const { host, dispose } = mount(() => <Integrations {...tab} />)
    expect(asked.some(path => path.includes('/api/copilot-sessions'))).toBe(false)
    expect(host.textContent).toContain('4 session files')
    dispose()
  })
})
