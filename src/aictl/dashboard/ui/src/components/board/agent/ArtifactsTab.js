// ─── Agent drawer: Artifacts — files of the session folder and files the session wrote ─
// aictl keeps the path, size and time of each file, never its content. A viewer reads
// the file from disk when a row is opened.
import { html } from 'htm/preact';
import { useMemo, useState } from 'preact/hooks';
import * as api from '../../../api.js';
import { FixedPanel, Pending, useDetail } from '../Drawer.js';
import { NA, fmtBytes, fmtN, stamp } from '../format.js';
import { Actions, Stats } from '../Panel.js';
import Table from '../Table.js';
import TextView from '../../ui/TextView.js';

export const whereOf = x => (x.kind === 'written' ? 'Written' : (x.folder || 'Session folder'));

export function whyNotViewable(x) {
  if (x.exists === false) return 'This file is no longer on disk. aictl keeps only its path, size and time, not its content.';
  return 'aictl cannot show this file as text. It may be binary, or outside the folders the server may read.';
}

export function artifactsDef(list, { filter = '', sel = null, pick = () => {} } = {}) {
  const f = filter.trim().toLowerCase();
  const rows = list.filter(x => !f || [x.path, x.name, whereOf(x), x.ext].some(t => String(t || '').toLowerCase().includes(f)));
  return {
    key: 'agent.artifacts',
    cols: [
      { k: 'name', l: 'Name', minw: 200 },
      { k: 'where', l: 'Where', w: '120px', t: 'The folder of the session, or Written for a file the session wrote elsewhere' },
      { k: 'ext', l: 'Type', w: '60px' },
      { k: 'size', l: 'Size', n: true, w: '70px' },
      { k: 'mtime', l: 'Modified', w: '110px' },
      { k: 'exists', l: 'Exists', w: '66px', t: 'Checked when this panel opened' },
      { k: 'writes', l: 'Writes', n: true, w: '60px', t: 'Times the session wrote this file' },
    ],
    primary: 'name',
    rows: rows.map(x => ({
      id: x.path,
      go: () => pick(x.path),
      cls: sel === x.path ? 'bd-sel' : '',
      sort: { name: x.name || x.path, where: whereOf(x), ext: x.ext || '', size: x.size_bytes, mtime: x.mtime, exists: x.exists === false ? 0 : 1, writes: x.writes },
      cells: {
        name: { v: x.name || x.path, title: x.path, cls: 'm' },
        where: { v: whereOf(x), cls: 'dim', title: x.kind === 'written' ? 'Written by the session' : 'In the folder of the session: ' + (x.folder || 'top level') },
        ext: { v: x.ext || NA, cls: 'dim' },
        size: { v: fmtBytes(x.size_bytes), title: x.size_bytes == null ? 'No size stored' : fmtN(x.size_bytes) + ' bytes' },
        mtime: { v: stamp(x.mtime, true), cls: 'dim', title: x.mtime ? new Date(x.mtime * 1000).toLocaleString() : '' },
        exists: { v: x.exists === false ? 'Missing' : 'Yes', cls: x.exists === false ? 'crit' : 'dim' },
        writes: { v: fmtN(x.writes), cls: 'dim' },
      },
    })),
    sort: { k: 'mtime', dir: 'desc' },
    none: list.length ? 'No file matches this text.' : 'No artifact is stored for this session.',
  };
}

function Viewer({ item, act }) {
  const { data, error } = useDetail(
    () => api.getFile(item.path).then(async (r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return { text: await r.text() };
    }),
    'artifact:' + item.path,
  );
  if (!item.viewable || item.exists === false) return null;
  return html`<${FixedPanel} id="artview" title="File" sub=${item.path}>
    ${data
      ? html`<${TextView} text=${data.text} path=${item.path} source=${html`<div class="bd-ptext">${data.text}</div>`}/>
        <div class="bd-note">Read from disk now. A large file shows its end only.</div>`
      : html`<${Pending} error=${error}/>`}
    <${Actions} actions=${[{ label: 'Copy path', go: () => act.copy(item.path, 'Copied the path') }]}/>
  </${FixedPanel}>`;
}

export default function ArtifactsTab({ data, act }) {
  const list = data.artifacts || [];
  const [filter, setFilter] = useState('');
  const [sel, setSel] = useState(null);
  const def = useMemo(() => artifactsDef(list, { filter, sel, pick: setSel }), [data, filter, sel]);
  const item = list.find(x => x.path === sel) || null;
  const total = data.artifacts_total ?? list.length;
  const missing = list.filter(x => x.exists === false).length;
  const stats = [
    { label: 'Artifacts', value: fmtN(total) },
    { label: 'Total size', value: data.artifacts_bytes == null ? NA : fmtBytes(data.artifacts_bytes), sub: 'files that exist' },
    { label: 'Missing', value: fmtN(missing), sub: 'of the ' + list.length + ' listed' },
  ];
  return html`<${FixedPanel} id="arts" title="Artifacts" sub=${total > list.length ? 'Showing ' + list.length + ' of ' + total : total + ' files'}>
    <${Stats} stats=${stats}/>
    <input type="search" class="bd-artq" aria-label="Filter artifacts by text" placeholder="Filter by name, folder or type" value=${filter} onInput=${e => setFilter(e.currentTarget.value)}/>
    <${Table} def=${def} label="Artifacts"/>
    ${total > list.length ? html`<div class="bd-note">Showing ${list.length} of ${total} artifacts. The newest come first. The totals count all of them.</div>` : null}
    <div class="bd-note">aictl stores the path, size and time of each file, not its content.</div>
  </${FixedPanel}>
  ${item ? html`<${Viewer} key=${item.path} item=${item} act=${act}/>` : null}
  ${item && (!item.viewable || item.exists === false) ? html`<${FixedPanel} id="artno" title="Cannot show this file" sub=${item.path}>
    <div class="bd-ptext">${whyNotViewable(item)}</div>
    <${Actions} actions=${[{ label: 'Copy path', go: () => act.copy(item.path, 'Copied the path') }]}/>
  </${FixedPanel}>` : null}`;
}
