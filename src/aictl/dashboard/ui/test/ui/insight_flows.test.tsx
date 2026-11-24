// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import Flows from '../../src/panels/insights/Flows'
import {
  cycleRows, flowsFinding, flowsHero, outcomeHover, pathRows, projectRows, tooSmall, transitionMatrix, type FlowsBody,
} from '../../src/panels/insights/flowsModel'
import Kql from '../../src/panels/insights/Kql'
import {
  kqlCoverage, kqlFinding, kqlHero, largeHover, runHover, shapeHover, type KqlBody,
} from '../../src/panels/insights/kqlModel'
import Mcp from '../../src/panels/insights/Mcp'
import { callHover, mcpCoverage, mcpFinding, mcpHero, timeHover, type McpBody } from '../../src/panels/insights/mcpModel'
import Skills from '../../src/panels/insights/Skills'
import {
  afterHover, listingRows, skillCostHover, skillsCoverage, skillsFinding, skillsHero, type SkillsBody,
} from '../../src/panels/insights/skillsModel'
import type { DetailState, PanelContext } from '../../src/panels/types'
import { createBoxes } from '../../src/ui/Box'
import { installDom, layoutHeaders, mount } from './dom'

const label = (tool: string) => ({ 'copilot-cli': 'Copilot CLI', 'claude-code': 'Claude Code' }[tool] ?? tool)
const base = {
  range: { since: 1_700_000_000, until: 1_700_086_400 }, data_range: { first_ts: 1_700_000_100, last_ts: 1_700_080_000 },
  computed_at: 1_700_086_000,
}
const query = (view: string) => ({ view, kql: `// aictl view ${view}\ntool_invocations | take 1`, kusto_url: 'https://c.kusto.windows.net/db' })
const cycle = { pair: ['edit', 'test'], loops: 9, sessions: 6, calls: 120, rounds: 40, seconds: 3600, time_share: 0.2 }
const flows = {
  ...base, card: 'flows', view: 'insights.flows', query: query('insights.flows'),
  transitions: [{ from_step: 'edit', calls: 50, next: [{ to_step: 'test', calls: 30, share: 0.6 }, { to_step: 'edit', calls: 15, share: 0.3 }] }],
  endings: {
    committed: { sessions: 28, cost_usd: 150, last_steps: [{ step: 'finish', sessions: 28, cost_usd: 150 }] },
    changed: { sessions: 0, cost_usd: null, last_steps: [] },
    no_change: { sessions: 12, cost_usd: 50, last_steps: [{ step: 'read', sessions: 8, cost_usd: 40 }, { step: 'mcp', sessions: 4, cost_usd: 10 }] },
  },
  first_paths: [{ steps: ['skill', 'read'], sessions: 20 }], last_paths: [],
  cycles: [cycle],
  projects: [{ project: '/work/alpha', sessions: 30, committed: 20, changed: 0, no_change: 10, no_change_share: 1 / 3, cost_usd: 180,
    no_change_cost: 45, loops: 9, cycle_seconds: 3600, tools: ['copilot-cli'] }],
  tools: [{ tool: 'copilot-cli', calls: 900, sessions: 35, seconds: 18_000, test_runs: 0, unflagged_tests: 4 }],
  summary: {
    sessions: 40, cost_usd: 200, enough: true, no_change: 12, no_change_share: 0.3, no_change_cost: 50, no_change_cost_share: 0.25,
    no_change_last: { step: 'read', sessions: 8, cost_usd: 40 }, committed: 28, changed: 0, working_seconds: 18_000,
    cycle_seconds: 3600, cycle_share: 0.2, top_cycle: cycle, no_test_tools: ['copilot-cli'], unflagged_tests: 4,
    small_steps: ['ask'], small_paths: 1, small_cycles: 1, small_projects: ['beta'],
  },
  sessions: [{ session_id: 's-cycle', node_id: 'n', tool: 'copilot-cli', project_name: 'alpha', outcome: 'committed', last_step: 'finish',
    loops: 3, cycle_seconds: 1800, pair: ['edit', 'test'], cost_usd: 12 }],
} as unknown as FlowsBody

function context(state: DetailState<unknown> | undefined, opened: string[] = []) {
  return {
    scope: () => 'local', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined, filters: () => ({ projects: [], repos: [] }),
    openAgent(id: string, tab = 'flow') { opened.push(`${id}:${tab}`) },
    detail: (path: () => string | undefined) => Object.assign(() => path() ? state : undefined, { retry() {} }),
  } as unknown as PanelContext
}
const props = (ctx: PanelContext) => ({ ctx, boxes: createBoxes('test-work'), since: base.range.since, until: base.range.until })

beforeEach(() => { installDom(); layoutHeaders(); history.replaceState(null, '', '/?screen=insights&range=all') })

describe('INS-20 · Flows', () => {
  it('states the sessions by how they ended, their list price and the working time in cycles, without a conclusion', () => {
    expect(flowsFinding(flows)).toBe('40 sessions in this period: 28 committed, 0 changed files without a commit, 12 (30%) changed ' +
      'no file. The sessions that changed no file cost $50.00 at list price (25% of $200). Working time in cycles of two ' +
      'alternating steps: 1 h of 5 h (20%).')
    expect(flowsHero(flows)).toEqual({ value: '30%', label: 'of 40 sessions changed no file' })
  })

  it('states the count for too few sessions and names the groups too small to compare in one line', () => {
    const few = { ...flows, summary: { ...flows.summary, sessions: 6, enough: false } } as FlowsBody
    expect(flowsFinding(few)).toBe('6 sessions in this period; the card states its figures from 10 sessions. The charts show the ' +
      'sessions there are.')
    expect(flowsHero(few)).toBeUndefined()
    expect(tooSmall(flows, label)).toBe('Too small to compare: 1 project with fewer than 5 sessions; 1 cycle seen in fewer than 3 ' +
      'sessions; 1 path of fewer than 3 sessions; steps after ask the person (fewer than 30 calls). No recognised test run: ' +
      'Copilot CLI. 4 command lines named a test runner without starting with one; they count as commands, not test runs.')
  })

  it('builds the hover text of an outcome, a transition, a cycle, a path and a project', () => {
    expect(outcomeHover(flows, 'no_change')).toBe('Changed no file: 12 of 40 sessions (30%), $50.00 at list price')
    const matrix = transitionMatrix(flows)
    expect(matrix.columns).toEqual(['edit', 'test', 'rest'])
    expect(matrix.rows[0].cells.map(cell => cell?.calls)).toEqual([15, 30, 5])
    expect(matrix.rows[0].cells[1]!.hover).toBe('After edit: the next call was test run 30 times, 60% of 50 calls of edit')
    expect(matrix.rows[0].cells[2]!.hover).toBe('After edit: the next call was another step kind (not among the 4 listed) 5 times, ' +
      '10% of 50 calls of edit')
    expect(cycleRows(flows)[0].hover).toBe('edit ⇄ test run: 9 cycles in 6 sessions, 40 rounds and 120 calls in all; working time ' +
      '1 h, 20% of the working time of all tool calls (5 h). A cycle is two steps taking turns 3 rounds or more.')
    expect(pathRows(flows, 'first')[0].hover).toBe('First 4 steps skill → read: 20 of 40 sessions (50%); repeats of one step count once')
    expect(projectRows(flows)[0].parts[2].hover).toBe('alpha, changed no file: 10 of 30 sessions (33%), $45.00 at list price')
  })

  it('draws how sessions ended, the last steps, the transition matrix, cycles, paths and projects, and opens a session', () => {
    const opened: string[] = []
    const { host, dispose } = mount(() => <Flows {...props(context({ data: flows, status: 'ready', error: null }, opened))} />)
    const box = host.querySelector('#insight-flows')!
    const value = (chart: string) => [...box.querySelectorAll(`[data-chart="${chart}"] [data-value]`)].map(node => node.textContent)
    expect(box.querySelector('[data-hero] strong')!.textContent).toBe('30%')
    expect(value('endings')).toEqual(['28 committed · 0 changed files, no commit · 12 changed no file'])
    expect(box.querySelector('[data-chart="endings"] rect[data-part="c4"] title')!.textContent)
      .toBe('Changed no file: 12 of 40 sessions (30%), $50.00 at list price')
    expect(value('last-no_change')).toEqual(['8 sessions · $40.00', '4 sessions · $10.00'])
    expect(box.querySelector('[data-chart="last-changed"]')).toBeNull()
    const cell = box.querySelector('[data-cell="edit:test"]')!
    expect([...cell.querySelectorAll('text')].map(node => node.textContent)).toEqual(['60%', '30'])
    expect(cell.querySelector('title')!.textContent).toContain('60% of 50 calls of edit')
    expect(box.querySelector('[data-transitions]')!.textContent).toContain('After a failure')
    expect(value('cycles')).toEqual(['1 h (20%)'])
    expect(box.querySelector('[data-chart="cycles"] [data-row]')!.textContent).toContain('edit ⇄ test run40 rounds · 6 sessions')
    expect(value('first-paths')).toEqual(['20 sessions (50%)'])
    expect(box.querySelector('[data-chart="last-paths"]')!.textContent).toContain('No end shared by 3 or more sessions.')
    expect(value('projects')).toEqual(['20 · 0 · 10'])
    expect(value('tools')).toEqual(['900 calls · 5 h'])
    expect(box.querySelector('[data-chart="tools"]')!.textContent).toContain('Bar length: tool calls, linear scale from 0 to 900.')
    expect(box.querySelector('[data-small]')!.textContent).toMatch(/^Too small to compare/)
    const open = [...box.querySelectorAll('button')].find(button => button.getAttribute('aria-label')?.startsWith('Open session s-cycle'))
    open!.click()
    expect(opened).toEqual(['s-cycle:flow'])
    dispose()
  })
})

const skill = { name: 'kql', uses: 142, sessions: 142, projects: 6, tools: ['copilot-cli'], turns: 142, turn_tokens: 608_000_000,
  cost_usd: 1315.68, cost_share: 0.3125, with_turn: 142, after_edit: 138 / 142, after_test: 0, after_commit: 1 / 142 }
const skills = {
  ...base, card: 'skills', view: 'insights.skills', query: query('insights.skills'),
  skills: [skill], small_skills: [{ ...skill, name: 'rare', uses: 2, sessions: 2 }],
  unused: [{ tool: 'claude-code', name: 'never-used', sessions: 24, list_tokens: 7180 }],
  listings: [{ tool: 'claude-code', listed: 118, unused: 114, sessions: 25, list_tokens: 177_101, unused_tokens: 163_424 }],
  tools: [{ tool: 'copilot-cli', uses: 927, skills: 29, sessions: 286, with_turn: 927 }],
  projects: [{ project: '/work/alpha', uses: 386, skills: 12, sessions: 117 }],
  summary: { uses: 927, skills: 30, sessions: 286, cost_usd: 4211, top: skill, use_tools: ['copilot-cli', 'claude-code'],
    listing_tools: ['claude-code'], listed: 118, unused: 114, unused_tokens: 163_424, listed_sessions: 25, small_skills: 1,
    small_projects: ['beta'] },
  sessions: [{ session_id: 's-skill', node_id: 'n', tool: 'copilot-cli', project_name: 'alpha', uses: 7, skills: ['kql', 'review'] }],
} as unknown as SkillsBody

describe('INS-21 · Skills', () => {
  it('states the uses, skills and sessions, and the skills listed and not used, without a conclusion', () => {
    expect(skillsFinding(skills, label)).toBe('927 skill uses of 30 skills in 286 sessions (Copilot CLI, Claude Code). Claude Code ' +
      'listed 118 skills to the model in 25 sessions; 114 of them were not used in the period; their listing took an estimated ' +
      '163 k tokens over the sessions that listed them.')
    expect(skillsHero(skills)).toEqual({ value: '927', label: 'skill uses in 286 sessions' })
  })

  it('says when no skill has enough uses, and which tools report listings', () => {
    const few = { ...skills, skills: [], summary: { ...skills.summary, top: null, listed: 0, unused: 0, unused_tokens: null } } as SkillsBody
    expect(skillsFinding(few, label)).toBe('927 skill uses of 30 skills in 286 sessions (Copilot CLI, Claude Code). No skill has 5 ' +
      'uses in 3 sessions, the least the card compares.')
    expect(skillsCoverage(skills, label)).toBe('Claude Code reports which skills are listed to the model; for other tools, listed ' +
      'and not used is not measured. Skill uses come from Copilot CLI, Claude Code. Too small to compare: 1 skill with fewer than ' +
      '5 uses or 3 sessions; 1 project with fewer than 5 uses.')
  })

  it('builds the hover text of a turn cost, of what followed a use and of a listing', () => {
    expect(skillCostHover(skills, skill)).toBe("kql: 142 turns, 608.0 M tokens, $1,316 at list price, 31% of the period's $4,211. " +
      'Turns of different skills can overlap; their costs do not add up.')
    expect(afterHover(skill, 'after_edit')).toBe('kql: 138 of 142 uses with a recorded turn were followed by an edit in the same ' +
      'turn (97%)')
    expect(listingRows(skills, label)[0].parts[1].hover).toBe('Claude Code: 114 of 118 listed skills not used (97%), 163 k listing tokens')
  })

  it('draws uses, turn cost, what followed, listings, unused skills, projects and tools, and opens a session', () => {
    const opened: string[] = []
    const { host, dispose } = mount(() => <Skills {...props(context({ data: skills, status: 'ready', error: null }, opened))} />)
    const box = host.querySelector('#insight-skills')!
    const value = (chart: string) => [...box.querySelectorAll(`[data-chart="${chart}"] [data-value]`)].map(node => node.textContent)
    expect(box.querySelector('[data-hero] strong')!.textContent).toBe('927')
    expect(value('uses')).toEqual(['142 uses'])
    expect(box.querySelector('[data-chart="uses"] [data-row="kql"]')!.textContent).toContain('142 sessions · 6 projects')
    expect(box.querySelector('[data-chart="uses"] [data-row="rare"]')).toBeNull()
    expect(value('cost')).toEqual(['$1,316 (31%)'])
    expect(box.querySelector('[data-chart="cost"] rect title')!.textContent).toContain('608.0 M tokens')
    expect(value('after_edit')).toEqual(['97%'])
    expect(value('after_test')).toEqual(['0%'])
    expect(value('after_commit')).toEqual(['1%'])
    expect(box.querySelector('[data-chart="after_edit"]')!.textContent).toContain('linear scale from 0 to 100%')
    expect(value('listings')).toEqual(['4 used · 114 not used'])
    expect(value('unused')).toEqual(['7.2 k tokens'])
    expect(value('projects')).toEqual(['386 uses'])
    expect(value('tools')).toEqual(['927 uses'])
    const open = [...box.querySelectorAll('button')].find(button => button.getAttribute('aria-label')?.startsWith('Open session s-skill'))
    open!.click()
    expect(opened).toEqual(['s-skill:flow'])
    dispose()
  })
})

const fig = { calls: 650, sessions: 13, projects: 48, failures: 29, failure_share: 29 / 650, enough: true, p50_ms: 27, p95_ms: 4661,
  sum_ms: 2_098_216, output_bytes: 67_558, carried_bytes: 25_855_767 }
const server = { ...fig, server: 'kusto', tools: ['claude-code'], server_tools: 2, calls_by_tool: [{ ...fig, tool_name: 'query' }] }
const mcpBody = {
  ...base, card: 'mcp', view: 'insights.mcp', query: query('insights.mcp'),
  servers: [server], small_servers: [{ ...server, server: 'rare', calls: 4, sessions: 2, enough: false, failure_share: null }],
  listed: [{ server: 'docs', tool: 'claude-code', sessions: 24, called_sessions: 0, list_tokens: 4990, unused_tokens: 4990, listed_tools: 16 }],
  projects: [{ project: '/work/alpha', calls: 600, sessions: 10, servers: 2, failures: 20, sum_ms: 1_800_000, output_bytes: 60_000 }],
  summary: { calls: 2251, all_calls: 75_731, call_share: 2251 / 75_731, sum_ms: 5_070_000, time_share: 0.0128, output_bytes: 3_000_000,
    carried_bytes: 430_000_000, failures: 53, servers: 13, top: server, listing_tools: ['claude-code'], listed_servers: 1, never_called: 1, unused_tokens: 4990,
    small_servers: 1, small_projects: ['beta'] },
  sessions: [{ session_id: 's-mcp', node_id: 'n', tool: 'claude-code', project_name: 'alpha', calls: 300, failures: 3, servers: 2,
    sum_ms: 60_000, output_bytes: 1000 }],
} as unknown as McpBody

describe('INS-22 · MCP servers', () => {
  it('states the calls, failures, time and bytes of MCP calls and the listings not called, without a conclusion', () => {
    expect(mcpFinding(mcpBody, label)).toBe('2,251 MCP calls to 13 servers (3% of 75,731 tool calls), 53 failed. Tool time 1.4 h ' +
      '(1% of all tool time). Results 3 MB; carried with later requests up to 430 MB (upper bound). Claude Code listed tools of ' +
      '1 server to the model; 1 of them not called in any session that listed them. Listings in sessions that did not call the ' +
      'server: an estimated 5.0 k tokens.')
    expect(mcpHero(mcpBody)).toEqual({ value: '1.4 h', label: 'MCP tool time in 2,251 calls, 1% of all tool time' })
    expect(mcpCoverage(mcpBody, label)).toContain('Too small to compare (in the data table): 1 server with fewer than 20 calls or ' +
      '3 sessions; 1 project')
  })

  it('builds the hover text of the calls and the call time of a server', () => {
    expect(callHover('kusto', server)).toBe('kusto: 650 calls in 13 sessions of 48 projects; 29 failed (4%)')
    expect(timeHover('kusto', server)).toBe('kusto: median 27 ms, 95th percentile 4.7 s over the calls with a recorded duration; ' +
      'tool time 35 min in 650 calls')
  })

  it('draws calls, time, bytes, server tools, listings and projects for the servers with enough calls, and opens a session', () => {
    const opened: string[] = []
    const { host, dispose } = mount(() => <Mcp {...props(context({ data: mcpBody, status: 'ready', error: null }, opened))} />)
    const box = host.querySelector('#insight-mcp')!
    const value = (chart: string) => [...box.querySelectorAll(`[data-chart="${chart}"] [data-value]`)].map(node => node.textContent)
    expect(value('calls')).toEqual(['650 calls · 29 failed (4%)'])
    expect(box.querySelector('[data-chart="calls"] [data-row="kusto"]')!.textContent).toContain('13 sessions · 48 projects')
    expect(box.querySelector('[data-chart="calls"] rect[data-part="bad"] title')!.textContent).toBe('kusto: 29 of 650 calls failed (4%)')
    expect(box.querySelector('[data-row="rare"]')).toBeNull()
    expect(value('time')).toEqual(['median 27 ms · p95 4.7 s'])
    expect(box.querySelector('[data-chart="time"] [data-tick] title')!.textContent).toBe('kusto: 95th percentile 4.7 s')
    expect(value('sum')).toEqual(['35 min'])
    expect(value('returned')).toEqual(['67.6 KB'])
    expect(value('carried')).toEqual(['25.9 MB'])
    expect(value('server-tools')).toEqual(['650 calls · 29 failed (4%) · median 27 ms · p95 4.7 s'])
    expect(value('listed')).toEqual(['called in 0 of 24 sessions · 5.0 k tokens unused'])
    expect(value('projects')).toEqual(['600 calls · 20 failed (3%)'])
    const open = [...box.querySelectorAll('button')].find(button => button.getAttribute('aria-label')?.startsWith('Open session s-mcp'))
    open!.click()
    expect(opened).toEqual(['s-mcp:tools'])
    dispose()
  })
})

const figures = { runs: 3, sessions: 1, failures: 1, changes: 0, large: 0, sum_ms: 300, output_bytes: 3000 }
const shape = { ...figures, shape_key: 'a', snippet: 'StormEvents | where State == ? | take ?', kind: 'query', verb: null,
  most_in_session: 3, repeated_sessions: 1, repeat_runs: 3 }
const kqlBody = {
  ...base, card: 'kql', view: 'insights.kql', query: query('insights.kql'),
  coverage: [{ tool: 'copilot-cli', runs: 40, unrecognised: 6, mcp: 30, cli: 5, script: 5, with_text: 38 }],
  kinds: [{ ...figures, runs: 30, kind: 'query', verb: null, change: false },
    { ...figures, runs: 6, changes: 6, kind: 'management', verb: 'create', change: true },
    { ...figures, runs: 4, kind: 'management', verb: 'show', change: false }],
  failure_kinds: [{ failure: 'syntax', runs: 3 }, { failure: 'auth', runs: 1 }],
  targets: [{ ...figures, runs: 35, changes: 6, cluster: 'help.kusto.windows.net', database: 'Samples' }],
  shapes: [shape],
  projects: [{ ...figures, runs: 40, project: '/work/alpha' }],
  large: [{ session_id: 's-big', node_id: 'n', tool: 'copilot-cli', ts: 1, route: 'mcp', kind: 'query', verb: null, output_bytes: 250_000,
    snippet: 'Events | take ?', text: 'Events | take 100000', project_name: 'alpha' }],
  summary: { runs: 40, sessions: 5, failures: 4, changes: 6, large: 1, sum_ms: 7_200_000, output_bytes: 900_000, enough: true,
    failure_share: 0.1, large_bytes: 250_000, with_text: 38, top_failure: { failure: 'syntax', runs: 3 }, change_verbs: ['create'],
    top_shape: shape, repeated: shape, unrecognised: 6, routes: { mcp: 30, cli: 5, script: 5 }, small_projects: [] },
  sessions: [{ session_id: 's-kql', node_id: 'n', tool: 'copilot-cli', project_name: 'alpha', ...figures }],
} as unknown as KqlBody

describe('INS-23 · Kusto queries', () => {
  it('states the runs, changes of schema or data, failures, large results and the command lines not recognised', () => {
    expect(kqlFinding(kqlBody)).toBe('40 recognised Kusto runs in 5 sessions, 2 h of run time: 6 changed schema or data (.create), ' +
      '4 failed (10%), 1 result of 100 KB or more (250 KB). 6 command lines named kusto or kql and were not recognised as a run.')
    expect(kqlHero(kqlBody)).toEqual({ value: '40', label: 'recognised Kusto runs in 5 sessions' })
    expect(kqlCoverage(kqlBody, label)).toBe('Recognised: 30 through an MCP tool, 5 by a Kusto command line, 5 by a script with an ' +
      'inline query; 38 with query text kept. Not recognised (named kusto or kql): Copilot CLI 6.')
  })

  it('states the count for too few runs, with no failure share, and still shows the command lines not recognised', () => {
    const few = { ...kqlBody, summary: { ...kqlBody.summary, runs: 9, sessions: 2, enough: false, unrecognised: 9459 } } as KqlBody
    expect(kqlFinding(few)).toBe('9 recognised Kusto runs in 2 sessions: 6 changed schema or data, 4 failed. The card compares ' +
      'groups and gives a failure share from 20 runs in 3 sessions; the charts show the runs there are. 9,459 command lines named ' +
      'kusto or kql and were not recognised as a run.')
    expect(kqlHero(few)).toEqual({ value: '9', label: 'recognised Kusto runs in 2 sessions' })
  })

  it('builds the hover text of a run group, a query shape and a large result', () => {
    expect(runHover('.create', kqlBody.kinds[1])).toBe('.create: 6 runs in 1 session; 1 failed (17%); 6 changed schema or data; ' +
      'run time 300 ms; 3 KB returned')
    expect(shapeHover(kqlBody.shapes[0])).toBe('StormEvents | where State == ? | take ?: 3 runs in 1 session, 1 failed; 3 of the runs ' +
      'in 1 session that ran it 3 times or more, up to 3 in one session')
    const large = largeHover(kqlBody.large[0], label)
    expect(large).toMatch(/^250 KB returned by a query run through MCP tool \(Copilot CLI\) at .+ in alpha$/)
  })

  it('draws routes, failure kinds, kinds, targets, shapes, projects and large results, shows the full text on expand, and opens a session', () => {
    const opened: string[] = []
    const { host, dispose } = mount(() => <Kql {...props(context({ data: kqlBody, status: 'ready', error: null }, opened))} />)
    const box = host.querySelector('#insight-kql')!
    const value = (chart: string) => [...box.querySelectorAll(`[data-chart="${chart}"] [data-value]`)].map(node => node.textContent)
    expect(box.querySelector('[data-hero] strong')!.textContent).toBe('40')
    expect(value('routes')).toEqual(['30 runs (75%)', '5 runs (13%)', '5 runs (13%)'])
    expect(value('failures')).toEqual(['3 runs', '1 run'])
    expect(value('kinds')).toEqual(['30 runs · 1 failed', '6 runs · 1 failed', '4 runs · 1 failed'])
    const create = box.querySelector('[data-chart="kinds"] [data-row=".create"]')!
    expect(create.textContent).toContain('changes schema or data')
    expect(create.querySelector('rect[data-part="c4"]')).not.toBeNull()
    expect(create.querySelector('rect[data-part="bad"] title')!.textContent).toBe('.create: 1 of 6 runs failed (17%)')
    expect(box.querySelector('[data-chart="targets"]')!.textContent).toContain('help.kusto.windows.net · Samples')
    expect(value('targets')).toEqual(['35 runs · 1 failed'])
    expect(value('shapes')).toEqual(['3 runs'])
    expect(box.querySelector('[data-chart="shapes"]')!.textContent).toContain('query · 1 session · up to 3 in one session')
    expect(value('projects')).toEqual(['40 runs · 1 failed'])
    expect(value('large')).toEqual(['250 KB'])
    const large = box.querySelector('[data-large] details')!
    expect(large.textContent).toContain('250 KB · query')
    expect(large.textContent).toContain('Events | take 100000')
    const open = [...box.querySelectorAll('button')].find(button => button.getAttribute('aria-label')?.startsWith('Open session s-kql'))
    open!.click()
    expect(opened).toEqual(['s-kql:tools'])
    dispose()
  })
})
