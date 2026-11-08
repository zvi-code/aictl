// Files: every file the settings come from, as a tree grouped by location or by
// purpose, with a purpose-by-location summary above it and faceted filters in
// the navigator. Folders the monitor watches are listed apart, at the end.
import { useState } from 'preact/hooks';
import { Fragment } from 'preact';
import { html } from 'htm/preact';
import { fmtAgo, fmtSz } from '../../utils.js';
import {
  GIT_STATES, LOCATIONS, LOCATION_LABELS, LOCATION_SHORT, PURPOSE_LABELS, PURPOSES, SCOPE_LABELS,
  fileFolders, fileGroups, fileMatrix, gitCategory, gitRisk, listOf, listParam, matchFile, purposeGroups, purposeOf, tildePath,
} from './model.js';
import { ScopeChip, LockGlyph } from './Value.js';
import { Swatch, NavHead, ToolChip } from './parts.js';
import { useGrid } from './tableGrid.js';

export const FOLD_FILES = 8;
const DAY_S = 86400;
const COLS = 8;

/** The active Files filters, from the URL state. */
export function fileFilters(st) {
  const cell = st.cell ? st.cell.split(':') : null;
  return {
    loc: listOf(st.sec), tools: listOf(st.tool), purpose: listOf(st.purpose), scope: listOf(st.fscope), git: listOf(st.git),
    recent: !!st.recent, cell: cell && cell.length === 2 ? cell : null,
  };
}

function passes(f, F, skip, now) {
  if (skip !== 'loc' && F.loc.length && !F.loc.includes(f.location)) return false;
  if (skip !== 'tools' && F.tools.length && !f.tools.some(t => F.tools.includes(t))) return false;
  if (skip !== 'purpose' && F.purpose.length && !F.purpose.includes(purposeOf(f))) return false;
  if (skip !== 'scope' && F.scope.length && !F.scope.includes(f.scope)) return false;
  if (skip !== 'git' && F.git.length && !F.git.includes(gitCategory(f))) return false;
  if (skip !== 'recent' && F.recent && !(f.mtime && f.mtime >= now - DAY_S)) return false;
  if (skip !== 'cell' && F.cell && (purposeOf(f) !== F.cell[0] || f.location !== F.cell[1])) return false;
  return true;
}

/** The files the view shows: the search and every filter, but the one named by `skip` (for its counts). */
export function visibleFiles(w, skip = null, now = Date.now() / 1000) {
  const F = fileFilters(w.st);
  return w.files.filter(f => matchFile(f, w.q) && passes(f, F, skip, now));
}

function toggle(w, key, id) {
  const cur = listOf(w.st[key]);
  w.set({ [key]: listParam(cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]), row: '' });
}

function Facet({ w, title, fkey, skip, options, valueOf, attr, swatch }) {
  const base = visibleFiles(w, skip);
  const on = listOf(w.st[fkey]);
  const shown = options.map(o => ({ ...o, n: base.filter(f => valueOf(f).includes(o.id)).length }))
    .filter(o => o.n || on.includes(o.id) || o.always);
  if (!shown.length) return null;
  return html`<${NavHead}>${title}</${NavHead}>
    <ul class="st-nav__list" aria-label=${title}>
      ${shown.map((o) => {
        const sel = on.includes(o.id);
        return html`<li key=${o.id}><button type="button" class=${'st-nav__item' + (sel ? ' is-on' : '') + (o.n ? '' : ' is-empty')}
          aria-pressed=${sel ? 'true' : 'false'} ...${{ [attr]: o.id }} onClick=${() => toggle(w, fkey, o.id)}>
          ${swatch ? html`<${Swatch} id=${o.id}/>` : null}<span class="st-nav__label">${o.label}</span><span class="st-nav__n">${o.n}</span></button></li>`;
      })}
    </ul>`;
}

export function FilesNav({ w }) {
  const readers = [...new Set(w.files.flatMap(f => f.tools))];
  const scopes = [...new Set(w.files.map(f => f.scope).filter(Boolean))];
  const recentN = visibleFiles(w, 'recent').filter(f => f.mtime && f.mtime >= Date.now() / 1000 - DAY_S).length;
  return html`<nav class="st-nav" aria-label="File filters">
    <${Facet} w=${w} title="Locations" fkey="sec" skip="loc" attr="data-loc" options=${LOCATIONS.map(l => ({ ...l, always: true }))} valueOf=${f => [f.location]}/>
    <${Facet} w=${w} title="Purpose" fkey="purpose" skip="purpose" attr="data-purpose" options=${PURPOSES} valueOf=${f => [purposeOf(f)]}/>
    <${Facet} w=${w} title="Read by" fkey="tool" skip="tools" attr="data-tool" swatch=${true}
      options=${readers.map(id => ({ id, label: w.labelOf(id) }))} valueOf=${f => f.tools}/>
    <${Facet} w=${w} title="Scope" fkey="fscope" skip="scope" attr="data-scope"
      options=${scopes.map(id => ({ id, label: SCOPE_LABELS[id] || id }))} valueOf=${f => [f.scope]}/>
    <${Facet} w=${w} title="Git" fkey="git" skip="git" attr="data-git" options=${GIT_STATES} valueOf=${f => [gitCategory(f)]}/>
    <${NavHead}>Changes</${NavHead}>
    <ul class="st-nav__list">
      <li><button type="button" class=${'st-nav__item' + (w.st.recent ? ' is-on' : '')} aria-pressed=${w.st.recent ? 'true' : 'false'}
        data-recent="1" onClick=${() => w.set({ recent: !w.st.recent, row: '' })}>
        <span class="st-nav__label">Changed in the last 24 h</span><span class="st-nav__n">${recentN}</span></button></li>
    </ul>
  </nav>`;
}

/** One removable chip per active filter, and a way to clear them all. */
function FilterChips({ w }) {
  const F = fileFilters(w.st);
  const chips = [
    ...F.loc.map(id => ({ k: 'sec:' + id, label: 'Location: ' + (LOCATION_SHORT[id] || id), drop: () => toggle(w, 'sec', id) })),
    ...F.purpose.map(id => ({ k: 'purpose:' + id, label: 'Purpose: ' + (PURPOSE_LABELS[id] || id), drop: () => toggle(w, 'purpose', id) })),
    ...F.tools.map(id => ({ k: 'tool:' + id, label: 'Read by: ' + w.labelOf(id), drop: () => toggle(w, 'tool', id) })),
    ...F.scope.map(id => ({ k: 'fscope:' + id, label: 'Scope: ' + (SCOPE_LABELS[id] || id), drop: () => toggle(w, 'fscope', id) })),
    ...F.git.map(id => ({ k: 'git:' + id, label: 'Git: ' + (GIT_STATES.find(g => g.id === id)?.label || id), drop: () => toggle(w, 'git', id) })),
    ...(F.recent ? [{ k: 'recent', label: 'Changed in the last 24 h', drop: () => w.set({ recent: false, row: '' }) }] : []),
    ...(F.cell ? [{ k: 'cell', label: (PURPOSE_LABELS[F.cell[0]] || F.cell[0]) + ' in ' + (LOCATION_SHORT[F.cell[1]] || F.cell[1]), drop: () => w.set({ cell: '', row: '' }) }] : []),
  ];
  if (!chips.length) return null;
  return html`<div class="st-fchips" data-testid="st-file-chips">
    ${chips.map(c => html`<button key=${c.k} type="button" class="st-chip st-chip--btn" data-chip=${c.k}
      aria-label=${'Remove the filter ' + c.label} onClick=${c.drop}>${c.label} <span aria-hidden="true">×</span></button>`)}
    <button type="button" class="st-link" onClick=${() => w.set({ sec: '', tool: '', purpose: '', fscope: '', git: '', recent: false, cell: '', row: '' })}>Clear filters</button>
  </div>`;
}

/** Purpose by location, counted over the files the other filters keep. A cell narrows the tree to it. */
function Summary({ w }) {
  const m = fileMatrix(visibleFiles(w, 'cell').filter(f => !f.is_dir));
  const cols = [
    { k: 'purpose', l: 'Purpose', get: r => r.label },
    ...m.cols.map(c => ({ k: c.id, l: c.label, cls: 'st-num', n: true, get: r => r.cells[c.id] || undefined })),
    { k: 'all', l: 'All', cls: 'st-num', n: true, get: r => r.total || undefined },
  ];
  const g = useGrid('settings.files.matrix', cols);
  if (!m.rows.length) return null;
  return html`<div class="st-scroll"><table class=${'st-table st-fmatrix ' + g.tableProps.class} style=${g.tableProps.style} data-testid="st-file-matrix">
    <caption class="st-sr">Files by purpose and location</caption>
    <thead><tr>${cols.map(g.th)}</tr></thead>
    <tbody>${g.order(m.rows).map(r => html`<tr key=${r.id}>
      <th scope="row">${r.label}</th>
      ${m.cols.map((c) => {
        const n = r.cells[c.id] || 0;
        const id = r.id + ':' + c.id;
        const on = w.st.cell === id;
        return html`<td key=${c.id} class=${'st-cell st-num' + (on ? ' is-sel' : '')}>${n
          ? html`<button type="button" class="st-cellbtn" data-cell=${id} aria-pressed=${on ? 'true' : 'false'}
              aria-label=${n + ' ' + r.label + ' ' + (n === 1 ? 'file' : 'files') + ' in ' + c.label}
              onClick=${() => w.set({ cell: on ? '' : id, row: '' })}>${n}</button>`
          : html`<span class="st-dim" aria-hidden="true">·</span>`}</td>`;
      })}
      <td class="st-num st-dim">${r.total}</td>
    </tr>`)}</tbody>
  </table></div>`;
}

function FileRow({ f, w }) {
  const sel = w.selectedFile && w.selectedFile.path === f.path;
  const choose = () => w.select({ row: f.path });
  const risk = gitRisk(f);
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
    <td><span class="st-chip" data-kind=${purposeOf(f)}>${f.is_dir ? 'Folder' : PURPOSE_LABELS[purposeOf(f)]}</span></td>
    <td><${ScopeChip} scope=${f.scope}/></td>
    <td><span class="st-tools">${f.tools.map(id => html`<${ToolChip} key=${id} id=${id} label=${w.labelOf(id)}/>`)}</span></td>
    <td class="st-mono st-num">${f.settings ? f.settings : '—'}</td>
    <td class="st-mono st-num">${!f.is_dir && f.bytes != null ? fmtSz(f.bytes) : '—'}</td>
    <td class=${risk ? 'st-warn' : 'st-dim'} data-git=${gitCategory(f) || undefined}
      title=${risk ? 'A tool always loads this file, and git does not track it' : undefined}>${f.git_state || '—'}</td>
    <td class="st-dim">${f.mtime ? fmtAgo(f.mtime) : '—'}</td>
  </tr>`;
}

/** Absent managed locations the view lists last: search and "Read by" applied, hidden while a location is picked. */
export function visibleAbsent(w) {
  const F = fileFilters(w.st);
  if (F.loc.length || F.purpose.length || F.scope.length || F.git.length || F.recent || F.cell) return [];
  const q = w.q.trim().toLowerCase();
  return (w.managedAbsent || []).filter(m => (!q || [m.path, m.label, m.note].join('\n').toLowerCase().includes(q))
    && (!F.tools.length || m.tools.some(t => F.tools.includes(t))));
}

function AbsentGroup({ w, items }) {
  const [openGroup, setOpenGroup] = useState(false);
  return html`<tbody class="st-absent" data-root="managed-absent">
    <tr class="st-group"><th scope="colgroup" colspan=${COLS}>
      <button type="button" class="st-fold" aria-expanded=${openGroup ? 'true' : 'false'} onClick=${() => setOpenGroup(!openGroup)}>
        <span aria-hidden="true">${openGroup ? '▾' : '▸'}</span><span>Managed locations (not present)</span></button>
      <span class="st-group__meta">${items.length} ${items.length === 1 ? 'location' : 'locations'} · where a policy would come from</span>
    </th></tr>
    ${openGroup && items.map(m => html`<tr key=${m.path} class="st-row st-row--static st-row--absent" data-path=${m.path}>
      <td class="st-c-file"><span class="st-fname" title=${m.path + (m.note ? '\n' + m.note : '')}>${tildePath(m.path)}</span>
        <span class="st-hint"> not present</span></td>
      <td class="st-dim">—</td>
      <td><span class="st-scopewrap"><${LockGlyph} label="Cannot be changed from this machine"/><${ScopeChip} scope=${m.scope}/></span></td>
      <td><span class="st-tools">${m.tools.map(id => html`<${ToolChip} key=${id} id=${id} label=${w.labelOf(id)}/>`)}</span></td>
      <td class="st-mono st-num">—</td><td class="st-mono st-num">—</td><td class="st-dim">—</td><td class="st-dim">—</td>
    </tr>`)}
  </tbody>`;
}

/** The tree's groups: by location root or by purpose, then the watched folders. */
export function treeGroups(files, by) {
  const plain = files.filter(f => !f.is_dir);
  const dirs = files.filter(f => f.is_dir);
  const out = by === 'purpose'
    ? purposeGroups(plain).map(g => ({ key: 'purpose:' + g.id, attrs: { 'data-purpose': g.id }, title: g.label, mono: false, root: null, files: g.files }))
    : fileGroups(plain).map(g => ({ key: g.root, attrs: { 'data-root': g.root }, title: tildePath(g.root), full: g.root, mono: true, root: g.root, sub: LOCATION_LABELS[g.location] || 'Other', files: g.files }));
  if (dirs.length) out.push({ key: 'watched', attrs: { 'data-root': 'watched' }, title: 'Watched folders', mono: false, root: null, flat: true, sub: 'folders the monitor reads', files: dirs });
  return out;
}

function GroupBody({ g, w, open, setOpen, shut, setShut, grid }) {
  const closed = !!shut[g.key];
  const tools = [...new Set(g.files.flatMap(f => f.tools))];
  const bytes = g.files.reduce((n, f) => n + (f.is_dir ? 0 : Number(f.bytes) || 0), 0);
  const folders = (g.flat ? [{ dir: '', files: g.files }] : fileFolders(g.files)).map(d => ({ ...d, files: grid.order(d.files) }));
  // Files right in the group's own folder come first, with no folder line.
  if (g.root) folders.sort((a, b) => (b.dir === g.root) - (a.dir === g.root));
  return html`<tbody ...${g.attrs}>
    <tr class="st-group"><th scope="colgroup" colspan=${COLS}>
      <button type="button" class="st-fold" aria-expanded=${closed ? 'false' : 'true'}
        onClick=${() => setShut({ ...shut, [g.key]: !closed })}>
        <span aria-hidden="true">${closed ? '▸' : '▾'}</span>
        <span class=${g.mono ? 'st-mono' : ''} title=${g.full || undefined}>${g.title}</span></button>
      <span class="st-group__meta">${g.sub ? g.sub + ' · ' : ''}${g.files.length} ${g.files.length === 1 ? 'file' : 'files'}${bytes ? ' · ' + fmtSz(bytes) : ''}</span>
      ${tools.length > 0 && html`<span class="st-tools st-group__tools">${tools.map(id => html`<${ToolChip} key=${id} id=${id} label=${w.labelOf(id)}/>`)}</span>`}
    </th></tr>
    ${!closed && folders.map((d) => {
      const k = g.key + '|' + d.dir;
      const shown = open[k] ? d.files : d.files.slice(0, FOLD_FILES);
      const more = d.files.length - shown.length;
      return html`<${Fragment} key=${k}>
        ${d.dir && d.dir !== g.root && html`<tr class="st-folder" data-dir=${d.dir}><td colspan=${COLS}>
          <span class="st-mono st-path" title=${d.dir}>${tildePath(d.dir)}</span><span class="st-dim"> · ${d.files.length}</span></td></tr>`}
        ${shown.map(f => html`<${FileRow} key=${f.path} f=${f} w=${w}/>`)}
        ${more > 0 && html`<tr class="st-morerow"><td colspan=${COLS}>
          <button type="button" class="st-link st-more" onClick=${() => setOpen({ ...open, [k]: true })}>▸ ${more} more</button>
        </td></tr>`}
      </${Fragment}>`;
    })}
  </tbody>`;
}

const GROUP_OPTIONS = [{ value: 'location', label: 'By location' }, { value: 'purpose', label: 'By purpose' }];

const timeOf = f => {
  if (!f.mtime) return undefined;
  const t = Number(f.mtime);
  return t > 0 ? t : (typeof f.mtime === 'string' ? Date.parse(f.mtime) || undefined : undefined);
};

function fileCols(w) {
  return [
    { k: 'file', l: 'File', cls: 'st-c-file', get: f => f.name },
    { k: 'purpose', l: 'Purpose', get: f => (f.is_dir ? 'Folder' : PURPOSE_LABELS[purposeOf(f)]) },
    { k: 'scope', l: 'Scope', get: f => f.scope },
    { k: 'readby', l: 'Read by', get: f => f.tools.map(w.labelOf).join(', ') },
    { k: 'settings', l: 'Settings', cls: 'st-num', n: true, get: f => f.settings || undefined },
    { k: 'size', l: 'Size', cls: 'st-num', n: true, get: f => (f.is_dir || f.bytes == null ? undefined : Number(f.bytes)) },
    { k: 'git', l: 'Git', get: f => f.git_state },
    { k: 'changed', l: 'Last change', n: true, get: timeOf },
  ];
}

export function FilesMain({ w }) {
  const grid = useGrid('settings.files', fileCols(w));
  const [open, setOpen] = useState({});
  const [shut, setShut] = useState({});
  const files = visibleFiles(w);
  const by = w.st.group === 'purpose' ? 'purpose' : 'location';
  const groups = treeGroups(files, by);
  const absent = visibleAbsent(w);
  return html`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Files aictl reads</h2>
      <span class="st-bar__sub">${files.length} ${files.length === 1 ? 'file' : 'files'} · grouped by ${by === 'purpose' ? 'what they are for' : 'where they live'}</span>
      <div class="st-seg st-bar__end" role="group" aria-label="Group the files">
        ${GROUP_OPTIONS.map(o => html`<button key=${o.value} type="button" class="st-seg__btn" aria-pressed=${by === o.value ? 'true' : 'false'}
          onClick=${() => w.set({ group: o.value })}>${o.label}</button>`)}
      </div>
    </div>
    ${w.filesStatus !== 'ready' && html`<p class="st-note" role="status">File details are loading</p>`}
    <${Summary} w=${w}/>
    <${FilterChips} w=${w}/>
    ${groups.length || absent.length ? html`<div class="st-scroll"><table class=${'st-table st-files ' + grid.tableProps.class} style=${grid.tableProps.style}>
      <thead><tr>${fileCols(w).map(grid.th)}</tr></thead>
      ${groups.map(g => html`<${GroupBody} key=${g.key} g=${g} w=${w} open=${open} setOpen=${setOpen} shut=${shut} setShut=${setShut} grid=${grid}/>`)}
      ${absent.length > 0 && html`<${AbsentGroup} w=${w} items=${absent}/>`}
    </table></div>` : html`<p class="st-empty">${w.files.length ? 'No file matches the search or the filters.' : 'No settings files were found.'}</p>`}
  </section>`;
}
