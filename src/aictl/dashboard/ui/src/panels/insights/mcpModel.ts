// ─── MCP servers — the payload of /api/board/insights/mcp and the finding it states ─
// A server with fewer than 20 calls or 3 sessions is too small to compare: it is listed apart, never leads and has no failure share.
import { fmtN } from '../../design/format'
import { bytes, hours, millis, plural, share, type Base, type Hero, type Label } from './insightsModel'

type Num = number | null
export type McpFigures = {
  calls: number; sessions: number; projects: number; failures: number; failure_share: Num; enough: boolean
  p50_ms: Num; p95_ms: Num; sum_ms: Num; output_bytes: Num; carried_bytes: Num
}
export type McpServer = McpFigures & { server: string; tools: string[]; server_tools: number; calls_by_tool: (McpFigures & { tool_name: string })[] }
export type McpBody = Base<'mcp'> & {
  servers: McpServer[]; small_servers: McpServer[]
  listed: { server: string; tool: string; sessions: number; called_sessions: number; list_tokens: number; unused_tokens: number; listed_tools: number }[]
  projects: { project: string; calls: number; sessions: number; servers: number; failures: number; sum_ms: number; output_bytes: number }[]
  summary: {
    calls: number; all_calls: number; call_share: Num; sum_ms: Num; time_share: Num; output_bytes: Num; carried_bytes: Num
    failures: number; servers: number; top: McpServer | null; listing_tools: string[]; listed_servers: number; never_called: number
    unused_tokens: Num
    small_servers: number; small_projects: string[]
  }
}

/** The time MCP calls took and the bytes they carried, the server that took most, and the listings never called. */
export function mcpFinding(body: McpBody, label: Label) {
  const s = body.summary
  if (!s.calls && !body.listed.length) return 'No MCP call and no MCP tool listing in this period.'
  const all = s.calls ? `${plural(s.calls, 'MCP call')} (${share(s.call_share)} of all tool calls) took ${hours(s.sum_ms)} ` +
    `(${share(s.time_share)} of all tool time); their results were sent again with later requests up to ${bytes(s.carried_bytes)}.` : ''
  const top = s.top
  const lead = top ? ` The server that took most, ${top.server}, took ${hours(top.sum_ms)} in ${plural(top.calls, 'call')} of ` +
    `${plural(top.sessions, 'session')} in ${plural(top.projects, 'project')}: median ${millis(top.p50_ms)}, 95th percentile ` +
    `${millis(top.p95_ms)}, ${share(top.failure_share)} failed.`
    : s.calls ? ' No server has 20 calls in 3 sessions: too few to compare.' : ''
  const unused = s.listed_servers ? ` ${s.listing_tools.map(label).join(', ')} listed tools of ${plural(s.listed_servers, 'server')} ` +
    `to the model, ${s.never_called} of them never called; listings in sessions that did not call the server took ` +
    `${fmtN(s.unused_tokens ?? 0)} tokens (estimated from size).` : ''
  return (all + lead + unused).trim()
}

export const mcpHero = (body: McpBody): Hero | undefined => body.summary.calls && body.summary.sum_ms != null
  ? { value: hours(body.summary.sum_ms), label: `of tool time in MCP calls, ${share(body.summary.time_share)} of all` } : undefined

/** Which tools report MCP listings, and the groups too small to compare, in one line. */
export function mcpCoverage(body: McpBody, label: Label) {
  const s = body.summary
  const listing = `Only ${s.listing_tools.map(label).join(', ')} reports which MCP tools are listed to the model; for other ` +
    'tools, listed and never called cannot be measured.'
  const small = [
    s.small_servers ? `${plural(s.small_servers, 'server')} with fewer than 20 calls or 3 sessions` : '',
    s.small_projects.length ? `${plural(s.small_projects.length, 'project')} with fewer than 20 MCP calls` : '',
  ].filter(Boolean)
  return listing + (small.length ? ` Too small to compare: ${small.join('; ')}.` : '')
}
