// ─── MCP servers — the payload of /api/board/insights/mcp, the sentence it states and the rows of its charts ─
// A server or server tool with fewer than 20 calls or 3 sessions is too small to compare: it gets no bar and no failure share.
import { fmtN, fmtNum, projectName } from '../../design/format'
import { type BarLegend, type BarRow } from './flowBarModel'
import { bytes, hours, millis, plural, share, type Base, type Hero, type Label } from './insightsModel'

type Num = number | null
export type McpFigures = {
  calls: number; sessions: number; projects: number; failures: number; failure_share: Num; enough: boolean
  p50_ms: Num; p95_ms: Num; sum_ms: Num; output_bytes: Num; carried_bytes: Num
}
export type McpTool = McpFigures & { tool_name: string }
export type McpServer = McpFigures & { server: string; tools: string[]; server_tools: number; calls_by_tool: McpTool[] }
export type McpListed = { server: string; tool: string; sessions: number; called_sessions: number; list_tokens: number; unused_tokens: number; listed_tools: number }
export type McpBody = Base<'mcp'> & {
  servers: McpServer[]; small_servers: McpServer[]
  listed: McpListed[]
  projects: { project: string; calls: number; sessions: number; servers: number; failures: number; sum_ms: number; output_bytes: number }[]
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

export const mcpHero = (body: McpBody): Hero | undefined => body.summary.calls && body.summary.sum_ms != null
  ? { value: hours(body.summary.sum_ms), label: `MCP tool time in ${plural(body.summary.calls, 'call')}, ${share(body.summary.time_share)} of all tool time` }
  : undefined

export const callLegend: BarLegend = [{ tone: 'c1', label: 'Succeeded' }, { tone: 'bad', label: 'Failed (stored failure flag)' }]

/** Hover text of one server's or server tool's calls: calls, sessions, projects, failures and their share. */
export function callHover(name: string, item: McpFigures) {
  return `${name}: ${plural(item.calls, 'call')} in ${plural(item.sessions, 'session')} of ${plural(item.projects, 'project')}; ` +
    `${fmtNum(item.failures)} failed (${share(item.failure_share ?? ratio(item.failures, item.calls))})`
}

const callRow = (key: string, name: string, item: McpFigures, sub: string): BarRow => {
  const hover = callHover(name, item)
  return { key, name, sub, hover,
    parts: [{ value: item.calls - item.failures, tone: 'c1', hover: `${name}: ${fmtNum(item.calls - item.failures)} of ${plural(item.calls, 'call')} succeeded` },
      { value: item.failures, tone: 'bad', hover: `${name}: ${fmtNum(item.failures)} of ${plural(item.calls, 'call')} failed (${share(ratio(item.failures, item.calls))})` }],
    text: `${plural(item.calls, 'call')} · ${fmtNum(item.failures)} failed (${share(item.failure_share)})` }
}

/** Per server with enough calls: its calls split into succeeded and failed. */
export const serverCallRows = (body: McpBody): BarRow[] => body.servers.slice(0, SHOWN).map(item =>
  callRow(item.server, item.server, item, `${plural(item.sessions, 'session')} · ${plural(item.projects, 'project')}`))

/** Hover text of one server's call time: median, 95th percentile and the summed tool time. */
const timeText = (item: McpFigures) => `median ${millis(item.p50_ms)}, 95th percentile ${millis(item.p95_ms)} over the calls with a ` +
  `recorded duration; tool time ${hours(item.sum_ms)} in ${plural(item.calls, 'call')}`
export const timeHover = (name: string, item: McpFigures) => `${name}: ${timeText(item)}`

/** Per server: the median call time as a bar and the 95th percentile as a tick on the same scale. */
export const serverTimeRows = (body: McpBody): BarRow[] => body.servers.slice(0, SHOWN).map(item => {
  const hover = timeHover(item.server, item)
  return { key: item.server, name: item.server, parts: [{ value: item.p50_ms ?? 0, tone: 'c2', hover }], hover,
    tick: item.p95_ms == null ? undefined : { value: item.p95_ms, hover: `${item.server}: 95th percentile ${millis(item.p95_ms)}` },
    text: `median ${millis(item.p50_ms)} · p95 ${millis(item.p95_ms)}` }
})

/** Per server: the summed tool time. */
export const serverSumRows = (body: McpBody): BarRow[] => body.servers.slice(0, SHOWN).map(item => {
  const hover = `${item.server}: tool time ${hours(item.sum_ms)} in ${plural(item.calls, 'call')}, ` +
    `${share(ratio(item.sum_ms ?? 0, body.summary.sum_ms ?? 0))} of all MCP tool time (${hours(body.summary.sum_ms)})`
  return { key: item.server, name: item.server, parts: [{ value: item.sum_ms ?? 0, tone: 'c2', hover }], hover, text: hours(item.sum_ms) }
})

/** Per server: the result bytes returned, or the bytes carried with later requests (an upper bound). */
export const serverBytesRows = (body: McpBody, which: 'output_bytes' | 'carried_bytes'): BarRow[] => body.servers.slice(0, SHOWN).map(item => {
  const hover = which === 'output_bytes'
    ? `${item.server}: results of ${plural(item.calls, 'call')} took ${bytes(item.output_bytes)}`
    : `${item.server}: ${bytes(item.carried_bytes)} carried, result bytes × the later requests of the same session and agent ` +
      `(${bytes(item.output_bytes)} returned); an upper bound, compaction and truncation not counted`
  return { key: item.server, name: item.server, parts: [{ value: item[which] ?? 0, tone: which === 'output_bytes' ? 'c3' : 'c4', hover }],
    hover, text: bytes(item[which]) }
})

/** The server tools with enough calls, by calls; the rest are counted apart. */
export function serverTools(body: McpBody) {
  const every = body.servers.flatMap(item => item.calls_by_tool.map(tool => ({ server: item.server, ...tool })))
  const kept = every.filter(tool => tool.enough).sort((a, b) => b.calls - a.calls)
  return { kept: kept.slice(0, SHOWN_TOOLS), small: every.length - kept.length, more: Math.max(0, kept.length - SHOWN_TOOLS) }
}

/** Per server tool: its calls split into succeeded and failed, with its median and 95th percentile time in the hover. */
export const toolCallRows = (body: McpBody): BarRow[] => serverTools(body).kept.map(tool => {
  const name = `${tool.server} · ${tool.tool_name}`
  const row = callRow(`${tool.server}:${tool.tool_name}`, name, tool, `${plural(tool.sessions, 'session')}`)
  return { ...row, hover: `${callHover(name, tool)}; ${timeText(tool)}; results ${bytes(tool.output_bytes)}, ` +
    `carried up to ${bytes(tool.carried_bytes)}`, text: `${row.text} · median ${millis(tool.p50_ms)} · p95 ${millis(tool.p95_ms)}` }
})

export const listedLegend: BarLegend = [{ tone: 'c1', label: 'Sessions that called the server' }, { tone: 'muted', label: 'Sessions that did not' }]

/** Per listed server: the sessions that listed it, split into those that called it and those that did not. */
export const listedRows = (body: McpBody, label: Label): BarRow[] => body.listed.slice(0, SHOWN).map(item => {
  const not = Math.max(0, item.sessions - item.called_sessions)
  const hover = `${item.server} (${label(item.tool)}): ${plural(item.listed_tools, 'tool')} listed in ${plural(item.sessions, 'session')}, ` +
    `called in ${fmtNum(item.called_sessions)}; listing tokens ${fmtN(item.list_tokens)}, of which ${fmtN(item.unused_tokens)} in ` +
    'sessions that did not call it (estimated from size)'
  return { key: `${item.tool}:${item.server}`, name: item.server, sub: `${plural(item.listed_tools, 'tool')} · ${label(item.tool)}`, hover,
    parts: [{ value: item.called_sessions, tone: 'c1', hover: `${item.server}: called in ${fmtNum(item.called_sessions)} of ${plural(item.sessions, 'session')} that listed it` },
      { value: not, tone: 'muted', hover: `${item.server}: not called in ${fmtNum(not)} of ${plural(item.sessions, 'session')} that listed it, ` +
        `${fmtN(item.unused_tokens)} listing tokens there` }],
    text: `called in ${fmtNum(item.called_sessions)} of ${plural(item.sessions, 'session')} · ${fmtN(item.unused_tokens)} tokens unused` }
})

/** Per project with 20 or more MCP calls: its calls split into succeeded and failed. */
export const mcpProjectRows = (body: McpBody): BarRow[] => body.projects.slice(0, SHOWN).map(row => {
  const name = projectName(row.project)
  const item = { ...row, projects: 1, failure_share: ratio(row.failures, row.calls), enough: true, p50_ms: null, p95_ms: null, carried_bytes: null }
  const base = callRow(row.project, name, item, `${plural(row.servers, 'server')} · ${plural(row.sessions, 'session')}`)
  return { ...base, hover: `${name}: ${plural(row.calls, 'call')} to ${plural(row.servers, 'server')} in ${plural(row.sessions, 'session')}; ` +
    `${fmtNum(row.failures)} failed (${share(item.failure_share)}); tool time ${hours(row.sum_ms)}; results ${bytes(row.output_bytes)}` }
})

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
