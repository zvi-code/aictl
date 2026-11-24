// @vitest-environment jsdom
// A name drawn on an Insights view is a way in: a skill opens its detail, a session its flow, a repository or a coding
// tool narrows the page. These tests keep every shared chart piece able to carry that, the Skills view wired to it,
// and the step of a session's flow linked to the skill and the tool it names.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FlowEvent } from '../../src/data/contract.gen'
import { StepInspector } from '../../src/drawer/FlowParts'
import { flowModel } from '../../src/drawer/flowModel'
import { skillOfCall, stepsOf } from '../../src/drawer/flowSteps'
import { Bars } from '../../src/panels/insights/Bars'
import { BarGrid } from '../../src/panels/insights/charts/BarGrid'
import { DotRows } from '../../src/panels/insights/charts/DotRows'
import { HeatGrid } from '../../src/panels/insights/charts/HeatGrid'
import { MarkStrip } from '../../src/panels/insights/charts/MarkStrip'
import { foldersNamed, openHover, opens, OpensContext, type Open } from '../../src/panels/insights/charts/Open'
import { PairedBars } from '../../src/panels/insights/charts/PairedBars'
import { PercentileStrip } from '../../src/panels/insights/charts/PercentileStrip'
import { Scatter } from '../../src/panels/insights/charts/Scatter'
import { BarChart } from '../../src/panels/insights/FlowsBars'
import { scopeText } from '../../src/panels/insights/InsightCard'
import { RepoLegend } from '../../src/panels/insights/RepoLegend'
import { INSIGHT_VIEWS } from '../../src/panels/insights/views'
import Skills from '../../src/panels/insights/Skills'
import type { SkillsBody } from '../../src/panels/insights/skillsModel'
import { Bars as WorkBars, Ranges } from '../../src/panels/insights/WorkCharts'
import type { Detail, DetailState, PanelContext } from '../../src/panels/types'
import { installDom, layoutHeaders, mount } from './dom'

beforeEach(() => { installDom(); layoutHeaders(); history.replaceState(null, '', '/?screen=insights&range=all') })

type Went = { details: Detail[]; agents: string[]; patches: Record<string, unknown>[] }
function context(state?: DetailState<unknown>) {
  const went: Went = { details: [], agents: [], patches: [] }
  const ctx = {
    scope: () => 'local', tools: () => null, nodeId: () => null, paused: () => false, copy() {}, board: () => undefined, filters: () => ({ projects: [], repos: [] }),
    openAgent(id: string, tab = 'flow') { went.agents.push(`${id}:${tab}`) },
    openDetail(detail: Detail) { went.details.push(detail) },
    navigate(patch: Record<string, unknown>) { went.patches.push(patch) },
    detail: (path: () => string | undefined) => Object.assign(() => path() ? state : undefined, { retry() {} }),
  } as unknown as PanelContext
  return { ctx, went }
}
// An SVG name holds its hover as a <title> child before its text.
const named = (host: Element, text: string) => [...host.querySelectorAll<HTMLElement>('[data-open]')]
  .find(node => node.textContent === text || node.lastChild?.textContent === text)

describe('INS-OPEN · what each kind of name opens', () => {
  it('sends a skill, a tool, an MCP server and a file to their detail, a session to its flow', () => {
    const { ctx, went } = context()
    const open = opens(ctx)
    open.skill('kql')!.run(); open.tool('Bash')!.run(); open.mcp('srv-1', 'Search')!.run(); open.file('/work/a.py')!.run()
    open.session('s-1', 'Fix the parser')!.run(); open.session('s-2', 'Other', 'tools')!.run()
    expect(went.details).toEqual([{ type: 'skill', name: 'kql' }, { type: 'tool', name: 'Bash' }, { type: 'mcp', name: 'srv-1' },
      { type: 'file', path: '/work/a.py' }])
    expect(went.agents).toEqual(['s-1:flow', 's-2:tools'])
    expect(open.skill('kql')!.label).toBe('Open skill kql: uses, sessions and its text')
  })

  it('narrows the page to a repository, a project, a coding tool or a model', () => {
    const { ctx, went } = context()
    const open = opens(ctx)
    open.repo('/work/alpha')!.run(); open.project('/work/alpha/api')!.run(); open.product('copilot-cli', 'Copilot CLI')!.run(); open.model('m-1')!.run()
    expect(went.patches[0]).toEqual({ repo: ['/work/alpha'], project: null, sel: null })
    expect(went.patches[1]).toEqual({ project: ['/work/alpha/api'], repo: null, sel: null })
    expect(JSON.stringify(went.patches[2])).toContain('copilot-cli')
    expect(went.patches[3]).toEqual({ model: 'm-1' })
  })

  it('finds every stored folder of a project name, and keeps the hover of a name beside what a click does', () => {
    const list = [{ project: '/b/alpha', name: 'alpha' }, { project: '/a/alpha' }, { project: '/a/alpha' }, { project: '/a/beta', name: 'beta' }]
    expect(foldersNamed(list, 'alpha')).toEqual(['/a/alpha', '/b/alpha'])
    expect(foldersNamed(list, 'gamma')).toEqual([])
    const open = { label: 'Open session Fix the parser', run() {} }
    expect(openHover(open, 'Fix the parser\nBranch: main')).toBe('Fix the parser\nBranch: main\nClick: Open session Fix the parser')
    expect(openHover(open)).toBe('Open session Fix the parser')
  })

  it('opens nothing for a name that is empty', () => {
    const open = opens(context().ctx)
    expect([open.skill(''), open.tool(''), open.mcp(''), open.file(''), open.session('', 'x'), open.repo(''), open.project(''),
      open.product('', 'x'), open.model(''), open.projectNamed('')]).toEqual(Array(10).fill(undefined))
  })
})

describe('INS-OPEN · every chart piece draws a name that opens something as a button', () => {
  const pressed: string[] = []
  const open = (name: string): Open => ({ label: `Open ${name}`, run: () => pressed.push(name) })
  const part = { key: 'p', label: 'Part', value: 2, text: '2', hover: 'two', tone: 0 }
  const press = (host: Element, text: string) => {
    const button = named(host, text)
    expect(button, text).toBeTruthy()
    expect(button!.getAttribute('aria-label') ?? button!.closest('button')?.getAttribute('aria-label')).toContain(`Open ${text}`)
    button!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }
  beforeEach(() => { pressed.length = 0 })

  it('bars, bar charts, dot rows, heat grids, paired bars, bar grids, strips and scatters', () => {
    const { host, dispose } = mount(() => <>
      <Bars name="a" title="A" axis="x" rows={[{ key: 'r', label: 'bars', parts: [part], total: '2', open: open('bars') },
        { key: 'q', label: 'plain', parts: [part], total: '2' }]} />
      <BarChart data="b" title="B" axis="x" rows={[{ key: 'r', name: 'chart', parts: [{ value: 1, tone: 'c1', hover: 'h' }], text: '1', hover: 'h',
        open: open('chart') }]} />
      <DotRows name="c" title="C" axis="x" measures={[{ key: 'm', name: 'M', top: 2, topText: '2' }]}
        rows={[{ key: 'r', name: 'dots', values: [{ value: 1, text: '1', hover: 'h' }], open: open('dots') }]} />
      <HeatGrid name="d" title="D" axis="x" corner="c" blank={() => ''} columns={[{ key: 'k', name: 'column', open: open('column') }]}
        rows={[{ key: 'r', name: 'heat', cells: [null], open: open('heat') }]} />
      <PairedBars name="e" title="E" axis="x" scale="shared" lanes={[{ title: 'L' }, { title: 'R' }]}
        rows={[{ key: 'r', label: 'paired', cells: [{ parts: [part], total: '2' }, { parts: [part], total: '2' }], open: open('paired') }]} />
      <BarGrid name="f" label="F" head="Item" columns={[{ id: 'm', label: 'M', scale: '0 to 2' }]}
        rows={[{ key: 'r', label: 'grid', cells: {}, open: open('grid') }]} />
      <PercentileStrip chart={{ name: 'g', title: 'G', axis: 'x', top: 2, start: '0', end: '2',
        rows: [{ key: 'r', label: 'strip', marks: [], text: '', open: open('strip') }] }} />
      <MarkStrip name="h" title="H" axis="x" legend={[]} format={String}
        rows={[{ key: 'r', label: 'marks', marks: [], total: '', open: open('marks') }]} />
      <Scatter name="i" title="I" x={{ label: 'x', format: String }} y={{ label: 'y', format: String }}
        points={[{ key: 'r', x: 1, y: 1, label: 'point', hover: 'h', open: open('point') }]} />
    </>)
    const names = ['bars', 'chart', 'dots', 'column', 'heat', 'paired', 'grid', 'strip', 'marks', 'point']
    for (const name of names) press(host, name)
    expect(pressed).toEqual(names)
    // A name with nothing to open stays text.
    expect(named(host, 'plain')).toBeUndefined()
    expect(host.querySelector('[data-chart="a"] [data-row="q"]')!.textContent).toContain('plain')
    dispose()
  })

  it('a row of the work charts opens on a click anywhere on it', () => {
    const track = { parts: [{ value: 1, tone: 'c1' as const, label: 'p' }], text: '1' }
    const { host, dispose } = mount(() => <>
      <WorkBars chart={{ id: 'w', title: 'W', axis: 'x', legend: [], tops: [1],
        rows: [{ key: 'r', name: 'work', sub: '', tracks: [track], hover: 'h', small: false, open: open('work') },
          { key: 'q', name: 'still', sub: '', tracks: [track], hover: 'h', small: false }] }} />
      <Ranges chart={{ id: 'v', title: 'V', axis: 'x', legend: '', top: 1,
        rows: [{ key: 'r', name: 'range', sub: '', mid: 1, high: 1, max: 1, text: '1', hover: 'h', small: false, open: open('range') }] }} />
    </>)
    for (const name of ['work', 'range']) {
      const button = named(host, name)!.closest('button')!
      expect(button.getAttribute('aria-label')).toContain(`Open ${name}`)
      button.click()
    }
    expect(pressed).toEqual(['work', 'range'])
    expect(host.querySelector('[data-chart="w"] [data-bar="q"] [data-open]')).toBeNull()
    dispose()
  })

  it('a repository in the legend narrows the page to it; every other repository summed opens nothing', () => {
    const { ctx, went } = context()
    const split = { repo_order: [{ repo: '/work/alpha', name: 'alpha', cost_usd: 5 }], repo_others: { repos: 2, cost_usd: 1 } }
    const { host, dispose } = mount(() => <>
      <OpensContext value={opens(ctx)}><div id="in"><RepoLegend split={split as never} other /></div></OpensContext>
      <div id="out"><RepoLegend split={split as never} other /></div>
    </>)
    const items = [...host.querySelectorAll('#in [data-repo]')]
    expect(items.map(item => !!item.querySelector('[data-open]'))).toEqual([true, false])
    items[0].querySelector<HTMLElement>('[data-open]')!.click()
    expect(went.patches).toEqual([{ repo: ['/work/alpha'], project: null, sel: null }])
    // Outside a view (no openers given) the legend is plain text.
    expect(host.querySelector('#out [data-open]')).toBeNull()
    dispose()
  })
})

const base = {
  range: { since: 1_700_000_000, until: 1_700_086_400 }, data_range: { first_ts: 1_700_000_100, last_ts: 1_700_080_000 },
  computed_at: 1_700_086_000,
}
const skill = { name: 'kql', uses: 142, sessions: 142, projects: 6, tools: ['copilot-cli'], turns: 142, turn_tokens: 608_000_000,
  cost_usd: 1315.68, cost_share: 0.3125, with_turn: 142, after_edit: 138 / 142, after_test: 0, after_commit: 1 / 142 }
const skills = {
  ...base, card: 'skills', view: 'insights.skills',
  query: { view: 'insights.skills', kql: '// aictl view insights.skills\nskill_uses | take 1', kusto_url: 'https://c.kusto.windows.net/db' },
  skills: [skill], small_skills: [],
  unused: [{ tool: 'claude-code', name: 'never-used', sessions: 24, list_tokens: 7180 }],
  listings: [{ tool: 'claude-code', listed: 118, unused: 114, sessions: 25, list_tokens: 177_101, unused_tokens: 163_424 }],
  tools: [{ tool: 'copilot-cli', uses: 927, skills: 29, sessions: 286, with_turn: 927 }],
  projects: [{ project: '/work/alpha', uses: 386, skills: 12, sessions: 117 }],
  summary: { uses: 927, skills: 30, sessions: 286, cost_usd: 4211, top: skill, use_tools: ['copilot-cli', 'claude-code'],
    listing_tools: ['claude-code'], listed: 118, unused: 114, unused_tokens: 163_424, listed_sessions: 25, small_skills: 0, small_projects: [] },
  sessions: [{ session_id: 's-skill', node_id: 'n', tool: 'copilot-cli', project_name: 'alpha', uses: 7, skills: ['kql', 'review'] }],
} as unknown as SkillsBody

describe('INS-OPEN · the coding tool and model filters narrow every view', () => {
  const asked = (ctx: PanelContext) => {
    const paths: string[] = []
    const seen = { ...ctx, detail: (path: () => string | undefined) => { paths.push(path() ?? ''); return ctx.detail(path) } } as PanelContext
    return { seen, paths }
  }

  it('sends the chosen tools and model with the request, and says what the view is narrowed to', () => {
    const { ctx } = context({ data: skills, status: 'ready', error: null })
    const { seen, paths } = asked({ ...ctx, tools: () => ['copilot-cli', 'claude-code'],
      filters: () => ({ projects: [], repos: [], model: 'claude-opus-5-5' }) } as unknown as PanelContext)
    const { host, dispose } = mount(() => <Skills ctx={seen} since={base.range.since} until={base.range.until} />)
    expect(paths[0]).toContain('tool=copilot-cli%2Cclaude-code')
    expect(paths[0]).toContain('model=claude-opus-5-5')
    expect(host.querySelector('[data-scope]')!.textContent).toBe('Narrowed to the sessions of copilot-cli, claude-code, and to sessions ' +
      'that made a request with claude-opus-5-5 in the period.')
    dispose()
  })

  it('asks for no coding tool when none is chosen, and says nothing when neither filter is set', () => {
    expect(scopeText([], 'all', String)).toBe('Narrowed to no coding tool (none is chosen).')
    expect(scopeText(null, 'm-1', String)).toBe('Narrowed to sessions that made a request with m-1 in the period.')
    expect(scopeText(null, 'all', String)).toBe('')
    const { ctx } = context({ data: skills, status: 'ready', error: null })
    const { seen, paths } = asked({ ...ctx, filters: () => ({ projects: [], repos: [], model: 'all' }) } as unknown as PanelContext)
    const { host, dispose } = mount(() => <Skills ctx={seen} since={base.range.since} until={base.range.until} />)
    expect(paths[0]).not.toMatch(/tool=|model=/)
    expect(host.querySelector('[data-scope]')).toBeNull()
    dispose()
  })
})

describe('INS-OPEN · the Skills view', () => {
  it('opens the skill from its name on every chart that ranks skills, and from the data table', () => {
    const { ctx, went } = context({ data: skills, status: 'ready', error: null })
    const { host, dispose } = mount(() => <Skills ctx={ctx} since={base.range.since} until={base.range.until} />)
    const name = (chart: string) => host.querySelector<HTMLElement>(`[data-chart="${chart}"] [data-open]`)
    for (const chart of ['uses', 'cost', 'after_edit', 'after_test', 'after_commit']) {
      expect(name(chart)?.textContent, chart).toBe('kql')
      name(chart)!.click()
    }
    expect(name('unused')!.textContent).toBe('never-used')
    name('unused')!.click()
    expect(went.details).toEqual([...Array(5).fill({ type: 'skill', name: 'kql' }), { type: 'skill', name: 'never-used' }])
    expect(name('uses')!.getAttribute('aria-label')).toBe('Open skill kql: uses, sessions and its text')
    const inTable = [...host.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === 'Open skill kql')
    inTable!.click()
    expect(went.details).toHaveLength(7)
    dispose()
  })

  it('narrows the page from a project named by its last folder, and from a coding tool', async () => {
    const { ctx, went } = context({ data: skills, status: 'ready', error: null })
    // The view names a project by its last folder; the folders of that name come from the project list.
    const asked: string[] = []
    vi.stubGlobal('fetch', async (url: string) => {
      asked.push(url)
      return new Response(JSON.stringify({ projects: [{ project: '/work/alpha', name: 'alpha' }, { project: '/other/alpha', name: 'alpha' },
        { project: '/work/beta', name: 'beta' }] }))
    })
    const { host, dispose } = mount(() => <Skills ctx={ctx} since={base.range.since} until={base.range.until} />)
    host.querySelector<HTMLElement>('[data-chart="projects"] [data-open]')!.click()
    await vi.waitFor(() => expect(went.patches).toHaveLength(1))
    expect(asked).toEqual(['/api/board/projects'])
    host.querySelector<HTMLElement>('[data-chart="tools"] [data-open]')!.click()
    host.querySelector<HTMLElement>('[data-chart="listings"] [data-open]')!.click()
    expect(went.patches[0]).toEqual({ project: ['/other/alpha', '/work/alpha'], repo: null, sel: null })
    expect(JSON.stringify(went.patches[1])).toContain('copilot-cli')
    expect(JSON.stringify(went.patches[2])).toContain('claude-code')
    dispose()
    vi.unstubAllGlobals()
  })
})

const event = (type: string, ts: number, extra: Partial<FlowEvent> = {}): FlowEvent =>
  ({ type, ts, source: 'store', rt_tokens: null, cum_tokens: null, ...extra })

describe('INS-OPEN · a step of a session flow', () => {
  const inspect = (events: FlowEvent[], open?: (detail: { type: 'skill' | 'tool'; name: string }) => void) => {
    const steps = stepsOf(flowModel(events).events)
    return { steps, ...mount(() => <StepInspector step={steps[0]} close={() => {}} open={open} />) }
  }

  it('a skill step opens the skill', () => {
    const went: unknown[] = []
    const { host, dispose } = inspect([event('skill_event', 1_700_000_000, { name: 'kql', phase: 'invoked' })], detail => went.push(detail))
    const button = host.querySelector<HTMLElement>('[data-open-skill]')!
    expect(button.textContent).toBe('Open skill kql')
    button.click()
    expect(went).toEqual([{ type: 'skill', name: 'kql' }])
    dispose()
  })

  it('a call of the Skill tool opens the skill it started and the tool; any call opens its tool', () => {
    const went: unknown[] = []
    const { host, dispose } = inspect([event('tool_use', 1_700_000_000, { to: 'Skill', params: '{"skill":"review"}' }),
    ], detail => went.push(detail))
    host.querySelector<HTMLElement>('[data-open-skill]')!.click()
    host.querySelector<HTMLElement>('[data-open-tool]')!.click()
    expect(went).toEqual([{ type: 'skill', name: 'review' }, { type: 'tool', name: 'Skill' }])
    dispose()
  })

  it('reads the skill only from a Skill call whose input was kept; a drawer with no opener draws no button', () => {
    expect(skillOfCall(event('tool_use', 1, { to: 'skill', params: '{"name":" plan "}' }))).toBe('plan')
    expect(skillOfCall(event('tool_use', 1, { to: 'Skill', params: 'not json' }))).toBe('')
    expect(skillOfCall(event('tool_use', 1, { to: 'Skill' }))).toBe('')
    expect(skillOfCall(event('tool_use', 1, { to: 'Read', params: '{"skill":"x"}' }))).toBe('')
    const { host, dispose } = inspect([event('skill_event', 1_700_000_000, { name: 'kql' })])
    expect(host.querySelector('[data-open-skill]')).toBeNull()
    dispose()
  })
})

describe('INS-OPEN · the skill detail says whose files it read', () => {
  it('names the serving node in all nodes scope, says nothing is read for another node, and nothing on this node', async () => {
    const { skillFilesNote } = await import('../../src/drawer/OtherDetail')
    expect(skillFilesNote('fleet', false)).toBe('Skill files are read from the disk of the node that serves this page ([0]). ' +
      'Copies on other nodes are not read.')
    expect(skillFilesNote('node', false)).toContain('The skill files of another node are not read')
    expect(skillFilesNote('node', true)).toBeUndefined()
    expect(skillFilesNote('local', true)).toBeUndefined()
  })
})

describe('INS-OPEN · no view is drawn without openers', () => {
  it('every Insights view builds its openers from the one map', () => {
    const folder = join(__dirname, '../../src/panels/insights')
    const source = (file: string) => readFileSync(join(folder, file), 'utf8')
    const views = readdirSync(folder).filter(file => file.endsWith('.tsx') && file !== 'InsightCard.tsx' && /<InsightCard[<\s]/.test(source(file)))
    // One file per view of views.ts.
    expect(views).toHaveLength(INSIGHT_VIEWS.length)
    // A view that draws names as plain text is a dead end for the reader: a new view has to say what its names open.
    expect(views.filter(file => !/\bopens\(/.test(source(file)))).toEqual([])
  })
})
