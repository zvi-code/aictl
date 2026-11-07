// The permission matrix: per tool, whether MCP, file reads, file writes, shell
// and web run without asking, ask first or are refused. A cell's title lists
// the rules that decide it; a click selects the setting row behind it.
import { html } from 'htm/preact';
import { CAPABILITIES } from './permissions.js';
import { Swatch } from './parts.js';

function PermCell({ cell, onPick }) {
  const pick = cell.key && onPick ? () => onPick(cell.key) : null;
  return html`<td class=${'st-perm st-perm--' + cell.state} data-cap=${cell.cap} data-state=${cell.state} title=${cell.title}>
    ${pick
      ? html`<button type="button" class="st-perm__btn" aria-label=${`${cell.label}: ${cell.text}`} onClick=${pick}>${cell.text}</button>`
      : html`<span class="st-perm__text">${cell.text}</span>`}
  </td>`;
}

function Head({ first = '' }) {
  return html`<thead><tr>
    ${first && html`<th scope="col">${first}</th>`}
    ${CAPABILITIES.map(c => html`<th scope="col" key=${c.id} data-cap=${c.id}>${c.label}</th>`)}
  </tr></thead>`;
}

/** One tool's matrix, shown above the rows of its Autonomy and safety section. */
export function ToolPermissionMatrix({ w, entry, perms }) {
  const pick = key => w.select({ tool: entry.id, row: key });
  return html`<div class="st-perms" data-testid="st-perms" data-tool=${entry.id}>
    <table class="st-permtable">
      <caption class="st-perms__cap">What the agent can do without asking</caption>
      <${Head}/>
      <tbody><tr>${perms.cells.map(c => html`<${PermCell} key=${c.cap} cell=${c} onPick=${pick}/>`)}</tr></tbody>
    </table>
    ${perms.notes.map((n, i) => html`<p key=${i} class="st-hint st-perms__note">${n}</p>`)}
  </div>`;
}

/** Every tool's matrix, one line per tool, for By topic → Autonomy and safety. */
export function TopicPermissionMatrix({ w, mats }) {
  if (!mats.length) return null;
  return html`<div class="st-perms st-perms--topic" data-testid="st-perms-topic">
    <div class="st-scroll"><table class="st-permtable">
      <caption class="st-perms__cap">What each tool's agent can do without asking</caption>
      <${Head} first="Tool"/>
      <tbody>
        ${mats.map(({ entry, perms }) => html`<tr key=${entry.id} data-tool=${entry.id}>
          <th scope="row" class="st-perms__tool"><span class="st-matrix__toolname"><${Swatch} id=${entry.id}/>${entry.label}</span></th>
          ${perms.cells.map(c => html`<${PermCell} key=${c.cap} cell=${c} onPick=${key => w.select({ tool: entry.id, row: key })}/>`)}
        </tr>`)}
      </tbody>
    </table></div>
    ${mats.flatMap(({ entry, perms }) => perms.notes.map((n, i) => html`<p key=${entry.id + i} class="st-hint st-perms__note">${entry.label}: ${n}</p>`))}
  </div>`;
}
