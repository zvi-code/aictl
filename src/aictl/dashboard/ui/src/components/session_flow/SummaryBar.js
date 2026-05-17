import { html } from 'htm/preact';
import { fmtK } from '../../utils.js';
import { fmtDurSec } from './helpers.js';

export default function SummaryBar({summary}) {
  if (!summary || !summary.event_count) return null;
  return html`<div class="sf-summary">
    ${summary.total_turns > 0 && html`<div class="sf-summary-stat"><div class="label">Prompts</div><div class="value">${summary.total_turns}</div></div>`}
    <div class="sf-summary-stat"><div class="label">API Calls</div><div class="value">${summary.total_api_calls || 0}</div></div>
    ${summary.total_tool_uses > 0 && html`<div class="sf-summary-stat"><div class="label">Tools</div><div class="value">${summary.total_tool_uses}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Tokens</div><div class="value">${fmtK(summary.total_tokens)}</div></div>
    <div class="sf-summary-stat"><div class="label">In/Out</div><div class="value">${fmtK(summary.total_input_tokens)}/${fmtK(summary.total_output_tokens)}</div></div>
    ${summary.compactions > 0 && html`<div class="sf-summary-stat"><div class="label">Compactions</div><div class="value" style="color:var(--orange)">${summary.compactions}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Duration</div><div class="value">${fmtDurSec(summary.duration_s)}</div></div>
    <div class="sf-summary-stat"><div class="label">Events</div><div class="value">${summary.event_count}</div></div>
  </div>`;
}
