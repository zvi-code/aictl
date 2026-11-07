// By topic: one section across every tool, as a matrix of setting by tool.
import { html } from 'htm/preact';
import { SECTION_ORDER, SECTION_TITLES, plainValue, topicMatrix } from './model.js';
import { Value } from './Value.js';
import { Swatch, RiskDot, NavHead } from './parts.js';

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

export function TopicMain({ w }) {
  const sec = topicSection(w);
  const { tools, rows } = topicMatrix(w.entries, sec, w.pass);
  const risky = rows.reduce((n, g) => n + Object.values(g.cells).filter(r => r.risky).length, 0);
  return html`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${SECTION_TITLES[sec]}</h2>
      <span class="st-bar__sub">every tool, side by side${risky ? html` · <span class="st-red">${risky} risky ${risky === 1 ? 'value' : 'values'}</span>` : ''}</span>
    </div>
    ${rows.length ? html`<div class="st-scroll"><table class="st-table st-matrix">
      <thead><tr>
        <th scope="col" class="st-c-set">Setting</th>
        ${tools.map(e => html`<th scope="col" key=${e.id} class="st-matrix__tool" data-tool=${e.id}>
          <span class="st-matrix__toolname"><${Swatch} id=${e.id}/>${e.label}</span></th>`)}
      </tr></thead>
      <tbody>
        ${rows.map(g => html`<tr key=${g.id} class="st-row st-row--static">
          <th scope="row" class="st-c-set" title=${g.keys.join('\n')}>${g.label}</th>
          ${tools.map(e => {
            const r = g.cells[e.id];
            if (!r) return html`<td key=${e.id} class="st-cell st-cell--none">—</td>`;
            const sel = w.selected?.uid === r.uid;
            return html`<td key=${e.id} class=${'st-cell' + (r.risky ? ' is-risky' : '') + (sel ? ' is-sel' : '')}>
              <button type="button" class="st-cellbtn" data-key=${r.key}
                aria-label=${`${g.label}, ${e.label}: ${plainValue(r.value)}`}
                onClick=${() => w.select({ tool: e.id, row: r.key })}>
                <${Value} row=${r} compact/>
              </button>
            </td>`;
          })}
        </tr>`)}
      </tbody>
    </table></div>
    <p class="st-hint">A cell is one setting in one tool. Click it for the file, the scope and the override chain.</p>`
    : html`<p class="st-empty">${tools.length ? 'No setting matches the search or the toggles.' : 'No tool has settings in this section.'}</p>`}
  </section>`;
}
