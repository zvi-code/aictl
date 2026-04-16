import { html } from 'htm/preact';
import { fmtK, esc } from '../../utils.js';
import { fmtDur } from './helpers.js';

export default function SeqTooltip({event}) {
  if (event.type === 'user_message') {
    if (event.redacted) {
      return html`<div class="sf-seq-tooltip">
        <div class="sf-tip-label">User Prompt <span style="color:var(--orange)">(redacted)</span></div>
        <div class="sf-tip-meta" style="margin-bottom:var(--sp-2)">
          Claude Code redacts prompts by default in OTel telemetry.
        </div>
        <div class="sf-tip-meta">
          To capture prompt text, restart Claude Code with:<br/>
          <code style="color:var(--accent)">eval $(aictl otel enable)</code><br/>
          This sets <code>OTEL_LOG_USER_PROMPTS=1</code> before launch.
        </div>
        ${event.prompt_length && html`<div class="sf-tip-meta" style="margin-top:var(--sp-2)">Prompt length: ${event.prompt_length} chars</div>`}
      </div>`;
    }
    if (!event.message) return null;
    return html`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">User Prompt</div>
      <div class="sf-tip-body">${esc(event.message)}</div>
      ${event.prompt_length && html`<div class="sf-tip-meta">${event.prompt_length} chars</div>`}
    </div>`;
  }
  if (event.type === 'api_call') {
    const tok = event.tokens || {};
    return html`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">API Call${event.model ? ' \u2014 ' + event.model : ''}</div>
      ${event.agent_name && html`<div class="sf-tip-meta">Agent: ${esc(event.agent_name)}</div>`}
      <div class="sf-tip-meta">
        Input: ${fmtK(tok.input || 0)} \u00B7 Output: ${fmtK(tok.output || 0)}
        ${(tok.cache_read || 0) > 0 ? ' \u00B7 Cache: ' + fmtK(tok.cache_read) : ''}
      </div>
      <div class="sf-tip-meta">
        ${event.duration_ms > 0 ? 'Duration: ' + fmtDur(event.duration_ms) : ''}
        ${event.ttft_ms > 0 ? ' \u00B7 TTFT: ' + fmtDur(event.ttft_ms) : ''}
      </div>
      ${event.is_error && html`<div class="sf-tip-meta" style="color:var(--red)">Error: ${esc(event.error_type || 'unknown')}</div>`}
    </div>`;
  }
  if (event.type === 'api_response') {
    const tok = event.tokens || {};
    return html`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">API Response${event.model ? ' \u2014 ' + event.model : ''}</div>
      <div class="sf-tip-meta">
        Output: ${fmtK(tok.output || 0)} tokens
        ${event.duration_ms > 0 ? ' \u00B7 Latency: ' + fmtDur(event.duration_ms) : ''}
        ${event.finish_reason ? ' \u00B7 ' + event.finish_reason : ''}
      </div>
      ${event.response_preview && html`<div class="sf-tip-body">${esc(event.response_preview)}</div>`}
    </div>`;
  }
  if (event.type === 'error') {
    return html`<div class="sf-seq-tooltip">
      <div class="sf-tip-label" style="color:var(--red)">Error: ${esc(event.error_type || 'unknown')}</div>
      ${event.error_message && html`<div class="sf-tip-body">${esc(event.error_message)}</div>`}
      ${event.parent_span && html`<div class="sf-tip-meta">During: ${esc(event.parent_span)}</div>`}
    </div>`;
  }
  if (event.type === 'tool_use') {
    let paramDisplay = null;
    if (event.params) {
      let parsed = event.params;
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch { parsed = null; }
      }
      if (parsed && typeof parsed === 'object') {
        paramDisplay = Object.entries(parsed).filter(([, v]) => v != null && v !== '');
      }
    }
    return html`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">${esc(event.to || 'Tool')}${event.subtype === 'result' ? ' (result)' : event.subtype === 'decision' ? ' (decision)' : ''}</div>
      ${event.decision && html`<div class="sf-tip-meta" style="margin-bottom:var(--sp-2)">Decision: <strong>${esc(event.decision)}</strong></div>`}
      ${paramDisplay
        ? html`<div class="sf-tip-params">
            ${paramDisplay.map(([k, v]) => {
              const val = String(v);
              const isLong = val.length > 120;
              return html`<div key=${k} class="sf-tip-param-row">
                <span class="sf-tip-param-key">${esc(k)}</span>
                <span class="sf-tip-param-val ${isLong ? 'sf-tip-param-long' : ''}" title=${val}>${esc(isLong ? val.slice(0, 200) + '...' : val)}</span>
              </div>`;
            })}
          </div>`
        : event.params && html`<div class="sf-tip-body mono">${esc(event.params)}</div>`}
      ${(event.success || event.duration_ms > 0 || event.result_size) && html`<div class="sf-tip-meta" style="margin-top:var(--sp-2)">
        ${event.success ? 'Success: ' + event.success : ''}
        ${event.duration_ms > 0 ? ' \u00B7 ' + fmtDur(event.duration_ms) : ''}
        ${event.result_size ? ' \u00B7 Result: ' + event.result_size + ' bytes' : ''}
      </div>`}
    </div>`;
  }
  if (event.type === 'subagent') {
    return html`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Subagent: ${esc(event.to || 'agent')}</div>
    </div>`;
  }
  if (event.type === 'hook') {
    return html`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Hook: ${esc(event.hook_name || '')}</div>
    </div>`;
  }
  return null;
}
