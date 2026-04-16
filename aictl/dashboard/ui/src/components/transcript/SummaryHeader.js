import { html } from 'htm/preact';
import { fmtK } from '../../utils.js';
import { fmtDur, shortModel } from './helpers.js';

export default function SummaryHeader({ summary, transcript }) {
  if (!summary) return null;
  return html`<div class="tr-summary">
    <span class="tr-summary-item" title="Conversation turns">\uD83D\uDCAC ${summary.total_turns} turns</span>
    <span class="tr-summary-item" title="API calls">\uD83C\uDF10 ${summary.total_api_calls} calls</span>
    <span class="tr-summary-item" title="Tool uses">\uD83D\uDD27 ${summary.total_tool_uses} tools</span>
    <span class="tr-summary-item" title="Total tokens">\uD83E\uDE99 ${fmtK(summary.total_tokens || 0)}</span>
    ${summary.compactions > 0 ? html`<span class="tr-summary-item" title="Compactions">\uD83D\uDDDC\uFE0F ${summary.compactions}</span>` : null}
    ${summary.errors > 0 ? html`<span class="tr-summary-item tr-stat-err" title="Errors">\u274C ${summary.errors}</span>` : null}
    ${summary.subagents > 0 ? html`<span class="tr-summary-item" title="Subagents">\uD83E\uDD16 ${summary.subagents}</span>` : null}
    ${summary.duration_s > 0 ? html`<span class="tr-summary-item" title="Duration">\u23F1\uFE0F ${fmtDur(summary.duration_s * 1000)}</span>` : null}
    ${transcript?.model ? html`<span class="tr-summary-item" title="Model">\uD83E\uDDE0 ${shortModel(transcript.model)}</span>` : null}
    ${transcript?.is_live ? html`<span class="tr-summary-live">\u25CF LIVE</span>` : null}
    <span class="tr-summary-source">${summary.source || ''}</span>
  </div>`;
}
