// ─── Spend in subagents as a view: the rows its charts draw, coloured by side or by repository ─
import { fmtNum } from '../../design/format'
import type { BarRow, LegendItem } from './Bars'
import type { ColourMode } from './charts/ColourBy'
import {
  leftOut, money, plural, share, subagentHover, subagentSessionHover, type InsightSession, type Label, type SubagentBody,
} from './insightsModel'
import { hasOther, repoParts, type RepoSegment } from './repoSplit'
import { sessionHover, sessionLabel, sessionName } from './sessionName'

export const SUBAGENT_SESSIONS = 5
const SIDES = { main: 'main agent', subagents: 'subagents' } as const
export const SIDE_LEGEND: LegendItem[] = [{ label: 'Main agent', tone: 2 }, { label: 'Subagents', tone: 1 }]

/** The one line under the title: what is measured, in what unit, over what. */
export function subagentLine(body: SubagentBody): string {
  if (!body.summary.subagents) return 'No subagent ran in this period.'
  return 'Model requests per tool and their cost at list price (US dollars), split by who made them: a session\'s main ' +
    'agent or its subagents.'
}

/** What prevents a misreading: list price is not a bill, and requests with no known cost are left out of it. */
export const subagentNote = (body: SubagentBody) =>
  `Cost is list price, not a bill.${leftOut(body.summary.unpriced_requests)}`

/** Whether the answer splits any bar by repository: the view then offers "Colour by: Repository". */
export const subagentSplit = (body: SubagentBody) => !!body.repo_order?.length && [
  ...body.tools.flatMap(tool => [tool.main, tool.subagents]), ...body.sessions.map(row => ({ repos: sessionRepos(row) })),
].some(bar => bar.repos?.length)
export const subagentOther = (body: SubagentBody) => hasOther([...body.tools.flatMap(tool => [tool.main, tool.subagents]),
  ...body.sessions.map(row => ({ repos: sessionRepos(row) }))])

const toolCost = (tool: SubagentBody['tools'][number]) => tool.main.cost_usd == null && tool.subagents.cost_usd == null ? null
  : (tool.main.cost_usd ?? 0) + (tool.subagents.cost_usd ?? 0)

/** Per tool one bar, its parts the main agent's and the subagents' cost (or requests). */
export function sideRows(body: SubagentBody, label: Label, of: 'cost' | 'requests'): (BarRow & { tool: string })[] {
  return body.tools.map(tool => ({
    key: tool.tool, label: label(tool.tool), tool: tool.tool,
    sub: of === 'cost' ? `${plural(tool.subagents.agents, 'subagent')} · ${share(tool.subagent_share)} of cost in subagents` : undefined,
    total: of === 'cost' ? money(toolCost(tool)) : plural(tool.main.requests + tool.subagents.requests, 'request'),
    parts: (['main', 'subagents'] as const).map(side => ({
      key: side, label: SIDES[side], tone: side === 'main' ? 2 : 1,
      value: of === 'cost' ? tool[side].cost_usd : tool[side].requests,
      text: of === 'cost' ? money(tool[side].cost_usd) : fmtNum(tool[side].requests), hover: subagentHover(tool, side, label),
    })),
  }))
}

/** Per tool and side one bar, its parts the repositories; a side the answer did not split is one grey part. */
export function sideRepoRows(body: SubagentBody, label: Label, of: 'cost' | 'requests'): (BarRow & { tool: string })[] {
  const key = of === 'cost' ? 'cost_usd' : 'requests'
  const format = (value: number) => of === 'cost' ? money(value) : fmtNum(value)
  return body.tools.flatMap(tool => (['main', 'subagents'] as const).filter(side => (tool[side][key] ?? 0) > 0).map(side => ({
    key: `${tool.tool}:${side}`, label: `${label(tool.tool)}: ${SIDES[side]}`, tool: tool.tool,
    sub: side === 'subagents' ? plural(tool.subagents.agents, 'subagent') : undefined,
    total: of === 'cost' ? money(tool[side].cost_usd) : plural(tool[side].requests, 'request'),
    parts: tool[side].repos?.length
      ? repoParts(tool[side].repos, key, body.repo_order, format, `${label(tool.tool)}, ${SIDES[side]}, ${of}`,
        `${of} in ${side === 'main' ? 'main agents' : 'subagents'}`, subagentHover(tool, side, label))
      : [{ key: 'whole', label: SIDES[side], value: tool[side][key], tone: 7, text: format(tool[side][key] ?? 0),
        hover: `${subagentHover(tool, side, label)} Not split by repository in this answer.` }],
  })))
}

/** The session's own repository: one segment of the answer's session row. */
export const sessionRepos = (row: InsightSession) => Array.isArray(row.repos) ? row.repos as RepoSegment[] : undefined

/** The sessions with the largest subagent cost, coloured as subagents, or by their repository. */
export function sessionRows(body: SubagentBody, label: Label, mode: ColourMode): (BarRow & { session: string; sessionName: string })[] {
  return [...body.sessions].filter(row => typeof row.cost_usd === 'number')
    .sort((a, b) => Number(b.cost_usd) - Number(a.cost_usd)).slice(0, SUBAGENT_SESSIONS).map(row => ({
      key: row.session_id, label: sessionLabel(row, label), title: sessionHover(row), session: row.session_id, sessionName: sessionName(row),
      sub: `${plural(Number(row.agents ?? 0), 'subagent')} · ${plural(Number(row.requests ?? 0), 'request')}`,
      total: money(Number(row.cost_usd)),
      parts: mode === 'repo' && sessionRepos(row)?.length ? repoParts(sessionRepos(row), 'cost_usd', body.repo_order, value => money(value),
        `Session ${sessionName(row)}, subagent cost`, 'subagent cost', subagentSessionHover(row, label))
        : [{ key: 'cost', label: 'subagent cost', value: Number(row.cost_usd), tone: mode === 'repo' ? 7 : 1, text: money(Number(row.cost_usd)),
          hover: subagentSessionHover(row, label) }],
    }))
}
