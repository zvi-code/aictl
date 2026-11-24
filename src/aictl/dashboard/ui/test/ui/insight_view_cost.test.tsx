// @vitest-environment jsdom
// The cost views of Insights (Pause tax, Context carry, Context weight, Fixed context overhead) as stand-alone views:
// the marks of each main chart, the "Colour by" switch between the view's own parts and the repositories, one hover per
// kind of mark, the line under the title, and a body without a split by repository. Invented rows only.
import type { JSX } from '@solidjs/web'
import { flush } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'
import type { CardProps } from '../../src/panels/insights/InsightCard'
import PauseTax from '../../src/panels/insights/PauseTax'
import { readColourBy } from '../../src/panels/insights/charts/ColourBy'
import { pauseColumns, pauseLine } from '../../src/panels/insights/costModel'
import type { PauseBody } from '../../src/panels/insights/insightsModel'
import { OTHER, type RepoRef, type RepoSegment } from '../../src/panels/insights/repoSplit'
import type { UrlPatch } from '../../src/data/urlState'
import type { DetailState, PanelContext } from '../../src/panels/types'
import { createBoxes } from '../../src/ui/Box'
import { installDom, layoutHeaders, mount } from './dom'

const base = {
  view: 'insights.x', range: { since: 1_700_000_000, until: 1_700_086_400 },
  data_range: { first_ts: 1_700_000_100, last_ts: 1_700_080_000 }, computed_at: 1_700_086_000,
  query: { view: 'insights.x', kql: '// aictl view insights.x\nrequests | take 1', kusto_url: 'https://c.kusto.windows.net/db' },
  sessions: [],
}
const order: RepoRef[] = [
  { repo: '/work/shop', name: 'shop', cost_usd: 300, requests: 900, sessions: 30 },
  { repo: '/work/wiki', name: 'wiki', cost_usd: 100, requests: 200, sessions: 5 },
]
const others = { repos: 2, cost_usd: 20, requests: 40, sessions: 4 }
const REPOS: [string, string | null][] = [['/work/shop', 'shop'], ['/work/wiki', 'wiki'], ['', null]]

/** Three segments (shop, wiki, other) of a bar: each measure's values in that order, their shares of the bar. */
function segments(values: Record<string, [number, number, number]>): RepoSegment[] {
  return REPOS.map(([repo, name], i) => {
    const segment: RepoSegment = { repo, name, share: {}, of_repo: {} }
    for (const [key, triple] of Object.entries(values)) {
      const whole = triple.reduce((total, value) => total + value, 0)
      segment[key] = triple[i]
      segment.share[key] = whole ? triple[i] / whole : null
      segment.of_repo[key] = null
    }
    return segment
  })
}
/** A body as the store sends it without a split: every `repos` and the repository ranking removed. */
function unsplit<T>(body: T): T {
  const strip = (value: unknown): unknown => Array.isArray(value) ? value.map(strip)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value)
      .filter(([key]) => key !== 'repos' && key !== 'small_repos' && key !== 'repo_order' && key !== 'repo_others')
      .map(([key, inner]) => [key, strip(inner)])) : value
  return strip(body) as T
}

function context(data: unknown, patches: UrlPatch[] = []) {
  const state: DetailState<unknown> = { data, status: 'ready', error: null }
  return {
    scope: () => 'local', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined,
    filters: () => ({ projects: [], repos: [] }), tools: () => [], openAgent() {}, navigate: (patch: UrlPatch) => { patches.push(patch) },
    detail: (path: () => string | undefined) => Object.assign(() => path() ? state : undefined, { retry() {} }),
  } as unknown as PanelContext
}
function draw(View: (p: CardProps) => JSX.Element, card: string, data: unknown, patches: UrlPatch[] = []) {
  const given = { ctx: context(data, patches), boxes: createBoxes('test-cost-views'), since: base.range.since, until: base.range.until }
  const { host, dispose } = mount(() => <View {...given} />)
  return { box: host.querySelector(`#insight-${card}`)!, dispose }
}
const attr = (nodes: Iterable<Element>, name: string) => [...nodes].map(node => node.getAttribute(name))
const text = (nodes: Iterable<Element>) => [...nodes].map(node => node.textContent)
const tip = (scope: Element, part: string) => scope.querySelector(`[data-part="${part}"] [role="tooltip"]`)!.textContent
const switchTo = (box: Element, choice: 'parts' | 'repo') => {
  box.querySelector<HTMLButtonElement>(`[data-colour-by] button[role="radio"]:nth-of-type(${choice === 'repo' ? 2 : 1})`)!.click()
  flush()
}
/** The words above the fold: the line under the title, the headline, the switch, the chart titles and axis lines. */
const words = (value: string) => value.trim().split(/\s+/).filter(Boolean).length

beforeEach(() => { installDom(); layoutHeaders(); history.replaceState(null, '', '/?screen=insights&range=all') })

describe('INS-VIEW-COST · The "Colour by" choice lives in the address', () => {
  it('reads by=repo, and the view\'s own parts otherwise', () => {
    expect(readColourBy('?view=pause&by=repo')).toBe('repo')
    expect(readColourBy('?view=pause')).toBe('parts')
    expect(readColourBy('?by=anything')).toBe('parts')
  })
})

// ─── Pause tax ───────────────────────────────────────────────────────────────────────────────────────────────────────
const pauseCell = (bucket: string, requests: number, avg: number, repos?: RepoSegment[]) =>
  ({ bucket, requests, priced: requests, cache_hit_share: 0.5, avg_cost_usd: avg, cost_usd: avg * requests, repos })
const pause = {
  ...base, card: 'pause', repo_order: order, repo_others: others,
  tools: [{
    tool: 'claude-code', cache_reported: true,
    buckets: [pauseCell('under_1m', 600, 0.1, segments({ requests: [400, 150, 50], cost_usd: [40, 15, 5] })),
      pauseCell('1_5m', 300, 0.1, segments({ requests: [200, 60, 40], cost_usd: [20, 6, 4] })),
      pauseCell('5_60m', 80, 0.5, segments({ requests: [50, 20, 10], cost_usd: [25, 10, 5] })),
      pauseCell('over_60m', 20, 1, segments({ requests: [10, 5, 5], cost_usd: [10, 5, 5] }))],
    long_pause: { requests: 100, priced: 100, cost_usd: 60, estimate_usd: 10,
      repos: segments({ requests: [60, 25, 15], cost_usd: [35, 15, 10], estimate_usd: [6, 2.5, 1.5] }) },
  }],
  causes: [{ tool: 'claude-code', cause: 'tool_running', requests: 60, priced: 60, cost_usd: 40, share: 2 / 3, buckets: [],
    repos: segments({ cost_usd: [25, 10, 5] }) },
  { tool: 'claude-code', cause: 'new_prompt', requests: 40, priced: 40, cost_usd: 20, share: 1 / 3, buckets: [],
    repos: segments({ cost_usd: [10, 5, 5] }) }],
  summary: { sessions: 12, tools: ['claude-code'], requests: 100, cost_usd: 60, baseline_usd: 10, extra_usd: 50, not_reported: [] },
} as unknown as PauseBody

describe('INS-VIEW-COST · Pause tax', () => {
  it('says what is measured in one line, and a headline of one measured total', () => {
    const { box, dispose } = draw(PauseTax, 'pause', pause)
    expect(box.querySelector('[data-finding]')!.textContent).toBe(pauseLine(pause))
    expect(pauseLine(pause)).toBe('Model requests and their cost at list price, by the pause before each request: the time since the ' +
      'previous request of the same session and agent.')
    expect(words(pauseLine(pause))).toBeLessThanOrEqual(30)
    expect(box.querySelector('[data-hero]')!.textContent).toBe('$60.00at list price for the 100 requests that followed a pause of ' +
      '5 minutes or more in 12 sessions')
    dispose()
  })

  it('draws a column per pause length in order, the value over each and its share under it', () => {
    const { box, dispose } = draw(PauseTax, 'pause', pause)
    const requests = box.querySelector('[data-chart="pause-requests-claude-code"]')!
    expect(attr(requests.querySelectorAll('[data-column]'), 'data-column')).toEqual(['under_1m', '1_5m', '5_60m', 'over_60m'])
    expect(text(requests.querySelectorAll('[data-column] [data-total]'))).toEqual(['600', '300', '80', '20'])
    expect(text(requests.querySelectorAll('[data-column] small'))).toEqual(['60%', '30%', '8%', '2%'])
    // One scale from 0: the largest column is full height, the others in proportion.
    expect([...requests.querySelectorAll<HTMLElement>('[data-column] [role="group"]')].map(stack => stack.style.blockSize))
      .toEqual(['100.00%', '50.00%', '13.33%', '3.33%'])
    expect(text(box.querySelectorAll('[data-chart="pause-cost-claude-code"] [data-total]'))).toEqual(['$60.00', '$30.00', '$40.00', '$20.00'])
    expect(text(box.querySelectorAll('[data-chart="pause-average-claude-code"] [data-total]'))).toEqual(['$0.10', '$0.10', '$0.50', '$1.00'])
    // Pauses under 5 minutes in one colour, 5 minutes or more in another; the legend names both.
    expect(text(box.querySelectorAll('[data-parts-legend] li'))).toEqual(['Pause under 5 min', 'Pause of 5 min or more'])
    dispose()
  })

  it('switches every split mark to a segment per repository and back, and writes the choice to the address', () => {
    const patches: UrlPatch[] = []
    const { box, dispose } = draw(PauseTax, 'pause', pause, patches)
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    switchTo(box, 'repo')
    expect(new URLSearchParams(location.search).get('by')).toBe('repo')
    expect(box.querySelectorAll('[data-repo-legend]')).toHaveLength(1)
    expect(box.querySelector('[data-parts-legend]')).toBeNull()
    const column = box.querySelector('[data-chart="pause-cost-claude-code"] [data-column="5_60m"]')!
    expect(attr(column.querySelectorAll('[data-part]'), 'data-repo')).toEqual(['0', '1', String(OTHER)])
    expect(tip(column, 'repo:/work/wiki')).toMatch(/^claude-code, pause 5–60 min, cost — wiki \(\/work\/wiki\): \$10\.00 · 25% of this bar\. /)
    // An average is not a sum: it stays whole, and says so.
    expect(attr(box.querySelectorAll('[data-chart="pause-average-claude-code"] [data-part]'), 'data-part'))
      .toEqual(['under_1m', '1_5m', '5_60m', 'over_60m'])
    switchTo(box, 'parts')
    expect(new URLSearchParams(location.search).get('by')).toBeNull()
    expect(box.querySelector('[data-repo-legend]')).toBeNull()
    dispose()
  })

  it('opens in the encoding the address names', () => {
    history.replaceState(null, '', '/?screen=insights&view=pause&by=repo')
    const { box, dispose } = draw(PauseTax, 'pause', pause)
    expect(box.querySelector('[data-colour-by]')!.getAttribute('data-colour-by')).toBe('repo')
    expect(box.querySelectorAll('[data-repo-legend]')).toHaveLength(1)
    dispose()
  })

  it('keeps the estimate in a lane of its own, named and hatched as an estimate, on the scale of the measured cost', () => {
    const { box, dispose } = draw(PauseTax, 'pause', pause)
    const chart = box.querySelector('[data-chart="pause-estimate"]')!
    expect(text(chart.querySelectorAll('[role="columnheader"]'))).toEqual(['', 'Measured', 'Estimate, not measured'])
    const row = chart.querySelector('[data-row="claude-code"]')!
    expect(text(row.querySelectorAll('[data-total]'))).toEqual(['$60.00', '$10.00 (estimate)'])
    expect(row.querySelector('[data-lane="1"]')!.hasAttribute('data-estimate')).toBe(true)
    expect([...row.querySelectorAll<HTMLElement>('[role="group"]')].map(stack => stack.style.inlineSize)).toEqual(['100.00%', '16.67%'])
    expect(tip(row, 'estimate')).toBe('claude-code, estimate: 100 priced requests after a pause of 5 minutes or more × $0.10, the ' +
      'tool\'s average cost per request after a pause under 1 minute = $10.00. Measured cost of the same requests: $60.00; ' +
      'difference $50.00. All compared tools: 100 requests after a pause of 5 minutes or more, measured $60.00, estimate $10.00, ' +
      'difference $50.00.')
    expect(chart.querySelector('[data-axis]')!.textContent).toContain('Estimate: priced requests × the tool\'s average cost')
    dispose()
  })

  it('gives every kind of mark a hover with its figures', () => {
    const { box, dispose } = draw(PauseTax, 'pause', pause)
    expect(tip(box.querySelector('[data-chart="pause-requests-claude-code"]')!, '1_5m')).toBe('claude-code, pause from 1 to under 5 ' +
      'minutes: 300 requests (30% of 1,000), $30.00 at list price (20% of $150), $0.10 per request over 300 priced, cache hits 50% of input.')
    expect(tip(box.querySelector('[data-chart="pause-causes"]')!, 'new_prompt')).toMatch(/^claude-code, A new prompt: 40 requests \(40 priced\), \$20\.00 at list price, 33% of the tool's \$60\.00/)
    expect(tip(box.querySelector('[data-chart="pause-estimate"]')!, 'measured')).toMatch(/^claude-code, measured: 100 requests after a pause of 5 minutes or more \(100 priced\) cost \$60\.00 at list price\./)
    dispose()
  })

  it('draws a body without a split by repository with no switch, the columns whole', () => {
    const plain = unsplit(pause)
    const { box, dispose } = draw(PauseTax, 'pause', plain)
    expect(box.querySelector('[data-colour-by]')).toBeNull()
    expect(text(box.querySelectorAll('[data-chart="pause-requests-claude-code"] [data-total]'))).toEqual(['600', '300', '80', '20'])
    expect(pauseColumns(plain, plain.tools[0], 'cost', 'repo', tool => tool).every(column => column.parts.length === 1)).toBe(true)
    dispose()
  })
})
