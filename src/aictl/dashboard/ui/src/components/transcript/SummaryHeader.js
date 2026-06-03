import { html } from 'htm/preact';
import { fmtK } from '../../utils.js';
import { fmtDur, shortModel } from './helpers.js';
import { Icon } from '../ui/index.js';

export default function SummaryHeader({ summary, transcript }) {
  if (!summary) return null;
  return html`<div class="tr-summary">
    <span class="tr-summary-item" title="Conversation turns"><${Icon} name="message-square" size="0.9em"/> ${summary.total_turns} turns</span>
    <span class="tr-summary-item" title="API calls"><${Icon} name="globe" size="0.9em"/> ${summary.total_api_calls} calls</span>
    <span class="tr-summary-item" title="Tool uses"><${Icon} name="wrench" size="0.9em"/> ${summary.total_tool_uses} tools</span>
    <span class="tr-summary-item" title="Total tokens"><${Icon} name="coins" size="0.9em"/> ${fmtK(summary.total_tokens || 0)}</span>
    ${summary.compactions > 0 ? html`<span class="tr-summary-item" title="Compactions"><${Icon} name="archive" size="0.9em"/> ${summary.compactions}</span>` : null}
    ${summary.errors > 0 ? html`<span class="tr-summary-item tr-stat-err" title="Errors"><${Icon} name="x" size="0.9em"/> ${summary.errors}</span>` : null}
    ${summary.subagents > 0 ? html`<span class="tr-summary-item" title="Subagents"><${Icon} name="bot" size="0.9em"/> ${summary.subagents}</span>` : null}
    ${summary.duration_s > 0 ? html`<span class="tr-summary-item" title="Duration"><${Icon} name="clock" size="0.9em"/> ${fmtDur(summary.duration_s * 1000)}</span>` : null}
    ${transcript?.model ? html`<span class="tr-summary-item" title="Model"><${Icon} name="brain-circuit" size="0.9em"/> ${shortModel(transcript.model)}</span>` : null}
    ${transcript?.is_live ? html`<span class="tr-summary-live">\u25CF LIVE</span>` : null}
    <span class="tr-summary-source">${summary.source || ''}</span>
  </div>`;
}
