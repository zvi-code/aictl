// The permission matrix: per tool, whether MCP, file reads, file writes, shell
// and web run without asking, ask first or are refused. A cell's title lists
// the rules that decide it; a click selects the setting row behind it.
import { html } from 'htm/preact';
import { CAPABILITIES } from './permissions.js';
import { Swatch } from './parts.js';
import { useGrid } from './tableGrid.js';

function PermCell({ cell, onPick }) {
  const pick = cell.key && onPick ? () => onPick(cell.key) : null;
  return html`<td class=${'st-perm st-perm--' + cell.state} data-cap=${cell.cap} data-state=${cell.state} title=${cell.title}>
    ${pick
      ? html`<button type="button" class="st-perm__btn" aria-label=${`${cell.label}: ${cell.text}`} onClick=${pick}>${cell.text}</button>`
      : html`<span class="st-perm__text">${cell.text}</span>`}
  </td>`;
}

const capCols = (first, sortable) => [
  ...(first ? [{ k: 'tool', l: first, get: sortable ? m => m.entry.label : undefined }] : []),
  ...CAPABILITIES.map(c => ({
    k: c.id, l: c.label, attrs: { 'data-cap': c.id },
    get: sortable ? m => m.perms.cells.find(x => x.cap === c.id)?.text : undefined,
  })),
];

/** One tool's matrix, shown above the rows of its Autonomy and safety section. */
export function ToolPermissionMatrix({ w, entry, perms }) {
  const pick = key => w.select({ tool: entry.id, row: key });
  // One row: there is nothing to order, so these headers only resize.
  const cols = capCols('', false);
  const g = useGrid('settings.perms', cols);
  return html`<div class="st-perms" data-testid="st-perms" data-tool=${entry.id}>
    <table class=${'st-permtable ' + g.tableProps.class} style=${g.tableProps.style}>
      <caption class="st-perms__cap">What the agent can do without asking</caption>
      <thead><tr>${cols.map(g.th)}</tr></thead>
      <tbody><tr>${perms.cells.map(c => html`<${PermCell} key=${c.cap} cell=${c} onPick=${pick}/>`)}</tr></tbody>
    </table>
    ${perms.notes.map((n, i) => html`<p key=${i} class="st-hint st-perms__note">${n}</p>`)}
  </div>`;
}

/** Every tool's matrix, one line per tool, for By topic → Autonomy and safety. */
export function TopicPermissionMatrix({ w, mats }) {
  const cols = capCols('Tool', true);
  const g = useGrid('settings.perms.all', cols);
  if (!mats.length) return null;
  return html`<div class="st-perms st-perms--topic" data-testid="st-perms-topic">
    <div class="st-scroll"><table class=${'st-permtable ' + g.tableProps.class} style=${g.tableProps.style}>
      <caption class="st-perms__cap">What each tool's agent can do without asking</caption>
      <thead><tr>${cols.map(g.th)}</tr></thead>
      <tbody>
        ${g.order(mats).map(({ entry, perms }) => html`<tr key=${entry.id} data-tool=${entry.id}>
          <th scope="row" class="st-perms__tool"><span class="st-matrix__toolname"><${Swatch} id=${entry.id}/>${entry.label}</span></th>
          ${perms.cells.map(c => html`<${PermCell} key=${c.cap} cell=${c} onPick=${key => w.select({ tool: entry.id, row: key })}/>`)}
        </tr>`)}
      </tbody>
    </table></div>
    ${mats.flatMap(({ entry, perms }) => perms.notes.map((n, i) => html`<p key=${entry.id + i} class="st-hint st-perms__note">${entry.label}: ${n}</p>`))}
  </div>`;
}
