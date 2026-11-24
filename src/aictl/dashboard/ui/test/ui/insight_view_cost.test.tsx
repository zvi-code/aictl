// @vitest-environment jsdom
// The cost views of Insights (Pause tax, Context carry, Context weight, Fixed context overhead) as stand-alone views:
// the marks of each main chart, the "Colour by" switch between the view's own parts and the repositories, one hover per
// kind of mark, the line under the title, and a body without a split by repository. Invented rows only.
import type { JSX } from '@solidjs/web'
import { flush } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'
import type { CardProps } from '../../src/panels/insights/InsightCard'
import ContextCarry from '../../src/panels/insights/ContextCarry'
import ContextWeight from '../../src/panels/insights/ContextWeight'
import FixedContext from '../../src/panels/insights/FixedContext'
import PauseTax from '../../src/panels/insights/PauseTax'
import { readColourBy } from '../../src/panels/insights/charts/ColourBy'
import { carryLine, carryNameRows, contextLine, fixedKindRows, fixedLine, pauseColumns, pauseLine } from '../../src/panels/insights/costModel'
import type { CarryBody, ContextBody, FixedBody, PauseBody } from '../../src/panels/insights/insightsModel'
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

// ─── Context carry ───────────────────────────────────────────────────────────────────────────────────────────────────
const carryName = (tool: string, name: string, calls: number, output: number, later: number) => ({
  tool, tool_name: name, calls, output_bytes: output, carried_bytes: output * later, avg_later_requests: later,
  repos: segments({ output_bytes: [output * 0.6, output * 0.3, output * 0.1], carried_bytes: [output * later * 0.6, output * later * 0.3, output * later * 0.1] }),
})
const carry = {
  ...base, card: 'carry', repo_order: order, repo_others: others,
  tool_names: [carryName('claude-code', 'Read', 400, 20_000_000, 50), carryName('claude-code', 'Bash', 300, 5_000_000, 80)],
  tools: [{ tool: 'claude-code', calls: 800, reported: 700, output_bytes: 25_000_000, carried_bytes: 1_400_000_000,
    repos: segments({ output_bytes: [15e6, 7.5e6, 2.5e6], carried_bytes: [840e6, 420e6, 140e6] }) },
  { tool: 'codex-cli', calls: 150, reported: 0, output_bytes: null, carried_bytes: null }],
  summary: { output_bytes: 25_000_000, carried_bytes: 1_400_000_000, top: null, not_reported: ['codex-cli'] },
} as unknown as CarryBody

describe('INS-VIEW-COST · Context carry', () => {
  it('says what is measured in one line, and leads with the measured result bytes, not the estimate', () => {
    const { box, dispose } = draw(ContextCarry, 'carry', carry)
    expect(box.querySelector('[data-finding]')!.textContent).toBe(carryLine())
    expect(words(carryLine())).toBeLessThanOrEqual(30)
    expect(box.querySelector('[data-hero]')!.textContent).toBe('25 MBof tool results in 700 calls with a recorded size')
    dispose()
  })

  it('draws a row per tool name with the result bytes and the estimate in two lanes, each on its own scale', () => {
    const { box, dispose } = draw(ContextCarry, 'carry', carry)
    const chart = box.querySelector('[data-chart="carry-names"]')!
    expect(text(chart.querySelectorAll('[role="columnheader"]'))).toEqual(['', 'Result bytes', 'Sent again, estimate (upper bound)'])
    expect(attr(chart.querySelectorAll('[data-row]'), 'data-row')).toEqual(['claude-code:Read', 'claude-code:Bash'])
    expect(text(chart.querySelectorAll('[data-row] [data-total]'))).toEqual(['20 MB', 'up to 1 GB', '5 MB', 'up to 400 MB'])
    expect([...chart.querySelectorAll<HTMLElement>('[data-row] [role="group"]')].map(stack => stack.style.inlineSize))
      .toEqual(['100.00%', '100.00%', '25.00%', '40.00%'])
    expect(chart.querySelector('[data-row="claude-code:Bash"] small')!.textContent).toBe('claude-code · 300 calls · ≈ 80 later requests')
    expect(attr(chart.querySelectorAll('[data-lane]'), 'data-estimate')).toEqual([null, '', null, ''])
    // A tool that records no result size has a row with no bar, and is named under the charts.
    const codex = box.querySelector('[data-chart="carry-tools"] [data-row="codex-cli"]')!
    expect(text(codex.querySelectorAll('[data-total]'))).toEqual(['result size not reported', 'result size not reported'])
    expect(codex.querySelectorAll('[data-part]')).toHaveLength(0)
    expect(box.querySelector('[data-not-reported]')!.textContent).toBe('Result size not reported by: codex-cli.')
    dispose()
  })

  it('switches both lanes to a segment per repository', () => {
    const patches: UrlPatch[] = []
    const { box, dispose } = draw(ContextCarry, 'carry', carry, patches)
    expect(text(box.querySelectorAll('[data-parts-legend] li'))).toEqual(['Result bytes, recorded', 'Sent again, estimate (upper bound)'])
    switchTo(box, 'repo')
    expect(new URLSearchParams(location.search).get('by')).toBe('repo')
    const row = box.querySelector('[data-chart="carry-names"] [data-row="claude-code:Read"]')!
    expect(attr(row.querySelectorAll('[data-lane="0"] [data-part]'), 'data-repo')).toEqual(['0', '1', String(OTHER)])
    expect(attr(row.querySelectorAll('[data-lane="1"] [data-part]'), 'data-repo')).toEqual(['0', '1', String(OTHER)])
    expect(tip(row.querySelector('[data-lane="0"]')!, 'repo:/work/wiki')).toMatch(/^Read \(claude-code\), result bytes — wiki \(\/work\/wiki\): 6 MB · 30% of this bar\. /)
    dispose()
  })

  it('gives the result and the estimate marks a hover with their figures and the formula', () => {
    const { box, dispose } = draw(ContextCarry, 'carry', carry)
    const row = box.querySelector('[data-chart="carry-tools"] [data-row="claude-code"]')!
    expect(tip(row, 'output')).toBe('claude-code: 800 calls, 700 with a size, 25 MB of results; up to 1.4 GB sent again (estimate, upper bound).')
    expect(tip(row, 'carried')).toBe('claude-code: 800 calls, 700 with a size, 25 MB of results; up to 1.4 GB sent again (estimate, upper ' +
      'bound). All tools: 25 MB of results, up to 1.4 GB sent again (56× the result bytes, estimate).')
    expect(tip(box.querySelector('[data-chart="carry-names"] [data-row="claude-code:Read"]')!, 'output')).toBe('Read (claude-code): 400 calls ' +
      'returned 20 MB. Estimate, upper bound: each result × the later requests of the same session and agent (50 on average) = 1 GB; ' +
      'compaction and truncation are not taken into account.')
    dispose()
  })

  it('draws a body without a split by repository with no switch', () => {
    const { box, dispose } = draw(ContextCarry, 'carry', unsplit(carry))
    expect(box.querySelector('[data-colour-by]')).toBeNull()
    expect(attr(box.querySelectorAll('[data-chart="carry-names"] [data-part]'), 'data-part')).toEqual(['output', 'carried', 'output', 'carried'])
    expect(carryNameRows(unsplit(carry), 'repo', tool => tool)[0].cells[0].parts.map(part => part.key)).toEqual(['output'])
    dispose()
  })
})

// ─── Context weight ──────────────────────────────────────────────────────────────────────────────────────────────────
const ctxCell = (bucket: string, requests: number, cost: number) => ({
  bucket, requests, priced: requests, cost_usd: cost, request_share: requests / 1000, cost_share: cost / 200,
  repos: segments({ requests: [requests * 0.5, requests * 0.3, requests * 0.2], cost_usd: [cost * 0.5, cost * 0.3, cost * 0.2] }),
})
const weight = {
  ...base, card: 'context', repo_order: order, repo_others: others,
  tools: [{ tool: 'claude-code', requests: 1000, reported: 1000, p50_context: 120_000, p90_context: 300_000, cost_usd: 200,
    buckets: [ctxCell('under_50k', 100, 5), ctxCell('50_100k', 300, 30), ctxCell('100_200k', 400, 80), ctxCell('200_500k', 180, 70),
      ctxCell('over_500k', 20, 15)],
    heavy_requests: 200, heavy_cost_usd: 85, small_requests: 250, small_cost_usd: 20,
    repos: segments({ reported: [500, 300, 200], cost_usd: [100, 60, 40] }),
    small_repos: segments({ small_requests: [125, 75, 50], small_cost_usd: [10, 6, 4] }) },
  { tool: 'codex-cli', requests: 400, reported: 0, p50_context: null, p90_context: null, cost_usd: null,
    buckets: ['under_50k', '50_100k', '100_200k', '200_500k', 'over_500k'].map(bucket => ({ bucket, requests: 0, priced: 0, cost_usd: null,
      request_share: null, cost_share: null })),
    heavy_requests: 0, heavy_cost_usd: null, small_requests: null, small_cost_usd: null }],
  summary: { reported: 1000, heavy_requests: 200, heavy_share: 0.2, cost_usd: 200, heavy_cost_usd: 85, heavy_cost_share: 0.425,
    small_requests: 250, small_cost_usd: 20, not_reported: ['codex-cli'] },
} as unknown as ContextBody

describe('INS-VIEW-COST · Context weight', () => {
  it('says what is measured in one line, and a headline of one measured total', () => {
    const { box, dispose } = draw(ContextWeight, 'context', weight)
    expect(box.querySelector('[data-finding]')!.textContent).toBe(contextLine(weight))
    expect(words(contextLine(weight))).toBeLessThanOrEqual(30)
    expect(box.querySelector('[data-hero]')!.textContent).toBe('$200at list price for the 1,000 requests with token counts')
    dispose()
  })

  it('draws a column per context size in order, the heavy sizes in their own colour', () => {
    const { box, dispose } = draw(ContextWeight, 'context', weight)
    const chart = box.querySelector('[data-chart="context-cost-claude-code"]')!
    expect(attr(chart.querySelectorAll('[data-column]'), 'data-column')).toEqual(['under_50k', '50_100k', '100_200k', '200_500k', 'over_500k'])
    expect(text(chart.querySelectorAll('[data-column] [data-total]'))).toEqual(['$5.00', '$30.00', '$80.00', '$70.00', '$15.00'])
    expect(text(chart.querySelectorAll('[data-column] small'))).toEqual(['3%', '15%', '40%', '35%', '8%'])
    expect(text(chart.querySelectorAll('[data-column] > span:last-child')).map(label => label!.replace(/\d+%$/, '')))
      .toEqual(['under 50k', '50k–100k', '100k–200k', '200k–500k', '500k and more'])
    expect(text(box.querySelectorAll('[data-parts-legend] li'))).toEqual(['Context under 200k tokens', 'Context of 200k tokens or more'])
    // The tool with no token counts gets its name and one line, no empty chart.
    expect(box.querySelector('[data-tool="codex-cli"] [data-no-tokens]')).not.toBeNull()
    expect(box.querySelector('[data-chart="context-requests-codex-cli"]')).toBeNull()
    dispose()
  })

  it('marks the median and 90th percentile of each tool on one axis of tokens, with the bucket boundaries', () => {
    const { box, dispose } = draw(ContextWeight, 'context', weight)
    const strip = box.querySelector('[data-chart="context-percentiles"]')!
    expect(attr(strip.querySelectorAll('[data-row]'), 'data-row')).toEqual(['claude-code'])
    expect([...strip.querySelectorAll<HTMLElement>('[data-mark]')].map(mark => [mark.dataset.mark, mark.style.insetInlineStart]))
      .toEqual([['p50', '40.00%'], ['p90', '100.00%']])
    expect(text(strip.querySelectorAll('[data-scale] span span'))).toEqual(['0', '50k', '100k', '200k', '300 k'])
    expect(strip.querySelector('[data-total]')!.textContent).toBe('120 k · 300 k')
    dispose()
  })

  it('switches the columns and the small steps to a segment per repository; the percentiles stay whole', () => {
    const patches: UrlPatch[] = []
    const { box, dispose } = draw(ContextWeight, 'context', weight, patches)
    switchTo(box, 'repo')
    expect(new URLSearchParams(location.search).get('by')).toBe('repo')
    const column = box.querySelector('[data-chart="context-requests-claude-code"] [data-column="100_200k"]')!
    expect(attr(column.querySelectorAll('[data-part]'), 'data-repo')).toEqual(['0', '1', String(OTHER)])
    expect(tip(column, 'repo:/work/shop')).toMatch(/^claude-code, context 100k–200k tokens, requests — shop \(\/work\/shop\): 200 requests · 50% of this bar\. This repository in every context size: 500 requests · 50% of the tool's\. /)
    expect(attr(box.querySelectorAll('[data-chart="context-small"] [data-row="claude-code"] [data-part]'), 'data-repo'))
      .toEqual(['0', '1', String(OTHER)])
    expect(box.querySelector('[data-chart="context-percentiles"] [data-mark="p90"] [role="tooltip"]')!.textContent)
      .toContain('Not split by repository')
    dispose()
  })

  it('gives every kind of mark a hover with its figures', () => {
    const { box, dispose } = draw(ContextWeight, 'context', weight)
    expect(tip(box.querySelector('[data-chart="context-requests-claude-code"]')!, 'under_50k')).toBe('claude-code, context under 50k ' +
      'tokens: 100 requests (10% of 1,000 with token counts), $5.00 at list price (3% of $200), 100 priced.')
    expect(box.querySelector('[data-chart="context-percentiles"] [data-mark="p50"] [role="tooltip"]')!.textContent).toBe('claude-code: ' +
      'median context 120 k tokens (input + cache read + cache write) over 1,000 requests with token counts.')
    expect(tip(box.querySelector('[data-chart="context-small"]')!, 'small')).toBe('claude-code: 250 requests with under 150 output ' +
      'tokens and no thinking time (25% of 1,000), $20.00 at list price. All tools: 250 small steps, $20.00 at list price.')
    dispose()
  })

  it('draws a body without a split by repository with no switch, the columns whole', () => {
    const { box, dispose } = draw(ContextWeight, 'context', unsplit(weight))
    expect(box.querySelector('[data-colour-by]')).toBeNull()
    expect(attr(box.querySelectorAll('[data-chart="context-requests-claude-code"] [data-part]'), 'data-part'))
      .toEqual(['under_50k', '50_100k', '100_200k', '200_500k', 'over_500k'])
    dispose()
  })
})

// ─── Fixed context overhead ──────────────────────────────────────────────────────────────────────────────────────────
const KINDS = ['instruction_file', 'memory_file', 'system_prompt_other', 'skills', 'mcp_instructions', 'custom_agents', 'tools_listed']
const fixedCell = (kind: string, avg: number | null, p50: number | null) => avg == null
  ? { kind, reported: false, sessions: null, session_share: null, p50_tokens: null, avg_tokens: null, p50_items: null, estimated: false }
  : { kind, reported: true, sessions: 40, session_share: 1, p50_tokens: p50, avg_tokens: avg, p50_items: 3, estimated: true,
    repos: segments({ sessions: [20, 12, 8], avg_tokens: [avg * 0.5, avg * 0.3, avg * 0.2] }) }
const AVG: Record<string, [number, number] | null> = {
  instruction_file: [4000, 4200], memory_file: [1000, 900], system_prompt_other: null, skills: [3000, 3100],
  mcp_instructions: [1000, 800], custom_agents: null, tools_listed: [1000, 1000],
}
const fixedBody = {
  ...base, card: 'fixed', repo_order: order, repo_others: others,
  tools: [{ tool: 'claude-code', sessions: 40, p50_tokens: 9500, p90_tokens: 14_000, avg_tokens: 10_000, p50_skills: 30, estimated: true,
    kinds: KINDS.map(kind => fixedCell(kind, AVG[kind]?.[0] ?? null, AVG[kind]?.[1] ?? null)),
    repos: segments({ sessions: [20, 12, 8], avg_tokens: [5000, 3000, 2000] }) }],
  skills: [{ tool: 'claude-code', listed: 40, used: 10, listing_tokens: 120_000, unused_tokens: 90_000, uses: 25, skills_used: 10, triggers: [] }],
  top_skills: [{ tool: 'claude-code', name: 'pdf', sessions: 40, tokens: 12_000, uses: 4 }, { tool: 'claude-code', name: 'slides', sessions: 40, tokens: 8000, uses: 0 }],
  files: [{ tool: 'claude-code', file: 'AGENTS.md', sessions: 40, loads: 44, avg_tokens: 3000, max_tokens: 3500, tokens: 132_000 }],
  summary: { sessions: 40, heaviest: { tool: 'claude-code', p50_tokens: 9500 }, listed: 40, never_used: 30, never_used_share: 0.75,
    listing_tokens: 120_000, unused_tokens: 90_000, listing_not_reported: [] },
} as unknown as FixedBody

describe('INS-VIEW-COST · Fixed context overhead', () => {
  it('says what is measured in one line', () => {
    const { box, dispose } = draw(FixedContext, 'fixed', fixedBody)
    expect(box.querySelector('[data-finding]')!.textContent).toBe(fixedLine())
    expect(words(fixedLine())).toBeLessThanOrEqual(30)
    expect(box.querySelector('[data-hero] strong')!.textContent).toBe('75%')
    dispose()
  })

  it('stacks the average per session by kind, the kinds in their fixed order, one scale for every tool', () => {
    const { box, dispose } = draw(FixedContext, 'fixed', fixedBody)
    const row = box.querySelector('[data-chart="fixed-kinds"] [data-row="claude-code"]')!
    expect(attr(row.querySelectorAll('[data-part]'), 'data-part')).toEqual(['instruction_file', 'memory_file', 'skills', 'mcp_instructions', 'tools_listed'])
    expect(text(row.querySelectorAll('[data-part] button'))).toEqual(['4.0 k', '1.0 k', '3.0 k', '1.0 k', '1.0 k'])
    expect(row.querySelector('[data-total]')!.textContent).toBe('average 10 k tokens')
    expect(row.querySelector('small')!.textContent).toBe('40 sessions · estimated · not reported: Other system prompt, Custom agents')
    expect(text(box.querySelectorAll('[data-chart="fixed-kinds"] [aria-label$="legend"] li'))).toHaveLength(7)
    dispose()
  })

  it('marks the median, 90th percentile and average of the whole on one axis', () => {
    const { box, dispose } = draw(FixedContext, 'fixed', fixedBody)
    const row = box.querySelector('[data-chart="fixed-spread"] [data-row="claude-code"]')!
    expect([...row.querySelectorAll<HTMLElement>('[data-mark]')].map(mark => [mark.dataset.mark, mark.style.insetInlineStart]))
      .toEqual([['p50', '67.86%'], ['p90', '100.00%'], ['avg', '71.43%']])
    expect(row.querySelector('[data-total]')!.textContent).toBe('9.5 k · 14 k')
    expect(row.querySelector('[data-mark="avg"] [role="tooltip"]')!.textContent).toBe('claude-code, average fixed context per session: ' +
      '10 k tokens (estimated). claude-code: average 10 k tokens per session over 40 sessions (estimated); median 9.5 k tokens, 90th ' +
      'percentile 14 k tokens.')
    dispose()
  })

  it('switches the kind bars to a bar per tool and kind with a segment per repository; the rest stays whole', () => {
    const patches: UrlPatch[] = []
    const { box, dispose } = draw(FixedContext, 'fixed', fixedBody, patches)
    switchTo(box, 'repo')
    expect(new URLSearchParams(location.search).get('by')).toBe('repo')
    const rows = box.querySelectorAll('[data-chart="fixed-kinds"] [data-row]')
    expect(attr(rows, 'data-row')).toEqual(['claude-code', 'claude-code:instruction_file', 'claude-code:memory_file', 'claude-code:skills',
      'claude-code:mcp_instructions', 'claude-code:tools_listed'])
    expect(attr(rows[0].querySelectorAll('[data-part]'), 'data-repo')).toEqual(['0', '1', String(OTHER)])
    expect(tip(rows[1], 'repo:/work/wiki')).toMatch(/^claude-code, instruction files, average per session — wiki \(\/work\/wiki\): 1\.2 k tokens · 30% of this bar\. 12 sessions in this repository/)
    // A bar that is not split turns grey, so no chart colour reads as a repository's.
    expect(box.querySelector('[data-chart="fixed-files"] [data-part="avg"]')!.className).toContain('t7')
    expect(tip(box.querySelector('[data-chart="fixed-listing"]')!, 'unused')).toMatch(/Not split by repository\.$/)
    dispose()
  })

  it('gives the listing, the files and the skills a hover with their figures', () => {
    const { box, dispose } = draw(FixedContext, 'fixed', fixedBody)
    expect(tip(box.querySelector('[data-chart="fixed-listing"]')!, 'unused')).toBe('claude-code: listing of the 30 skills listed and not ' +
      'used in the period, 90 k tokens of 120 k tokens (estimated).')
    expect(tip(box.querySelector('[data-chart="fixed-files"]')!, 'avg')).toBe('AGENTS.md (claude-code): 3.0 k tokens per load on average, ' +
      'largest 3.5 k tokens; 44 loads in 40 sessions, 132 k tokens in all (estimated).')
    expect(text(box.querySelectorAll('[data-chart="fixed-skills"] [data-total]'))).toEqual(['12 k tokens · 4 uses', '8.0 k tokens · no use in the period'])
    dispose()
  })

  it('draws a body without a split by repository with no switch', () => {
    const { box, dispose } = draw(FixedContext, 'fixed', unsplit(fixedBody))
    expect(box.querySelector('[data-colour-by]')).toBeNull()
    expect(attr(box.querySelectorAll('[data-chart="fixed-kinds"] [data-row]'), 'data-row')).toEqual(['claude-code'])
    expect(fixedKindRows(unsplit(fixedBody), 'repo', tool => tool)).toEqual([])
    dispose()
  })
})
