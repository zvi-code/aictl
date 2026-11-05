// ─── Tool filter ───────────────────────────────────────────────
// A compact picker whose trigger names the selection, so the header says which
// tools every panel is scoped to. The selection lives in the URL (useTools).
import { html } from 'htm/preact';
import { Icon, Popover, ToolIcon } from './ui/index.js';
import { VERIFIED_TOOLS as VERIFIED, orderToolsByActivity } from '../utils/tools.js';


/** Trigger text: concrete names up to two, then a count. */
export function toolFilterLabel(tools, enabledTools) {
  const verified = tools.filter(t => VERIFIED.has(t.tool));
  if (enabledTools === null || enabledTools === undefined) return `All tools (${verified.length})`;
  const names = verified.filter(t => enabledTools.includes(t.tool)).map(t => t.label);
  if (names.length === 0) return 'No tools';
  if (names.length <= 2) return names.join(', ');
  return `${names[0]} +${names.length - 1}`;
}

export default function ToolFilterBar({ snap, enabledTools, onToggle, onSetAll }) {
  if (!snap) return null;
  const allTools = orderToolsByActivity(snap.tools.filter(t => !t.meta));
  if (!allTools.length) return null;
  const allEnabled = enabledTools === null;
  const label = toolFilterLabel(allTools, enabledTools);
  const trigger = html`<button type="button" class=${'hdr-btn tool-filter-trigger' + (allEnabled ? '' : ' is-filtered')}
    aria-label=${'Tool filter: ' + label}>
    <${Icon} name="filter" size="12"/> ${label}
  </button>`;

  return html`<${Popover} trigger=${trigger} placement="bottom">
    <div class="tool-filter-bar" role="group" aria-label="Filter every panel by tool">
      <label class="tool-filter-item">
        <input type="checkbox" checked=${allEnabled}
          onChange=${() => onSetAll(allEnabled ? [] : null)} />
        <span>All tools</span>
      </label>
      <hr class="hdr-views-sep"/>
      ${allTools.map(t => {
        const verified = VERIFIED.has(t.tool);
        const checked = enabledTools === null || enabledTools.includes(t.tool);
        return html`<label key=${t.tool}
          class=${'tool-filter-item' + (verified ? '' : ' tool-unverified')}
          title=${verified ? '' : 'Discovery only: this tool is not verified yet, so it cannot be filtered'}>
          <input type="checkbox" checked=${checked} disabled=${!verified}
            onChange=${() => verified && onToggle(t.tool)} />
          <${ToolIcon} tool=${t.tool} size="1em"/>
          <span>${t.label}</span>
        </label>`;
      })}
    </div>
  </${Popover}>`;
}
