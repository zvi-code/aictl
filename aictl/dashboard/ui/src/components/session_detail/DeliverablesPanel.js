import { html } from 'htm/preact';
import { fmtK, esc } from '../../utils.js';

export default function DeliverablesPanel({session}) {
  const filesTouched = session.files_touched || [];
  const fileEvents = session.file_events || 0;

  if (!filesTouched.length) {
    return html`<p class="empty-state">No file changes recorded.</p>`;
  }

  return html`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Files Modified</div><div class="value">${filesTouched.length}</div></div>
      <div class="es-kv-card"><div class="label">File Events</div><div class="value">${fmtK(fileEvents)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${filesTouched.map(f => html`<div key=${f} class="text-muted" style="padding:2px 0">${esc(f)}</div>`)}
    </div>
  </div>`;
}
