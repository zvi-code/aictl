// @vitest-environment jsdom
// The tool-call views of Insights as stand-alone views: After a failure, Repeated file reads, Skills, MCP servers and
// Kusto queries. Per view: the marks of the main chart, the "Colour by" switch, a hover per kind of mark, the line
// under the title, and a body without `repos`.
import { flush } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { beforeEach, describe, expect, it } from 'vitest'
import AfterFailure from '../../src/panels/insights/AfterFailure'
import Rereads from '../../src/panels/insights/Rereads'
import { readColourBy } from '../../src/panels/insights/charts/ColourBy'
import type { CardProps } from '../../src/panels/insights/InsightCard'
import type { FailureBody, RereadBody } from '../../src/panels/insights/insightsModel'
import { notSplitNote, OTHER, OTHER_REPOS, type RepoRef, type RepoSegment } from '../../src/panels/insights/repoSplit'
import type { DetailState, PanelContext } from '../../src/panels/types'
import { installDom, layoutHeaders, mount } from './dom'

const base = {
  view: 'insights.x', range: { since: 1_700_000_000, until: 1_700_086_400 },
  data_range: { first_ts: 1_700_000_100, last_ts: 1_700_080_000 }, computed_at: 1_700_086_000,
  query: { view: 'insights.x', kql: '// aictl view insights.x\nrequests | take 1', kusto_url: 'https://c.kusto.windows.net/db' },
}
const order: RepoRef[] = [
  { repo: '/src/app', name: 'app', cost_usd: 300, requests: 900, sessions: 30 },
  { repo: '/src/docs', name: 'docs', cost_usd: 100, requests: 200, sessions: 5 },
]
const others = { repos: 3, cost_usd: 20, requests: 40, sessions: 4 }
const OTHER_TEXT = String(OTHER)

/** One segment of a bar: its measures, each one's share of `whole` and of the repository's own total (`own`). */
function seg(repo: string, values: Record<string, number>, whole: Record<string, number>, own: Record<string, number | null> = {}): RepoSegment {
  const name = order.find(item => item.repo === repo)?.name ?? null
  return {
    repo, name, ...values,
    share: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, whole[key] ? value / whole[key] : null])),
    of_repo: Object.fromEntries(Object.keys(values).map(key => [key, own[key] ?? null])),
  }
}

function context(state: DetailState<unknown>, navigated: Record<string, unknown>[]) {
  return {
    scope: () => 'local', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined,
    filters: () => ({ projects: [], repos: [] }), tools: () => [], openAgent() {},
    navigate: (patch: Record<string, unknown>) => {
      navigated.push(patch)
      history.replaceState(null, '', `/?screen=insights&range=all${patch.by ? `&by=${String(patch.by)}` : ''}`)
    },
    detail: (path: () => string | undefined) => Object.assign(() => path() ? state : undefined, { retry() {} }),
  } as unknown as PanelContext
}
/** Draw one view with an answer; the props are made outside the render, as a page passes them. */
function draw(View: (p: CardProps) => JSX.Element, card: string, data: unknown) {
  const navigated: Record<string, unknown>[] = []
  const given = { ctx: context({ data, status: 'ready', error: null }, navigated), since: base.range.since, until: base.range.until }
  const { host, dispose } = mount(() => <View {...given} />)
  return { box: host.querySelector(`#insight-${card}`)!, dispose, navigated }
}
const texts = (nodes: Iterable<Element>, read: (node: Element) => string | null) => [...nodes].map(read)
const rows = (box: Element, chart: string) => texts(box.querySelectorAll(`[data-chart="${chart}"] [data-row]`), row => row.getAttribute('data-row'))
const parts = (row: Element) => texts(row.querySelectorAll('[data-part]'), part => part.getAttribute('data-part'))
const repos = (row: Element) => texts(row.querySelectorAll('[data-part]'), part => part.getAttribute('data-repo'))
const written = (row: Element) => texts(row.querySelectorAll('[data-part] button'), part => part.textContent)
const tip = (row: Element, part: string) => row.querySelector(`[data-part="${part}"] [role="tooltip"]`)!.textContent
const finding = (box: Element) => box.querySelector('[data-finding]')!.textContent
/** Click a choice of the "Colour by" switch. */
function colourBy(box: Element, choice: string) {
  const button = [...box.querySelectorAll('[data-colour-by] button')].find(item => item.textContent === choice) as HTMLButtonElement
  button.click()
  flush()
}

beforeEach(() => { installDom(); layoutHeaders(); history.replaceState(null, '', '/?screen=insights&range=all') })

describe('INS-V-C · Colour by', () => {
  it('reads the choice from the address', () => {
    expect(readColourBy('?screen=insights&by=repo')).toBe('repo')
    expect(readColourBy('?screen=insights')).toBe('parts')
    expect(readColourBy('?by=other')).toBe('parts')
  })
})

// ─── After a failure ─────────────────────────────────────────────────────────────────────────────────────────────────
const outcomes = { identical_failed: 10, identical_succeeded: 20, changed_failed: 5, changed_succeeded: 25, other_tool: 20 }
const failWhole = { calls: 1000, failures: 100, last_failures: 20, streaks: 4, streak_calls: 15, ...outcomes }
const failures = {
  ...base, card: 'failures', repo_order: order, repo_others: others, sessions: [],
  tools: [{
    tool: 'claude-code', calls: 1000, failures: 100, last_failures: 20, outcomes, streaks: 4, streak_calls: 15, longest: 6,
    repos: [
      seg('/src/app', { calls: 700, failures: 70, last_failures: 14, streaks: 3, streak_calls: 11, identical_failed: 8, identical_succeeded: 14,
        changed_failed: 4, changed_succeeded: 16, other_tool: 14 }, failWhole, { failures: 0.9, streaks: 1 }),
      seg('', { calls: 300, failures: 30, last_failures: 6, streaks: 1, streak_calls: 4, identical_failed: 2, identical_succeeded: 6,
        changed_failed: 1, changed_succeeded: 9, other_tool: 6 }, failWhole, { failures: 0.5, streaks: 1 }),
    ],
  }, {
    tool: 'codex', calls: 200, failures: 10, last_failures: 2,
    outcomes: { identical_failed: 4, identical_succeeded: 0, changed_failed: 1, changed_succeeded: 3, other_tool: 0 },
    streaks: 0, streak_calls: 0, longest: null, repos: [],
  }],
  summary: { failures: 110, followed: 88, streaks: 4, streak_calls: 15, longest: 6,
    identical_failed: 14, identical_succeeded: 20, changed_failed: 6, changed_succeeded: 28, other_tool: 20 },
} as unknown as FailureBody

describe('INS-V-C · After a failure', () => {
  it('states what is measured and leads with the failed calls', () => {
    const { box, dispose } = draw(AfterFailure, 'failures', failures)
    expect(finding(box)).toBe('Failed tool calls per tool, and the next tool call of the same session and agent after each one.')
    expect(box.querySelector('[data-hero]')!.textContent).toBe('110failed tool calls in the period, every tool')
    // The counts sentence is out of sight, under "Totals of the period".
    expect(box.querySelector('[data-totals] p')!.textContent).toMatch(/^Of 110 failed tool calls \(claude-code and codex\), 88 had a next call/)
    dispose()
  })

  it('draws each tool\'s failed calls as 100% by next call, every tool first, with the legend of the outcomes only', () => {
    const { box, dispose } = draw(AfterFailure, 'failures', failures)
    expect(rows(box, 'failure-next')).toEqual(['all', 'claude-code', 'codex'])
    const all = box.querySelector('[data-chart="failure-next"] [data-row="all"]')!
    expect(parts(all)).toEqual(['identical_failed', 'identical_succeeded', 'changed_failed', 'changed_succeeded', 'other_tool', 'last'])
    expect(written(all)).toEqual(['14', '20', '6', '28', '20', '22'])
    expect(all.querySelector('[data-total]')!.textContent).toBe('110 failed')
    expect(tip(all, 'identical_failed')).toBe('All tools, identical call, failed: 14 calls, 16% of the 88 failed calls with a next call, ' +
      '13% of all 110 failed calls.')
    expect(tip(all, 'last')).toBe('All tools, no next call: 22 failed calls (20% of 110 failed calls) were the last call of their agent in the period.')
    const codex = box.querySelector('[data-chart="failure-next"] [data-row="codex"]')!
    // A zero outcome draws no segment.
    expect(parts(codex)).toEqual(['identical_failed', 'changed_failed', 'changed_succeeded', 'last'])
    expect(tip(codex, 'changed_succeeded')).toContain('Next call: same tool name with another target, and it succeeded.')
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    expect(texts(box.querySelectorAll('[data-chart="failure-next"] li'), item => item.textContent)).toContain('No next call (last call of its agent)')
    dispose()
  })

  it('splits the failed calls into those in runs and the others, and draws the runs with the longest beside', () => {
    const { box, dispose } = draw(AfterFailure, 'failures', failures)
    const calls = box.querySelector('[data-chart="failure-calls"] [data-row="claude-code"]')!
    expect([parts(calls), written(calls)]).toEqual([['runs', 'other'], ['15', '85']])
    expect(calls.querySelector('[data-total]')!.textContent).toBe('100 · 10% of calls')
    expect(tip(calls, 'other')).toBe('claude-code: 85 failed calls not in a run of 3 or more failed calls in a row (85% of 100 failed calls); ' +
      '100 failed of 1,000 tool calls.')
    const runs = box.querySelector('[data-chart="failure-runs"] [data-row="claude-code"]')!
    expect(runs.querySelector('[data-total]')!.textContent).toBe('4 runs · longest 6')
    expect(tip(runs, 'runs')).toBe('claude-code: 4 runs of 3 or more failed calls in a row by one agent, 15 calls in them (15% of 100 failed calls); ' +
      'the longest 6 calls.')
    dispose()
  })

  it('switches every chart to the repository split, keeps it in the address, and shows the repository legend alone', () => {
    const { box, dispose, navigated } = draw(AfterFailure, 'failures', failures)
    colourBy(box, 'Repository')
    expect(navigated).toEqual([{ by: 'repo' }])
    expect(box.querySelector('[data-chart="failure-next"]')).toBeNull()
    expect(texts(box.querySelectorAll('[data-repo-legend] li'), item => item.textContent)).toEqual(['app', 'docs', OTHER_REPOS])
    expect(rows(box, 'failure-next-repos')).toEqual(['claude-code:identical_failed', 'claude-code:identical_succeeded',
      'claude-code:changed_failed', 'claude-code:changed_succeeded', 'claude-code:other_tool', 'claude-code:last'])
    const last = box.querySelector('[data-chart="failure-next-repos"] [data-row="claude-code:last"]')!
    expect([repos(last), written(last)]).toEqual([['0', OTHER_TEXT], ['14', '6']])
    expect(tip(last, 'repo:/src/app')).toMatch(/^claude-code, no next call — app \(\/src\/app\): 14 · 70% of this bar\. Of 70 failed calls of this tool in this repository\./)
    const calls = box.querySelector('[data-chart="failure-calls"] [data-row="claude-code"]')!
    expect([repos(calls), written(calls)]).toEqual([['0', OTHER_TEXT], ['70', '30']])
    expect(tip(calls, 'repo:/src/app')).toBe('claude-code, failed calls — app (/src/app): 70 · 70% of this bar · 90% of app own failed calls. ' +
      '700 calls of this tool in this repository; 11 of the failed ones in runs of 3 or more. ' +
      'claude-code: 100 failed calls of 1,000 tool calls in the period (10%).')
    // A tool with no split keeps its own parts.
    expect(parts(box.querySelector('[data-chart="failure-calls"] [data-row="codex"]')!)).toEqual(['other'])
    const runs = box.querySelector('[data-chart="failure-runs"] [data-row="claude-code"]')!
    expect([repos(runs), written(runs)]).toEqual([['0', OTHER_TEXT], ['3', '1']])
    expect(tip(runs, 'repo:')).toContain(notSplitNote('longest run'))
    colourBy(box, 'Next call')
    expect(navigated.at(-1)).toEqual({ by: null })
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    expect(rows(box, 'failure-next')).toEqual(['all', 'claude-code', 'codex'])
    dispose()
  })

  it('opens on the repository split the address names', () => {
    history.replaceState(null, '', '/?screen=insights&range=all&by=repo')
    const { box, dispose } = draw(AfterFailure, 'failures', failures)
    expect(box.querySelector('[data-chart="failure-next-repos"]')).not.toBeNull()
    dispose()
  })

  it('draws by next call with no switch when the answer carries no split', () => {
    history.replaceState(null, '', '/?screen=insights&range=all&by=repo')
    const plain = { ...failures, repo_order: [], repo_others: null,
      tools: failures.tools.map(tool => ({ ...tool, repos: undefined })) } as unknown as FailureBody
    const { box, dispose } = draw(AfterFailure, 'failures', plain)
    expect(box.querySelector('[data-colour-by]')).toBeNull()
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    expect(rows(box, 'failure-next')).toEqual(['all', 'claude-code', 'codex'])
    expect(parts(box.querySelector('[data-chart="failure-calls"] [data-row="claude-code"]')!)).toEqual(['runs', 'other'])
    dispose()
  })
})

// ─── Repeated file reads ─────────────────────────────────────────────────────────────────────────────────────────────
const readWhole = { reads: 1000, repeat_reads: 400, files: 300, files_5plus: 20, repeat_bytes: 4_000_000 }
const rereads = {
  ...base, card: 'rereads', repo_order: order, repo_others: others, sessions: [],
  tools: [{ tool: 'claude-code', ...readWhole, repeat_share: 0.4, most_reads: 30, unmatched: 0,
    repos: [seg('/src/app', { reads: 700, repeat_reads: 300, files: 200, files_5plus: 15, repeat_bytes: 3_000_000 }, readWhole),
      seg('/src/docs', { reads: 200, repeat_reads: 60, files: 70, files_5plus: 4, repeat_bytes: 600_000 }, readWhole),
      seg('', { reads: 100, repeat_reads: 40, files: 30, files_5plus: 1, repeat_bytes: 400_000 }, readWhole)] },
  { tool: 'copilot-cli', reads: 200, repeat_reads: 0, repeat_share: 0, files: 150, files_5plus: 0, most_reads: 1, repeat_bytes: null, unmatched: 7 }],
  summary: { reads: 1200, repeat_reads: 400, repeat_share: 1 / 3, files_5plus: 20, repeat_bytes: 4_000_000, unmatched: 7 },
} as unknown as RereadBody

describe('INS-V-C · Repeated file reads', () => {
  it('states what is measured and leads with the reads of a file already read, of all reads', () => {
    const { box, dispose } = draw(Rereads, 'rereads', rereads)
    expect(finding(box)).toBe('File reads with a recorded path, per tool; read again: a file the same session and agent had already read in the period.')
    expect(box.querySelector('[data-hero]')!.textContent).toBe('400reads of a file the same agent had already read, of 1,200 file reads with a recorded path (33%)')
    expect(box.querySelector('[data-unmatched]')!.textContent).toBe('7 reads had no recorded path and are not compared.')
    expect(box.querySelector('[data-totals] p')!.textContent).toMatch(/^33% of file reads \(400 of 1,200\)/)
    dispose()
  })

  it('draws each tool\'s reads as 100%, first read and read again, every tool first', () => {
    const { box, dispose } = draw(Rereads, 'rereads', rereads)
    expect(rows(box, 'reread-reads')).toEqual(['all', 'claude-code', 'copilot-cli'])
    const all = box.querySelector('[data-chart="reread-reads"] [data-row="all"]')!
    expect([parts(all), written(all)]).toEqual([['first', 'again'], ['800', '400']])
    expect(all.querySelector('[data-total]')!.textContent).toBe('400 again · 33%')
    expect(tip(all, 'again')).toBe('All tools, read of a file the same agent had already read: 400 reads, 33% of 1,200 reads with a recorded path; ' +
      '4 MB returned again.')
    const tool = box.querySelector('[data-chart="reread-reads"] [data-row="claude-code"]')!
    expect(tip(tool, 'first')).toBe('claude-code, first read of a file by its agent: 600 reads, 60% of 1,000 reads with a recorded path over 300 files.')
    // A tool with no read again has no bytes bar.
    expect(rows(box, 'reread-bytes')).toEqual(['claude-code'])
    const bytes = box.querySelector('[data-chart="reread-bytes"] [data-row="claude-code"]')!
    expect(tip(bytes, 'bytes')).toBe('claude-code: 4 MB returned by 400 reads of a file the same agent had already read, each at the average ' +
      'result size of reads of that file.')
    const files = box.querySelector('[data-chart="reread-files"] [data-row="claude-code"]')!
    expect(files.querySelector('[data-total]')!.textContent).toBe('20 of 300 files')
    expect(tip(files, 'files')).toBe('claude-code: 20 files read 5 times or more by one agent, of 300 files read; the most reads of one file: 30.')
    dispose()
  })

  it('switches to reads and reads again by repository, and splits the bytes and the files', () => {
    const { box, dispose, navigated } = draw(Rereads, 'rereads', rereads)
    colourBy(box, 'Repository')
    expect(navigated).toEqual([{ by: 'repo' }])
    expect(box.querySelector('[data-chart="reread-reads"]')).toBeNull()
    expect(texts(box.querySelectorAll('[data-repo-legend] li'), item => item.textContent)).toEqual(['app', 'docs', OTHER_REPOS])
    expect(rows(box, 'reread-reads-repos')).toEqual(['claude-code:reads', 'claude-code:again'])
    const reads = box.querySelector('[data-chart="reread-reads-repos"] [data-row="claude-code:reads"]')!
    expect([repos(reads), written(reads)]).toEqual([['0', '1', OTHER_TEXT], ['700 reads', '200 reads', '']])
    expect(tip(reads, 'repo:/src/app')).toBe('claude-code, file reads — app (/src/app): 700 reads · 70% of this bar. First reads 400, ' +
      'read again 300, over 200 files; 3 MB returned again. claude-code: 1,000 reads with a recorded path over 300 files, 400 of them ' +
      'of a file the same agent had already read (40%).')
    const bytes = box.querySelector('[data-chart="reread-bytes"] [data-row="claude-code"]')!
    expect(repos(bytes)).toEqual(['0', '1', OTHER_TEXT])
    expect(tip(bytes, 'repo:/src/docs')).toMatch(/^claude-code, bytes returned again — docs \(\/src\/docs\): 600 KB · 15% of this bar\. 60 reads again in this repository\./)
    const files = box.querySelector('[data-chart="reread-files"] [data-row="claude-code"]')!
    expect(tip(files, 'repo:/src/docs')).toMatch(/Of 70 files read in this repository\. .* Not split by repository: the maximum of a whole/)
    dispose()
  })

  it('draws by first read and again with no switch when the answer carries no split', () => {
    const plain = { ...rereads, repo_order: [], repo_others: null,
      tools: rereads.tools.map(tool => ({ ...tool, repos: undefined })) } as unknown as RereadBody
    const { box, dispose } = draw(Rereads, 'rereads', plain)
    expect(box.querySelector('[data-colour-by]')).toBeNull()
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    expect(rows(box, 'reread-reads')).toEqual(['all', 'claude-code', 'copilot-cli'])
    expect(parts(box.querySelector('[data-chart="reread-files"] [data-row="claude-code"]')!)).toEqual(['files'])
    dispose()
  })
})
