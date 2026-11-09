// Findings: the context audit's findings, grouped by rule.
import { useState } from 'preact/hooks';
import { html } from 'htm/preact';
import { envName, findingGroups, findingTools, isEnvSource, matchFinding, tildePath } from './model.js';
import { RiskDot, NavHead } from './parts.js';
import { useGrid } from './tableGrid.js';

export const FOLD_FINDINGS = 5;

export function whereText(path, line) {
  if (!path) return '—';
  return tildePath(path) + (line > 0 ? ':' + line : '');
}

export function FindingsNav({ w }) {
  const groups = findingGroups(w.findings.filter(f => matchFinding(f, w.q)));
  return html`<nav class="st-nav" aria-label="Finding rules">
    <${NavHead}>Finding rules</${NavHead}>
    <ul class="st-nav__list">
      <li><button type="button" class=${'st-nav__item' + (!w.st.sec ? ' is-on' : '')} aria-current=${!w.st.sec ? 'true' : undefined}
        onClick=${() => w.set({ sec: '', row: '' })}>
        <span class="st-dotspace" aria-hidden="true"></span><span class="st-nav__label">All rules</span>
        <span class="st-nav__n">${groups.reduce((n, g) => n + g.count, 0)}</span></button></li>
      ${groups.map(g => {
        const on = w.st.sec === g.rule;
        return html`<li key=${g.rule}><button type="button" class=${'st-nav__item' + (on ? ' is-on' : '')}
          aria-current=${on ? 'true' : undefined} data-rule=${g.rule}
          onClick=${() => w.set({ sec: on ? '' : g.rule, row: '' })}>
          ${g.alarm ? html`<${RiskDot} label=${g.severity + ' severity'}/>` : html`<span class="st-dotspace" aria-hidden="true"></span>`}
          <span class="st-nav__label">${g.label}</span><span class="st-nav__n">${g.count}</span></button></li>`;
      })}
    </ul>
  </nav>`;
}

function FindingRow({ f, group, w }) {
  const sel = w.selectedFinding && w.selectedFinding.id === f.id;
  const choose = () => w.select({ row: f.id, sec: w.st.sec });
  const what = group.why && f.why === group.why ? (f.action || '') : (f.why || f.action || '');
  const tools = findingTools(f).map(w.labelOf).join(', ') || (f.session_id ? 'session ' + f.session_id : '—');
  return html`<tr class=${'st-row' + (sel ? ' is-sel' : '') + (f.severity === 'high' || f.severity === 'medium' ? ' st-row--risky' : '')}
    data-id=${f.id} tabindex="0" onClick=${choose}
    onKeyDown=${e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } }}>
    <td class="st-c-tool">${tools}</td>
    <td class="st-c-where st-mono" title=${f.path ? f.path + (f.line > 0 ? ':' + f.line : '') : undefined}>
      ${whereText(f.path, f.line)}${f.count > 1 ? html` <span class="st-dim">×${f.count}</span>` : ''}</td>
    <td class="st-c-what" title=${[f.why, f.action].filter(Boolean).join('\n') || undefined}>${what}</td>
    <td class="st-c-act">${f.path && (isEnvSource(f.path)
      ? html`<button type="button" class="st-chip st-chip--btn"
        onClick=${e => { e.stopPropagation(); w.openEnv(envName(f.path), findingTools(f)[0] || ''); }}>Show the variable</button>`
      : html`<button type="button" class="st-chip st-chip--btn"
        onClick=${e => { e.stopPropagation(); w.openAt(f.path, f.line); }}>Show the line</button>`)}</td>
  </tr>`;
}

function findingCols(w) {
  const toolsOf = f => findingTools(f).map(w.labelOf).join(', ');
  return [
    { k: 'tool', l: 'Tool', cls: 'st-c-tool', get: toolsOf },
    { k: 'where', l: 'Where', cls: 'st-c-where', get: f => f.path ? tildePath(f.path) + String(f.line > 0 ? f.line : 0).padStart(8, '0') : undefined },
    { k: 'what', l: 'What it does', get: f => f.why || f.action },
    { k: 'action', l: html`<span class="st-sr">Action</span>`, cls: 'st-c-act' },
  ];
}

export function FindingsMain({ w }) {
  const grid = useGrid('settings.findings', findingCols(w));
  const [open, setOpen] = useState({});
  if (w.auditStatus === 'loading' && !w.audit) {
    const s = w.scan;
    return html`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note" role="status" aria-busy="true" data-state="scanning">Scanning context sources…${s ? ' ' + (s.step || '') + (s.elapsed_s != null ? ', ' + Math.round(s.elapsed_s) + ' s' : '') : ''}</p>
    </section>`;
  }
  if (w.auditStatus === 'error' && !w.audit) {
    return html`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note st-red" role="alert">The context audit failed: ${w.auditError}
        ${w.rescan && html` <button type="button" class="st-btn" onClick=${() => w.rescan()}>Retry</button>`}</p>
    </section>`;
  }
  const all = w.findings.filter(f => matchFinding(f, w.q));
  const groups = findingGroups(all).filter(g => !w.st.sec || g.rule === w.st.sec);
  const n = groups.reduce((s, g) => s + g.count, 0);
  const scanning = w.auditStatus === 'loading';
  const incomplete = w.audit?.incomplete || [];
  const failed = w.audit?.failed_steps || [];
  return html`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Findings</h2>
      <span class="st-bar__sub">${n} in ${groups.length} ${groups.length === 1 ? 'rule' : 'rules'} · hidden changes, conflicts and settings outside this project</span>
      ${w.rescan && html`<button type="button" class="st-chip st-chip--btn st-bar__end" disabled=${scanning}
        onClick=${() => w.rescan()}>${scanning ? 'Scanning…' : 'Rescan'}</button>`}
    </div>
    ${scanning && html`<p class="st-note" role="status" data-state="rescanning">Scanning again…${w.scan ? ' ' + (w.scan.step || '') + (w.scan.elapsed_s != null ? ', ' + Math.round(w.scan.elapsed_s) + ' s' : '') : ''} The last results stay until it ends.</p>`}
    ${w.auditStatus === 'error' && html`<p class="st-note st-red" role="alert">The last scan failed: ${w.auditError}. These are the earlier results.</p>`}
    ${incomplete.length > 0 && html`<p class="st-note st-warn">The scan reached its time limit and skipped: ${incomplete.join(', ')}.</p>`}
    ${failed.length > 0 && html`<p class="st-note st-warn">The scan could not read: ${failed.map(f => f.step + ' (' + f.error + ')').join(', ')}.</p>`}
    ${groups.length ? html`<table class=${'st-table st-findings ' + grid.tableProps.class} style=${grid.tableProps.style}>
      <thead><tr>${findingCols(w).map(grid.th)}</tr></thead>
      ${groups.map(g => {
        const expanded = !!open[g.rule];
        const items = grid.order(g.items);
        const shown = expanded ? items : items.slice(0, FOLD_FINDINGS);
        const more = items.length - shown.length;
        return html`<tbody key=${g.rule} data-rule=${g.rule}>
          <tr class="st-group"><th scope="colgroup" colspan="4">
            ${g.alarm && html`<${RiskDot} label=${g.severity + ' severity'}/>`} ${g.label}
            <span class="st-group__meta">${g.count} · ${g.tools.map(w.labelOf).join(', ') || 'no tool'}${g.why ? ' · ' + g.why : ''}</span>
          </th></tr>
          ${shown.map(f => html`<${FindingRow} key=${f.id} f=${f} group=${g} w=${w}/>`)}
          ${more > 0 && html`<tr class="st-morerow"><td colspan="4">
            <button type="button" class="st-link st-more" onClick=${() => setOpen({ ...open, [g.rule]: true })}>▸ ${more} more</button>
          </td></tr>`}
        </tbody>`;
      })}
    </table>` : html`<p class="st-empty">${w.findings.length ? 'No finding matches the search.' : 'No findings for the selected tools.'}</p>`}
  </section>`;
}
