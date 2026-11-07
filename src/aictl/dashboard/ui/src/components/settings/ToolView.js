// By tool: the tools on the left, one tool's settings as a table in the middle.
import { html } from 'htm/preact';
import { baseName } from '../../utils/paths.js';
import { Value, ScopeChip } from './Value.js';
import { Swatch, RiskDot, SetIn, NavHead } from './parts.js';

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
        const rows = e.rows.filter(w.pass);
        const risky = rows.some(r => r.risky);
        return html`<li key=${e.id}>
          <button type="button" class=${'st-nav__item' + (on ? ' is-on' : '') + (rows.length ? '' : ' is-empty')}
            aria-current=${on ? 'true' : undefined} data-tool=${e.id}
            onClick=${() => w.set({ tool: e.id, sec: '', row: '' })}>
            <${Swatch} id=${e.id}/><span class="st-nav__label">${e.label}</span>
            ${risky && html`<${RiskDot} label="A risky setting is on"/>`}
            <span class="st-nav__n">${rows.length}</span>
          </button>
          ${on && html`<ul class="st-nav__subs">
            ${e.sections.map(s => {
              const sr = s.rows.filter(w.pass);
              const son = st.sec === s.id;
              return html`<li key=${s.id}><button type="button" class=${'st-nav__sub' + (son ? ' is-on' : '')}
                aria-current=${son ? 'true' : undefined}
                onClick=${() => w.set({ sec: son ? '' : s.id })}>
                <span class="st-nav__label">${s.title}</span>
                ${sr.some(r => r.risky) && html`<${RiskDot} label="A risky setting is on"/>`}
                <span class="st-nav__n">${sr.length}</span>
              </button></li>`;
            })}
          </ul>`}
        </li>`;
      })}
      ${aictl && html`<li key="aictl">
        <button type="button" class=${'st-nav__item' + (w.toolId === 'aictl' ? ' is-on' : '')}
          aria-current=${w.toolId === 'aictl' ? 'true' : undefined} data-tool="aictl"
          onClick=${() => w.set({ tool: 'aictl', sec: '', row: '' })}>
          <${Swatch} id="aictl"/><span class="st-nav__label">aictl</span>
          <span class="st-nav__n">${aictl.collectors.length}</span>
        </button>
      </li>`}
    </ul>
  </nav>`;
}

function SettingRow({ row, w }) {
  const sel = w.selected?.uid === row.uid;
  const choose = () => w.select({ tool: row.tool, row: row.key });
  return html`<tr class=${'st-row' + (row.risky ? ' st-row--risky' : '') + (sel ? ' is-sel' : '')}
    data-key=${row.key} tabindex="0" onClick=${choose}
    onKeyDown=${e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } }}>
    <td class="st-c-set">
      <div class="st-label">${row.label}</div>
      ${row.risky && row.tip && html`<div class="st-risknote">${row.tip}</div>`}
    </td>
    <td class="st-c-val"><${Value} row=${row}/></td>
    <td class="st-c-scope"><${ScopeChip} scope=${row.scope}/></td>
    <td class="st-c-src"><${SetIn} path=${row.source} line=${row.line} w=${w}/></td>
    <td class="st-c-what" title=${row.tip || undefined}>${row.tip}</td>
  </tr>`;
}

export function ToolMain({ w, entry }) {
  const sections = entry.sections
    .filter(s => !w.st.sec || s.id === w.st.sec)
    .map(s => ({ ...s, shown: s.rows.filter(w.pass) }))
    .filter(s => s.shown.length);
  const total = entry.rows.length;
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
    ${sections.length ? html`<table class="st-table">
      <thead><tr>
        <th scope="col" class="st-c-set">Setting</th><th scope="col" class="st-c-val">Value</th>
        <th scope="col" class="st-c-scope">Scope</th><th scope="col" class="st-c-src">Set in</th>
        <th scope="col">What it does</th>
      </tr></thead>
      ${sections.map(s => {
        const k = s.shown.filter(r => r.risky).length;
        return html`<tbody key=${s.id} data-section=${s.id}>
          <tr class="st-group"><th scope="colgroup" colspan="5">${s.title}
            <span class="st-group__meta">${s.shown.length}${k ? html` · <span class="st-red">${k} risky</span>` : ''}</span></th></tr>
          ${s.shown.map(r => html`<${SettingRow} key=${r.uid} row=${r} w=${w}/>`)}
        </tbody>`;
      })}
    </table>` : html`<p class="st-empty">${total ? 'No setting matches the search or the toggles.' : 'No settings were read for this tool.'}</p>`}
  </section>`;
}

export function AictlMain({ w, aictl }) {
  const q = w.q.trim().toLowerCase();
  const collectors = aictl.collectors.filter(c => !q || [c.name, c.mode, c.status, c.detail].join(' ').toLowerCase().includes(q));
  const roots = aictl.roots.filter(p => !q || p.toLowerCase().includes(q));
  return html`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${Swatch} id="aictl" big/>
      <h2 class="st-bar__title" id="st-main-title">aictl</h2>
      <span class="st-bar__sub">monitoring engine · ${aictl.collectors.length} collectors · ${aictl.roots.length} monitored roots</span>
    </div>
    ${collectors.length > 0 && html`<table class="st-table">
      <thead><tr><th scope="col" class="st-c-set">Collector</th><th scope="col">Mode</th><th scope="col">Status</th><th scope="col">Detail</th></tr></thead>
      <tbody>
        <tr class="st-group"><th scope="colgroup" colspan="4">Collectors<span class="st-group__meta">${collectors.length}</span></th></tr>
        ${collectors.map(c => html`<tr key=${c.name} class="st-row st-row--static">
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
