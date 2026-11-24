// @vitest-environment jsdom
// The tool-call views of Insights as stand-alone views: After a failure, Repeated file reads, Skills, MCP servers and
// Kusto queries. Per view: the marks of the main chart, the "Colour by" switch, a hover per kind of mark, the line
// under the title, and a body without `repos`.
import { flush } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { beforeEach, describe, expect, it } from 'vitest'
import AfterFailure from '../../src/panels/insights/AfterFailure'
import Rereads from '../../src/panels/insights/Rereads'
import Mcp from '../../src/panels/insights/Mcp'
import type { McpBody } from '../../src/panels/insights/mcpModel'
import Skills from '../../src/panels/insights/Skills'
import type { SkillsBody } from '../../src/panels/insights/skillsModel'
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

// ─── SVG bar charts (Skills, MCP servers, Kusto queries) ─────────────────────────────────────────────────────────────
const svgRow = (box: Element, chart: string, row: string) => box.querySelector(`[data-chart="${chart}"] [data-row="${row}"]`)!
const svgTip = (row: Element, part: string) => row.querySelector(`[data-part="${part}"] title`)!.textContent
const values = (box: Element, chart: string) => texts(box.querySelectorAll(`[data-chart="${chart}"] [data-value]`), node => node.textContent)
const charts = (box: Element) => texts(box.querySelectorAll('[data-chart]'), node => node.getAttribute('data-chart'))

// ─── Skills ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const skillWhole = { uses: 100, cost_usd: 50, after_edit: 0.6, after_test: 0.2, after_commit: 0.1 }
const skill = { name: 'review', uses: 100, sessions: 40, projects: 3, tools: ['claude-code'], turns: 90, turn_tokens: 9_000_000, cost_usd: 50,
  cost_share: 0.25, with_turn: 90, after_edit: 0.6, after_test: 0.2, after_commit: 0.1,
  repos: [seg('/src/app', { uses: 70, cost_usd: 40, after_edit: 0.5, after_test: 0.2, after_commit: 0 }, skillWhole),
    seg('', { uses: 30, cost_usd: 10, after_edit: 0.1, after_test: 0, after_commit: 0.1 }, skillWhole)] }
const skills = {
  ...base, card: 'skills', repo_order: order, repo_others: others, sessions: [],
  skills: [skill, { ...skill, name: 'deploy', uses: 20, sessions: 10, cost_usd: 5, cost_share: 0.025, repos: [] }],
  small_skills: [{ ...skill, name: 'rare', uses: 2, sessions: 2, repos: [] }],
  unused: [{ tool: 'claude-code', name: 'never-used', sessions: 24, list_tokens: 7000,
    repos: [seg('/src/docs', { list_tokens: 7000 }, { list_tokens: 7000 })] }],
  listings: [{ tool: 'claude-code', listed: 40, unused: 30, sessions: 25, list_tokens: 20_000, unused_tokens: 15_000 }],
  tools: [{ tool: 'claude-code', uses: 120, skills: 2, sessions: 50, with_turn: 110,
    repos: [seg('/src/app', { uses: 80 }, { uses: 120 }), seg('/src/docs', { uses: 40 }, { uses: 120 })] }],
  projects: [{ project: '/src/app', uses: 80, skills: 2, sessions: 30, repos: [seg('/src/app', { uses: 80 }, { uses: 80 })] }],
  summary: { uses: 122, skills: 3, sessions: 50, cost_usd: 200, top: skill, use_tools: ['claude-code'], listing_tools: ['claude-code'],
    listed: 40, unused: 30, unused_tokens: 15_000, listed_sessions: 25, small_skills: 1, small_projects: [] },
} as unknown as SkillsBody

describe('INS-V-C · Skills', () => {
  it('states what is measured and draws the rankings side by side, uses per skill first', () => {
    const { box, dispose } = draw(Skills, 'skills', skills)
    expect(finding(box)).toBe('Skill uses (skill_uses records, any trigger) per skill, project and tool; the list price of the turns they ' +
      'ran in; what followed in the same turn; skills listed to the model.')
    expect(charts(box)).toEqual(['uses', 'cost', 'after_edit', 'after_test', 'after_commit', 'projects', 'tools', 'unused', 'listings'])
    expect(rows(box, 'uses')).toEqual(['review', 'deploy'])
    expect(values(box, 'uses')).toEqual(['100 uses', '20 uses'])
    expect(box.querySelector('[data-totals] p')!.textContent).toMatch(/^122 skill uses of 3 skills in 50 sessions/)
    // No switch: the bars have no parts of their own to colour by; the legend is the repositories', once.
    expect(box.querySelector('[data-colour-by]')).toBeNull()
    expect(box.querySelectorAll('[data-repo-legend]').length).toBe(1)
    dispose()
  })

  it('splits uses, turn cost, what followed, unused listings, projects and tools by repository', () => {
    const { box, dispose } = draw(Skills, 'skills', skills)
    const uses = svgRow(box, 'uses', 'review')
    expect([parts(uses), repos(uses)]).toEqual([['repo:/src/app', 'repo:'], ['0', OTHER_TEXT]])
    expect(svgTip(uses, 'repo:/src/app')).toBe('review — app (/src/app): 70 uses · 70% of this bar. review: 100 uses in 40 sessions of ' +
      '3 projects, from claude-code; 90 of the uses belong to a recorded turn')
    // A skill whose answer carries no segment keeps its plain bar.
    expect(parts(svgRow(box, 'uses', 'deploy'))).toEqual(['c1'])
    expect(svgTip(svgRow(box, 'cost', 'review'), 'repo:/src/app')).toMatch(/^review, turn cost — app \(\/src\/app\): \$40\.00 · 80% of this bar\. 70 uses in this repository\. review: 90 turns/)
    const edit = svgRow(box, 'after_edit', 'review')
    expect(repos(edit)).toEqual(['0', OTHER_TEXT])
    expect(svgTip(edit, 'repo:')).toMatch(/^review, then edited a file — Other repositories \(every repository outside the 8 with the highest cost, summed\): 10% · 17% of this bar\. 30 uses in this repository\. review: 54 of 90 uses/)
    expect(svgTip(svgRow(box, 'after_commit', 'review'), 'repo:')).toContain('10%')
    expect(repos(svgRow(box, 'unused', 'claude-code:never-used'))).toEqual(['1'])
    expect(repos(svgRow(box, 'tools', 'claude-code'))).toEqual(['0', '1'])
    expect(repos(svgRow(box, 'projects', '/src/app'))).toEqual(['0'])
    // The listings are not split: neutral tones, not repository colours.
    expect(parts(svgRow(box, 'listings', 'claude-code'))).toEqual(['ink', 'muted'])
    dispose()
  })

  it('draws plain bars and no legend when the answer carries no split', () => {
    const strip = <T extends object>(list: T[]) => list.map(row => ({ ...row, repos: undefined }))
    const plain = { ...skills, repo_order: [], repo_others: null, skills: strip(skills.skills), unused: strip(skills.unused),
      tools: strip(skills.tools), projects: strip(skills.projects) } as unknown as SkillsBody
    const { box, dispose } = draw(Skills, 'skills', plain)
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    expect(parts(svgRow(box, 'uses', 'review'))).toEqual(['c1'])
    expect(parts(svgRow(box, 'after_edit', 'review'))).toEqual(['c1'])
    expect(values(box, 'after_edit')).toEqual(['60%', '60%'])
    dispose()
  })
})

// ─── MCP servers ─────────────────────────────────────────────────────────────────────────────────────────────────────
const mcpWhole = { calls: 650, failures: 30, sum_ms: 2_000_000, output_bytes: 60_000, carried_bytes: 20_000_000 }
const mcpFig = { ...mcpWhole, sessions: 13, projects: 4, failure_share: 30 / 650, enough: true, p50_ms: 27, p95_ms: 4661 }
const mcpRepos = [seg('/src/app', { calls: 500, failures: 10, sum_ms: 1_500_000, output_bytes: 40_000, carried_bytes: 15_000_000 }, mcpWhole),
  seg('', { calls: 150, failures: 20, sum_ms: 500_000, output_bytes: 20_000, carried_bytes: 5_000_000 }, mcpWhole)]
const mcpServer = { ...mcpFig, server: 'kusto', tools: ['claude-code'], server_tools: 1, repos: mcpRepos,
  calls_by_tool: [{ ...mcpFig, tool_name: 'query', repos: mcpRepos.map(item => ({ ...item, share: {}, of_repo: {} })) }] }
const mcp = {
  ...base, card: 'mcp', repo_order: order, repo_others: others, sessions: [],
  servers: [mcpServer, { ...mcpServer, server: 'docs', calls: 100, failures: 0, failure_share: 0, repos: [], calls_by_tool: [] }],
  small_servers: [],
  listed: [{ server: 'docs', tool: 'claude-code', sessions: 24, called_sessions: 4, list_tokens: 5000, unused_tokens: 4000, listed_tools: 16,
    repos: [seg('/src/docs', { sessions: 24, called_sessions: 4, unused_tokens: 4000 }, { sessions: 24, called_sessions: 4, unused_tokens: 4000 })] }],
  projects: [{ project: '/src/app', calls: 500, sessions: 10, servers: 1, failures: 10, sum_ms: 1_500_000, output_bytes: 40_000,
    repos: [seg('/src/app', { calls: 500, failures: 10 }, { calls: 500, failures: 10 })] }],
  summary: { calls: 750, all_calls: 10_000, call_share: 0.075, sum_ms: 2_500_000, time_share: 0.02, output_bytes: 70_000, carried_bytes: 20_000_000,
    failures: 30, servers: 2, top: mcpServer, listing_tools: ['claude-code'], listed_servers: 1, never_called: 0, unused_tokens: 4000,
    small_servers: 0, small_projects: [] },
} as unknown as McpBody

describe('INS-V-C · MCP servers', () => {
  it('states what is measured, leads with the MCP calls of all tool calls, and draws the rankings side by side', () => {
    const { box, dispose } = draw(Mcp, 'mcp', mcp)
    expect(finding(box)).toBe('MCP tool calls in the period, per server, server tool and project: calls, failures, duration and result bytes; ' +
      'MCP tools listed to the model.')
    expect(box.querySelector('[data-hero]')!.textContent).toBe('750MCP calls to 2 servers, of 10,000 tool calls (8%)')
    expect(charts(box)).toEqual(['calls', 'time', 'sum', 'returned', 'carried', 'server-tools', 'listed', 'projects'])
    expect(rows(box, 'calls')).toEqual(['kusto', 'docs'])
    expect(values(box, 'calls')).toEqual(['650 calls · 30 failed (5%)', '100 calls · 0 failed (0%)'])
    const kusto = svgRow(box, 'calls', 'kusto')
    expect(parts(kusto)).toEqual(['c1', 'bad'])
    expect(svgTip(kusto, 'bad')).toBe('kusto: 30 of 650 calls failed (5%)')
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    expect(box.querySelector('[data-totals] p')!.textContent).toMatch(/^750 MCP calls to 2 servers \(8% of 10,000 tool calls\), 30 failed/)
    dispose()
  })

  it('switches every split bar to repositories; the median time stays whole in a neutral tone', () => {
    const { box, dispose, navigated } = draw(Mcp, 'mcp', mcp)
    colourBy(box, 'Repository')
    expect(navigated).toEqual([{ by: 'repo' }])
    expect(texts(box.querySelectorAll('[data-repo-legend] li'), item => item.textContent)).toEqual(['app', 'docs', OTHER_REPOS])
    const kusto = svgRow(box, 'calls', 'kusto')
    expect([parts(kusto), repos(kusto)]).toEqual([['repo:/src/app', 'repo:'], ['0', OTHER_TEXT]])
    expect(svgTip(kusto, 'repo:')).toBe('kusto — Other repositories (every repository outside the 8 with the highest cost, summed): ' +
      '150 calls · 23% of this bar. 20 of them failed. kusto: 650 calls in 13 sessions of 4 projects; 30 failed (5%)')
    // A server the answer does not split keeps its own parts.
    expect(parts(svgRow(box, 'calls', 'docs'))).toEqual(['c1'])
    expect(parts(svgRow(box, 'time', 'kusto'))).toEqual(['muted'])
    expect(svgTip(svgRow(box, 'sum', 'kusto'), 'repo:/src/app')).toMatch(/^kusto, tool time — app \(\/src\/app\): 25 min · 75% of this bar\. 500 calls in this repository\. kusto: tool time 33 min/)
    expect(repos(svgRow(box, 'returned', 'kusto'))).toEqual(['0', OTHER_TEXT])
    expect(repos(svgRow(box, 'carried', 'kusto'))).toEqual(['0', OTHER_TEXT])
    expect(repos(svgRow(box, 'server-tools', 'kusto:query'))).toEqual(['0', OTHER_TEXT])
    expect(svgTip(svgRow(box, 'listed', 'claude-code:docs'), 'repo:/src/docs')).toMatch(/^docs, sessions that listed it — docs \(\/src\/docs\): 24 sessions · 100% of this bar\. Called in 4 of them; 4\.0 k listing tokens in those that did not\./)
    expect(repos(svgRow(box, 'projects', '/src/app'))).toEqual(['0'])
    expect(box.querySelector('[data-chart="calls"] [data-part="bad"]')).toBeNull()
    colourBy(box, 'Succeeded / failed')
    expect(parts(svgRow(box, 'calls', 'kusto'))).toEqual(['c1', 'bad'])
    dispose()
  })

  it('draws succeeded and failed with no switch when the answer carries no split', () => {
    history.replaceState(null, '', '/?screen=insights&range=all&by=repo')
    const strip = <T extends object>(list: T[]) => list.map(row => ({ ...row, repos: undefined }))
    const plain = { ...mcp, repo_order: [], repo_others: null, listed: strip(mcp.listed), projects: strip(mcp.projects),
      servers: mcp.servers.map(item => ({ ...item, repos: undefined, calls_by_tool: strip(item.calls_by_tool) })) } as unknown as McpBody
    const { box, dispose } = draw(Mcp, 'mcp', plain)
    expect(box.querySelector('[data-colour-by]')).toBeNull()
    expect(parts(svgRow(box, 'calls', 'kusto'))).toEqual(['c1', 'bad'])
    expect(parts(svgRow(box, 'listed', 'claude-code:docs'))).toEqual(['c1', 'muted'])
    dispose()
  })
})
