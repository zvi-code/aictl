import { html } from 'htm/preact';
import { fmtK, esc } from '../../utils.js';
import { fmtDur, ACTION_ICONS, ACTION_COLORS, truncate } from './helpers.js';

export default function ActionRow({ action, turnTs }) {
  const icon = ACTION_ICONS[action.kind] || '\u2022';
  const color = ACTION_COLORS[action.kind] || 'var(--fg2)';
  const offset = action.ts - turnTs;
  const offsetLabel = offset > 0 ? '+' + (offset < 1 ? offset.toFixed(1) : Math.round(offset)) + 's' : '';
  const dur = action.duration_ms > 0 ? fmtDur(action.duration_ms) : '';
  const tokens = action.tokens;
  const tokLabel = tokens ? fmtK((tokens.input || 0) + (tokens.output || 0)) : '';

  return html`<div class="tr-action-row">
    <span class="tr-action-icon" style="color:${color}">${icon}</span>
    <span class="tr-action-name" style="color:${color}">${esc(action.name || action.kind)}</span>
    ${action.input_summary ? html`<span class="tr-action-args">${esc(truncate(action.input_summary, 80))}</span>` : null}
    ${action.output_summary ? html`<span class="tr-action-result">${esc(truncate(action.output_summary, 60))}</span>` : null}
    <span class="tr-action-meta">
      ${offsetLabel ? html`<span class="tr-action-offset">${offsetLabel}</span>` : null}
      ${dur ? html`<span class="tr-action-dur">${dur}</span>` : null}
      ${tokLabel ? html`<span class="tr-action-tok">\uD83E\uDE99 ${tokLabel}</span>` : null}
      ${action.success === false ? html`<span class="tr-action-fail">\u2717</span>` : null}
      ${action.success === true ? html`<span class="tr-action-ok">\u2713</span>` : null}
    </span>
  </div>`;
}
