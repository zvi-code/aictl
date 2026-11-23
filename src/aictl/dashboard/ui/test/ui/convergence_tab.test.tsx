// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { SessionConvergence, StripCell } from '../../src/panels/overview/b/patternsModel'
import { repeatFigures, singleMarks } from '../../src/drawer/convergenceModel'
import type { TabProps } from '../../src/drawer/shared'
import Convergence from '../../src/drawer/tabs/Convergence'
import type { DrawerProps } from '../../src/shell/drawerTypes'
import { installDom, layoutHeaders, mount } from './dom'

const cell = (n: number, extra: Partial<StripCell> = {}): StripCell =>
  ({ first: n, last: n, tokens: 100, output_tokens: 10, calls: 1, errors: 0, edits: 0, accepted: 0, repeats: 0, retries: 0, ...extra })
// A Copilot session: two repeated calls and one retry, none of them in a run big enough to be listed.
const data = {
  session_id: 's', requests: 4, truncated: false, strip: [cell(1), cell(2, { repeats: 1 }), cell(3, { repeats: 1, retries: 1 }), cell(4)],
  clusters: [], clusters_total: 0, retry_runs: [], retry_runs_total: 0, files: [], compactions: [],
  summary: { requests: 4, tokens: 400, repeats: 2, retries: 1, edits: 0, accepted: 0, commits: 0, longest_dry: 4, tail_dry: 4, compactions: 0 },
  signals: [], verdict: 'No sign of non-convergence above the thresholds (heuristic).', definitions: {}, query: undefined,
} as unknown as SessionConvergence
const tab = { shell: { ctx: { copy() {}, scope: () => 'local', nodeId: () => null,
  detail: () => Object.assign(() => ({ data, status: 'ready' as const, error: null }), { retry() {} }) } } as unknown as DrawerProps,
  entry: { type: 'agent', id: 's', tab: 'convergence' }, detail: () => undefined, agent: () => undefined, runtime: () => undefined, session: () => 's' } as unknown as TabProps

beforeEach(() => { installDom(); layoutHeaders() })

describe('DRW-CV-01 · The totals and the lists of Convergence read the same requests', () => {
  it('says what the total counts and how many of them reach the size of a listed run', () => {
    const figures = repeatFigures(data)
    expect(figures.repeats).toEqual({ value: 2, detail: '0 runs of 3 or more identical calls' })
    expect(figures.retries).toEqual({ value: 1, detail: '0 runs of 2 or more retries' })
    expect(figures.noRepeatRun).toBe('2 calls repeated an earlier call, none 3 or more times.')
    expect(figures.noRetryRun).toBe('1 retry after an error, no run of 2 or more.')
    expect(repeatFigures({ ...data, summary: { ...data.summary, repeats: 0, retries: 0 } }).noRepeatRun).toBe('No call repeated an earlier call.')
  })

  it('marks the bars of a repeat or a retry that is not in a listed run', () => {
    const marks = singleMarks(data.strip, { repeat: new Set([2]), retry: new Set() })
    expect(marks).toEqual([
      { kind: 'repeat', bin: 1, text: '1 repeated call in request 2' }, { kind: 'retry', bin: 2, text: '1 retry after an error in request 3' }])
  })

  it('shows the tiles, the sections and the strip from one set of numbers, and no legend', () => {
    const { host, dispose } = mount(() => <Convergence {...tab} />)
    const text = host.textContent!
    expect(text).toMatch(/Repeated calls\s*2\s*0 runs of 3 or more identical calls/)
    expect(text).toMatch(/Retries after errors\s*1\s*0 runs of 2 or more retries/)
    expect(text).toContain('Runs of identical calls · 0')
    expect(text).toContain('2 calls repeated an earlier call, none 3 or more times.')
    expect(text).not.toContain('(0 of 0)')
    expect(text).not.toContain('Hover a bar')
    expect(host.querySelector('[class*="legend"]')).toBeNull()
    const titles = Array.from(host.querySelectorAll('svg title')).map(item => item.textContent)
    expect(titles).toContain('1 repeated call in request 2')
    expect(titles).toContain('1 retry after an error in request 3')
    dispose()
  })
})
