// @vitest-environment jsdom
import { flush } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'
import ModelReport from '../../src/panels/insights/ModelReport'
import {
  costText, effortCost, logPlace, modelFinding, modelHero, rateText, type ModelBody, type ModelFigures, type ModelRow,
} from '../../src/panels/insights/modelReportModel'
import type { DetailState, PanelContext } from '../../src/panels/types'
import { drawerPatch, nextAddress } from '../../src/shell/viewState'
import { createBoxes } from '../../src/ui/Box'
import { bodyRows, installDom, layoutHeaders, mount } from './dom'

const DAY = 86_400
const T0 = new Date(2023, 10, 14, 12).getTime() / 1000  // local noon, so day labels do not depend on the time zone
const figures = (values: Partial<ModelFigures>): ModelFigures => ({
  requests: 100, sessions: 10, priced: 100, cost_usd: 10, cost_per_request: 0.1, cache_reported: 100, cache_write_reported: 100,
  input_per_request: 50, cache_write_per_request: 900, cache_read_per_request: 40_000, output_per_request: 600,
  unsplit_prompt_per_request: null, thinking_reported: 0, p50_thinking_ms: null, reasoning_reported: 100, reasoning_per_request: 250,
  first_ts: T0, last_ts: T0 + 6 * DAY, calls: 13_680, failures: 356, refused: 2, exit_unknown: 10, call_sessions: 9,
  failure_share: 0.026, at_least: false, ...values,
})
const model = (name: string, values: Partial<ModelRow>): ModelRow => ({
  tool: 'copilot-cli', model: name, recorded_sessions: 10, helper: false, failing: [], efforts: [], ...figures(values), ...values,
})
const astra = model('gpt-6-astra', {
  requests: 556, priced: 130, cost_usd: 42.5, cost_per_request: 0.327, calls: 4000, failures: 116, failure_share: 0.029,
  failing: [{ tool_name: 'bash', failures: 70, share: 0.6 }, { tool_name: 'view', failures: 46, share: 0.4 }],
  efforts: [
    { effort: 'high', ...figures({ requests: 300, cost_per_request: 0.076, reasoning_per_request: 300 }) },
    { effort: 'medium', ...figures({ requests: 200, cost_per_request: 0.078, reasoning_per_request: 120 }) },
    { effort: 'low', ...figures({ requests: 5, cost_per_request: null }) },
  ],
})
const argon = model('gemini-4-argon', { cost_per_request: 0.075, failure_share: 0.026, first_ts: T0 + 2 * DAY })
const storeOnly = model('claude-opus-4-8', { requests: 40, sessions: 4, recorded_sessions: 0, calls: null, failures: null,
  refused: null, exit_unknown: null, call_sessions: null, failure_share: null, cost_per_request: 0.12 })
const partly = model('claude-sonnet-5', { requests: 60, sessions: 6, recorded_sessions: 2, calls: 131, call_sessions: 2,
  failure_share: null, cost_per_request: 0.05 })
const vscodeUnpriced = model('gpt-5.5', { tool: 'copilot-vscode', requests: 4, sessions: 2, priced: 0, cost_usd: null,
  cost_per_request: null, cache_reported: 0, cache_write_reported: 0, input_per_request: null, cache_write_per_request: null, cache_read_per_request: null,
  unsplit_prompt_per_request: null, calls: 0, failures: 0, failure_share: null, helper: true, reasoning_reported: 0,
  reasoning_per_request: null })
const vscodeSplit = model('claude-opus-4-8', { tool: 'copilot-vscode', requests: 400, priced: 30, cost_per_request: 0.9,
  cache_reported: 30, cache_write_reported: 0, cache_write_per_request: null, unsplit_prompt_per_request: 60_000, calls: 900, failures: 80, exit_unknown: 90, call_sessions: 5,
  failure_share: 80 / 900, at_least: true, reasoning_reported: 0, reasoning_per_request: null })
const body = {
  card: 'models', view: 'insights.model_report', range: { since: T0, until: T0 + 7 * DAY },
  data_range: { first_ts: T0, last_ts: T0 + 6 * DAY }, computed_at: T0 + 7 * DAY,
  query: { view: 'insights.model_report', kql: '// aictl view insights.model_report\nrequests | take 1', kusto_url: 'https://c.kusto.windows.net/db' },
  tools: [
    { tool: 'copilot-cli', requests: 1000, sessions: 30, no_model: 3, store_calls: 250, store_sessions: 42, unsplit_calls: 0,
      calls: 17_680, failures: 472, refused: 2, exit_unknown: 20, unattributed: 0, models: [astra, argon, storeOnly, partly] },
    { tool: 'copilot-vscode', requests: 404, sessions: 5, calls: 900, failures: 80, models: [vscodeSplit, vscodeUnpriced] },
    { tool: 'codex-cli', requests: 129, no_model: 129, calls: null, models: [] },
  ],
  summary: {
    lead: { kind: 'ratio', tool: 'copilot-cli', high: astra, low: argon, ratio: 0.327 / 0.075 },
    not_reported: { cost: ['codex-cli'], token_split: ['codex-cli'], cache_write: ['copilot-vscode'], thinking: ['copilot-cli', 'copilot-vscode', 'codex-cli'],
      reasoning: ['copilot-vscode', 'codex-cli'], effort: ['codex-cli'], model: ['codex-cli'], calls: ['codex-cli'] },
  },
  sessions: [
    { session_id: 's-cli', node_id: 'n', tool: 'copilot-cli', model: 'gpt-6-astra', models: 2, requests: 40, calls: 300, failures: 30, refused: 1, cost_usd: 4.2 },
    { session_id: 's-vs', node_id: 'n', tool: 'copilot-vscode', model: 'gpt-5.5', models: 1, requests: 3, calls: 20, failures: 5, refused: 0, cost_usd: null },
  ],
  tool_labels: { 'copilot-cli': 'Copilot CLI', 'copilot-vscode': 'Copilot in VS Code', 'codex-cli': 'Codex CLI' },
} as unknown as ModelBody
const label = (tool: string) => body.tool_labels![tool] ?? tool

function context(state: DetailState<unknown> | undefined, opened: string[] = []) {
  return {
    scope: () => 'local', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined,
    openAgent(id: string, tab = 'flow') {
      opened.push(`${id}:${tab}`)
      history.pushState(null, '', nextAddress(drawerPatch({ type: 'agent', id, tab })))
    },
    detail: (path: () => string | undefined) => Object.assign(() => path() ? state : undefined, { retry() {} }),
  } as unknown as PanelContext
}
const props = (ctx: PanelContext) => ({ ctx, boxes: createBoxes('test-models'), since: T0, until: T0 + 7 * DAY })

beforeEach(() => { installDom(); layoutHeaders(); history.replaceState(null, '', '/?screen=insights&range=all') })

describe('MOD-01 · The finding states the measured costs and failure shares and that this is not a comparison', () => {
  it('compares the dearest and cheapest priced model of the busiest tool, with each model\'s dates when they differ', () => {
    expect(modelFinding(body, label)).toBe('In Copilot CLI, gpt-6-astra cost 4.4× as much per priced request as gemini-4-argon at ' +
      'list price ($0.327 against $0.075) (gpt-6-astra Nov 14–Nov 20, gemini-4-argon Nov 16–Nov 20), and 2.9% of its tool ' +
      'calls were marked failed against 2.6%. They worked on different tasks, so this describes the work recorded here, not the models.')
    expect(modelHero(body, label)).toEqual({ value: '4.4×',
      label: 'the cost per priced request of gpt-6-astra against gemini-4-argon in Copilot CLI, at list price' })
  })

  it('writes "at least" for a floor, and says when calls were not recorded or too few for a share', () => {
    const floor = { ...body, summary: { ...body.summary, lead: { ...body.summary.lead!, high: vscodeSplit, low: { ...argon, first_ts: T0 } } } } as ModelBody
    expect(modelFinding(floor, label)).toContain('and at least 8.9% of its tool calls were marked failed against 2.6%.')
    const unrecorded = { ...body, summary: { ...body.summary, lead: { ...body.summary.lead!, high: storeOnly, low: { ...partly, first_ts: T0 } } } } as ModelBody
    expect(modelFinding(unrecorded, label)).toContain('; tool calls: claude-opus-4-8 calls not recorded, claude-sonnet-5 131 calls ' +
      'in 2 sessions, too few sessions for a failure share.')
    const fewCalls = { ...partly, calls: 60, call_sessions: 5 }
    const few = { ...body, summary: { ...body.summary, lead: { ...body.summary.lead!, high: storeOnly, low: { ...fewCalls, first_ts: T0 } } } } as ModelBody
    expect(modelFinding(few, label)).toContain('claude-sonnet-5 60 calls, too few for a failure share.')
    expect(modelFinding(unrecorded, label)).not.toMatch(/\b0(\.0)?%/)
  })

  it('leads with one model\'s cost, or with requests when nothing is priced, or says there is no request', () => {
    const one = { ...body, summary: { ...body.summary, lead: { kind: 'cost', tool: 'copilot-cli', high: astra, low: astra, ratio: null } } } as ModelBody
    expect(modelFinding(one, label)).toBe('In Copilot CLI, gpt-6-astra cost $0.327 per priced request at list price over 130 priced ' +
      'requests, and 2.9% of its tool calls were marked failed. This describes real work, not a controlled comparison.')
    const oneSession = { ...one, summary: { ...one.summary, lead: { kind: 'cost', tool: 'copilot-cli', high: { ...partly, call_sessions: 1 },
      low: partly, ratio: null } } } as ModelBody
    expect(modelFinding(oneSession, label)).toContain('and its 131 tool calls in 1 session are too few sessions for a failure share.')
    expect(modelHero(one, label)?.value).toBe('$0.327')
    // Codex CLI records no model name at all: the finding says so instead of speaking of unpriced models.
    const none = { ...body, summary: { ...body.summary, lead: { kind: 'requests', tool: 'codex-cli', requests: 129 } } } as ModelBody
    expect(modelFinding(none, label)).toBe('Codex CLI made 129 requests and records no model name, so no cost per request is ' +
      'stated. This describes real work, not a controlled comparison.')
    expect(modelHero(none, label)?.label).toBe('requests in Codex CLI, which records no model name')
    const unpriced = { ...body, summary: { ...body.summary, lead: { kind: 'requests', tool: 'copilot-vscode', requests: 404 } } } as ModelBody
    expect(modelFinding(unpriced, label)).toBe('Copilot in VS Code made 404 requests; no model has 20 priced requests, so no cost per ' +
      'request is stated. This describes real work, not a controlled comparison.')
    expect(modelHero(unpriced, label)?.label).toBe('requests in Copilot in VS Code; no model has 20 priced requests')
    expect(modelFinding({ ...body, summary: { ...body.summary, lead: null } }, label)).toBe('No model request in this period.')
    expect(modelHero({ ...body, summary: { ...body.summary, lead: null } }, label)).toBeUndefined()
  })

  it('states the cost and rate of a model in words and never as zero', () => {
    expect(costText(astra)).toBe('$0.327 · priced 130 of 556')
    expect(costText(vscodeUnpriced)).toBe('not priced')
    expect(costText({ ...astra, priced: 5, cost_per_request: null })).toBe('5 priced requests, too few for a cost per request')
    expect(effortCost(vscodeUnpriced)).toBe('not priced')
    expect(effortCost({ ...astra, cost_per_request: null })).toBe('too few priced')
    expect(rateText(argon)).toBe('2.6% of 13,680 calls failed')
    expect(rateText(vscodeSplit)).toBe('at least 8.9% of 900 calls failed')
    expect(rateText(partly)).toBe('131 calls in 2 sessions, too few sessions for a failure share')
    expect(rateText({ ...partly, calls: 60, call_sessions: 5 })).toBe('60 calls')
    expect(rateText(storeOnly)).toBe('calls not recorded')
    expect(logPlace(0.075, 0.075, 0.9)).toBe(0)
    expect(logPlace(0.9, 0.075, 0.9)).toBe(1)
    expect(logPlace(0.3, 0.3, 0.3)).toBe(0.5)
  })
})

describe('MOD-02 · The card draws one row per model, grouped by tool', () => {
  it('shows each model\'s cost, failure figure, efforts and what the tool does not record', () => {
    const { host, dispose } = mount(() => <ModelReport {...props(context({ data: body, status: 'ready', error: null }))} />)
    const box = host.querySelector('[data-box="insight-models"]')!
    expect(box.querySelector('[data-hero] strong')?.textContent).toBe('4.4×')
    expect(box.querySelector('[data-finding]')?.textContent).toContain('not the models.')
    const row = (tool: string, name: string) => box.querySelector(`[data-tool="${tool}"] [data-model="${name}"]`)!
    expect(row('copilot-cli', 'gpt-6-astra').querySelector('[data-cost]')?.textContent).toBe('$0.327 · priced 130 of 556')
    expect(row('copilot-cli', 'gpt-6-astra').querySelector('[data-rate]')?.textContent).toBe('2.9% of 4,000 calls failedbash 60% · view 40%')
    // Two efforts with 20 requests or more make a strip; the effort with 5 requests is left out of it.
    expect(Array.from(row('copilot-cli', 'gpt-6-astra').querySelectorAll('[data-efforts] li')).map(li => li.textContent))
      .toEqual(['high $0.076 · 300 reasoning tokens', 'medium $0.078 · 120 reasoning tokens'])
    expect(row('copilot-cli', 'claude-opus-4-8').querySelector('[data-rate]')?.textContent).toBe('calls not recorded')
    expect(row('copilot-cli', 'claude-sonnet-5').querySelector('[data-rate]')?.textContent).toBe('131 calls in 2 sessions, too few sessions for a failure ' +
      'sharecalls recorded in 2 of 6 sessions')
    expect(row('copilot-vscode', 'claude-opus-4-8').querySelector('[data-rate]')?.textContent).toContain('at least 8.9%')
    expect(row('copilot-vscode', 'gpt-5.5').querySelector('[data-cost]')?.textContent).toBe('not priced')
    expect(row('copilot-vscode', 'gpt-5.5').querySelector('[data-helper]')).not.toBeNull()
    expect(row('copilot-vscode', 'gpt-5.5').querySelector('[role="img"]')).toBeNull()
    // The dots sit on one log scale: the cheapest at the left edge, the dearest at the right.
    const place = (tool: string, name: string) => (row(tool, name).querySelector('[role="img"] span') as HTMLElement).style.insetInlineStart
    expect([place('copilot-cli', 'claude-sonnet-5'), place('copilot-vscode', 'claude-opus-4-8')]).toEqual(['0.00%', '100.00%'])
    expect(box.querySelector('[data-tool="copilot-cli"] [data-footer]')?.textContent).toBe('3 requests with no model · 250 calls in ' +
      '42 sessions read from the session store: shell commands only, not attributed')
    expect(box.querySelector('[data-tool="codex-cli"]')).toBeNull()
    expect(box.querySelector('[data-not-reported]')?.textContent).toContain('thinking time by Copilot CLI, Copilot in VS Code, Codex CLI')
    expect(box.querySelector('[data-not-reported]')?.textContent).toContain('tool calls by Codex CLI')
    expect(box.querySelector('[data-not-reported]')?.textContent).toContain('cache writes by Copilot in VS Code')
    dispose()
  })

  it('nests effort rows under their model in the data table and names a missing cache split', () => {
    const { host, dispose } = mount(() => <ModelReport {...props(context({ data: body, status: 'ready', error: null }))} />)
    const ids = bodyRows(host).map(row => row.getAttribute('data-row-id')).filter(id => id?.startsWith('copilot-'))
    expect(ids.slice(0, 5)).toEqual(['copilot-cli:gpt-6-astra', 'copilot-cli:gpt-6-astra:high', 'copilot-cli:gpt-6-astra:medium',
      'copilot-cli:gpt-6-astra:low', 'copilot-cli:gemini-4-argon'])
    expect(ids).toContain('copilot-cli:total')
    const unpriced = bodyRows(host).find(row => row.getAttribute('data-row-id') === 'copilot-vscode:gpt-5.5')!
    expect(unpriced.textContent).toContain('cache split not reported')
    // Copilot in VS Code splits the cached prompt but never reports cache writes: the cell says so, never 0.
    const split = bodyRows(host).find(row => row.getAttribute('data-row-id') === 'copilot-vscode:claude-opus-4-8')!
    expect(split.querySelector('[data-col="write"]')?.textContent).toBe('not reported')
    expect(split.querySelector('[data-col="read"]')?.textContent).toBe('40 k')
    const cli = bodyRows(host).find(row => row.getAttribute('data-row-id') === 'copilot-cli:gpt-6-astra')!
    expect(cli.querySelector('[data-col="write"]')?.textContent).toBe('900')
    dispose()
  })

  it('lists the sessions with the most failed calls and opens one in the drawer', () => {
    const opened: string[] = []
    const { host, dispose } = mount(() => <ModelReport {...props(context({ data: body, status: 'ready', error: null }, opened))} />)
    const sessions = host.querySelector<HTMLDetailsElement>('[data-sessions]')!
    expect(sessions.querySelector('summary')?.textContent).toBe('Open sessions (2)')
    sessions.open = true
    flush()
    expect(sessions.textContent).toContain('not priced')
    host.querySelector<HTMLButtonElement>('button[aria-label="Open session s-cli"]')!.click()
    flush()
    expect(opened).toEqual(['s-cli:flow'])
    dispose()
  })

  it('keeps its own error state', () => {
    const { host, dispose } = mount(() => <ModelReport {...props(context(
      { data: undefined, status: 'error', error: new Error('Kusto view insights.model_report failed') }))} />)
    expect(host.textContent).toContain('Could not load Model report on your own work: Kusto view insights.model_report failed')
    expect(host.querySelector('[data-finding]')).toBeNull()
    dispose()
  })
})
