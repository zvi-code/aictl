// @vitest-environment jsdom
// Every name the cost views of Insights draw is a way in: a coding tool narrows the page to it, a project narrows it to
// the project, a tool name opens the tool, a skill its detail, a session its team. A name with nothing to open (a pause
// length, a context size, a kind of fixed context, a file drawn as the last part of its path, "Other projects") stays
// text. Invented rows only.
import type { JSX } from '@solidjs/web'
import { flush } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'
import ContextCarry from '../../src/panels/insights/ContextCarry'
import ContextWeight from '../../src/panels/insights/ContextWeight'
import FixedContext from '../../src/panels/insights/FixedContext'
import type { CardProps } from '../../src/panels/insights/InsightCard'
import type { CarryBody, ContextBody, FixedBody, PauseBody, SubagentBody } from '../../src/panels/insights/insightsModel'
import PauseTax from '../../src/panels/insights/PauseTax'
import Subagents from '../../src/panels/insights/Subagents'
import type { Detail, PanelContext } from '../../src/panels/types'
import { createBoxes } from '../../src/ui/Box'
import { installDom, layoutHeaders, mount } from './dom'

beforeEach(() => { installDom(); layoutHeaders(); history.replaceState(null, '', '/?screen=insights&range=all') })

const base = {
  view: 'insights.x', range: { since: 1_700_000_000, until: 1_700_086_400 },
  data_range: { first_ts: 1_700_000_100, last_ts: 1_700_080_000 }, computed_at: 1_700_086_000,
  query: { view: 'insights.x', kql: '// aictl view insights.x\nrequests | take 1', kusto_url: 'https://c.kusto.windows.net/db' },
  sessions: [],
}

type Went = { details: Detail[]; agents: string[]; patches: Record<string, unknown>[] }
function draw(View: (p: CardProps) => JSX.Element, card: string, data: unknown) {
  const went: Went = { details: [], agents: [], patches: [] }
  const ctx = {
    scope: () => 'local', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined,
    filters: () => ({ projects: [], repos: [] }), tools: () => [],
    openAgent(id: string, tab = 'flow') { went.agents.push(`${id}:${tab}`) },
    openDetail(detail: Detail) { went.details.push(detail) },
    navigate(patch: Record<string, unknown>) { went.patches.push(patch) },
    detail: (path: () => string | undefined) => Object.assign(() => path() ? { data, status: 'ready', error: null } : undefined, { retry() {} }),
  } as unknown as PanelContext
  const given = { ctx, boxes: createBoxes(`test-open-${card}`), since: base.range.since, until: base.range.until }
  const { host, dispose } = mount(() => <View {...given} />)
  return { box: host.querySelector(`#insight-${card}`)!, went, dispose }
}
/** The opening name in a chart's row (or in the first row when no key is given). */
const name = (box: Element, chart: string, row?: string) =>
  box.querySelector<HTMLElement>(`[data-chart="${chart}"] ${row ? `[data-row="${CSS.escape(row)}"]` : ''} [data-open]`)
/** Open the data table and press the button of a column in its first row with that text. */
function inTable(box: Element, label: string) {
  box.querySelector<HTMLDetailsElement>('[data-more]')!.open = true
  for (const details of box.querySelectorAll<HTMLDetailsElement>('details')) details.open = true
  flush()
  return [...box.querySelectorAll<HTMLButtonElement>('table button')].find(button => button.getAttribute('aria-label')?.includes(label))
}
const narrowedTo = (went: Went, tool: string) => went.patches.map(patch => JSON.stringify(patch)).filter(text => text.includes(tool))

// ─── Pause tax ───────────────────────────────────────────────────────────────────────────────────────────────────────
const pauseCell = (bucket: string, requests: number, avg: number) =>
  ({ bucket, requests, priced: requests, cache_hit_share: 0.5, avg_cost_usd: avg, cost_usd: avg * requests })
const pause = {
  ...base, card: 'pause',
  tools: [{ tool: 'claude-code', cache_reported: true,
    buckets: [pauseCell('under_1m', 600, 0.1), pauseCell('1_5m', 300, 0.1), pauseCell('5_60m', 80, 0.5), pauseCell('over_60m', 20, 1)],
    long_pause: { requests: 100, priced: 100, cost_usd: 60, estimate_usd: 10 } }],
  causes: [{ tool: 'claude-code', cause: 'tool_running', requests: 100, priced: 100, cost_usd: 60, share: 1, buckets: [] }],
  cause_tools: [{ tool: 'claude-code', tool_name: 'Bash', program: 'npm', requests: 12, cost_usd: 9, p50_call_s: 400, max_call_s: 900 },
    { tool: 'claude-code', tool_name: null, program: null, requests: 3, cost_usd: 1, p50_call_s: 320, max_call_s: 330 }],
  projects: [{ project: '/work/shop', tool: 'claude-code', requests: 60, sessions: 4, cost_usd: 40, extra_usd: 30 }],
  summary: { sessions: 12, tools: ['claude-code'], requests: 100, cost_usd: 60, baseline_usd: 10, extra_usd: 50, not_reported: [] },
} as unknown as PauseBody

describe('INS-OPEN-COST · Pause tax', () => {
  it('narrows the page to a coding tool from its heading, its cause bar, its estimate row and the data table', () => {
    const { box, went, dispose } = draw(PauseTax, 'pause', pause)
    box.querySelector<HTMLElement>('[data-tool="claude-code"] h2 [data-open]')!.click()
    name(box, 'pause-causes', 'claude-code')!.click()
    name(box, 'pause-estimate', 'claude-code')!.click()
    inTable(box, 'Set the coding tool filter to claude-code')!.click()
    expect(narrowedTo(went, 'claude-code')).toHaveLength(4)
    dispose()
  })

  it('narrows the page to a project; a call opens its tool; the rest of the projects and an unnamed call stay text', () => {
    const { box, went, dispose } = draw(PauseTax, 'pause', pause)
    name(box, 'pause-projects', '/work/shop')!.click()
    expect(went.patches).toEqual([{ project: ['/work/shop'], repo: null, sel: null }])
    expect(box.querySelector('[data-chart="pause-projects"] [data-row="rest"]')!.textContent).toContain('Other projects')
    expect(name(box, 'pause-projects', 'rest')).toBeNull()
    const calls = [...box.querySelectorAll<HTMLElement>('[data-chart="pause-calls"] [data-open]')]
    expect(calls.map(call => call.textContent)).toEqual(['Bash (npm)'])
    calls[0].click()
    expect(went.details).toEqual([{ type: 'tool', name: 'Bash' }])
    // A pause length is a bucket: it opens nothing.
    expect(box.querySelector('[data-chart="pause-requests-claude-code"] [data-open]')).toBeNull()
    dispose()
  })
})

// ─── Context carry ───────────────────────────────────────────────────────────────────────────────────────────────────
const carry = {
  ...base, card: 'carry',
  tool_names: [{ tool: 'claude-code', tool_name: 'Read', calls: 400, output_bytes: 20_000_000, carried_bytes: 1e9, avg_later_requests: 50 }],
  tools: [{ tool: 'claude-code', calls: 800, reported: 700, output_bytes: 25_000_000, carried_bytes: 1_400_000_000 },
    { tool: 'codex-cli', calls: 150, reported: 0, output_bytes: null, carried_bytes: null }],
  summary: { output_bytes: 25_000_000, carried_bytes: 1_400_000_000, top: null, not_reported: ['codex-cli'] },
} as unknown as CarryBody

describe('INS-OPEN-COST · Context carry', () => {
  it('opens a tool name as the tool and narrows the page to a coding tool, in the charts, the note and the table', () => {
    const { box, went, dispose } = draw(ContextCarry, 'carry', carry)
    name(box, 'carry-names')!.click()
    expect(went.details).toEqual([{ type: 'tool', name: 'Read' }])
    name(box, 'carry-tools', 'claude-code')!.click()
    box.querySelector<HTMLElement>('[data-not-reported] [data-open]')!.click()
    expect(narrowedTo(went, 'claude-code')).toHaveLength(1)
    expect(narrowedTo(went, 'codex-cli')).toHaveLength(1)
    inTable(box, 'Open tool Read')!.click()
    expect(went.details).toHaveLength(2)
    // "All tool names" of a tool's total row names no tool name.
    expect(inTable(box, 'Open tool All tool names')).toBeUndefined()
    dispose()
  })
})

// ─── Context weight ──────────────────────────────────────────────────────────────────────────────────────────────────
const ctxCell = (bucket: string, requests: number, cost: number) =>
  ({ bucket, requests, priced: requests, cost_usd: cost, request_share: requests / 1000, cost_share: cost / 200 })
const weight = {
  ...base, card: 'context',
  tools: [{ tool: 'claude-code', requests: 1000, reported: 1000, p50_context: 120_000, p90_context: 300_000, cost_usd: 200,
    buckets: [ctxCell('under_50k', 100, 5), ctxCell('50_100k', 300, 30), ctxCell('100_200k', 400, 80), ctxCell('200_500k', 180, 70),
      ctxCell('over_500k', 20, 15)],
    heavy_requests: 200, heavy_cost_usd: 85, small_requests: 250, small_cost_usd: 20 }],
  summary: { reported: 1000, heavy_requests: 200, heavy_share: 0.2, cost_usd: 200, heavy_cost_usd: 85, heavy_cost_share: 0.425,
    small_requests: 250, small_cost_usd: 20, not_reported: [] },
} as unknown as ContextBody

describe('INS-OPEN-COST · Context weight', () => {
  it('narrows the page to a coding tool from its heading, the percentile strip, the small steps and the table', () => {
    const { box, went, dispose } = draw(ContextWeight, 'context', weight)
    box.querySelector<HTMLElement>('[data-tool="claude-code"] h2 [data-open]')!.click()
    box.querySelector<HTMLElement>('[data-chart="context-percentiles"] [data-open]')!.click()
    name(box, 'context-small', 'claude-code')!.click()
    inTable(box, 'Set the coding tool filter to claude-code')!.click()
    expect(narrowedTo(went, 'claude-code')).toHaveLength(4)
    // A context size is a bucket: it opens nothing.
    expect(box.querySelector('[data-chart="context-requests-claude-code"] [data-open]')).toBeNull()
    dispose()
  })
})

// ─── Fixed context overhead ──────────────────────────────────────────────────────────────────────────────────────────
const KINDS = ['instruction_file', 'memory_file', 'system_prompt_other', 'skills', 'mcp_instructions', 'custom_agents', 'tools_listed']
const fixed = {
  ...base, card: 'fixed',
  tools: [{ tool: 'claude-code', sessions: 40, p50_tokens: 9500, p90_tokens: 14_000, avg_tokens: 10_000, p50_skills: 30, estimated: true,
    kinds: KINDS.map(kind => ({ kind, reported: true, sessions: 40, session_share: 1, p50_tokens: 1000, avg_tokens: 1000, p50_items: 3,
      estimated: true })) }],
  skills: [{ tool: 'claude-code', listed: 40, used: 10, listing_tokens: 120_000, unused_tokens: 90_000, uses: 25, skills_used: 10, triggers: [] }],
  top_skills: [{ tool: 'claude-code', name: 'pdf', sessions: 40, tokens: 12_000, uses: 4 }],
  files: [{ tool: 'claude-code', file: 'AGENTS.md', sessions: 40, loads: 44, avg_tokens: 3000, max_tokens: 3500, tokens: 132_000 }],
  summary: { sessions: 40, heaviest: { tool: 'claude-code', p50_tokens: 9500 }, listed: 40, never_used: 30, never_used_share: 0.75,
    listing_tokens: 120_000, unused_tokens: 90_000, listing_not_reported: ['copilot-cli'] },
} as unknown as FixedBody

describe('INS-OPEN-COST · Fixed context overhead', () => {
  it('narrows the page to a coding tool from every chart that ranks tools, the note and the table; a skill opens its detail', () => {
    const { box, went, dispose } = draw(FixedContext, 'fixed', fixed)
    name(box, 'fixed-kinds', 'claude-code')!.click()
    box.querySelector<HTMLElement>('[data-chart="fixed-spread"] [data-open]')!.click()
    name(box, 'fixed-listing', 'claude-code')!.click()
    inTable(box, 'Set the coding tool filter to claude-code')!.click()
    expect(narrowedTo(went, 'claude-code')).toHaveLength(4)
    box.querySelector<HTMLElement>('[data-listing-not-reported] [data-open]')!.click()
    expect(narrowedTo(went, 'copilot-cli')).toHaveLength(1)
    name(box, 'fixed-skills')!.click()
    expect(went.details).toEqual([{ type: 'skill', name: 'pdf' }])
    // A file is drawn as the last part of its path: there is no path to open.
    expect(box.querySelector('[data-chart="fixed-files"]')!.textContent).toContain('AGENTS.md')
    expect(name(box, 'fixed-files')).toBeNull()
    dispose()
  })
})

// ─── Spend in subagents ──────────────────────────────────────────────────────────────────────────────────────────────
const pair = JSON.stringify(['host-b', 'abcdef12-3456-7890-abcd-ef1234567890'])
const subagents = {
  ...base, card: 'subagents',
  tools: [{ tool: 'claude-code', main: { requests: 100, priced: 100, cost_usd: 37 }, subagents: { requests: 300, priced: 300, cost_usd: 63, agents: 4 },
    subagent_share: 0.63 }],
  summary: { main_cost_usd: 37, subagent_cost_usd: 63, subagent_share: 0.63, subagents: 4, subagent_requests: 300 },
  sessions: [{ session_id: pair, node_id: 'host-b', tool: 'claude-code', title: 'Fix the login page', requests: 30, cost_usd: 63, main_cost: 37,
    agents: 4 }],
} as unknown as SubagentBody

describe('INS-OPEN-COST · Spend in subagents', () => {
  it('narrows the page to a coding tool from both bars and the table; a session opens its team with its id as given', () => {
    const { box, went, dispose } = draw(Subagents, 'subagents', subagents)
    name(box, 'subagent-cost', 'claude-code')!.click()
    name(box, 'subagent-requests', 'claude-code')!.click()
    inTable(box, 'Set the coding tool filter to claude-code')!.click()
    expect(narrowedTo(went, 'claude-code')).toHaveLength(3)
    const session = name(box, 'subagent-sessions')!
    expect(session.getAttribute('aria-label')).toBe('Open session Fix the login page')
    session.click()
    expect(went.agents).toEqual([`${pair}:team`])
    dispose()
  })
})
