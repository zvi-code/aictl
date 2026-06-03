import { useState } from 'preact/hooks';
import { html } from 'htm/preact';
import { Icon } from '../ui/index.js';

// Collapsible panel shell used by every SessionDetail section.
// `icon` is a Lucide icon name (see components/ui/Icon.js); unknown values
// fall back to rendering the raw string, so legacy emoji still work.
export default function Panel({title, icon, badge, defaultOpen, children}) {
  const [open, setOpen] = useState(defaultOpen || false);
  return html`<div class="sd-panel">
    <button class="sd-panel-head" onClick=${() => setOpen(v => !v)}
      aria-expanded=${open}>
      <span class="sd-panel-icon"><${Icon} name=${icon} size="1em"/></span>
      <span class="sd-panel-title">${title}</span>
      ${badge != null && html`<span class="badge text-xs" style="margin-left:var(--sp-2)">${badge}</span>`}
      <span class="sd-panel-arrow">${open ? '\u25B2' : '\u25BC'}</span>
    </button>
    ${open && html`<div class="sd-panel-body">${children}</div>`}
  </div>`;
}
