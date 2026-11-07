// Agents: one row per agent with the model it runs on, its effort, context,
// tools and the files that define it and pin its model. By tool shows one
// tool's agents; By topic shows every tool's agents in one table.
import { html } from 'htm/preact';
import { agentInherits, pinWins, scopeLabel } from './model.js';
import { LockGlyph } from './Value.js';
import { SetIn, Swatch } from './parts.js';

export const AGENT_TOOLS_SHOWN = 4;

function lockText(row, w) {
  return `Set by ${scopeLabel(row.scope, w.scopesOf(row.tool))}; cannot be changed here`;
}

/** The effective model, "inherits" in muted italics, and the "required" and "pinned" badges. */
export function AgentModel({ row, w }) {
  const a = row.agent;
  const inherits = agentInherits(row);
  return html`<span class="st-agentmodel">
    ${row.locked && html`<${LockGlyph} label=${lockText(row, w)}/>`}
    ${inherits
      ? html`<span class="st-inherit" title=${row.note || 'Runs on the session model'}>inherits</span>`
      : html`<span class="st-v" title=${String(row.value)}>${String(row.value)}</span>`}
    ${a.model_policy === 'required' && html`<span class="st-badge" title="The agent file requires a model">required</span>`}
    ${pinWins(row) && html`<span class="st-badge st-badge--pin" title=${'A settings pin decides the model: ' + a.pinned_in}>pinned</span>`}
  </span>`;
}

/** Tool names as chips: the first four, then "+N" with the rest in its title; every one with `all`. */
export function AgentTools({ tools, all = false }) {
  if (!tools || !tools.length) return html`<span class="st-none" title="The agent file lists no tools">—</span>`;
  const shown = all ? tools : tools.slice(0, AGENT_TOOLS_SHOWN);
  const rest = tools.length - shown.length;
  return html`<span class="st-tools">
    ${shown.map(t => html`<span key=${t} class="st-chip st-chip--mono" title=${t}>${t}</span>`)}
    ${rest > 0 && html`<span class="st-chip st-more-tools" title=${tools.slice(shown.length).join(', ')}>+${rest}</span>`}
  </span>`;
}

function AgentRow({ row, w, withTool, withContext }) {
  const a = row.agent;
  const sel = w.selected?.uid === row.uid;
  const choose = () => w.select({ tool: row.tool, row: row.key });
  const line = n => (Number(n) > 0 ? Number(n) : 0);
  return html`<tr class=${'st-row st-agentrow' + (sel ? ' is-sel' : '')} data-key=${row.key} data-tool=${row.tool}
    tabindex="0" onClick=${choose}
    onKeyDown=${e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } }}>
    ${withTool && html`<td class="st-c-tool"><span class="st-matrix__toolname"><${Swatch} id=${row.tool}/>${w.labelOf(row.tool)}</span></td>`}
    <td class="st-c-agent">
      <div class="st-label st-mono">${a.name || row.label}</div>
      ${a.description && html`<div class="st-agentdesc" title=${a.description}>${a.description}</div>`}
    </td>
    <td class="st-c-model"><${AgentModel} row=${row} w=${w}/></td>
    <td class="st-mono">${a.effort || html`<span class="st-none">—</span>`}</td>
    ${withContext && html`<td class="st-mono">${a.context_tier || html`<span class="st-none">—</span>`}</td>`}
    <td><${AgentTools} tools=${a.tools}/></td>
    <td class="st-c-src"><${SetIn} path=${a.defined_in} line=${line(a.defined_line)} w=${w}/></td>
    <td class="st-c-src"><${SetIn} path=${a.pinned_in} line=${line(a.pinned_line)} w=${w}/></td>
  </tr>`;
}

/** By tool: the agents section of one tool, as its own table under a group row. */
export function ToolAgentsTable({ w, section }) {
  const rows = section.shown;
  const inherit = rows.filter(agentInherits).length;
  return html`<table class="st-table st-agents" data-section="agents">
    <thead><tr>
      <th scope="col" class="st-c-agent">Agent</th><th scope="col">Model</th><th scope="col">Effort</th>
      <th scope="col">Context</th><th scope="col">Tools</th><th scope="col" class="st-c-src">Defined in</th>
      <th scope="col" class="st-c-src">Pinned in</th>
    </tr></thead>
    <tbody>
      <tr class="st-group"><th scope="colgroup" colspan="7">${section.title}
        <span class="st-group__meta">${rows.length}${inherit ? ` · ${inherit} inherit the session model` : ''}</span></th></tr>
      ${rows.map(r => html`<${AgentRow} key=${r.uid} row=${r} w=${w} withContext/>`)}
    </tbody>
  </table>`;
}

const SORTS = {
  tool: (w) => (a, b) => w.labelOf(a.tool).localeCompare(w.labelOf(b.tool)) || name(a).localeCompare(name(b)),
  agent: (w) => (a, b) => name(a).localeCompare(name(b)) || w.labelOf(a.tool).localeCompare(w.labelOf(b.tool)),
  model: (w) => (a, b) => modelOf(a).localeCompare(modelOf(b)) || SORTS.tool(w)(a, b),
};

function name(r) {
  return String(r.agent?.name || r.label || '');
}

function modelOf(r) {
  return agentInherits(r) ? '￿' : String(r.value);
}

/** Agent rows across tools in the order a sort key asks for. */
export function sortAgents(rows, key, w) {
  return [...rows].sort((SORTS[key] || SORTS.tool)(w));
}

function SortHead({ id, label, sort, onSort }) {
  const on = sort === id;
  return html`<th scope="col" aria-sort=${on ? 'ascending' : 'none'}>
    <button type="button" class=${'st-sort' + (on ? ' is-on' : '')} onClick=${() => onSort(id)}>
      ${label}<span aria-hidden="true">${on ? ' ▴' : ''}</span></button></th>`;
}

/** By topic: every tool's agents in one table, sorted by tool then name unless a header asks otherwise. */
export function TopicAgentsTable({ w, rows, sort, onSort }) {
  const sorted = sortAgents(rows, sort, w);
  return html`<div class="st-scroll"><table class="st-table st-agents st-agents--all">
    <thead><tr>
      <${SortHead} id="tool" label="Tool" sort=${sort} onSort=${onSort}/>
      <${SortHead} id="agent" label="Agent" sort=${sort} onSort=${onSort}/>
      <${SortHead} id="model" label="Model" sort=${sort} onSort=${onSort}/>
      <th scope="col">Effort</th><th scope="col">Tools</th>
      <th scope="col" class="st-c-src">Defined in</th><th scope="col" class="st-c-src">Pinned in</th>
    </tr></thead>
    <tbody>${sorted.map(r => html`<${AgentRow} key=${r.uid} row=${r} w=${w} withTool/>`)}</tbody>
  </table></div>`;
}
