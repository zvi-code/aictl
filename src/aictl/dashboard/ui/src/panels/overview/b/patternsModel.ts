// Shapes for the MCP servers and Convergence panels and their drawers. The server computes
// every figure; these helpers only turn its rows into table rows and readable text.
import { boardQuery, windowOf } from '../../../data/filters'
import type { KeyedRow, PanelContext } from '../../types'

export type QueryBlock = { view: string; kql: string; kusto_url: string | null } | null
type Figures = {
  calls: number; failures: number; fail_rate: number | null; total_ms: number | null; p50_ms: number | null
  p95_ms: number | null; output_bytes: number | null; est_tokens: number | null; time_share: number | null
}
export type McpTool = Figures & { name: string; sessions: number | null; last_ts: number | null }
export type McpGroup = Figures & {
  id: string; kind: 'mcp' | 'unknown' | 'builtin'; server: string; label: string; sessions: number | null
  sessions_at_least: boolean; tool_count: number; first_ts: number | null; last_ts: number | null; tools: McpTool[]
}
export type McpBody = {
  groups: McpGroup[]
  totals: { calls: number | null; failures: number | null; sessions: number | null; total_ms: number | null
    tool_names: number | null; tool_names_shown: number }
  definitions: Record<string, string>; query: QueryBlock; node_scope?: { kind: string; node_id: string | null }
}
export type McpServerBody = {
  id: string; label: string; group: McpGroup | null; series: { ts: number; calls: number; failures: number; total_ms: number | null }[]
  bucket_s?: number; errors: { key: string; tool: string; count: number; last_ts: number; sample: string | null }[]
  failures_read: number; failures_total?: number
  sessions: { session_id: string; node_id?: string; title: string; calls: number; failures: number; total_ms: number | null
    output_bytes: number | null; first_ts: number | null; last_ts: number | null; tools: string[] }[]
  sessions_total?: number | null; definitions: Record<string, string>; query: QueryBlock
}
export type SignalHit = { id: string; label: string; weight: number; evidence: string; values: Record<string, unknown> }
export type ConvergenceRow = {
  session_id: string; node_id?: string; title?: string; tool?: string; project_path?: string; model?: string
  first_ts?: number; last_ts?: number; requests: number; tokens: number; cost_usd?: number | null; calls?: number; errors?: number
  repeats?: number; top_repeat?: number; retries?: number; top_file_edits?: number; top_file?: string; longest_dry?: number
  tail_dry?: number; compactions: number; accepted?: number; tokens_per_change: number | null; score: number
  signals: SignalHit[]; verdict: string
}
export type ConvergenceBody = {
  rows: ConvergenceRow[]; flagged: number; checked: number; checked_capped: boolean
  signals: { id: string; label: string; weight: number; definition: string }[]
  definitions: Record<string, string>; query: QueryBlock; node_scope?: { kind: string; node_id: string | null }
}
export type StripCell = {
  first: number; last: number; tokens: number; output_tokens: number; calls: number; errors: number; edits: number
  accepted: number; repeats: number; retries: number
}
export type SessionConvergence = {
  session_id: string; requests: number; truncated: boolean; strip: StripCell[]
  clusters: { label: string; tool: string; calls: number; first: number; last: number; failed: number }[]; clusters_total: number
  retry_runs: { first: number; last: number; retries: number }[]; retry_runs_total: number
  files: { file: string; edits: number; failed: number; first: number; last: number }[]
  compactions: number[]; summary: Record<string, number | null>; signals: SignalHit[]; verdict: string
  definitions: Record<string, string>; query: QueryBlock
}

/** The board's time range and filters as query parameters, as the tool and error drawers send them. */
export function windowQuery(ctx: PanelContext) {
  const picked = ctx.filters().sel
  const range = ctx.board('range')
  return new URLSearchParams(boardQuery(ctx.filters(), ctx.tools(), picked
    ? { ...picked, buckets: 48 } : range ? { ...range, buckets: range.bucket_starts.length } : windowOf(ctx.filters().range, ctx.startedAt)))
}

/**
 * Server groups as folded parents with their tools as children. A lone group that is not an MCP server
 * (only built-in tools) is not folded: its tools are the rows, since unfolding one row tells nothing.
 */
export function mcpRows(body: McpBody | undefined): KeyedRow[] {
  if (!body) return []
  if (body.groups.length === 1 && body.groups[0].kind !== 'mcp') {
    const [group] = body.groups
    return group.tools.map(tool => ({ id: `${group.id}\u0000${tool.name}`,
      row: { ...tool, type: 'tool', tools: undefined, sessions_text: tool.sessions == null ? undefined : String(tool.sessions) } }))
  }
  return body.groups.flatMap(group => [
    { id: group.id, folded: true, row: { ...group, name: group.label, type: 'group', tools: group.tool_count,
      sessions_text: group.sessions == null ? undefined : `${group.sessions_at_least ? '≥ ' : ''}${group.sessions}` } },
    ...group.tools.map(tool => ({ id: `${group.id}\u0000${tool.name}`, parent: group.id,
      row: { ...tool, type: 'tool', tools: undefined, sessions_text: tool.sessions == null ? undefined : String(tool.sessions) } })),
  ])
}

export function share(value: number | null | undefined) {
  return value == null ? undefined : `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`
}

export function signalText(row: ConvergenceRow) {
  return row.signals.map(signal => `${signal.label}: ${signal.evidence}`).join(' · ')
}

/** The height of each strip bar relative to the largest bin, from 0 to 1. */
export function scaled(cells: readonly StripCell[], key: keyof StripCell) {
  const top = Math.max(0, ...cells.map(cell => cell[key]))
  return cells.map(cell => top ? cell[key] / top : 0)
}

/** Which strip bins a request range covers. */
export function binsOf(cells: readonly StripCell[], first: number, last: number) {
  return cells.flatMap((cell, index) => cell.last >= first && cell.first <= last ? [index] : [])
}

export function requestRange(first: number, last: number) {
  return first === last ? `request ${first}` : `requests ${first}-${last}`
}
