// @vitest-environment jsdom
// The time and spend views as stand-alone views: one chart per question, one switch "Colour by", one line under the title.
import { flush } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'
import Subagents from '../../src/panels/insights/Subagents'
import { readColourBy } from '../../src/panels/insights/charts/ColourBy'
import type { SubagentBody } from '../../src/panels/insights/insightsModel'
import { OTHER, type RepoRef, type RepoSegment } from '../../src/panels/insights/repoSplit'
import { sessionRows, sideRepoRows, sideRows, subagentLine } from '../../src/panels/insights/subagentsModel'
import type { DetailState, PanelContext } from '../../src/panels/types'
import { createBoxes } from '../../src/ui/Box'
import { installDom, layoutHeaders, mount } from './dom'

const base = {
  range: { since: 1_700_000_000, until: 1_700_086_400 }, data_range: { first_ts: 1_700_000_100, last_ts: 1_700_080_000 },
  computed_at: 1_700_086_000,
}
const query = (view: string) => ({ view, kql: `// aictl view ${view}\nrequests | take 1`, kusto_url: 'https://c.kusto.windows.net/db' })
const order: RepoRef[] = [
  { repo: '/w/alpha', name: 'alpha', cost_usd: 300, requests: 900, sessions: 30 },
  { repo: '/w/beta', name: 'beta', cost_usd: 100, requests: 200, sessions: 5 },
]
const others = { repos: 2, cost_usd: 20, requests: 40, sessions: 4 }
const label = (tool: string) => tool

/** Segments of one bar: per repository its measures; shares are of the bar's whole. */
function split(rows: [string, Record<string, number>][]): RepoSegment[] {
  const total: Record<string, number> = {}
  for (const [, values] of rows) for (const [key, value] of Object.entries(values)) total[key] = (total[key] ?? 0) + value
  return rows.map(([repo, values]) => ({
    repo, name: repo ? repo.split('/').at(-1)! : null, ...values,
    share: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value / total[key]])),
    of_repo: Object.fromEntries(Object.keys(values).map(key => [key, null])),
  }))
}
/** What an older server answers: no split and no ranking. */
function unsplit<T>(body: T): T {
  return JSON.parse(JSON.stringify(body, (key, value) => key === 'repos' && Array.isArray(value) && value.every(item => 'share' in item)
    ? undefined : key === 'repo_order' ? [] : key === 'repo_others' ? null : value)) as T
}

function context(state: DetailState<unknown>) {
  return {
    scope: () => 'local', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined,
    filters: () => ({ projects: [], repos: [], model: 'all' }), tools: () => [], openAgent() {},
    detail: (path: () => string | undefined) => Object.assign(() => path() ? state : undefined, { retry() {} }),
  } as unknown as PanelContext
}
const props = (data: unknown) => ({ ctx: context({ data, status: 'ready', error: null }), boxes: createBoxes('test-view-time'),
  since: base.range.since, until: base.range.until })
const rows = (chart: Element | null) => [...chart!.querySelectorAll('[data-row]')].map(row => row.getAttribute('data-row'))
const parts = (row: Element) => [...row.querySelectorAll('[data-part]')].map(part => part.getAttribute('data-part'))
const written = (row: Element) => [...row.querySelectorAll('[data-part] button')].map(part => part.textContent)
const tip = (node: Element, selector: string) => node.querySelector(`${selector} [role="tooltip"]`)!.textContent
/** Clicks "Colour by: Repository" (or the view's own parts) and returns the address after it. */
function colourBy(box: Element, choice: 'parts' | 'repo') {
  box.querySelector<HTMLButtonElement>(`[data-colour-by] button:nth-child(${choice === 'repo' ? 2 : 1})`)!.click()
  flush()
  return location.search
}

beforeEach(() => { installDom(); layoutHeaders(); history.replaceState(null, '', '/?screen=insights&view=x') })

describe('INS-VIEW · Colour by', () => {
  it('reads the choice from the address: by=repo, anything else the view\'s own parts', () => {
    expect(readColourBy('?view=time&by=repo')).toBe('repo')
    expect(readColourBy('?view=time&by=kind')).toBe('parts')
    expect(readColourBy('')).toBe('parts')
  })
})

// ─── Spend in subagents ──────────────────────────────────────────────────────────────────────────────────────────────
const subagents = {
  ...base, card: 'subagents', view: 'insights.subagents', query: query('insights.subagents'), repo_order: order, repo_others: others,
  tools: [
    { tool: 'tool-a', subagent_share: 0.6,
      main: { requests: 400, priced: 400, cost_usd: 40, repos: split([['/w/alpha', { requests: 300, cost_usd: 30 }], ['/w/beta', { requests: 100, cost_usd: 10 }]]) },
      subagents: { requests: 600, priced: 600, cost_usd: 60, agents: 12,
        repos: split([['/w/alpha', { requests: 500, cost_usd: 50 }], ['', { requests: 100, cost_usd: 10 }]]) } },
    { tool: 'tool-b', subagent_share: 0.2,
      main: { requests: 240, priced: 240, cost_usd: 8, repos: split([['/w/beta', { requests: 240, cost_usd: 8 }]]) },
      subagents: { requests: 60, priced: 60, cost_usd: 2, agents: 3, repos: split([['/w/beta', { requests: 60, cost_usd: 2 }]]) } },
  ],
  sessions: [
    { session_id: 's-one', node_id: 'n', tool: 'tool-a', title: 'Draft the parser', git_branch: 'feat/parse', agents: 5, requests: 200,
      cost_usd: 25, main_cost: 9, repos: split([['/w/alpha', { cost_usd: 25, requests: 200 }]]) },
    { session_id: 's-two', node_id: 'n', tool: 'tool-a', title: 'Tidy the tests', agents: 2, requests: 50, cost_usd: 40, main_cost: 4,
      repos: split([['', { cost_usd: 40, requests: 50 }]]) },
  ],
  summary: { main_cost_usd: 48, subagent_cost_usd: 62, subagent_share: 62 / 110, subagents: 15, subagent_requests: 660, unpriced_requests: 3 },
} as unknown as SubagentBody

describe('INS-VIEW · Spend in subagents', () => {
  it('says in one line what is measured, and keeps the headline share with its denominator', () => {
    const { host, dispose } = mount(() => <Subagents {...props(subagents)} />)
    const box = host.querySelector('#insight-subagents')!
    expect(box.querySelector('[data-finding]')!.textContent).toBe(subagentLine(subagents))
    expect(subagentLine(subagents)).toBe('Model requests per tool and their cost at list price (US dollars), split by who made them: ' +
      'a session\'s main agent or its subagents.')
    expect(box.querySelector('[data-hero]')!.textContent).toBe('56%of the cost at list price is in subagent requests: $62.00 of $110')
    expect(box.querySelector('[data-note]')!.textContent).toBe('Cost is list price, not a bill. 3 requests with no known cost are left ' +
      'out of the cost.')
    expect(subagentLine({ ...subagents, summary: { ...subagents.summary, subagents: 0 } })).toBe('No subagent ran in this period.')
    dispose()
  })

  it('draws one bar per tool by side, cost on one scale and requests as 100%, with every figure written', () => {
    const { host, dispose } = mount(() => <Subagents {...props(subagents)} />)
    const box = host.querySelector('#insight-subagents')!
    const cost = box.querySelector('[data-chart="subagent-cost"]')
    expect(rows(cost)).toEqual(['tool-a', 'tool-b'])
    const a = cost!.querySelector('[data-row="tool-a"]')!
    expect([parts(a), written(a), a.querySelector('[data-total]')!.textContent]).toEqual([['main', 'subagents'], ['$40.00', '$60.00'], '$100'])
    // tool-b's bar is a tenth of tool-a's on the shared scale.
    expect(cost!.querySelector<HTMLElement>('[data-row="tool-b"] [role="group"]')!.style.inlineSize).toBe('10.00%')
    expect(box.querySelector<HTMLElement>('[data-chart="subagent-requests"] [data-row="tool-b"] [role="group"]')!.style.inlineSize).toBe('100.00%')
    expect(tip(a, '[data-part="subagents"]')).toBe('tool-a, subagents (12 subagents): 600 requests (60% of 1,000; 600 priced), $60.00 at ' +
      'list price (60% of $100).')
    expect([...box.querySelectorAll('[data-side-legend] li')].map(item => item.textContent)).toEqual(['Main agent', 'Subagents'])
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    // Sessions ranked by subagent cost, named by title and branch, coloured as subagents.
    const sessions = box.querySelector('[data-chart="subagent-sessions"]')
    expect(rows(sessions)).toEqual(['s-two', 's-one'])
    expect(sessions!.querySelector('[data-row="s-one"] > span')!.firstChild!.textContent).toBe('tool-a · Draft the parser · on feat/parse')
    expect(tip(sessions!, '[data-row="s-one"] [data-part="cost"]')).toBe('Session Draft the parser (tool-a): 5 subagents made 200 requests ' +
      'costing $25.00 at list price; its main agent cost $9.00.')
    dispose()
  })

  it('switches every chart to the repositories and back, one legend at a time, and keeps the choice in the address', () => {
    const { host, dispose } = mount(() => <Subagents {...props(subagents)} />)
    const box = host.querySelector('#insight-subagents')!
    expect(colourBy(box, 'repo')).toContain('by=repo')
    expect(box.querySelector('[data-side-legend]')).toBeNull()
    expect([...box.querySelectorAll('[data-repo-legend] li')].map(item => item.textContent)).toEqual(['alpha', 'beta', 'Other repositories'])
    const cost = box.querySelector('[data-chart="subagent-cost"]')
    expect(rows(cost)).toEqual(['tool-a:main', 'tool-a:subagents', 'tool-b:main', 'tool-b:subagents'])
    const sub = cost!.querySelector('[data-row="tool-a:subagents"]')!
    expect([...sub.querySelectorAll('[data-part]')].map(part => part.getAttribute('data-repo'))).toEqual(['0', String(OTHER)])
    expect(tip(sub, '[data-part="repo:/w/alpha"]')).toBe('tool-a, subagents, cost — alpha (/w/alpha): $50.00 · 83% of this bar. ' +
      'tool-a, subagents (12 subagents): 600 requests (60% of 1,000; 600 priced), $60.00 at list price (60% of $100).')
    expect(box.querySelector('[data-chart="subagent-sessions"] [data-row="s-one"] [data-part]')!.getAttribute('data-repo')).toBe('0')
    expect(colourBy(box, 'parts')).not.toContain('by=')
    expect(parts(box.querySelector('[data-chart="subagent-cost"] [data-row="tool-a"]')!)).toEqual(['main', 'subagents'])
    dispose()
  })

  it('draws a side the answer did not split as one grey part, and draws without repos at all', () => {
    const half = { ...subagents, tools: [{ ...subagents.tools[0], main: { ...subagents.tools[0].main, repos: undefined } }] } as SubagentBody
    const main = sideRepoRows(half, label, 'cost')[0]
    expect(main.parts.map(part => [part.key, part.tone, part.text])).toEqual([['whole', 7, '$40.00']])
    expect(main.parts[0].hover).toMatch(/Not split by repository in this answer\.$/)
    expect(sideRows(half, label, 'requests')[0].total).toBe('1,000 requests')
    expect(sessionRows(half, label, 'repo').map(row => row.key)).toEqual(['s-two', 's-one'])
    history.replaceState(null, '', '/?screen=insights&view=subagents&by=repo')
    const { host, dispose } = mount(() => <Subagents {...props(unsplit(subagents))} />)
    const box = host.querySelector('#insight-subagents')!
    expect(box.querySelector('[data-colour-by]')).toBeNull()
    expect(rows(box.querySelector('[data-chart="subagent-cost"]'))).toEqual(['tool-a', 'tool-b'])
    expect(parts(box.querySelector('[data-chart="subagent-sessions"] [data-row="s-one"]')!)).toEqual(['cost'])
    dispose()
  })
})
