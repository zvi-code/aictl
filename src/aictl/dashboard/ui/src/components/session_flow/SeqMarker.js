import { html } from 'htm/preact';
import { esc } from '../../utils.js';
import { fmtDur, fmtHHMMSS } from './helpers.js';

export default function SeqMarker({event}) {
  let label = '', color = 'var(--fg2)', icon = '';
  if (event.type === 'session_start') {
    label = 'Session started'; color = 'var(--green)'; icon = '\u25B6';
  } else if (event.type === 'session_end') {
    label = 'Session ended'; color = 'var(--fg3)'; icon = '\u25A0';
  } else if (event.type === 'compaction') {
    label = 'Compaction' + (event.compaction_count ? ' #' + event.compaction_count : '');
    color = 'var(--orange)'; icon = '\u27F3';
  }

  return html`<div class="sf-seq-marker" style="border-left-color:${color}">
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok"></span><span class="sf-seq-rttok"></span>
    </div>
    <div class="sf-seq-time">${fmtHHMMSS(event.ts)}</div>
    <div class="sf-seq-marker-body" style="color:${color}">
      ${icon} ${label}
      ${event.type === 'compaction' && event.duration_ms > 0 ? ' \u2014 ' + fmtDur(event.duration_ms) : ''}
      ${event.cwd ? html` <span class="text-muted text-xs mono">${esc(event.cwd)}</span>` : ''}
    </div>
  </div>`;
}
