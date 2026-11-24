// ─── MCP servers — the payload of /api/board/insights/mcp, the sentence it states and the rows of its charts ─
// A server or server tool with fewer than 20 calls or 3 sessions is too small to compare: it gets no bar and no failure share.
import { fmtN, fmtNum, projectName } from '../../design/format'
import { type BarLegend, type BarPart, type BarRow } from './flowBarModel'
import { bytes, hours, millis, plural, segmentValue, share, type Base, type Hero, type Label } from './insightsModel'
import { hasSplit, repoBarParts } from './repoBarParts'
import type { RepoRef, RepoSegment } from './repoSplit'

type Num = number | null
export type McpFigures = {
  calls: number; sessions: number; projects: number; failures: number; failure_share: Num; enough: boolean
  p50_ms: Num; p95_ms: Num; sum_ms: Num; output_bytes: Num; carried_bytes: Num
  /** Its parts per repository (calls, failures, and for a server sum_ms, output_bytes, carried_bytes), repoSplit.ts; the
   * median and 95th percentile are not split. */
  repos?: RepoSegment[]
}
export type McpTool = McpFigures & { tool_name: string }
export type McpServer = McpFigures & { server: string; tools: string[]; server_tools: number; calls_by_tool: McpTool[] }
export type McpListed = { server: string; tool: string; sessions: number; called_sessions: number; list_tokens: number; unused_tokens: number
  listed_tools: number; repos?: RepoSegment[] }
export type McpBody = Base<'mcp'> & {
  servers: McpServer[]; small_servers: McpServer[]
  listed: McpListed[]
  projects: { project: string; calls: number; sessions: number; servers: number; failures: number; sum_ms: number; output_bytes: number
    repos?: RepoSegment[] }[]
  summary: {
    calls: number; all_calls: number; call_share: Num; sum_ms: Num; time_share: Num; output_bytes: Num; carried_bytes: Num
    failures: number; servers: number; top: McpServer | null; listing_tools: string[]; listed_servers: number; never_called: number
    unused_tokens: Num
    small_servers: number; small_projects: string[]
  }
}

const SHOWN = 8
const SHOWN_TOOLS = 12
const ratio = (part: number, whole: number) => whole ? part / whole : null
const fN = (value: Num) => value == null ? 'not reported' : fmtN(value)

/** The calls, failures, time and bytes of MCP calls, and the listings not called: counts only. */
export function mcpFinding(body: McpBody, label: Label) {
  const s = body.summary
  if (!s.calls && !body.listed.length) return 'No MCP call and no MCP tool listing in this period.'
  const all = s.calls ? `${plural(s.calls, 'MCP call')} to ${plural(s.servers, 'server')} (${share(s.call_share)} of ` +
    `${plural(s.all_calls, 'tool call')}), ${fmtNum(s.failures)} failed. Tool time ${hours(s.sum_ms)} (${share(s.time_share)} of all ` +
    `tool time). Results ${bytes(s.output_bytes)}; carried with later requests up to ${bytes(s.carried_bytes)} (upper bound).` +
    (body.servers.length ? '' : ' No server has 20 calls in 3 sessions, the least the card compares.') : ''
  const unused = s.listed_servers ? ` ${s.listing_tools.map(label).join(', ')} listed tools of ${plural(s.listed_servers, 'server')} ` +
    `to the model; ${fmtNum(s.never_called)} of them not called in any session that listed them. Listings in sessions that did not ` +
    `call the server: an estimated ${fmtN(s.unused_tokens ?? 0)} tokens.` : ''
  return (all + unused).trim()
}

/** The headline: the MCP calls of the period, of all tool calls. */
export const mcpHero = (body: McpBody): Hero | undefined => body.summary.calls
  ? { value: fmtNum(body.summary.calls), label: `MCP calls to ${plural(body.summary.servers, 'server')}, of ${plural(body.summary.all_calls, 'tool call')} ` +
    `(${share(body.summary.call_share)})` }
  : undefined

/** The line under the title: what is measured, in technical terms. */
export const mcpMeasured = 'MCP tool calls in the period, per server, server tool and project: calls, failures, duration and result bytes; ' +
  'MCP tools listed to the model.'

/** Whether the answer carries a repository split on any bar. */
export const mcpSplit = (body: McpBody) => hasSplit(body.repo_order, body.servers, body.projects, body.listed,
  body.servers.flatMap(item => item.calls_by_tool))

/** A repository's failed calls of a bar of calls. */
const failedMore = (segment: RepoSegment) => `${fmtNum(segmentValue(segment, 'failures') ?? 0)} of them failed.`
/** The parts of a bar of calls: succeeded and failed, or a segment per repository. */
function callParts(order: readonly RepoRef[] | undefined, name: string, item: { calls: number; failures: number; repos?: RepoSegment[] },
  repo: boolean, detail: string): BarPart[] {
  if (repo && item.repos?.length) return repoBarParts(order, item.repos, 'calls', value => plural(value, 'call'), name, 'calls', detail, failedMore)
  return [{ value: item.calls - item.failures, tone: 'c1', hover: `${name}: ${fmtNum(item.calls - item.failures)} of ${plural(item.calls, 'call')} succeeded` },
    { value: item.failures, tone: 'bad', hover: `${name}: ${fmtNum(item.failures)} of ${plural(item.calls, 'call')} failed (${share(ratio(item.failures, item.calls))})` }]
}

export const callLegend: BarLegend = [{ tone: 'c1', label: 'Succeeded' }, { tone: 'bad', label: 'Failed (stored failure flag)' }]

/** Hover text of one server's or server tool's calls: calls, sessions, projects, failures and their share. */
export function callHover(name: string, item: McpFigures) {
  return `${name}: ${plural(item.calls, 'call')} in ${plural(item.sessions, 'session')} of ${plural(item.projects, 'project')}; ` +
    `${fmtNum(item.failures)} failed (${share(item.failure_share ?? ratio(item.failures, item.calls))})`
}

const callRow = (order: readonly RepoRef[] | undefined, key: string, name: string, item: McpFigures, sub: string, repo: boolean,
  hover = callHover(name, item)): BarRow => ({ key, name, sub, hover, parts: callParts(order, name, item, repo, hover),
  text: `${plural(item.calls, 'call')} · ${fmtNum(item.failures)} failed (${share(item.failure_share)})` })

/** Per server with enough calls: its calls split into succeeded and failed, or by repository. */
export const serverCallRows = (body: McpBody, repo = false): BarRow[] => body.servers.slice(0, SHOWN).map(item =>
  callRow(body.repo_order, item.server, item.server, item, `${plural(item.sessions, 'session')} · ${plural(item.projects, 'project')}`, repo))

/** Hover text of one server's call time: median, 95th percentile and the summed tool time. */
const timeText = (item: McpFigures) => `median ${millis(item.p50_ms)}, 95th percentile ${millis(item.p95_ms)} over the calls with a ` +
  `recorded duration; tool time ${hours(item.sum_ms)} in ${plural(item.calls, 'call')}`
export const timeHover = (name: string, item: McpFigures) => `${name}: ${timeText(item)}`

/** Per server: the median call time as a bar and the 95th percentile as a tick on the same scale. */
export const serverTimeRows = (body: McpBody): BarRow[] => body.servers.slice(0, SHOWN).map(item => {
  const hover = timeHover(item.server, item)
  // Neutral: a median is not a sum and is never split by repository.
  return { key: item.server, name: item.server, parts: [{ value: item.p50_ms ?? 0, tone: 'muted', hover }], hover,
    tick: item.p95_ms == null ? undefined : { value: item.p95_ms, hover: `${item.server}: 95th percentile ${millis(item.p95_ms)}` },
    text: `${millis(item.p50_ms)} · ${millis(item.p95_ms)}` }
})

const callsMore = (segment: RepoSegment) => `${plural(segmentValue(segment, 'calls') ?? 0, 'call')} in this repository.`

/** Per server: the summed tool time, whole or by repository. */
export const serverSumRows = (body: McpBody, repo = false): BarRow[] => body.servers.slice(0, SHOWN).map(item => {
  const hover = `${item.server}: tool time ${hours(item.sum_ms)} in ${plural(item.calls, 'call')}, ` +
    `${share(ratio(item.sum_ms ?? 0, body.summary.sum_ms ?? 0))} of all MCP tool time (${hours(body.summary.sum_ms)})`
  return { key: item.server, name: item.server, hover, text: hours(item.sum_ms),
    parts: repo && item.repos?.length ? repoBarParts(body.repo_order, item.repos, 'sum_ms', value => hours(value), `${item.server}, tool time`,
      'tool time', hover, callsMore) : [{ value: item.sum_ms ?? 0, tone: 'c2', hover }] }
})

/** Per server: the result bytes returned, or the bytes carried with later requests (an upper bound). */
export const serverBytesRows = (body: McpBody, which: 'output_bytes' | 'carried_bytes', repo = false): BarRow[] => body.servers.slice(0, SHOWN).map(item => {
  const hover = which === 'output_bytes'
    ? `${item.server}: results of ${plural(item.calls, 'call')} took ${bytes(item.output_bytes)}`
    : `${item.server}: ${bytes(item.carried_bytes)} carried, result bytes × the later requests of the same session and agent ` +
      `(${bytes(item.output_bytes)} returned); an upper bound, compaction and truncation not counted`
  return { key: item.server, name: item.server, hover, text: bytes(item[which]),
    parts: repo && item.repos?.length ? repoBarParts(body.repo_order, item.repos, which, value => bytes(value),
      `${item.server}, ${which === 'output_bytes' ? 'bytes returned' : 'bytes carried'}`, which === 'output_bytes' ? 'bytes returned' : 'bytes carried',
      hover, callsMore) : [{ value: item[which] ?? 0, tone: which === 'output_bytes' ? 'c3' : 'c4', hover }] }
})

/** The server tools with enough calls, by calls; the rest are counted apart. */
export function serverTools(body: McpBody) {
  const every = body.servers.flatMap(item => item.calls_by_tool.map(tool => ({ server: item.server, ...tool })))
  const kept = every.filter(tool => tool.enough).sort((a, b) => b.calls - a.calls)
  return { kept: kept.slice(0, SHOWN_TOOLS), small: every.length - kept.length, more: Math.max(0, kept.length - SHOWN_TOOLS) }
}

/** A server tool's bar, with its server and tool as the answer names them (what its name opens). */
export type McpToolRow = BarRow & { server: string; tool_name: string }

/** Per server tool: its calls split into succeeded and failed, with its median and 95th percentile time in the hover. */
export const toolCallRows = (body: McpBody, repo = false): McpToolRow[] => serverTools(body).kept.map(tool => {
  const name = `${tool.server} · ${tool.tool_name}`
  const hover = `${callHover(name, tool)}; ${timeText(tool)}; results ${bytes(tool.output_bytes)}, carried up to ${bytes(tool.carried_bytes)}`
  const row = callRow(body.repo_order, `${tool.server}:${tool.tool_name}`, name, tool, `${plural(tool.sessions, 'session')}`, repo, hover)
  return { ...row, text: `${row.text} · median ${millis(tool.p50_ms)} · p95 ${millis(tool.p95_ms)}`, server: tool.server, tool_name: tool.tool_name }
})

export const listedLegend: BarLegend = [{ tone: 'c1', label: 'Sessions that called the server' }, { tone: 'muted', label: 'Sessions that did not' }]

/** Per listed server: the sessions that listed it, split into those that called it and those that did not. */
export const listedRows = (body: McpBody, label: Label, repo = false): (BarRow & { server: string })[] => body.listed.slice(0, SHOWN).map(item => {
  const not = Math.max(0, item.sessions - item.called_sessions)
  const hover = `${item.server} (${label(item.tool)}): ${plural(item.listed_tools, 'tool')} listed in ${plural(item.sessions, 'session')}, ` +
    `called in ${fmtNum(item.called_sessions)}; listing tokens ${fmtN(item.list_tokens)}, of which ${fmtN(item.unused_tokens)} in ` +
    'sessions that did not call it (estimated from size)'
  return { key: `${item.tool}:${item.server}`, server: item.server, name: item.server, sub: `${plural(item.listed_tools, 'tool')} · ${label(item.tool)}`, hover,
    parts: repo && item.repos?.length ? repoBarParts(body.repo_order, item.repos, 'sessions', value => plural(value, 'session'),
      `${item.server}, sessions that listed it`, 'sessions that listed it', hover, segment => `Called in ` +
        `${fmtNum(segmentValue(segment, 'called_sessions') ?? 0)} of them; ${fN(segmentValue(segment, 'unused_tokens'))} listing tokens in those that did not.`)
    : [{ value: item.called_sessions, tone: 'c1', hover: `${item.server}: called in ${fmtNum(item.called_sessions)} of ${plural(item.sessions, 'session')} that listed it` },
      { value: not, tone: 'muted', hover: `${item.server}: not called in ${fmtNum(not)} of ${plural(item.sessions, 'session')} that listed it, ` +
        `${fmtN(item.unused_tokens)} listing tokens there` }],
    text: `called in ${fmtNum(item.called_sessions)} of ${plural(item.sessions, 'session')} · ${fmtN(item.unused_tokens)} tokens unused` }
})

/** Per project with 20 or more MCP calls: its calls split into succeeded and failed. */
export const mcpProjectRows = (body: McpBody, repo = false): BarRow[] => body.projects.slice(0, SHOWN).map(row => {
  const name = projectName(row.project)
  const item = { ...row, projects: 1, failure_share: ratio(row.failures, row.calls), enough: true, p50_ms: null, p95_ms: null, carried_bytes: null }
  const hover = `${name}: ${plural(row.calls, 'call')} to ${plural(row.servers, 'server')} in ${plural(row.sessions, 'session')}; ` +
    `${fmtNum(row.failures)} failed (${share(item.failure_share)}); tool time ${hours(row.sum_ms)}; results ${bytes(row.output_bytes)}`
  return callRow(body.repo_order, row.project, name, item, `${plural(row.servers, 'server')} · ${plural(row.sessions, 'session')}`, repo, hover)
})

/** The id the MCP server detail reads a server by: `mcp:<server>`, as the board's MCP panel groups its calls. */
export const mcpServerId = (server: string) => server ? `mcp:${server}` : ''
/** The name the store keeps a server tool's calls under, for the tool detail: `mcp__<server>__<tool>`. The answer names
 * only the server and the tool; a call stored under another name (a source that reports the server apart) is not found. */
export const mcpToolName = (server: string, tool: string) => server && tool ? `mcp__${server}__${tool}` : ''

/** Which tools report MCP listings, and the groups too small to compare, in one line. */
export function mcpCoverage(body: McpBody, label: Label) {
  const s = body.summary
  const listing = `${s.listing_tools.map(label).join(', ')} reports which MCP tools are listed to the model; for other ` +
    'tools, listed and not called is not measured.'
  const tools = serverTools(body)
  const small = [
    s.small_servers ? `${plural(s.small_servers, 'server')} with fewer than 20 calls or 3 sessions` : '',
    tools.small ? `${plural(tools.small, 'server tool')} with fewer than 20 calls or 3 sessions` : '',
    s.small_projects.length ? `${plural(s.small_projects.length, 'project')} with fewer than 20 MCP calls` : '',
  ].filter(Boolean)
  return listing + (small.length ? ` Too small to compare (in the data table): ${small.join('; ')}.` : '')
}
