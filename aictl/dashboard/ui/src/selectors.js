// ─── Pure data selectors — extracted from app.js for testability ─
// All functions are pure: (input) → output, no side effects.

const MAX_GLOBAL = 200;
const MAX_TOOL = 80;

export const GLOBAL_KEYS = ['ts','files','tokens','cpu','mem_mb','mcp','mem_tokens',
                     'live_sessions','live_tokens','live_in_rate','live_out_rate'];

/**
 * Merge an SSE summary update into the existing snapshot.
 * Tool-level fields (live, vendor, host) are updated; everything else is spread.
 */
export function mergeSseSummary(prev, data) {
  if(!prev) return data;
  const toolMap = Object.fromEntries((data.tools || []).map(t => [t.tool, t]));
  return {
    ...prev,
    ...data,
    tools: prev.tools.map(t => {
      const update = toolMap[t.tool];
      if(!update) return t;
      return { ...t, live: update.live, vendor: update.vendor || t.vendor, host: update.host || t.host };
    }),
  };
}

/**
 * Append a single SSE data point to the running history arrays.
 * Trims to MAX_GLOBAL entries to bound memory.
 */
export function appendHistory(prev, data) {
  if(!prev) return prev;
  prev.ts.push(data.timestamp);
  prev.files.push(data.total_files);
  prev.tokens.push(data.total_tokens);
  prev.cpu.push(Math.round(data.total_cpu * 10) / 10);
  prev.mem_mb.push(Math.round(data.total_mem_mb * 10) / 10);
  prev.mcp.push(data.total_mcp_servers);
  prev.mem_tokens.push(data.total_memory_tokens);
  prev.live_sessions.push(data.total_live_sessions);
  prev.live_tokens.push(data.total_live_estimated_tokens);
  prev.live_in_rate.push(Math.round((data.total_live_inbound_rate_bps || 0) * 100) / 100);
  prev.live_out_rate.push(Math.round((data.total_live_outbound_rate_bps || 0) * 100) / 100);
  if(prev.ts.length > MAX_GLOBAL) {
    for(const k of GLOBAL_KEYS) prev[k] = prev[k].slice(-MAX_GLOBAL);
  }
  const bt = prev.by_tool || {};
  for(const t of (data.tools || [])) {
    if(t.tool === 'aictl') continue;
    const cpu = t.live?.cpu_percent || 0;
    const mem = t.live?.mem_mb || 0;
    const tok = t.tokens || 0;
    const tr = (t.live?.outbound_rate_bps || 0) + (t.live?.inbound_rate_bps || 0);
    if(!bt[t.tool]) bt[t.tool] = { ts: [], cpu: [], mem_mb: [], tokens: [], traffic: [] };
    const th = bt[t.tool];
    th.ts.push(data.timestamp);
    th.cpu.push(Math.round(cpu * 10) / 10);
    th.mem_mb.push(Math.round(mem * 10) / 10);
    th.tokens.push(tok);
    th.traffic.push(Math.round(tr * 100) / 100);
    if(th.ts.length > MAX_TOOL) {
      for(const k of Object.keys(th)) th[k] = th[k].slice(-MAX_TOOL);
    }
  }
  return { ...prev, by_tool: bt };
}

/**
 * Filter a tools array by the enabled set.
 * If enabledTools is null, all tools pass (no filter active).
 */
export function filterToolsByEnabled(tools, enabledTools) {
  if (enabledTools === null) return tools;
  return tools.filter(t => enabledTools.includes(t.tool));
}
