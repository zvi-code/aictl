import type { DetailAgent } from '../data/contract.gen'

export function mcpTotals(rows: DetailAgent['tool_totals'] | undefined) {
  if (!rows) return undefined
  const totals = new Map<string, { server: string; calls: number; failed: number; input?: number; output?: number; partial: boolean }>()
  for (const row of rows) {
    if (!row.mcp_server) continue
    const stats = totals.get(row.mcp_server) ?? { server: row.mcp_server, calls: 0, failed: 0, partial: false }
    stats.calls += row.calls
    stats.failed += row.failed
    if (row.input_bytes != null) stats.input = (stats.input ?? 0) + row.input_bytes
    if (row.output_bytes != null) stats.output = (stats.output ?? 0) + row.output_bytes
    stats.partial ||= row.input_bytes == null || row.output_bytes == null
    totals.set(stats.server, stats)
  }
  return [...totals.values()].sort((a, b) => b.calls - a.calls || a.server.localeCompare(b.server))
}
