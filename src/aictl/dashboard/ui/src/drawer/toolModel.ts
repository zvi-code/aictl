import type { DetailAgent } from '../data/contract.gen'

export const UNKNOWN_SERVER = 'Unknown server'

/** Per MCP server: calls, failures, recorded run time and sizes. A server tool whose name
 * does not say its server ('' from the API) is counted under "Unknown server", not dropped. */
export function mcpTotals(rows: DetailAgent['tool_totals'] | undefined) {
  if (!rows) return undefined
  const totals = new Map<string, { server: string; calls: number; failed: number; total_ms?: number; input?: number; output?: number; partial: boolean }>()
  for (const row of rows) {
    if (row.mcp_server == null) continue
    const server = row.mcp_server || UNKNOWN_SERVER
    const stats = totals.get(server) ?? { server, calls: 0, failed: 0, partial: false }
    stats.calls += row.calls
    stats.failed += row.failed
    if (row.total_ms != null) stats.total_ms = (stats.total_ms ?? 0) + row.total_ms
    if (row.input_bytes != null) stats.input = (stats.input ?? 0) + row.input_bytes
    if (row.output_bytes != null) stats.output = (stats.output ?? 0) + row.output_bytes
    stats.partial ||= row.input_bytes == null || row.output_bytes == null || row.total_ms == null
    totals.set(stats.server, stats)
  }
  return [...totals.values()].sort((a, b) => b.calls - a.calls || a.server.localeCompare(b.server))
}
