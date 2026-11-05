import { useContext } from 'preact/hooks';
import { SnapContext } from '../context.js';
import { toolLabel } from '../utils/tools.js';
import { html } from 'htm/preact';
import { esc, COLORS } from '../utils.js';
import { ToolIcon } from './ui/index.js';

// Shared tool-picker tabs (one tab per AI tool with sessions in range).
// Used by the Explorer, Session Flow, Transcript and Timeline views.
// Renders nothing when there is only one tool — no choice to make.
export default function ToolTabs({tools, activeTool, onSelect}) {
  const snap = useContext(SnapContext)?.snap;
  if (tools.length <= 1) return null;
  return html`<div class="sf-tool-tabs">
    ${tools.map(t => html`<button key=${t} class="sf-tool-tab ${t === activeTool ? 'active' : ''}"
      style="border-bottom-color:${t === activeTool ? (COLORS[t] || 'var(--accent)') : 'transparent'}"
      onClick=${() => onSelect(t)}>
      <${ToolIcon} tool=${t} size="1em"/> ${esc(toolLabel(t, snap))}
    </button>`)}
  </div>`;
}
