import { html } from 'htm/preact';
import { esc, COLORS, ICONS } from '../../utils.js';

export default function ToolTabs({tools, activeTool, onSelect}) {
  if (tools.length <= 1) return null;
  return html`<div class="sf-tool-tabs">
    ${tools.map(t => html`<button key=${t} class="sf-tool-tab ${t === activeTool ? 'active' : ''}"
      style="border-bottom-color:${t === activeTool ? (COLORS[t] || 'var(--accent)') : 'transparent'};color:${COLORS[t] || 'var(--fg)'}"
      onClick=${() => onSelect(t)}>
      <span>${ICONS[t] || '\u{1F539}'}</span> ${esc(t)}
    </button>`)}
  </div>`;
}
