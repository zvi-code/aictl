import { html } from 'htm/preact';
import { esc, COLORS } from '../utils.js';
import { ToolIcon } from './ui/index.js';

// Shared tool-picker tabs (one tab per AI tool with sessions in range).
// Used by the Explorer, Session Flow, Transcript and Timeline views.
// Renders nothing when there is only one tool — no choice to make.
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
