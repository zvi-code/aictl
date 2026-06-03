import { html } from 'htm/preact';
import { esc, COLORS } from '../../utils.js';
import { ToolIcon } from '../ui/index.js';

export default function ToolTabs({tools, activeTool, onSelect}) {
  if (tools.length <= 1) return null;
  return html`<div class="sf-tool-tabs">
    ${tools.map(t => html`<button key=${t} class="sf-tool-tab ${t === activeTool ? 'active' : ''}"
      style="border-bottom-color:${t === activeTool ? (COLORS[t] || 'var(--accent)') : 'transparent'};color:${COLORS[t] || 'var(--fg)'}"
      onClick=${() => onSelect(t)}>
      <${ToolIcon} tool=${t} size="1em"/> ${esc(t)}
    </button>`)}
  </div>`;
}
