import { useContext } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../../context.js';
import { fmtK, esc } from '../../utils.js';
import FileHistoryButtons from './FileHistoryButtons.js';

export default function DeliverablesPanel({session}) {
  const ctx = useContext(SnapContext);
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
      ${filesTouched.map(f => html`<div key=${f} class="flex-row gap-sm text-muted"
        style="padding:2px 0;align-items:center">
        <span class="text-ellipsis" style="flex:1;min-width:0">${esc(f)}</span>
        <${FileHistoryButtons} path=${f} session=${session} openViewer=${ctx.openViewer}/>
      </div>`)}
    </div>
  </div>`;
}
