// By tool: the tools on the left, one tool's settings as a table in the middle.
import { html } from 'htm/preact';
import { baseName } from '../../utils/paths.js';
import { commonModel, plainValue, scopeLabel } from './model.js';
import { Value, ScopeChip, LockGlyph } from './Value.js';
import { Swatch, RiskDot, SetIn, NavHead, UndocumentedChip } from './parts.js';
import { ToolAgentsTable } from './Agents.js';
import { numeric, useGrid, useShared } from './tableGrid.js';
import { derivePermissions } from './permissions.js';
import { ToolPermissionMatrix } from './PermissionMatrix.js';
import { HookStatusLine, hookStatusOf } from './HookStatus.js';

// A file chip shows the file name; when two files share a name, the parent folder is added.
function chipName(path, all) {
  const name = baseName(path);
  if (all.filter(f => baseName(f) === name).length < 2) return name;
  const parts = String(path).split(/[\\/]/).filter(Boolean);
  if (parts.length < 2) return name;
  // A file directly under the home folder's tool folder is shown with a leading "~/".
  const underHome = /^(Users|home)$/.test(parts[0]) && parts.length === 4;
  return (underHome ? '~/' : '') + parts[parts.length - 2] + '/' + name;
}

export function ToolNav({ w }) {
  const { entries, aictl, st } = w;
  return html`<nav class="st-nav" aria-label="Tools">
    <${NavHead}>Tools</${NavHead}>
    <ul class="st-nav__list">
      ${entries.map(e => {
        const on = e.id === w.toolId;
        const rows = e.rows.filter(on ? w.passTool : w.pass);
        const risky = rows.some(r => r.risky);
        return html`<li key=${e.id}>
          <button type="button" class=${'st-nav__item' + (on ? ' is-on' : '') + (rows.length ? '' : ' is-empty')}
            aria-current=${on ? 'true' : undefined} data-tool=${e.id}
            onClick=${() => w.set({ tool: e.id, sec: '', row: '', scope: on ? w.st.scope : '' })}>
            <${Swatch} id=${e.id}/><span class="st-nav__label">${e.label}</span>
            ${risky && html`<${RiskDot} label="A risky setting is on"/>`}
            <span class="st-nav__n">${rows.length}</span>
          </button>
          ${on && html`<ul class="st-nav__subs">
            ${e.sections.map(s => {
              const sr = s.rows.filter(w.passTool);
              const son = st.sec === s.id;
              const model = s.id === 'agents' ? commonModel(sr) : '';
              return html`<li key=${s.id}><button type="button" class=${'st-nav__sub' + (son ? ' is-on' : '')}
                aria-current=${son ? 'true' : undefined}
                onClick=${() => w.set({ sec: son ? '' : s.id })}>
                <span class="st-nav__label">${s.title}</span>
                ${sr.some(r => r.risky) && html`<${RiskDot} label="A risky setting is on"/>`}
                <span class="st-nav__n">${sr.length}</span>
                ${model && html`<span class="st-nav__model" title=${'Every agent runs on ' + model}>${model}</span>`}
              </button></li>`;
            })}
          </ul>`}
        </li>`;
      })}
      ${aictl && html`<li key="aictl">
        <button type="button" class=${'st-nav__item' + (w.toolId === 'aictl' ? ' is-on' : '')}
          aria-current=${w.toolId === 'aictl' ? 'true' : undefined} data-tool="aictl"
          onClick=${() => w.set({ tool: 'aictl', sec: '', row: '', scope: '' })}>
          <${Swatch} id="aictl"/><span class="st-nav__label">aictl</span>
          <span class="st-nav__n">${aictl.collectors.length}</span>
        </button>
      </li>`}
    </ul>
  </nav>`;
}

function SettingRow({ row, w, scopes }) {
  const sel = w.selected?.uid === row.uid;
  const choose = () => w.select({ tool: row.tool, row: row.key });
  return html`<tr class=${'st-row' + (row.risky ? ' st-row--risky' : '') + (row.unset ? ' st-row--unset' : '') + (sel ? ' is-sel' : '')}
    data-key=${row.key} tabindex="0" onClick=${choose}
    onKeyDown=${e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } }}>
    <td class="st-c-set">
      <div class="st-label">${row.label}${row.undocumented && html` <${UndocumentedChip}/>`}</div>
      ${row.risky && row.tip && html`<div class="st-risknote">${row.tip}</div>`}
    </td>
    <td class="st-c-val"><${Value} row=${row}/></td>
    <td class="st-c-scope"><${ScopeChip} scope=${row.scope} locked=${row.locked} label=${scopeLabel(row.scope, scopes)}/></td>
    <td class="st-c-src"><${SetIn} path=${row.source} line=${row.line} w=${w}/></td>
    <td class="st-c-what" title=${row.tip || undefined}>${row.tip}</td>
  </tr>`;
}

/** The tool's configuration layers in precedence order; a chip filters the table to the rows set at that layer. */
export function ScopeStrip({ w, entry }) {
  const scopes = entry.scopes || [];
  if (!scopes.length) return null;
  const rows = entry.rows.filter(w.pass);
  return html`<div class="st-scopes" data-testid="st-scopes">
    <ol class="st-scopes__list" aria-label="Configuration layers, lowest precedence first">
      ${scopes.map((s, i) => {
        const n = rows.filter(r => r.scope === s.id).length;
        const on = w.st.scope === s.id;
        const file = s.path ? baseName(s.path) : '';
        const title = [
          s.label, s.paths.length ? s.paths.join('\n') : '', s.exists ? '' : 'not present', s.note,
          s.changeable ? '' : 'Locked: cannot be changed from this machine',
        ].filter(Boolean).join('\n');
        return html`<li key=${s.id} class="st-scopes__item">
          ${i > 0 && html`<span class="st-scopes__arrow" aria-hidden="true">→</span>`}
          <button type="button" class=${'st-scopechip' + (on ? ' is-on' : '') + (s.changeable ? '' : ' is-locked') + (s.exists ? '' : ' is-absent')}
            data-scope=${s.id} aria-pressed=${on ? 'true' : 'false'} title=${title}
            onClick=${() => w.set({ scope: on ? '' : s.id })}>
            <span class="st-scopechip__top">
              ${!s.changeable && html`<${LockGlyph}/><span class="st-sr">Locked: </span>`}
              <span class="st-scopechip__label">${s.label}</span>
              <span class="st-scopechip__n">${n}<span class="st-sr"> ${n === 1 ? 'setting wins' : 'settings win'} here</span></span>
            </span>
            <span class="st-scopechip__file">${s.exists ? (file || s.note) : 'not present'}</span>
          </button>
        </li>`;
      })}
    </ol>
    <p class="st-hint st-scopes__legend">Later layers override earlier ones. Locked layers cannot be changed from this machine.</p>
  </div>`;
}

/** A block shown under a section's heading, above its rows: the permission matrix, the hook status. */
function SectionExtra({ children, section }) {
  return html`<tr class="st-extra" data-extra=${section}><td colspan="5">${children}</td></tr>`;
}

const valueOf = r => (typeof r.value === 'number' ? r.value : (r.value == null || r.value === '' ? undefined : plainValue(r.value)));

function settingCols(rows, scopes) {
  return [
    { k: 'setting', l: 'Setting', cls: 'st-c-set', get: r => r.label },
    { k: 'value', l: 'Value', cls: 'st-c-val', n: numeric(rows, valueOf), get: valueOf },
    { k: 'scope', l: 'Scope', cls: 'st-c-scope', get: r => (r.scope ? scopeLabel(r.scope, scopes) : undefined) },
    { k: 'source', l: 'Set in', cls: 'st-c-src', get: r => r.source },
    { k: 'what', l: 'What it does', get: r => r.tip },
  ];
}

function GenericTable({ w, sections, scopes, shared, extras = {} }) {
  const cols = settingCols(sections.flatMap(s => s.shown), scopes);
  const grid = useGrid('settings.tool', cols, shared);
  return html`<table class=${'st-table ' + grid.tableProps.class} style=${grid.tableProps.style}>
    <thead><tr>${cols.map(grid.th)}</tr></thead>
    ${sections.map(s => {
      const k = s.shown.filter(r => r.risky).length;
      return html`<tbody key=${s.id} data-section=${s.id}>
        <tr class="st-group"><th scope="colgroup" colspan="5">${s.title}
          <span class="st-group__meta">${s.shown.length}${k ? html` · <span class="st-red">${k} risky</span>` : ''}${s.hidden ? html` · <span class="st-unsetn">+${s.hidden} unset</span>` : ''}</span></th></tr>
        ${extras[s.id] && html`<${SectionExtra} section=${s.id}>${extras[s.id]}</${SectionExtra}>`}
        ${grid.order(s.shown).map(r => html`<${SettingRow} key=${r.uid} row=${r} w=${w} scopes=${scopes}/>`)}
      </tbody>`;
    })}
  </table>`;
}

/** Sections in order, cut into runs of generic sections and the agents section, which has a table of its own. */
function tableRuns(sections) {
  const runs = [];
  for (const s of sections) {
    const agents = s.id === 'agents' && s.shown.every(r => r.kind === 'agent' && r.agent);
    const last = runs[runs.length - 1];
    if (agents) runs.push({ agents: true, sections: [s] });
    else if (last && !last.agents) last.sections.push(s);
    else runs.push({ agents: false, sections: [s] });
  }
  return runs;
}

export function ToolMain({ w, entry }) {
  // The tables of one tool (the agents have their own) sort and resize as one.
  const shared = useShared('settings.tool');
  const sections = entry.sections
    .filter(s => !w.st.sec || s.id === w.st.sec)
    .map(s => ({
      ...s,
      shown: s.rows.filter(w.passTool),
      hidden: w.showUnset ? 0 : s.rows.filter(r => r.unset && w.passAll(r) && (!w.st.scope || r.scope === w.st.scope)).length,
    }))
    .filter(s => s.shown.length || s.hidden);
  const total = entry.rows.length;
  const perms = derivePermissions(entry);
  const hookStatus = hookStatusOf(w.hooks, entry.id);
  const extras = {
    autonomy: perms && html`<${ToolPermissionMatrix} w=${w} entry=${entry} perms=${perms}/>`,
    hooks: hookStatus && html`<${HookStatusLine} status=${hookStatus}/>`,
  };
  const scopeName = w.st.scope ? scopeLabel(w.st.scope, entry.scopes) : '';
  return html`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${Swatch} id=${entry.id} big/>
      <h2 class="st-bar__title" id="st-main-title">${entry.label}</h2>
      <span class="st-bar__sub">${total} ${total === 1 ? 'setting' : 'settings'} in ${entry.files.length} ${entry.files.length === 1 ? 'file' : 'files'}${entry.risky ? html` · <span class="st-red">${entry.risky} risky</span>` : ''}</span>
      <span class="st-bar__files">
        ${entry.files.map(f => html`<button type="button" key=${f} class="st-chip st-chip--mono st-chip--btn" title=${f}
          onClick=${() => w.openAt(f)}>${chipName(f, entry.files)}</button>`)}
      </span>
    </div>
    ${entry.id === 'vscode' && html`<p class="st-note">chat.* settings, used by every AI tool in VS Code</p>`}
    ${entry.hints.map((h, i) => html`<p key=${i} class="st-note">${h}</p>`)}
    <${ScopeStrip} w=${w} entry=${entry}/>
    ${sections.length ? tableRuns(sections).map((run, i) => (run.agents
      ? html`<${ToolAgentsTable} key=${'a' + i} w=${w} section=${run.sections[0]}/>`
      : html`<${GenericTable} key=${'g' + i} w=${w} sections=${run.sections} scopes=${entry.scopes} shared=${shared} extras=${extras}/>`))
    : html`<p class="st-empty">${!total ? 'No settings were read for this tool.'
      : scopeName ? `No setting shown here is set at the ${scopeName} layer.`
      : 'No setting matches the search or the toggles.'}</p>`}
  </section>`;
}

const COLLECTOR_COLS = [
  { k: 'collector', l: 'Collector', cls: 'st-c-set', get: c => c.name },
  { k: 'mode', l: 'Mode', get: c => c.mode },
  { k: 'status', l: 'Status', get: c => c.status },
  { k: 'detail', l: 'Detail', get: c => c.detail },
];

export function AictlMain({ w, aictl }) {
  const grid = useGrid('settings.collectors', COLLECTOR_COLS);
  const q = w.q.trim().toLowerCase();
  const collectors = aictl.collectors.filter(c => !q || [c.name, c.mode, c.status, c.detail].join(' ').toLowerCase().includes(q));
  const roots = aictl.roots.filter(p => !q || p.toLowerCase().includes(q));
  return html`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${Swatch} id="aictl" big/>
      <h2 class="st-bar__title" id="st-main-title">aictl</h2>
      <span class="st-bar__sub">monitoring engine · ${aictl.collectors.length} collectors · ${aictl.roots.length} monitored roots</span>
    </div>
    ${collectors.length > 0 && html`<table class=${'st-table ' + grid.tableProps.class} style=${grid.tableProps.style}>
      <thead><tr>${COLLECTOR_COLS.map(grid.th)}</tr></thead>
      <tbody>
        <tr class="st-group"><th scope="colgroup" colspan="4">Collectors<span class="st-group__meta">${collectors.length}</span></th></tr>
        ${grid.order(collectors).map(c => html`<tr key=${c.name} class="st-row st-row--static">
          <td class="st-c-set st-mono">${c.name}</td>
          <td class="st-mono">${c.mode || '—'}</td>
          <td><span class=${'st-status ' + (c.status === 'active' ? 'is-ok' : 'is-warn')}>${c.status}</span></td>
          <td class="st-c-what" title=${c.detail || undefined}>${c.detail}</td>
        </tr>`)}
      </tbody>
    </table>`}
    ${roots.length > 0 && html`<h3 class="st-subhead">Monitored roots</h3>
      <ul class="st-roots">${roots.map((p, i) => html`<li key=${i} class="st-mono" title=${p}>${p}</li>`)}</ul>`}
    ${!collectors.length && !roots.length && html`<p class="st-empty">Nothing matches the search.</p>`}
  </section>`;
}
