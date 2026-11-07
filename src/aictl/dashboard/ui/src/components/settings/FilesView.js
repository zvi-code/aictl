// Files: every file the settings come from, grouped by the folder it lives in.
import { useState } from 'preact/hooks';
import { html } from 'htm/preact';
import { fmtAgo } from '../../utils.js';
import { LOCATIONS, LOCATION_LABELS, fileGroups, matchFile, tildePath } from './model.js';
import { ScopeChip } from './Value.js';
import { Swatch, NavHead, ToolChip } from './parts.js';

export const FOLD_FILES = 8;

/** The files the view shows: search, location and "Read by" applied. */
export function visibleFiles(w) {
  return w.files.filter(f => matchFile(f, w.q)
    && (!w.st.sec || f.location === w.st.sec)
    && (!w.st.tool || f.tools.includes(w.st.tool)));
}

export function FilesNav({ w }) {
  const base = w.files.filter(f => matchFile(f, w.q) && (!w.st.tool || f.tools.includes(w.st.tool)));
  const readers = [...new Set(w.files.flatMap(f => f.tools))];
  return html`<nav class="st-nav" aria-label="File locations">
    <${NavHead}>Locations</${NavHead}>
    <ul class="st-nav__list">
      <li><button type="button" class=${'st-nav__item' + (!w.st.sec ? ' is-on' : '')} aria-current=${!w.st.sec ? 'true' : undefined}
        onClick=${() => w.set({ sec: '', row: '' })}>
        <span class="st-nav__label">All locations</span><span class="st-nav__n">${base.length}</span></button></li>
      ${LOCATIONS.map(l => {
        const n = base.filter(f => f.location === l.id).length;
        const on = w.st.sec === l.id;
        return html`<li key=${l.id}><button type="button" class=${'st-nav__item' + (on ? ' is-on' : '') + (n ? '' : ' is-empty')}
          aria-current=${on ? 'true' : undefined} data-loc=${l.id}
          onClick=${() => w.set({ sec: on ? '' : l.id, row: '' })}>
          <span class="st-nav__label">${l.label}</span><span class="st-nav__n">${n}</span></button></li>`;
      })}
    </ul>
    ${readers.length > 0 && html`<${NavHead}>Read by</${NavHead}>
      <ul class="st-nav__list">
        ${readers.map(id => {
          const on = w.st.tool === id;
          return html`<li key=${id}><button type="button" class=${'st-nav__item' + (on ? ' is-on' : '')}
            aria-pressed=${on ? 'true' : 'false'} data-tool=${id}
            onClick=${() => w.set({ tool: on ? '' : id, row: '' })}>
            <${Swatch} id=${id}/><span class="st-nav__label">${w.labelOf(id)}</span>
            <span class="st-nav__n">${w.files.filter(f => f.tools.includes(id)).length}</span></button></li>`;
        })}
      </ul>`}
  </nav>`;
}

function FileRow({ f, w }) {
  const sel = w.selectedFile && w.selectedFile.path === f.path;
  const choose = () => w.select({ row: f.path });
  return html`<tr class=${'st-row' + (sel ? ' is-sel' : '') + (f.exists === false ? ' is-missing' : '')}
    data-path=${f.path} tabindex="0" onClick=${choose}
    onKeyDown=${e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } }}>
    <td class="st-c-file">
      ${f.is_dir
        ? html`<span class="st-fname" title=${f.path}>${f.name}/</span>`
        : html`<button type="button" class="st-fname st-link" title=${'Open ' + f.path}
            onClick=${e => { e.stopPropagation(); w.openAt(f.path); }}>${f.name}</button>`}
      ${f.exists === false && html`<span class="st-hint"> missing</span>`}
    </td>
    <td><${ScopeChip} scope=${f.scope}/></td>
    <td><span class="st-tools">${f.tools.map(id => html`<${ToolChip} key=${id} id=${id} label=${w.labelOf(id)}/>`)}</span></td>
    <td class="st-mono st-num">${f.settings ? f.settings : '—'}</td>
    <td class=${/ignored|untracked|modified/i.test(f.git_state || '') ? 'st-warn' : 'st-dim'}>${f.git_state || '—'}</td>
    <td class="st-dim">${f.mtime ? fmtAgo(f.mtime) : '—'}</td>
  </tr>`;
}

export function FilesMain({ w }) {
  const [open, setOpen] = useState({});
  const [shut, setShut] = useState({});
  const files = visibleFiles(w);
  const groups = fileGroups(files);
  return html`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Files aictl reads</h2>
      <span class="st-bar__sub">${files.length} ${files.length === 1 ? 'file' : 'files'} · grouped by where they live</span>
    </div>
    ${w.filesStatus !== 'ready' && html`<p class="st-note" role="status">File details are loading</p>`}
    ${groups.length ? html`<table class="st-table st-files">
      <thead><tr>
        <th scope="col" class="st-c-file">File</th><th scope="col">Scope</th><th scope="col">Read by</th>
        <th scope="col">Settings</th><th scope="col">Git</th><th scope="col">Last change</th>
      </tr></thead>
      ${groups.map(g => {
        const closed = !!shut[g.root];
        const all = !!open[g.root];
        const shown = closed ? [] : (all ? g.files : g.files.slice(0, FOLD_FILES));
        const more = closed ? 0 : g.files.length - shown.length;
        return html`<tbody key=${g.root} data-root=${g.root}>
          <tr class="st-group"><th scope="colgroup" colspan="6">
            <button type="button" class="st-fold" aria-expanded=${closed ? 'false' : 'true'}
              onClick=${() => setShut({ ...shut, [g.root]: !closed })}>
              <span aria-hidden="true">${closed ? '▸' : '▾'}</span>
              <span class="st-mono" title=${g.root}>${tildePath(g.root)}</span></button>
            <span class="st-group__meta">${LOCATION_LABELS[g.location] || 'Other'} · ${g.files.length} ${g.files.length === 1 ? 'file' : 'files'}</span>
          </th></tr>
          ${shown.map(f => html`<${FileRow} key=${f.path} f=${f} w=${w}/>`)}
          ${more > 0 && html`<tr class="st-morerow"><td colspan="6">
            <button type="button" class="st-link st-more" onClick=${() => setOpen({ ...open, [g.root]: true })}>▸ ${more} more</button>
          </td></tr>`}
        </tbody>`;
      })}
    </table>` : html`<p class="st-empty">${w.files.length ? 'No file matches the search or the filters.' : 'No settings files were found.'}</p>`}
  </section>`;
}
