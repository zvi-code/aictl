import { html } from 'htm/preact';
import { esc } from '../../utils.js';

export default function ToolTabs({ tools, activeTool, onSelect }) {
  if (!tools.length) return null;
  return html`<div class="sf-tool-tabs" style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-4);flex-wrap:wrap">
    ${tools.map(t => html`<button key=${t}
      class="chip ${t === activeTool ? 'chip-active' : ''}"
      onClick=${() => onSelect(t)}
      style="font-size:var(--fs-sm);padding:var(--sp-2) var(--sp-4)">
      ${esc(t)}
    </button>`)}
  </div>`;
}
