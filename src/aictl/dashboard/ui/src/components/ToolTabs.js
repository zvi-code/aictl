import { useContext, useEffect } from 'preact/hooks';
import { isToolSelected } from '../utils/toolScope.js';
import { SnapContext } from '../context.js';
import { toolLabel } from '../utils/tools.js';
import { html } from 'htm/preact';
import { esc, COLORS } from '../utils.js';
import { ToolIcon } from './ui/index.js';

// Shared tool-picker tabs (one tab per AI tool with sessions in range).
// Used by the Explorer, Session Flow, Transcript and Timeline views.
// Renders nothing when there is only one tool — no choice to make.
// Lists only the tools the header filter selects, and moves the active tab to the
// first one on offer when its tool stops being selected.
export default function ToolTabs({tools: offered, activeTool, onSelect}) {
  const ctx = useContext(SnapContext);
  const snap = ctx?.snap;
  const enabledTools = ctx?.enabledTools ?? null;
  const tools = offered.filter(t => isToolSelected(t, enabledTools));
  useEffect(() => {
    if (tools.length > 0 && !tools.includes(activeTool)) onSelect(tools[0]);
  }, [tools.join(','), activeTool]);
  if (tools.length <= 1) return null;
  return html`<div class="sf-tool-tabs">
    ${tools.map(t => html`<button key=${t} class="sf-tool-tab ${t === activeTool ? 'active' : ''}"
      style="border-bottom-color:${t === activeTool ? (COLORS[t] || 'var(--accent)') : 'transparent'}"
      onClick=${() => onSelect(t)}>
      <${ToolIcon} tool=${t} size="1em"/> ${esc(toolLabel(t, snap))}
    </button>`)}
  </div>`;
}
