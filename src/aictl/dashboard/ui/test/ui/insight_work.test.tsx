// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import Flows from '../../src/panels/insights/Flows'
import { flowsFinding, flowsHero, tooSmall, type FlowsBody } from '../../src/panels/insights/flowsModel'
import Skills from '../../src/panels/insights/Skills'
import { skillsCoverage, skillsFinding, skillsHero, type SkillsBody } from '../../src/panels/insights/skillsModel'
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
  it('states the share of sessions that changed nothing with its cost, the step they stop on and the costliest cycle', () => {
    expect(flowsFinding(flows)).toBe('12 of 40 sessions (30%) ended without changing a file, costing $50.00 at list price (25% of the ' +
      "period's cost); 8 of them stopped on a read. The costliest cycle is edit ⇄ test run: 40 rounds in 6 sessions, 1 h of working " +
      'time (20% of all).')
    expect(flowsHero(flows)).toEqual({ value: '30%', label: 'of sessions changed nothing' })
  })

  it('states no finding for too few sessions and names the groups too small to compare in one line', () => {
    const few = { ...flows, summary: { ...flows.summary, sessions: 6, enough: false } } as FlowsBody
    expect(flowsFinding(few)).toBe('Only 6 sessions in this period: too few to state a finding (the card needs 10).')
    expect(flowsHero(few)).toBeUndefined()
    expect(tooSmall(flows, label)).toBe('Too small to compare: 1 project with fewer than 5 sessions; 1 cycle seen in fewer than 3 ' +
      'sessions; 1 path of fewer than 3 sessions; steps after ask the person (fewer than 30 calls). Copilot CLI has no recognised ' +
      'test run, so no test step is shown for it. 4 command lines named a test runner but did not start with one, so they count ' +
      'as commands, not test runs.')
  })

  it('draws how sessions ended, what follows each step, cycles, paths and projects, and opens a session', () => {
    const opened: string[] = []
    const { host, dispose } = mount(() => <Flows {...props(context({ data: flows, status: 'ready', error: null }, opened))} />)
    const box = host.querySelector('[data-box="insight-flows"]')!
    expect(box.querySelector('[data-hero] strong')!.textContent).toBe('30%')
    expect(box.querySelector('[data-endings]')!.textContent).toContain('Changed nothing · 12 · $50.00')
    expect(box.querySelector('[data-endings]')!.textContent).toContain('stopped on: read 8 ($40.00) · MCP tool 4 ($10.00)')
    expect(box.querySelector('[data-transitions]')!.textContent).toContain('Next after edit')
    expect(box.querySelector('[data-transitions]')!.textContent).toContain('test run 60%')
    expect(box.querySelector('[data-transitions]')!.textContent).toContain('After a failure')
    expect(box.querySelector('[data-cycles]')!.textContent).toContain('edit ⇄ test run40 rounds · 6 sessions · 1 h (20%)')
    expect(box.querySelector('[data-first-paths]')!.textContent).toContain('skill → read')
    expect(box.querySelector('[data-projects]')!.textContent).toContain('alpha30 sessions · 10 changed nothing (33%, $45.00)')
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
  it('states the costliest skill with what followed it, and the skills listed and never used', () => {
    expect(skillsFinding(skills, label)).toBe('The skill kql ran in 142 turns of 142 sessions in 6 projects; those turns cost $1,316 at ' +
      "list price (31% of the period's cost). After it, in the same turn, 97% of its uses edited a file, 0% ran tests and 1% committed. " +
      'Claude Code listed 118 skills to the model; 114 were never used, and their listing took 163 k tokens (estimated from size) over ' +
      'the sessions that listed them.')
    expect(skillsHero(skills)).toEqual({ value: '31%', label: "of the period's cost was in turns that ran kql" })
  })

  it('leads with no skill when none has enough uses, and says which tools report listings', () => {
    const few = { ...skills, skills: [], summary: { ...skills.summary, top: null, listed: 0, unused: 0, unused_tokens: null } } as SkillsBody
    expect(skillsFinding(few, label)).toBe('927 skill uses in this period, but no skill has 5 uses in 3 sessions: too few to compare.')
    expect(skillsHero(few)).toBeUndefined()
    expect(skillsCoverage(skills, label)).toBe('Only Claude Code reports which skills are listed to the model; for other tools, listed ' +
      'and never used cannot be measured. Skill uses come from Copilot CLI, Claude Code. Too small to compare: 1 skill with fewer than ' +
      '5 uses or 3 sessions; 1 project with fewer than 5 uses.')
  })

  it('draws a bar per skill with what followed it, the unused listings and the projects, and opens a session', () => {
    const opened: string[] = []
    const { host, dispose } = mount(() => <Skills {...props(context({ data: skills, status: 'ready', error: null }, opened))} />)
    const box = host.querySelector('[data-box="insight-skills"]')!
    expect(box.querySelector('[data-hero] strong')!.textContent).toBe('31%')
    const row = box.querySelector('[data-skill="kql"]')!
    expect(row.textContent).toContain('142 uses · 142 sessions · 6 projects')
    expect(row.textContent).toContain('$1,316 (31%)')
    expect(row.textContent).toContain('then edit 97% · test 0% · commit 1%')
    expect(box.querySelector('[data-skill="rare"]')).toBeNull()
    expect(box.querySelector('[data-unused]')!.textContent).toContain('never-used24 sessions · 7.2 k tokens')
    expect(box.querySelector('[data-projects]')!.textContent).toContain('alpha386 uses of 12 skills · 117 sessions')
    const open = [...box.querySelectorAll('button')].find(button => button.getAttribute('aria-label')?.startsWith('Open session s-skill'))
    open!.click()
    expect(opened).toEqual(['s-skill:flow'])
    dispose()
  })
})
