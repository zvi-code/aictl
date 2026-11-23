// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import Processes, { runningNow } from '../../src/drawer/tabs/Processes'
import type { DetailAgent } from '../../src/data/contract.gen'
import { cell, harness } from './drawer_harness'
import { bodyRows, installDom, layoutHeaders, mount } from './dom'

beforeEach(() => { installDom(); layoutHeaders() })

const tree = [
  { pid: 86188, ppid: 38794, name: 'node', role: 'lead', cpu_percent: 0.0, mem_mb: 40.8, depth: 0 },
  { pid: 86189, ppid: 86188, name: 'copilot', role: 'teammate', cpu_percent: 0.4, mem_mb: 381.7, depth: 1 },
  { pid: 86283, ppid: 86189, name: 'caffeinate', role: 'subprocess', cpu_percent: 0.0, mem_mb: 2.4, depth: 2 },
]
const detail = (extra: object = {}) => ({
  resources: { bytes_in: 5881, bytes_out: 1821, state_writes: 0, cpu_peak: 2.8, process_tree: tree, subprocesses: [{ name: 'copilot', count: 2 }] },
  process: { cpu_percent: 0.2, mem_mb: 597.172, pids: [86188, 86189, 86283], started_at: 1 },
  agent: { tool_calls: 25, started_at: 1000, last_activity_at: 1000 + 4.5 * 3600 }, ...extra,
}) as unknown as Partial<DetailAgent>
const recorded = (processes: object[]) => ({ '/api/session-processes': () => ({ session_id: 's', total: processes.length, by_role: { lead: processes.length }, processes }) })
const process_ = (pid: number) => ({ pid, tool: 'copilot-cli', role: 'lead', joined_at: 1795444526 })
const heading = (host: Element) => Array.from(host.querySelectorAll('h3')).map(h => h.textContent)
const stat = (host: Element, label: string) => Array.from(host.querySelectorAll('dl')).find(dl => dl.querySelector('dt')?.textContent === label)?.textContent?.slice(label.length)

describe('PROC-UI · Processes tab', () => {
  it('shows the tree of the detail when the live feed has no process of the session, and says which it is', () => {
    const { tab } = harness(recorded([]), { detail: detail(), runtime: { pids: [86188], mem_mb: 597.172 } })
    const { host, dispose } = mount(() => <Processes {...tab} />)
    expect(heading(host)).toContain('Process tree · from the detail read')
    expect(bodyRows(host).map(row => cell(row, 'pid')?.textContent).slice(0, 3)).toEqual(['86188', '86189', '86283'])
    expect(cell(bodyRows(host)[1], 'ppid')?.textContent).toBe('86188')
    expect(cell(bodyRows(host)[1], 'memory_rss_bytes')?.textContent).toBe('400 MB')
    dispose()
  })

  it('shows the live rows, labelled live now, when the live feed has them', () => {
    const topic = [{ pid: 7, ppid: 1, created_at: 5, name: 'live-node', tool: 'copilot-cli', cwd: null, cpu_percent: 1, memory_rss_bytes: 2_000_000, present: true, session_id: 'sess-1' }]
    const { tab } = harness(recorded([]), { detail: detail(), runtime: { id: 'sess-1', pids: [7] }, topics: { 'runtime.process': topic } })
    const { host, dispose } = mount(() => <Processes {...tab} />)
    expect(heading(host)).toContain('Process tree · live now')
    expect(bodyRows(host)[0].textContent).toContain('live-node')
    dispose()
  })

  it('lists each recorded process without a role it was not shown to have, and says what the time is', () => {
    const { tab } = harness(recorded([process_(66852), process_(86189)]), { detail: detail(), runtime: { pids: [86188, 86189, 86283] } })
    const { host, dispose } = mount(() => <Processes {...tab} />)
    const rows = bodyRows(host).filter(row => cell(row, 'running'))
    expect(rows.length).toBe(2)
    const headers = Array.from(host.querySelectorAll('th[data-col]')).map(th => th.textContent)
    expect(headers.some(header => header?.includes('First seen by aictl'))).toBe(true)
    expect(headers.some(header => /^(role|left|joined)/i.test(header ?? ''))).toBe(false)
    expect(rows.map(row => cell(row, 'running')?.textContent)).toEqual(['no', 'yes'])
    // The one in the scan names its parent; the one that was not scanned says nothing it does not know.
    expect(cell(rows[1], 'ppid')?.textContent).toBe('86188')
    expect(cell(rows[0], 'ppid')?.textContent).toContain('Not available')
    dispose()
  })

  it('says a recorded process is not known to run when the session\'s current processes are not known', () => {
    expect(runningNow(1, undefined)).toBe('not known')
    expect(runningNow(1, [])).toBe('no')
    expect(runningNow(1, [1])).toBe('yes')
  })

  it('shows the resources the detail holds, with rounded memory, the call count and its span', () => {
    const { tab } = harness(recorded([]), { detail: detail(), runtime: { mem_mb: 597.172, pids: [] } })
    const { host, dispose } = mount(() => <Processes {...tab} />)
    expect(stat(host, 'Memory')).toBe('597 MB')
    expect(stat(host, 'Peak CPU')).toContain('2.8')
    expect(stat(host, 'Received')).toBe('6 KB')
    expect(stat(host, 'Sent')).toBe('2 KB')
    expect(stat(host, 'Tool calls')).toContain('25')
    expect(stat(host, 'Tool calls')).not.toContain('/min')
    expect(stat(host, 'Tool calls')).toMatch(/4\.5 h|4 h 30/)
    dispose()
  })
})
