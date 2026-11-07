// The inspector: what the selected setting, file or finding is, where it is
// set, what wins and what can be done with it.
import { html } from 'htm/preact';
import { fmtAgo, fmtSz } from '../../utils.js';
import { baseName } from '../../utils/paths.js';
import { findingTools, isUnset, samePath, whyWins, LOCATION_LABELS, ruleLabel } from './model.js';
import { Value, ScopeChip } from './Value.js';
import { ToolChip, SetIn } from './parts.js';
import { whereText } from './FindingsView.js';

function Sec({ title, children }) {
  return html`<section class="st-insp__sec"><h4 class="st-insp__h">${title}</h4>${children}</section>`;
}

function openLabel(path, line) {
  return 'Open ' + baseName(path) + (line > 0 ? ' at line ' + line : '');
}

function findingsAt(w, path) {
  return path ? w.findings.filter(f => samePath(f.path, path)) : [];
}

function showFinding(w, f) {
  w.set({ view: 'findings', sec: f.rule || '', row: f.id, tool: '' });
}

function History({ w, path }) {
  const recent = path && w.recentFiles && typeof w.recentFiles.get === 'function' ? w.recentFiles.get(path) : null;
  const mtime = path ? w.mtimeOf(path) : null;
  const lines = [];
  if (recent) lines.push(`File changed ${fmtAgo(recent.ts)}${recent.tool ? ' by ' + w.labelOf(recent.tool) : ''} (file history)`);
  else if (mtime) lines.push(`File last changed ${fmtAgo(mtime)} (file history)`);
  return html`<div class="st-hint" data-testid="st-history">${lines.length ? lines.join(' · ') + ' · no aictl change recorded' : 'No aictl change recorded'}</div>`;
}

function RowInspector({ w, row }) {
  const others = w.entries
    .filter(e => e.id !== row.tool && row.source && (e.files.some(f => samePath(f, row.source))))
    .map(e => e.label);
  const file = row.source ? w.files.find(f => samePath(f.path, row.source)) : null;
  for (const id of file?.tools || []) {
    const l = w.labelOf(id);
    if (id !== row.tool && !others.includes(l)) others.push(l);
  }
  const found = findingsAt(w, row.source);
  const { chain, wins } = row;
  return html`<div class="st-insp__body" data-testid="st-inspector-row">
    <h3 class="st-insp__title">${row.label}</h3>
    <div class="st-insp__key st-mono">${row.key}</div>
    ${row.tip && html`<p class="st-insp__tip">${row.tip}</p>`}
    <div class="st-insp__chips">
      ${row.risky && html`<span class="st-chip st-chip--risky">risky</span>`}
      <${ToolChip} id=${row.tool} label=${w.labelOf(row.tool)}/>
      <${ScopeChip} scope=${row.scope}/>
      ${others.length > 0 && html`<span class="st-chip">also read by ${others.join(', ')}</span>`}
    </div>
    <div class="st-insp__value"><${Value} row=${row}/></div>
    <${Sec} title="Override chain · what wins and why">
      <ol class="st-chain">
        ${chain.map((c, i) => {
          const win = i === wins;
          return html`<li key=${i} class=${'st-chain__lv' + (win ? ' is-win' : '')} aria-current=${win ? 'true' : undefined}>
            <span class="st-chain__sc">${c.scope || 'default'}</span>
            <span class="st-chain__v">${isUnset(c) ? html`<span class="st-dim">not set</span>` : html`<${Value} row=${row} value=${c.value} compact/>`}</span>
            <span class="st-chain__src">${c.source ? html`<${SetIn} path=${c.source} line=${Number(c.line) > 0 ? Number(c.line) : 0} w=${w}/>` : html`<span class="st-dim">${c.note || (c.scope === 'default' ? w.labelOf(row.tool) : '—')}</span>`}</span>
            ${win && html`<span class="st-sr"> (wins)</span>`}
          </li>`;
        })}
      </ol>
      <p class="st-hint st-insp__why">${whyWins(chain, wins)}</p>
    </${Sec}>
    <${Sec} title="History"><${History} w=${w} path=${row.source}/></${Sec}>
    <${Sec} title="Actions">
      <div class="st-actions">
        ${row.source && html`<button type="button" class="st-btn" onClick=${() => w.openAt(row.source, row.line)}>${openLabel(row.source, row.line)}</button>`}
        ${found.length > 0 && html`<button type="button" class="st-btn" onClick=${() => showFinding(w, found[0])}>Show finding</button>`}
      </div>
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled>Change value…</button>
        <span class="st-hint">phase 2: diff preview, backup, change log</span>
      </div>
    </${Sec}>
  </div>`;
}

function FileInspector({ w, file }) {
  const found = findingsAt(w, file.path);
  const labels = (file.rows || []);
  return html`<div class="st-insp__body" data-testid="st-inspector-file">
    <h3 class="st-insp__title">${file.name}</h3>
    <div class="st-insp__key st-mono">${file.path}</div>
    <div class="st-insp__chips">
      <span class="st-chip">${file.kind || 'other'}</span>
      <${ScopeChip} scope=${file.scope}/>
      <span class="st-chip">${LOCATION_LABELS[file.location] || 'Other'}</span>
      ${file.tools.map(id => html`<${ToolChip} key=${id} id=${id} label=${w.labelOf(id)}/>`)}
    </div>
    <${Sec} title=${'Settings from this file' + (labels.length ? ' · ' + labels.length : '')}>
      ${labels.length ? html`<ul class="st-insp__list">
        ${labels.map(r => html`<li key=${r.uid}><button type="button" class="st-link"
          onClick=${() => w.set({ view: 'tool', tool: r.tool, sec: '', row: r.key })}>${r.label}</button>
          <span class="st-dim"> · ${w.labelOf(r.tool)}${r.line > 0 ? ' · line ' + r.line : ''}</span></li>`)}
      </ul>` : html`<div class="st-hint">${file.settings ? file.settings + ' settings' : 'No settings are read from this file.'}</div>`}
    </${Sec}>
    <${Sec} title="File">
      <dl class="st-insp__dl">
        <dt>Git</dt><dd>${file.git_state || '—'}</dd>
        <dt>Size</dt><dd>${file.bytes != null ? fmtSz(file.bytes) : '—'}</dd>
        <dt>Last change</dt><dd>${file.mtime ? fmtAgo(file.mtime) : '—'}</dd>
        ${file.loading && html`<dt>Loading</dt><dd>${file.loading}</dd>`}
        ${file.exists === false && html`<dt>State</dt><dd>missing</dd>`}
      </dl>
    </${Sec}>
    <${Sec} title="Actions">
      <div class="st-actions">
        ${!file.is_dir && html`<button type="button" class="st-btn" onClick=${() => w.openAt(file.path)}>Open file</button>`}
        ${found.length > 0 && html`<button type="button" class="st-btn" onClick=${() => showFinding(w, found[0])}>Show finding</button>`}
      </div>
    </${Sec}>
  </div>`;
}

function FindingInspector({ w, f }) {
  return html`<div class="st-insp__body" data-testid="st-inspector-finding">
    <h3 class="st-insp__title">${ruleLabel(f.rule)}</h3>
    <div class="st-insp__key st-mono">${whereText(f.path, f.line)}</div>
    <div class="st-insp__chips">
      <span class=${'st-chip' + (f.severity === 'high' || f.severity === 'medium' ? ' st-chip--risky' : '')}>${f.severity || 'info'}</span>
      ${findingTools(f).map(id => html`<${ToolChip} key=${id} id=${id} label=${w.labelOf(id)}/>`)}
      ${f.session_id && html`<span class="st-chip st-chip--mono">session ${f.session_id}</span>`}
    </div>
    ${f.why && html`<${Sec} title="Why it matters"><p class="st-insp__tip">${f.why}</p></${Sec}>`}
    ${f.action && html`<${Sec} title="What to do"><p class="st-insp__tip">${f.action}</p></${Sec}>`}
    <${Sec} title="Actions">
      <div class="st-actions">
        ${f.path && html`<button type="button" class="st-btn" onClick=${() => w.openAt(f.path, f.line)}>${f.line > 0 ? openLabel(f.path, f.line) : 'Show the line'}</button>`}
      </div>
    </${Sec}>
  </div>`;
}

export default function Inspector({ w }) {
  const { view } = w.st;
  let body = null;
  if ((view === 'tool' || view === 'topic') && w.selected) body = html`<${RowInspector} w=${w} row=${w.selected}/>`;
  else if (view === 'files' && w.selectedFile) body = html`<${FileInspector} w=${w} file=${w.selectedFile}/>`;
  else if (view === 'findings' && w.selectedFinding) body = html`<${FindingInspector} w=${w} f=${w.selectedFinding}/>`;
  return html`<aside class=${'st-insp' + (w.drawer ? ' is-open' : '')} aria-label="Inspector">
    <button type="button" class="st-insp__close st-btn" onClick=${w.closeDrawer} aria-label="Close the inspector">Close</button>
    ${body || html`<div class="st-insp__body st-insp__body--empty">
      <h3 class="st-insp__title">Nothing selected</h3>
      <p class="st-hint">${view === 'files' ? 'Click a file for its details.'
        : view === 'findings' ? 'Click a finding for its details.'
        : 'Click a setting to see where it is set, what wins and why, and what you can do with it.'}</p>
    </div>`}
  </aside>`;
}
