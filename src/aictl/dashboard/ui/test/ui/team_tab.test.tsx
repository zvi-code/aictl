// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { DetailAgent } from '../../src/data/contract.gen'
import Team from '../../src/drawer/tabs/Team'
import { cell, harness } from './drawer_harness'
import { bodyRows, installDom, layoutHeaders, mount } from './dom'

beforeEach(() => { installDom(); layoutHeaders() })

const named = { id: 'a/1', title: 'Check if OTel is enabled', role: 'task', status: 'failed', primary_model: null, resolved_model: 'claude-opus-5', input: null, output: null,
  cache_read: null, cache_write: null, started_at: 100, ended_at: 160.5, status_evidence: 'tool recorded failed', tool_calls: 0 }
const unnamed = { id: 'a/2', title: 'task 58f1831d', role: null, status: 'ended', primary_model: 'claude-opus-5-5', resolved_model: 'claude-opus-5.5', input: 8, output: 414,
  cache_read: 68444, cache_write: 34863, started_at: 200, ended_at: 204, status_evidence: 'no activity for 15 min (inferred)', tool_calls: 2 }
const detail = { subagents: [named, unnamed] } as unknown as Partial<DetailAgent>

describe('TEAM-UI · Team tab subagents', () => {
  it('shows the model, the duration and why the status holds, and names each token column by what it counts', () => {
    const { tab } = harness({}, { detail, session: null })
    const { host, dispose } = mount(() => <Team {...tab} />)
    const label = (id: string) => host.querySelector(`th[data-col="${id}"]`)?.textContent ?? ''
    expect(label('input')).toContain('Input, cache excluded')
    expect(label('cache_read')).toContain('Cache read')
    expect(label('cache_write')).toContain('Cache write')
    expect(label('duration_s')).toContain('Duration')
    const [first, second] = bodyRows(host)
    expect(cell(first, 'model')?.textContent).toBe('claude-opus-5')
    expect(cell(second, 'model')?.textContent).toBe('claude-opus-5-5')
    expect(cell(first, 'duration_s')?.textContent).toBe('61')
    expect(cell(first, 'status_evidence')?.textContent).toBe('tool recorded failed')
    expect(cell(second, 'cache_read')?.textContent).toBe('68,444')
    // What the payload does not carry is said, not left blank or shown as 0.
    expect(cell(second, 'role')?.textContent).toContain('Not available')
    expect(cell(first, 'input')?.textContent).toContain('Not available')
    dispose()
  })
})
