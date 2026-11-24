import { Show, untrack } from 'solid-js'
import { fmtNum } from '../../design/format'
import { Bars, type BarRow } from './Bars'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import {
  subagentHero, money, plural, share, subagentFinding, subagentHover, subagentSessionHover, toolLabel,
  type InsightSession, type Label, type SubagentBody,
} from './insightsModel'
import { sessionHover, sessionLabel, sessionName } from './sessionName'
import { RepoLegend } from './RepoLegend'
import { hasOther, repoParts, type RepoSegment } from './repoSplit'

const legend = [{ label: 'Main agent', tone: 2 }, { label: 'Subagents', tone: 1 }]
const SESSIONS = 5

function sideRows(body: SubagentBody, label: Label, of: 'cost' | 'requests'): BarRow[] {
  return body.tools.map(tool => ({
    key: tool.tool, label: label(tool.tool),
    sub: of === 'cost' ? `${plural(tool.subagents.agents, 'subagent')} · ${share(tool.subagent_share)} of cost in subagents` : undefined,
    total: of === 'cost' ? money(tool.main.cost_usd == null && tool.subagents.cost_usd == null ? null
      : (tool.main.cost_usd ?? 0) + (tool.subagents.cost_usd ?? 0)) : plural(tool.main.requests + tool.subagents.requests, 'request'),
    parts: (['main', 'subagents'] as const).map(side => ({
      key: side, label: side === 'main' ? 'main agent' : 'subagents', tone: side === 'main' ? 2 : 1,
      value: of === 'cost' ? tool[side].cost_usd : tool[side].requests,
      text: of === 'cost' ? money(tool[side].cost_usd) : fmtNum(tool[side].requests), hover: subagentHover(tool, side, label),
    })),
  }))
}

const SIDES = { main: 'main agent', subagents: 'subagents' } as const

/** Per tool, the main agent's and the subagents' cost (or requests), each a row split by repository; the bar above splits them by side. */
function sideRepoRows(body: SubagentBody, label: Label, of: 'cost' | 'requests'): BarRow[] {
  const key = of === 'cost' ? 'cost_usd' : 'requests'
  const format = (value: number) => of === 'cost' ? money(value) : fmtNum(value)
  return body.tools.flatMap(tool => (['main', 'subagents'] as const).filter(side => tool[side].repos?.length).map(side => ({
    key: `${tool.tool}:${side}`, label: `${label(tool.tool)}: ${SIDES[side]}`,
    sub: side === 'subagents' ? plural(tool.subagents.agents, 'subagent') : undefined,
    total: of === 'cost' ? money(tool[side].cost_usd) : plural(tool[side].requests, 'request'),
    parts: repoParts(tool[side].repos, key, body.repo_order, format, `${label(tool.tool)}, ${SIDES[side]}, ${of}`,
      `${of} in ${side === 'main' ? 'main agents' : 'subagents'}`, subagentHover(tool, side, label)),
  })))
}

/** The session's own repository: one segment of the answer's session row. */
const sessionRepos = (row: InsightSession) => Array.isArray(row.repos) ? row.repos as RepoSegment[] : undefined

/** The sessions with the largest subagent cost, as the answer lists them, coloured by their repository where the answer gives it. */
function sessionRows(body: SubagentBody, label: Label): BarRow[] {
  return [...body.sessions].filter(row => typeof row.cost_usd === 'number')
    .sort((a, b) => Number(b.cost_usd) - Number(a.cost_usd)).slice(0, SESSIONS).map(row => ({
      key: row.session_id, label: sessionLabel(row, label), title: sessionHover(row),
      sub: `${plural(Number(row.agents ?? 0), 'subagent')} · ${plural(Number(row.requests ?? 0), 'request')}`,
      total: money(Number(row.cost_usd)),
      parts: sessionRepos(row)?.length ? repoParts(sessionRepos(row), 'cost_usd', body.repo_order, value => money(value),
        `Session ${sessionName(row)}, subagent cost`, 'subagent cost', subagentSessionHover(row, label))
        : [{ key: 'cost', label: 'subagent cost', value: Number(row.cost_usd), tone: 1, text: money(Number(row.cost_usd)),
          hover: subagentSessionHover(row, label) }],
    }))
}

function Visual(props: { body: SubagentBody; label: Label }) {
  const sessionsSplit = () => props.body.sessions.some(row => sessionRepos(row)?.length)
  return <>
    <RepoLegend split={props.body} other={hasOther([...props.body.tools.flatMap(tool => [tool.main, tool.subagents]),
      ...props.body.sessions.map(row => ({ repos: sessionRepos(row) }))])} />
    <Bars name="subagent-cost" title="Cost per tool: main agent and subagents" legend={legend}
      axis="Length: cost at list price, one linear scale for every tool from $0." rows={sideRows(props.body, props.label, 'cost')} />
    <Bars name="subagent-cost-repos" title="Cost per tool of the main agent and of subagents, by repository"
      axis="Length: cost at list price, one linear scale from $0 for every row; a segment per repository."
      rows={sideRepoRows(props.body, props.label, 'cost')} />
    <Bars name="subagent-requests" title="Requests per tool: main agent and subagents" legend={legend} scale="whole"
      axis="Bar: the tool's requests in the period (100%); segments: requests of the main agent and of subagents."
      rows={sideRows(props.body, props.label, 'requests')} />
    <Bars name="subagent-requests-repos" title="Requests per tool of the main agent and of subagents, by repository"
      axis="Length: requests, one linear scale from 0 for every row; a segment per repository."
      rows={sideRepoRows(props.body, props.label, 'requests')} />
    <Show when={sessionRows(props.body, props.label).length}>
      <Bars name="subagent-sessions" title={`Sessions with the largest subagent cost (up to ${SESSIONS})`}
        axis={`Length: subagent cost of the session at list price, linear from $0${sessionsSplit() ? '; coloured by the session\'s repository' : ''}.`}
        rows={sessionRows(props.body, props.label)} />
    </Show>
  </>
}

export default function Subagents(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<SubagentBody> {...props} card="subagents" title="Spend in subagents" tab="team"
    hero={subagentHero}
    finding={body => subagentFinding(body, label)}
    visual={body => <Visual body={body} label={label} />}
    note={'A subagent request has an agent id that is set and differs from its session id. Cost is list price, not a bill; ' +
      'a tool whose requests carry no price shows "not reported". Only requests in the period count.'}
    table={{
      label: 'Spend in subagents by tool',
      rows: body => body.tools.map(tool => ({
        id: tool.tool, tool: label(tool.tool), main_requests: tool.main.requests, main_cost: tool.main.cost_usd ?? undefined,
        sub_requests: tool.subagents.requests, sub_cost: tool.subagents.cost_usd ?? undefined, agents: tool.subagents.agents,
        share: tool.subagent_share ?? undefined,
      })),
      fields: [textField('tool', 'Tool'), numberField('main_requests', 'Main agent requests', fmtNum),
        numberField('main_cost', 'Main agent cost (list price)', value => money(value)),
        numberField('sub_requests', 'Subagent requests', fmtNum), numberField('sub_cost', 'Subagent cost (list price)', value => money(value)),
        numberField('agents', 'Subagents', fmtNum), numberField('share', 'Subagent share of cost', value => share(value))],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      numberField('agents', 'Subagents', fmtNum), numberField('requests', 'Subagent requests', fmtNum),
      numberField('cost_usd', 'Subagent cost (list price)', value => money(value)),
      numberField('main_cost', 'Main agent cost (list price)', value => money(value))]} />
}
