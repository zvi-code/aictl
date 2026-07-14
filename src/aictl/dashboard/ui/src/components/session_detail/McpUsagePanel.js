import { html } from 'htm/preact';
import * as api from '../../api.js';
import { esc } from '../../utils.js';
import { useAsyncResource } from '../../hooks/useAsyncResource.js';

/**
 * Per-session MCP server usage. Shows servers that actually received
 * calls during the session (with counts + first/last ts) followed by a
 * dimmed list of configured-but-unused servers.
 */
export default function McpUsagePanel({ sessionId }) {
  const { data, loading, error } = useAsyncResource(
    () => api.getSessionMcpUsage(sessionId),
    [sessionId],
    { enabled: !!sessionId },
  );

  if (loading) {
    return html`<div class="text-xs text-muted loading-state" style="padding:0">Loading MCP usage\u2026</div>`;
  }
  if (error) {
    return html`<div class="error-state text-xs" style="padding:0">Failed to load MCP usage${error.message ? ` (${error.message})` : ''}.</div>`;
  }

  const servers = (data && Array.isArray(data.servers)) ? data.servers : [];
  const configured = (data && Array.isArray(data.configured_servers)) ? data.configured_servers : [];
  const used = new Set(servers.map(s => s.server_name));
  const unused = configured.filter(n => !used.has(n));

  if (!servers.length && !configured.length) {
    return html`<div class="text-xs text-muted">No MCP servers called in this session.</div>`;
  }

  return html`<div class="mcp-usage-panel" aria-label="MCP server usage for session">
    ${servers.length > 0 && html`
      <div class="text-xs text-muted mb-sm">
        ${servers.length} server${servers.length === 1 ? '' : 's'} called \u00b7
        ${data.total_calls || 0} total call${(data.total_calls || 0) === 1 ? '' : 's'}
      </div>
      <div class="mcp-usage-rows">
        ${servers.map(s => {
          const hasErr = (s.err_count || 0) > 0;
          return html`<div key=${s.server_name} class="mcp-usage-row flex-row gap-sm"
            style="align-items:center;padding:var(--sp-1) 0">
            <span class="mono text-xs" style="flex:1" title=${s.server_name}>${esc(s.server_name)}</span>
            <span class="text-xs mono">${s.call_count}</span>
            ${hasErr && html`<span class="text-xs text-orange" title=${s.err_count + ' error(s)'}>!${s.err_count}</span>`}
          </div>`;
        })}
      </div>
    `}
    ${servers.length === 0 && configured.length > 0 && html`
      <div class="text-xs text-muted mb-sm">No MCP servers called in this session.</div>
    `}
    ${unused.length > 0 && html`
      <div class="mcp-usage-unused" style="margin-top:var(--sp-2);opacity:0.55">
        <div class="text-xs text-muted mb-sm">Configured but unused (${unused.length})</div>
        <div class="mcp-usage-rows">
          ${unused.map(name => html`<div key=${name} class="mono text-xs"
            style="padding:var(--sp-1) 0">${esc(name)}</div>`)}
        </div>
      </div>
    `}
  </div>`;
}
