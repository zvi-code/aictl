// @vitest-environment jsdom
// The names drawn on the MCP, Kusto, Flows and Problem sessions views open what they name: an MCP server its detail, a
// server tool the tool, a large Kusto run its session, a coding tool the page narrowed to it. Kinds of step, signals,
// clusters, query shapes and projects named by their last folder stay text.
import { beforeEach, describe, expect, it } from 'vitest'
import Flows from '../../src/panels/insights/Flows'
import type { FlowsBody } from '../../src/panels/insights/flowsModel'
import type { ProblemBody } from '../../src/panels/insights/insightsModel'
import Kql from '../../src/panels/insights/Kql'
import type { KqlBody } from '../../src/panels/insights/kqlModel'
import Mcp from '../../src/panels/insights/Mcp'
import type { McpBody } from '../../src/panels/insights/mcpModel'
import ProblemSessions from '../../src/panels/insights/ProblemSessions'
import type { CardProps } from '../../src/panels/insights/InsightCard'
import type { Detail, PanelContext } from '../../src/panels/types'
import type { JSX } from '@solidjs/web'
import { installDom, layoutHeaders, mount } from './dom'

beforeEach(() => { installDom(); layoutHeaders(); history.replaceState(null, '', '/?screen=insights&range=all') })

type Went = { details: Detail[]; agents: string[]; patches: Record<string, unknown>[] }
function draw(View: (props: CardProps) => JSX.Element, data: unknown) {
  const went: Went = { details: [], agents: [], patches: [] }
  const state = { data, status: 'ready', error: null }
  const ctx = {
    scope: () => 'local', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined, filters: () => ({ projects: [], repos: [] }),
    openAgent(id: string, tab = 'flow') { went.agents.push(`${id}:${tab}`) },
    openDetail(detail: Detail) { went.details.push(detail) },
    navigate(patch: Record<string, unknown>) { went.patches.push(patch) },
    detail: (path: () => string | undefined) => Object.assign(() => path() ? state : undefined, { retry() {} }),
  } as unknown as PanelContext
  const { host, dispose } = mount(() => <View ctx={ctx} since={base.range.since} until={base.range.until} />)
  return { host, dispose, went }
}
/** The button of a name in a chart, by the chart and the text it shows. */
const named = (host: Element, chart: string, text: string) => [...host.querySelectorAll<HTMLElement>(`${chart} [data-open]`)]
  .find(node => node.textContent === text)
/** A button of the data table, by its accessible name. */
const inTable = (host: Element, label: string) => [...host.querySelectorAll<HTMLElement>('button')].find(button => button.getAttribute('aria-label') === label)

const base = {
  range: { since: 1_700_000_000, until: 1_700_086_400 }, data_range: { first_ts: 1_700_000_100, last_ts: 1_700_080_000 },
  computed_at: 1_700_086_000,
}
const query = (view: string) => ({ view, kql: `// aictl view ${view}\ntool_invocations | take 1`, kusto_url: 'https://c.kusto.windows.net/db' })

const fig = { calls: 650, sessions: 13, projects: 4, failures: 29, failure_share: 29 / 650, enough: true, p50_ms: 27, p95_ms: 4661,
  sum_ms: 2_098_216, output_bytes: 67_558, carried_bytes: 25_855_767 }
const server = { ...fig, server: 'kusto', tools: ['claude-code'], server_tools: 1, calls_by_tool: [{ ...fig, tool_name: 'query' }] }
const mcp = {
  ...base, card: 'mcp', view: 'insights.mcp', query: query('insights.mcp'),
  servers: [server], small_servers: [],
  listed: [{ server: 'docs', tool: 'claude-code', sessions: 24, called_sessions: 0, list_tokens: 4990, unused_tokens: 4990, listed_tools: 16 }],
  projects: [{ project: 'alpha', calls: 600, sessions: 10, servers: 2, failures: 20, sum_ms: 1_800_000, output_bytes: 60_000 }],
  summary: { calls: 650, all_calls: 7000, call_share: 0.09, sum_ms: 2_098_216, time_share: 0.1, output_bytes: 67_558,
    carried_bytes: 25_855_767, failures: 29, servers: 1, top: server, listing_tools: ['claude-code'], listed_servers: 1, never_called: 1,
    unused_tokens: 4990, small_servers: 0, small_projects: [] },
  sessions: [],
} as unknown as McpBody

describe('INS-OPEN · MCP servers', () => {
  it('opens the server detail by its id mcp:<server> from every chart of servers and from the data table', () => {
    const { host, dispose, went } = draw(Mcp, mcp)
    for (const chart of ['calls', 'time', 'sum', 'returned', 'carried']) {
      const button = named(host, `[data-chart="${chart}"]`, 'kusto')
      expect(button, chart).toBeTruthy()
      button!.click()
    }
    named(host, '[data-chart="listed"]', 'docs')!.click()
    expect(went.details).toEqual([...Array(5).fill({ type: 'mcp', name: 'mcp:kusto' }), { type: 'mcp', name: 'mcp:docs' }])
    expect(named(host, '[data-chart="calls"]', 'kusto')!.getAttribute('aria-label')).toBe('Open MCP server kusto: tools, calls and sessions')
    went.details.length = 0
    const servers = [...host.querySelectorAll<HTMLElement>('button')].filter(button => button.getAttribute('aria-label') === 'Open MCP server kusto')
    expect(servers).toHaveLength(2) // the server's row and its tool's row
    servers[0].click()
    expect(went.details).toEqual([{ type: 'mcp', name: 'mcp:kusto' }])
    dispose()
  })

  it('opens a server tool as the store names it; the whole-server row of the table and a project stay text', () => {
    const { host, dispose, went } = draw(Mcp, mcp)
    named(host, '[data-chart="server-tools"]', 'kusto · query')!.click()
    inTable(host, 'Open tool mcp__kusto__query')!.click()
    expect(went.details).toEqual([{ type: 'tool', name: 'mcp__kusto__query' }, { type: 'tool', name: 'mcp__kusto__query' }])
    expect([...host.querySelectorAll('button')].some(button => button.textContent === '(all tools)')).toBe(false)
    expect(host.querySelector('[data-chart="projects"] [data-open]')).toBeNull()
    expect(host.querySelector('[data-chart="projects"]')!.textContent).toContain('alpha')
    dispose()
  })
})

const figures = { runs: 30, sessions: 4, failures: 3, changes: 0, large: 1, sum_ms: 3000, output_bytes: 300_000 }
const kql = {
  ...base, card: 'kql', view: 'insights.kql', query: query('insights.kql'),
  coverage: [{ tool: 'copilot-cli', runs: 30, unrecognised: 0, mcp: 30, cli: 0, script: 0, with_text: 30 }],
  kinds: [{ ...figures, kind: 'query', verb: null, change: false }],
  failure_kinds: [{ failure: 'syntax', runs: 3 }],
  targets: [{ ...figures, cluster: 'help.kusto.windows.net', database: 'Samples' }],
  shapes: [{ ...figures, shape_key: 'a', snippet: 'Events | take ?', kind: 'query', verb: null, most_in_session: 3, repeated_sessions: 1, repeat_runs: 3 }],
  projects: [{ ...figures, project: 'alpha' }],
  large: [{ session_id: '["n1","s-big-0001-long-id"]', node_id: 'n1', tool: 'copilot-cli', ts: 1_700_000_200, route: 'mcp', kind: 'query', verb: null,
    output_bytes: 250_000, snippet: 'Events | take ?', text: 'Events | take 100000', project_name: 'alpha', title: 'Load the events' }],
  summary: { ...figures, enough: true, failure_share: 0.1, large_bytes: 250_000, with_text: 30, top_failure: { failure: 'syntax', runs: 3 },
    change_verbs: [], top_shape: null, repeated: null, unrecognised: 0, routes: { mcp: 30, cli: 0, script: 0 }, small_projects: [] },
  sessions: [],
} as unknown as KqlBody

describe('INS-OPEN · Kusto runs', () => {
  it('opens the session of a large result at its tool calls, its id passed as the answer gives it', () => {
    const { host, dispose, went } = draw(Kql, kql)
    const run = named(host, '[data-chart="large"]', 'Events | take ?')!
    expect(run.getAttribute('aria-label')).toBe('Open session Load the events')
    run.click()
    expect(went.agents).toEqual(['["n1","s-big-0001-long-id"]:tools'])
    dispose()
  })

  it('keeps routes, failure kinds, kinds, clusters, query shapes and projects as text', () => {
    const { host, dispose } = draw(Kql, kql)
    for (const chart of ['routes', 'failures', 'kinds', 'targets', 'shapes', 'projects']) {
      expect(host.querySelector(`[data-chart="${chart}"]`), chart).toBeTruthy()
      expect(host.querySelector(`[data-chart="${chart}"] [data-open]`), chart).toBeNull()
    }
    dispose()
  })
})

const flows = {
  ...base, card: 'flows', view: 'insights.flows', query: query('insights.flows'),
  transitions: [{ from_step: 'edit', calls: 50, next: [{ to_step: 'test', calls: 30, share: 0.6 }] }],
  endings: {
    committed: { sessions: 28, cost_usd: 150, last_steps: [{ step: 'finish', sessions: 28, cost_usd: 150 }] },
    changed: { sessions: 0, cost_usd: null, last_steps: [] },
    no_change: { sessions: 12, cost_usd: 50, last_steps: [{ step: 'read', sessions: 12, cost_usd: 50 }] },
  },
  first_paths: [{ steps: ['skill', 'read'], sessions: 20 }], last_paths: [],
  cycles: [{ pair: ['edit', 'test'], loops: 9, sessions: 6, calls: 120, rounds: 40, seconds: 3600, time_share: 0.2 }],
  projects: [{ project: 'alpha', sessions: 30, committed: 20, changed: 0, no_change: 10, no_change_share: 1 / 3, cost_usd: 180,
    no_change_cost: 45, loops: 9, cycle_seconds: 3600, tools: ['copilot-cli'] }],
  tools: [{ tool: 'copilot-cli', calls: 900, sessions: 35, seconds: 18_000, test_runs: 0, unflagged_tests: 0 }],
  summary: {
    sessions: 40, cost_usd: 200, enough: true, no_change: 12, no_change_share: 0.3, no_change_cost: 50, no_change_cost_share: 0.25,
    no_change_last: null, committed: 28, changed: 0, working_seconds: 18_000, cycle_seconds: 3600, cycle_share: 0.2, top_cycle: null,
    no_test_tools: [], unflagged_tests: 0, small_steps: [], small_paths: 0, small_cycles: 0, small_projects: [],
  },
  sessions: [],
} as unknown as FlowsBody

describe('INS-OPEN · Flows', () => {
  it('narrows the page to a coding tool from its name; steps, cycles, paths and projects stay text', () => {
    const { host, dispose, went } = draw(Flows, flows)
    named(host, '[data-chart="tools"]', 'copilot-cli')!.click()
    expect(JSON.stringify(went.patches)).toContain('copilot-cli')
    for (const chart of ['[data-chart="cycles"]', '[data-chart="first-paths"]', '[data-chart="projects"]', '[data-heat="transitions"]']) {
      expect(host.querySelector(chart), chart).toBeTruthy()
      expect(host.querySelector(`${chart} [data-open]`), chart).toBeNull()
    }
    dispose()
  })
})

const signal = (name: string, sessions: number) => ({ signal: name, reported: true, sessions, share: sessions / 40, cost_usd: 5 })
const problems = {
  ...base, card: 'problems', view: 'insights.problem_sessions', query: query('insights.problem_sessions'),
  tools: [{ tool: 'claude-code', sessions: 40, reports: true, flagged: 10, multi: 4, flagged_cost_usd: 20, cost_usd: 80,
    signals: [signal('compaction', 6), signal('failure_streak', 4)] }],
  signals: [],
  pairs: [{ signals: ['compaction', 'failure_streak'], sessions: 4, cost_usd: 10 }],
  projects: [{ project: 'alpha', sessions: 8, all_sessions: 30, tools: ['claude-code'], cost_usd: 15, signals: { compaction: 6 } }],
  summary: { sessions: 40, flagged: 10, flagged_share: 0.25, multi: 4, flagged_cost_usd: 20, not_reporting: [] },
  sessions: [{ session_id: 's-flagged', node_id: 'n', tool: 'claude-code', title: 'Fix the parser', signals: 2,
    names: ['compaction', 'failure_streak'], project_name: 'alpha', cost_usd: 4 }],
} as unknown as ProblemBody

describe('INS-OPEN · Problem sessions', () => {
  it('narrows the page to a coding tool from its bar, its column and the data table', () => {
    const { host, dispose, went } = draw(ProblemSessions, problems)
    // With no labels on the board a coding tool is shown by its id.
    named(host, '[data-chart="problem-counts"]', 'claude-code')!.click()
    named(host, '[data-heat="problem-tools"]', 'claude-code')!.click()
    inTable(host, 'Show only claude-code on every view')!.click()
    expect(went.patches).toHaveLength(3)
    for (const patch of went.patches) expect(JSON.stringify(patch)).toContain('claude-code')
    dispose()
  })

  it('opens a flagged session from the sessions table; signals and projects stay text', () => {
    const { host, dispose, went } = draw(ProblemSessions, problems)
    inTable(host, 'Open session Fix the parser')!.click()
    expect(went.agents).toEqual(['s-flagged:errors'])
    expect(host.querySelector('[data-heat="problem-pairs"] [data-open]')).toBeNull()
    expect(host.querySelector('[data-heat="problem-projects"] [data-open]')).toBeNull()
    expect(host.querySelector('[data-heat="problem-tools"] [data-row] [data-open]')).toBeNull()
    dispose()
  })
})
