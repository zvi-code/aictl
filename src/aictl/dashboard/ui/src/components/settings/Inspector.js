// The inspector: what the selected setting, file or finding is, where it is
// set, what wins and what can be done with it.
import { useState } from 'preact/hooks';
import { html } from 'htm/preact';
import { fmtAgo, fmtSz } from '../../utils.js';
import { baseName } from '../../utils/paths.js';
import {
  agentDecision, envName, envWhere, findingTools, isAgentRow, isEnvSource, isLockedEntry, isUnset, plainValue, samePath,
  scopeLabel, tildePath, whyWins, writableScope, LOCATION_LABELS, PURPOSE_LABELS, purposeOf, ruleLabel,
} from './model.js';
import { Value, ScopeChip, LockGlyph } from './Value.js';
import { ToolChip, SetIn, UndocumentedChip } from './parts.js';
import { AgentModel, AgentTools } from './Agents.js';
import { whereText } from './FindingsView.js';
import { NOT_SUPPORTED, permissionEdit } from './permissions.js';
import PermissionsEditor from './PermissionsEditor.js';

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

/** The hint next to the disabled change button: the locking layer when the winner is locked. */
function changeHint(row, scopes) {
  const win = row.chain?.[row.wins];
  if (row.locked || isLockedEntry(win, scopes)) return 'Locked by ' + scopeLabel(row.locked ? row.scope : win.scope, scopes);
  return NOT_SUPPORTED;
}

/** For a knob no file sets: its default and the file a person would set it in. */
export function unsetText(row, scopes) {
  const target = writableScope(scopes);
  return `Not set in any file. Default: ${plainValue(row.value)}.`
    + (target ? ` Set it in ${tildePath(target.path)} (${target.label}).` : '');
}

function RowInspector({ w, row }) {
  const scopes = w.scopesOf(row.tool);
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
  const edit = permissionEdit(row, scopes);
  const [editing, setEditing] = useState(false);
  return html`<div class="st-insp__body" data-testid="st-inspector-row">
    <h3 class="st-insp__title">${row.label}</h3>
    <div class="st-insp__key st-mono">${row.key}</div>
    ${row.tip && html`<p class="st-insp__tip">${row.tip}</p>`}
    <div class="st-insp__chips">
      ${row.risky && html`<span class="st-chip st-chip--risky">risky</span>`}
      <${ToolChip} id=${row.tool} label=${w.labelOf(row.tool)}/>
      <${ScopeChip} scope=${row.scope} locked=${row.locked} label=${scopeLabel(row.scope, scopes)}/>
      ${row.undocumented && html`<${UndocumentedChip}/>`}
      ${others.length > 0 && html`<span class="st-chip">also read by ${others.join(', ')}</span>`}
    </div>
    <div class=${'st-insp__value' + (row.unset ? ' is-unset' : '')}><${Value} row=${row}/></div>
    ${row.unset && html`<p class="st-insp__tip" data-testid="st-unset-text">${unsetText(row, scopes)}</p>`}
    <${Sec} title="Override chain · what wins and why">
      <ol class="st-chain">
        ${chain.map((c, i) => {
          const win = i === wins;
          const locked = isLockedEntry(c, scopes);
          return html`<li key=${i} class=${'st-chain__lv' + (win ? ' is-win' : '') + (locked ? ' is-locked' : '')} aria-current=${win ? 'true' : undefined}>
            <span class="st-chain__sc">${locked && html`<${LockGlyph} label=${'Locked: ' + scopeLabel(c.scope, scopes) + ' cannot be changed here'}/>`}${c.scope || 'default'}</span>
            <span class="st-chain__v">${isUnset(c) ? html`<span class="st-dim">not set</span>` : html`<${Value} row=${row} value=${c.value} compact/>`}</span>
            <span class="st-chain__src">${c.source ? html`<${SetIn} path=${c.source} line=${Number(c.line) > 0 ? Number(c.line) : 0} w=${w} tool=${row.tool}/>` : html`<span class="st-dim">${c.note || (c.scope === 'default' ? w.labelOf(row.tool) : '—')}</span>`}</span>
            ${win && html`<span class="st-sr"> (wins)</span>`}
          </li>`;
        })}
      </ol>
      <p class="st-hint st-insp__why">${whyWins(chain, wins)}</p>
    </${Sec}>
    ${!isEnvSource(row.source) && html`<${Sec} title="History"><${History} w=${w} path=${row.source}/></${Sec}>`}
    <${Sec} title="Actions">
      <div class="st-actions">
        ${row.source && (isEnvSource(row.source)
          ? html`<button type="button" class="st-btn" onClick=${() => w.openEnv(envName(row.source), row.tool)}>Show ${envName(row.source) || 'the variable'}</button>`
          : html`<button type="button" class="st-btn" onClick=${() => w.openAt(row.source, row.line)}>${openLabel(row.source, row.line)}</button>`)}
        ${found.length > 0 && html`<button type="button" class="st-btn" onClick=${() => showFinding(w, found[0])}>Show finding</button>`}
      </div>
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled=${!edit.ok || editing}
          aria-expanded=${edit.ok ? (editing ? 'true' : 'false') : undefined}
          onClick=${() => setEditing(true)}>Change value…</button>
        <span class="st-hint" data-testid="st-change-hint">${edit.ok
          ? `Edits ${tildePath(edit.path) || 'the ' + edit.label + ' file'} (${edit.label})`
          : edit.hint}</span>
      </div>
    </${Sec}>
    ${editing && html`<${PermissionsEditor} tool=${row.tool} target=${edit} refresh=${w.refresh}
      onClose=${() => setEditing(false)}/>`}
  </div>`;
}

function AgentInspector({ w, row }) {
  const a = row.agent;
  const scopes = w.scopesOf(row.tool);
  const { steps, wins, why } = agentDecision(row);
  const line = n => (Number(n) > 0 ? Number(n) : 0);
  const files = [
    { label: 'Defined in', path: a.defined_in, line: line(a.defined_line), scope: a.scope_defined },
    { label: 'Pinned in', path: a.pinned_in, line: line(a.pinned_line), scope: a.scope_pinned },
  ];
  const hint = changeHint(row, scopes);
  return html`<div class="st-insp__body" data-testid="st-inspector-agent">
    <h3 class="st-insp__title">${a.name || row.label}</h3>
    <div class="st-insp__key st-mono">${row.key}</div>
    ${a.description && html`<p class="st-insp__tip">${a.description}</p>`}
    <div class="st-insp__chips">
      <${ToolChip} id=${row.tool} label=${w.labelOf(row.tool)}/>
      <${ScopeChip} scope=${row.scope} locked=${row.locked} label=${scopeLabel(row.scope, scopes)}/>
    </div>
    <div class="st-insp__value"><${AgentModel} row=${row} w=${w}/></div>
    <${Sec} title="Model · what decides it">
      <ol class="st-chain">
        ${steps.map((c, i) => {
          const win = i === wins;
          return html`<li key=${c.id} class=${'st-chain__lv' + (win ? ' is-win' : '')} aria-current=${win ? 'true' : undefined}>
            <span class="st-chain__sc">${c.label}</span>
            <span class="st-chain__v">${c.value === undefined || c.value === null || c.value === ''
              ? html`<span class="st-dim">${c.id === 'pin' && c.present ? 'set' : 'not set'}</span>`
              : c.value === 'inherits' ? html`<span class="st-inherit">inherits</span>`
              : html`<span class="st-v">${String(c.value)}</span>`}</span>
            <span class="st-chain__src">${c.source ? html`<${SetIn} path=${c.source} line=${c.line} w=${w}/>` : html`<span class="st-dim">${c.id === 'effective' ? (wins === 2 ? 'session model' : '') : '—'}</span>`}</span>
            ${win && html`<span class="st-sr"> (wins)</span>`}
          </li>`;
        })}
      </ol>
      <p class="st-hint st-insp__why">${why}</p>
    </${Sec}>
    <${Sec} title="Agent">
      <dl class="st-insp__dl">
        <dt>Effort</dt><dd>${a.effort || '—'}</dd>
        <dt>Context</dt><dd>${a.context_tier || '—'}</dd>
        <dt>Target</dt><dd>${a.target || '—'}</dd>
        <dt>Model policy</dt><dd>${a.model_policy || '—'}</dd>
      </dl>
    </${Sec}>
    <${Sec} title=${'Tools' + (a.tools.length ? ' · ' + a.tools.length : '')}><${AgentTools} tools=${a.tools} all/></${Sec}>
    <${Sec} title="Files">
      <dl class="st-insp__dl st-insp__files">
        ${files.map(f => html`<dt key=${f.label + 't'}>${f.label}</dt><dd key=${f.label + 'd'}>
          ${f.path ? html`<span class="st-mono" title=${f.path + (f.line ? ':' + f.line : '')}>${baseName(f.path)}${f.line ? ':' + f.line : ''}</span>
            ${f.scope && html` <span class="st-dim">· ${scopeLabel(f.scope, scopes)}</span>`}
            <button type="button" class="st-link" onClick=${() => w.openAt(f.path, f.line)}
              aria-label=${openLabel(f.path, f.line)}>Open</button>` : html`<span class="st-dim">—</span>`}
        </dd>`)}
      </dl>
    </${Sec}>
    <${Sec} title="History"><${History} w=${w} path=${a.defined_in || row.source}/></${Sec}>
    <${Sec} title="Actions">
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled>Change model…</button>
        <span class="st-hint" data-testid="st-change-hint">${hint}</span>
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
      <span class="st-chip">${file.is_dir ? 'Watched folder' : PURPOSE_LABELS[purposeOf(file)]}</span>
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
        <dt>Path</dt><dd class="st-insp__path">${file.path}</dd>
        <dt>Purpose</dt><dd>${file.is_dir ? 'Watched folder' : PURPOSE_LABELS[purposeOf(file)]}${file.kind && file.kind !== purposeOf(file) ? ' (' + file.kind + ')' : ''}</dd>
        <dt>Scope</dt><dd>${file.scope || '—'}</dd>
        <dt>Git</dt><dd>${file.git_state || '—'}</dd>
        <dt>Size</dt><dd>${file.bytes != null && !file.is_dir ? fmtSz(file.bytes) : '—'}</dd>
        <dt>Last change</dt><dd>${file.mtime ? fmtAgo(file.mtime) : '—'}</dd>
        ${file.mtime ? html`<dt>Modified</dt><dd>${new Date(file.mtime * 1000).toLocaleString()}</dd>` : null}
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

/** One environment variable: its value, where it is set and the settings it drives. */
function EnvInspector({ w, v }) {
  const where = envWhere(v);
  const found = findingsAt(w, v.source);
  return html`<div class="st-insp__body" data-testid="st-inspector-env">
    <h3 class="st-insp__title st-mono">${v.name || 'Environment variable'}</h3>
    <div class="st-insp__key">Environment variable${v.name ? '' : ' (this aictl version did not name it)'}</div>
    ${v.description && html`<p class="st-insp__tip">${v.description}</p>`}
    <div class="st-insp__chips">
      <${ToolChip} id=${v.tool} label=${w.labelOf(v.tool)}/>
      <${ScopeChip} scope="env" label=${scopeLabel('env', w.scopesOf(v.tool))}/>
      ${v.masked && html`<span class="st-chip st-chip--muted">value hidden</span>`}
      ${!v.documented && html`<${UndocumentedChip}/>`}
    </div>
    <div class=${'st-insp__value' + (v.set ? '' : ' is-unset')} data-testid="st-env-value">${!v.set
      ? html`<span class="st-dim">not set</span>`
      : v.masked ? html`<span class="st-dim" title="The name says it holds a credential, so the value is not shown">hidden</span>`
      : html`<span class="st-v st-mono">${v.value === '' ? '(empty)' : v.value}</span>`}</div>
    <${Sec} title="Where it is set">
      ${where.length ? html`<ul class="st-insp__list" data-testid="st-env-where">
        ${where.map(x => html`<li key=${x.id}>
          <b>${x.label}</b>${x.origin && html` <span class="st-mono" title=${x.origin}>${tildePath(x.origin)}</span>`}
          ${x.value !== v.value && html` <span class="st-dim">= ${x.value}</span>`}
          ${x.file && html` <button type="button" class="st-link" onClick=${() => w.openAt(x.file)}
            aria-label=${'Open ' + baseName(x.file)}>Open</button>`}
          <div class="st-hint">${x.note}</div>
        </li>`)}
      </ul>` : html`<div class="st-hint">Not set in aictl's environment, in a shell profile or in the registry.</div>`}
    </${Sec}>
    <${Sec} title=${'What it drives' + (v.drives.length ? ' · ' + v.drives.length : '')}>
      ${v.drives.length ? html`<ul class="st-insp__list" data-testid="st-env-drives">
        ${v.drives.map(d => html`<li key=${d.key}><button type="button" class="st-link"
          onClick=${() => w.set({ view: 'tool', tool: v.tool, sec: '', row: d.key })}>${d.label}</button>
          <span class="st-dim st-mono"> · ${d.key}</span></li>`)}
      </ul>` : html`<div class="st-hint">No setting shown here reads it; ${w.labelOf(v.tool)} reads it when it starts.</div>`}
    </${Sec}>
    <${Sec} title="Actions">
      <div class="st-actions">
        ${found.length > 0 && html`<button type="button" class="st-btn" onClick=${() => showFinding(w, found[0])}>Show finding</button>`}
        <span class="st-hint">A change applies to sessions started after it, from a shell that has the new value.</span>
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
        ${f.path && (isEnvSource(f.path)
          ? html`<button type="button" class="st-btn" onClick=${() => w.openEnv(envName(f.path), findingTools(f)[0] || '')}>Show ${envName(f.path) || 'the variable'}</button>`
          : html`<button type="button" class="st-btn" onClick=${() => w.openAt(f.path, f.line)}>${f.line > 0 ? openLabel(f.path, f.line) : 'Show the line'}</button>`)}
      </div>
    </${Sec}>
  </div>`;
}

export default function Inspector({ w }) {
  const { view } = w.st;
  let body = null;
  if ((view === 'tool' || view === 'topic') && w.selectedEnv) {
    body = html`<${EnvInspector} key=${w.selectedEnv.uid} w=${w} v=${w.selectedEnv}/>`;
  } else if ((view === 'tool' || view === 'topic') && w.selected) {
    body = isAgentRow(w.selected)
      ? html`<${AgentInspector} key=${w.selected.uid} w=${w} row=${w.selected}/>`
      : html`<${RowInspector} key=${w.selected.uid} w=${w} row=${w.selected}/>`;
  }
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
