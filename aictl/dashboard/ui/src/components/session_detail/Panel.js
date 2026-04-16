import { useState } from 'preact/hooks';
import { html } from 'htm/preact';

// Collapsible panel shell used by every SessionDetail section.
export default function Panel({title, icon, badge, defaultOpen, children}) {
  const [open, setOpen] = useState(defaultOpen || false);
  return html`<div class="sd-panel">
    <button class="sd-panel-head" onClick=${() => setOpen(v => !v)}
      aria-expanded=${open}>
      <span class="sd-panel-icon">${icon}</span>
      <span class="sd-panel-title">${title}</span>
      ${badge != null && html`<span class="badge text-xs" style="margin-left:var(--sp-2)">${badge}</span>`}
      <span class="sd-panel-arrow">${open ? '\u25B2' : '\u25BC'}</span>
    </button>
    ${open && html`<div class="sd-panel-body">${children}</div>`}
  </div>`;
}
