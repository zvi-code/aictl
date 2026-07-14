import { useState, useEffect } from 'preact/hooks';
import { html } from 'htm/preact';
import { esc, fmtHHMMSS } from '../../utils.js';
import * as api from '../../api.js';

// Per-session tool-call timeline + a latency distribution sparkbar. Surfaces
// the tool_invocations table (which tools the agent reached for, how long they
// took, which ones errored, and the actual input — Bash command / file path)
// that was captured but never shown per-session.
export default function ToolCallsPanel({sessionId}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Which timeline rows have their input expanded (keyed by row index).
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    setError(false);
    setExpanded({});
    api.getSessionToolCalls(sessionId)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [sessionId]);

  const toggleInput = (i) => setExpanded(e => ({ ...e, [i]: !e[i] }));

  if (loading) return html`<p class="loading-state">Loading tool calls…</p>`;
  if (error) return html`<p class="empty-state">Failed to load tool-call data.</p>`;
  if (!data || !data.calls || !data.calls.length) {
    return html`<p class="empty-state">No tool-call data recorded for this session.</p>`;
  }

  const {calls, by_tool, total, errors} = data;
  const sortedTools = Object.entries(by_tool).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...sortedTools.map(([, n]) => n), 1);

  return html`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Tool Calls</div><div class="value">${total}</div></div>
      <div class="es-kv-card"><div class="label">Errors</div>
        <div class="value" style="color:${errors > 0 ? 'var(--red)' : 'var(--fg)'}">${errors}</div>
      </div>
      <div class="es-kv-card"><div class="label">Distinct Tools</div><div class="value">${sortedTools.length}</div></div>
    </div>
    <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">By tool</div>
    <div style="margin-bottom:var(--sp-3)">
      ${sortedTools.map(([tool, n]) => {
        const pct = (n / maxCount * 100).toFixed(1);
        return html`<div key=${tool} class="flex-row gap-sm" style="align-items:center;margin-bottom:2px">
          <span class="text-xs text-ellipsis" style="width:120px;flex-shrink:0" title=${tool}>${esc(tool)}</span>
          <div class="flex-1 overflow-hidden" style="height:10px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${pct}%;background:var(--green);border-radius:3px"></div>
          </div>
          <span class="text-muted text-xs" style="width:32px;flex-shrink:0;text-align:right">${n}</span>
        </div>`;
      })}
    </div>
    <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Timeline</div>
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${calls.slice(0, 60).map((c, i) => {
        const t = c.ts ? fmtHHMMSS(c.ts) : '—';
        const input = c.input || '';
        const isOpen = !!expanded[i];
        return html`<div key=${i} style="padding:2px 0">
          <div class="flex-row gap-sm" style="align-items:center">
            <span class="text-muted" style="width:60px;flex-shrink:0">${t}</span>
            <span aria-hidden="true" style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${c.is_error ? 'var(--red)' : 'var(--green)'}"></span>
            <span style="width:14px;flex-shrink:0;text-align:center;color:${c.is_error ? 'var(--red)' : 'var(--green)'}">
              <span aria-hidden="true">${c.is_error ? '✗' : '✓'}</span><span class="sr-only">${c.is_error ? 'error' : 'ok'}</span>
            </span>
            <span class="text-ellipsis" style="width:110px;flex-shrink:0" title=${c.tool_name}>${esc(c.tool_name)}</span>
            <span style="width:56px;flex-shrink:0;text-align:right">${c.duration_ms ? Math.round(c.duration_ms) + 'ms' : ''}</span>
            <span class="text-muted text-ellipsis" style="flex:1;min-width:0">${esc(c.result_summary || '')}</span>
          </div>
          ${input ? html`<button type="button"
              class="tcp-input mono text-xs text-muted"
              aria-expanded=${isOpen}
              aria-label=${(isOpen ? 'Collapse' : 'Expand') + ' input for ' + c.tool_name}
              title=${isOpen ? 'Collapse input' : 'Expand input'}
              onClick=${() => toggleInput(i)}
              style=${'display:block;width:100%;text-align:left;background:none;border:none;cursor:pointer;'
                + 'padding:1px 0 3px 74px;'
                + (isOpen
                    ? 'white-space:pre-wrap;word-break:break-word'
                    : 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>
              ${esc(input)}${(c.input_truncated && isOpen) ? '…' : ''}
            </button>` : null}
        </div>`;
      })}
    </div>
  </div>`;
}
