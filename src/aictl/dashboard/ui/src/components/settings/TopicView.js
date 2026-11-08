// By topic: one section across every tool, as a matrix of setting by tool.
import { useState } from 'preact/hooks';
import { html } from 'htm/preact';
import { SECTION_ORDER, SECTION_TITLES, agentInherits, isAgentRow, plainValue, topicMatrix } from './model.js';
import { Value } from './Value.js';
import { Swatch, RiskDot, NavHead } from './parts.js';
import { TopicAgentsTable } from './Agents.js';
import { numeric, useGrid } from './tableGrid.js';
import { permissionMatrices } from './permissions.js';
import { TopicPermissionMatrix } from './PermissionMatrix.js';

/** The section a topic view shows: the one in the URL, else autonomy, else the first one any tool has. */
export function topicSection(w) {
  if (w.st.sec && SECTION_ORDER.includes(w.st.sec)) return w.st.sec;
  const has = id => w.entries.some(e => e.rows.some(r => r.sec === id));
  return has('autonomy') ? 'autonomy' : (SECTION_ORDER.find(has) || 'autonomy');
}

export function TopicNav({ w }) {
  const cur = topicSection(w);
  return html`<nav class="st-nav" aria-label="Topics">
    <${NavHead}>Topics</${NavHead}>
    <ul class="st-nav__list">
      ${SECTION_ORDER.map(id => {
        const tools = w.entries.filter(e => e.rows.some(r => r.sec === id && w.pass(r)));
        const risky = tools.some(e => e.rows.some(r => r.sec === id && r.risky && w.pass(r)));
        const on = id === cur;
        return html`<li key=${id}><button type="button" class=${'st-nav__item' + (on ? ' is-on' : '') + (tools.length ? '' : ' is-empty')}
          aria-current=${on ? 'true' : undefined} data-sec=${id}
          onClick=${() => w.set({ sec: id })}>
          <span class="st-nav__label">${SECTION_TITLES[id]}</span>
          ${risky && html`<${RiskDot} label="A risky setting is on"/>`}
          <span class="st-nav__n">${tools.length} ${tools.length === 1 ? 'tool' : 'tools'}</span>
        </button></li>`;
      })}
    </ul>
  </nav>`;
}

/** By topic for agents: one flat table of every tool's agents. */
function AgentsTopic({ w }) {
  const [sort, setSort] = useState('tool');
  const all = w.entries.flatMap(e => e.rows.filter(r => r.sec === 'agents' && isAgentRow(r)));
  const rows = all.filter(w.pass);
  const tools = new Set(rows.map(r => r.tool)).size;
  const inherit = rows.filter(agentInherits).length;
  return html`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${SECTION_TITLES.agents}</h2>
      <span class="st-bar__sub" data-testid="st-agents-count">${rows.length} ${rows.length === 1 ? 'agent' : 'agents'} in ${tools} ${tools === 1 ? 'tool' : 'tools'}, ${inherit} inherit the session model</span>
    </div>
    ${rows.length ? html`<${TopicAgentsTable} w=${w} rows=${rows} sort=${sort} onSort=${setSort}/>
      <p class="st-hint">Click an agent for its model decision, its tools and the files that define it.</p>`
    : html`<p class="st-empty">${all.length ? 'No agent matches the search or the toggles.' : 'No tool reports agents.'}</p>`}
  </section>`;
}

/** One tool's value in a matrix row: a number, or its plain text; nothing when unset and hidden. */
function cellValue(g, id, showUnset) {
  const r = g.cells[id];
  if (!r || (r.unset && !showUnset)) return undefined;
  return typeof r.value === 'number' ? r.value : (r.value == null || r.value === '' ? undefined : plainValue(r.value));
}

/** The setting-by-tool matrix. A tool column sorts the settings by that tool's value. */
function SettingMatrix({ w, tools, rows }) {
  const cols = [
    { k: 'setting', l: 'Setting', cls: 'st-c-set', get: g => g.label },
    ...tools.map(e => ({
      k: e.id, cls: 'st-matrix__tool', attrs: { 'data-tool': e.id }, n: numeric(rows, g => cellValue(g, e.id, w.showUnset)),
      l: html`<span class="st-matrix__toolname"><${Swatch} id=${e.id}/>${e.label}</span>`,
      get: g => cellValue(g, e.id, w.showUnset),
    })),
  ];
  const grid = useGrid('settings.topic', cols);
  return html`<div class="st-scroll"><table class=${'st-table st-matrix ' + grid.tableProps.class} style=${grid.tableProps.style}>
      <thead><tr>${cols.map(grid.th)}</tr></thead>
      <tbody>
        ${grid.order(rows).map(g => html`<tr key=${g.id} class="st-row st-row--static">
          <th scope="row" class="st-c-set" title=${g.keys.join('\n')}>${g.label}</th>
          ${tools.map(e => {
            const r = g.cells[e.id];
            if (!r || (r.unset && !w.showUnset)) return html`<td key=${e.id} class="st-cell st-cell--none">—</td>`;
            const sel = w.selected?.uid === r.uid;
            return html`<td key=${e.id} class=${'st-cell' + (r.risky ? ' is-risky' : '') + (r.unset ? ' is-unset' : '') + (sel ? ' is-sel' : '')}>
              <button type="button" class="st-cellbtn" data-key=${r.key}
                aria-label=${`${g.label}, ${e.label}: ${plainValue(r.value)}${r.unset ? ' (not set, default)' : ''}`}
                onClick=${() => w.select({ tool: e.id, row: r.key })}>
                <${Value} row=${r} compact/>
              </button>
            </td>`;
          })}
        </tr>`)}
      </tbody>
    </table></div>`;
}

export function TopicMain({ w }) {
  const sec = topicSection(w);
  if (sec === 'agents') return html`<${AgentsTopic} w=${w}/>`;
  const { tools, rows } = topicMatrix(w.entries, sec, w.pass);
  const risky = rows.reduce((n, g) => n + Object.values(g.cells).filter(r => r.risky).length, 0);
  const mats = sec === 'autonomy' ? permissionMatrices(w.entries) : [];
  return html`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${SECTION_TITLES[sec]}</h2>
      <span class="st-bar__sub">every tool, side by side${risky ? html` · <span class="st-red">${risky} risky ${risky === 1 ? 'value' : 'values'}</span>` : ''}</span>
    </div>
    <${TopicPermissionMatrix} w=${w} mats=${mats}/>
    ${rows.length ? html`<${SettingMatrix} w=${w} tools=${tools} rows=${rows}/>
    <p class="st-hint">A cell is one setting in one tool. Click it for the file, the scope and the override chain.</p>`
    : html`<p class="st-empty">${tools.length ? 'No setting matches the search or the toggles.' : 'No tool has settings in this section.'}</p>`}
  </section>`;
}
