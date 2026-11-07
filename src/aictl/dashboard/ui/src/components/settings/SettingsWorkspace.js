// ─── Settings workspace ──────────────────────────────────────────
// Four pivots over the same settings: By tool, By topic, Files, Findings. A
// navigator on the left, a table in the middle, an inspector on the right.
// The pivot and the selection live in the URL query, so a link opens the same view.
// The data comes in a `source` prop, so the board and the older Configuration
// screen can each give it their own records, file opener and audit:
//   { toolConfigs, tools, monitor, root, enabledTools, toolName(id), openFile(path, line),
//     recentFiles, findings: { audit, loading, error, scan, rescan },
//     refresh() (reads the settings again after an edit), hooks (GET /api/hooks-status) }
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { html } from 'htm/preact';
import { getSettingsFiles } from '../../api.js';
import { scopeAudit } from '../../utils/auditScope.js';
import { isFiltered } from '../../utils/toolScope.js';
import { writeUrl } from '../../hooks/urlState.js';
import { isTypingTarget } from '../../utils/a11y.js';
import Icon from '../ui/Icon.js';
import Segmented from '../ui/Segmented.js';
import ToolScopeEmpty from '../ui/ToolScopeEmpty.js';
import {
  CLEAR_PARAMS, FILE_PARAMS, absentManaged, aictlEntry, labelOf, mergeFiles, projectRoots, readSettingsUrl, rowFilter,
  samePath, settingsParams, settingsSummary, snapOf, toolEntries, withFindingIds,
} from './model.js';
import { ToolNav, ToolMain, AictlMain } from './ToolView.js';
import { TopicNav, TopicMain } from './TopicView.js';
import { FilesNav, FilesMain } from './FilesView.js';
import { FindingsNav, FindingsMain } from './FindingsView.js';
import Inspector from './Inspector.js';
import './settings.css';

const PIVOT_OPTIONS = [
  { value: 'tool', label: 'By tool' },
  { value: 'topic', label: 'By topic' },
  { value: 'files', label: 'Files' },
  { value: 'findings', label: 'Findings' },
];
const ROW_VIEWS = new Set(['tool', 'topic']);

function currentSearch() {
  return typeof window !== 'undefined' ? window.location.search : '';
}

/** The pivot and selection, kept in the URL query next to `tab`. */
function useSettingsState() {
  const [st, setSt] = useState(() => readSettingsUrl(currentSearch()));
  const set = useCallback(patch => setSt(prev => {
    const next = { ...prev, ...patch };
    if (patch.view && patch.view !== prev.view && !(ROW_VIEWS.has(prev.view) && ROW_VIEWS.has(patch.view))) {
      for (const k of ['tool', 'sec', 'row']) if (!(k in patch)) next[k] = '';
    }
    if (patch.view && patch.view !== prev.view && !('scope' in patch)) next.scope = '';
    if (patch.view && patch.view !== prev.view) {
      for (const k of FILE_PARAMS) if (!(k in patch)) next[k] = k === 'recent' ? false : '';
    }
    return next;
  }), []);
  useEffect(() => { writeUrl(settingsParams(st)); }, [st]);
  useEffect(() => {
    const onPop = () => setSt(readSettingsUrl(currentSearch()));
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      writeUrl(CLEAR_PARAMS);
    };
  }, []);
  return [st, set];
}

function useFiles() {
  const [res, setRes] = useState({ status: 'loading', files: null });
  useEffect(() => {
    let live = true;
    getSettingsFiles().then(
      r => { if (live) setRes(Array.isArray(r?.files) ? { status: 'ready', files: r.files } : { status: 'unavailable', files: null }); },
      () => { if (live) setRes({ status: 'unavailable', files: null }); },
    );
    return () => { live = false; };
  }, []);
  return res;
}

/** The audit state the Findings view reads: loading, error or ready, from the source's findings. */
export function auditState(findings) {
  const f = findings || {};
  const audit = f.audit || null;
  const status = f.loading ? 'loading' : f.error ? 'error' : audit || f.loading === false ? 'ready' : 'loading';
  return { status, audit, scan: f.scan || null, error: f.error ? String(f.error) : null };
}

export default function SettingsWorkspace({ source = {}, note = '' }) {
  const { toolConfigs, tools, monitor, root, enabledTools = null, recentFiles, toolName, openFile, findings: sourceFindings, refresh, hooks } = source;
  const snap = useMemo(() => snapOf({ toolConfigs, tools, monitor, root, enabledTools }), [toolConfigs, tools, monitor, root, enabledTools]);
  const [st, set] = useSettingsState();
  const [q, setQ] = useState('');
  const [nonDefault, setNonDefault] = useState(false);
  const [riskyOnly, setRiskyOnly] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const searchRef = useRef(null);
  const filesRes = useFiles();
  const audit = auditState(sourceFindings);
  const rescan = sourceFindings?.rescan;

  // `/` focuses this search box. It listens on window, after the header's own
  // `/` handler on document, so this box keeps the focus on this screen.
  useEffect(() => {
    const onKey = e => {
      if (e.key === '/' && !isTypingTarget(e.target) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'Escape') {
        setDrawer(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const entries = useMemo(() => toolEntries(snap), [snap]);
  const aictl = useMemo(() => aictlEntry(snap), [snap]);
  const roots = useMemo(() => projectRoots(snap), [snap]);
  const pass = useMemo(() => rowFilter({ q, nonDefault, risky: riskyOnly, unset: st.unset }), [q, nonDefault, riskyOnly, st.unset]);
  const passAll = useMemo(() => rowFilter({ q, nonDefault, risky: riskyOnly, unset: true }), [q, nonDefault, riskyOnly]);
  const passTool = useCallback(r => pass(r) && (!st.scope || r.scope === st.scope), [pass, st.scope]);
  const managedAbsent = useMemo(() => absentManaged(entries), [entries]);
  const files = useMemo(() => mergeFiles(filesRes.files, entries, roots, enabledTools), [filesRes.files, entries, roots, enabledTools]);
  const scoped = useMemo(() => scopeAudit(audit.audit, enabledTools), [audit.audit, enabledTools]);
  const findings = useMemo(() => withFindingIds(scoped?.findings || []), [scoped]);

  const openAt = useCallback((path, line = 0) => {
    if (!path || !openFile) return;
    openFile(path, line > 0 ? line : 0);
  }, [openFile]);
  const select = useCallback(patch => { set(patch); setDrawer(true); }, [set]);
  const closeDrawer = useCallback(() => setDrawer(false), []);
  const labelFor = useCallback((id) => {
    const l = labelOf(id, snap);
    return l === id && toolName ? toolName(id) : l;
  }, [snap, toolName]);
  const scopesOf = useCallback(id => entries.find(e => e.id === id)?.scopes || [], [entries]);
  const mtimeOf = useCallback(path => {
    const f = files.find(x => samePath(x.path, path));
    if (f?.mtime) return f.mtime;
    for (const t of snap?.tools || []) for (const x of t.files || []) if (samePath(x.path, path) && x.mtime) return x.mtime;
    return null;
  }, [files, snap]);

  if (!snap) return html`<p class="loading-state">Loading...</p>`;
  if (!entries.length && !aictl && !isFiltered(enabledTools)) {
    return html`<p class="empty-state">No tool configuration detected. Are AI tools installed?</p>`;
  }

  const toolId = entries.some(e => e.id === st.tool) || (st.tool === 'aictl' && aictl)
    ? st.tool : (entries[0]?.id || (aictl ? 'aictl' : ''));
  const entry = entries.find(e => e.id === toolId) || null;
  const rowOf = (tool, key) => (key ? entries.find(e => e.id === tool)?.rows.find(r => r.key === key) || null : null);
  const selected = st.view === 'tool' ? (entry ? rowOf(entry.id, st.row) : null)
    : st.view === 'topic' ? rowOf(st.tool, st.row) : null;
  const selectedFile = st.view === 'files' && st.row ? files.find(f => f.path === st.row) || null : null;
  const selectedFinding = st.view === 'findings' && st.row ? findings.find(f => f.id === st.row) || null : null;

  const w = {
    st, set, select, q, pass, passAll, passTool, showUnset: st.unset, scopesOf, managedAbsent, entries, aictl, toolId, files, filesStatus: filesRes.status,
    findings, audit: scoped, auditStatus: audit.status, auditError: audit.error, scan: audit.scan, rescan,
    selected, selectedFile, selectedFinding, openAt, labelOf: labelFor, mtimeOf, recentFiles,
    drawer, closeDrawer, refresh, hooks,
  };

  // The unset toggle and count appear once the server says, per row, whether a file sets it.
  const { set: totalRows, agents: totalAgents, knowsSet, unset: totalUnset, risky: totalRisky } = settingsSummary(entries);
  const scopeEmpty = isFiltered(enabledTools) && !entries.some(e => e.id !== 'vscode');

  let nav;
  let main;
  if (st.view === 'topic') {
    nav = html`<${TopicNav} w=${w}/>`;
    main = html`<${TopicMain} w=${w}/>`;
  } else if (st.view === 'files') {
    nav = html`<${FilesNav} w=${w}/>`;
    main = html`<${FilesMain} w=${w}/>`;
  } else if (st.view === 'findings') {
    nav = html`<${FindingsNav} w=${w}/>`;
    main = html`<${FindingsMain} w=${w}/>`;
  } else {
    nav = html`<${ToolNav} w=${w}/>`;
    main = entry ? html`<${ToolMain} w=${w} entry=${entry}/>`
      : toolId === 'aictl' && aictl ? html`<${AictlMain} w=${w} aictl=${aictl}/>`
      : html`<section class="st-main"><p class="st-empty">No tool settings to show.</p></section>`;
  }

  return html`<div class="st-ws" data-view=${st.view}>
    <div class="st-head">
      <${Segmented} class="st-pivot" options=${PIVOT_OPTIONS} value=${st.view} ariaLabel="Settings view"
        onChange=${v => set({ view: v })}/>
      <label class="st-searchbox">
        <${Icon} name="search" size="14"/>
        <input ref=${searchRef} type="search" class="st-search" value=${q}
          placeholder="Find a setting, value, key or file…" aria-label="Find a setting, value, key or file"
          onInput=${e => setQ(e.currentTarget.value)}/>
        <kbd class="st-kbd" aria-hidden="true">/</kbd>
      </label>
      <button type="button" class=${'st-toggle' + (nonDefault ? ' is-on' : '')} aria-pressed=${nonDefault ? 'true' : 'false'}
        onClick=${() => setNonDefault(!nonDefault)}>Only non-default</button>
      <button type="button" class=${'st-toggle st-toggle--risky' + (riskyOnly ? ' is-on' : '')} aria-pressed=${riskyOnly ? 'true' : 'false'}
        onClick=${() => setRiskyOnly(!riskyOnly)}>Only risky</button>
      ${knowsSet && html`<button type="button" class=${'st-toggle' + (st.unset ? ' is-on' : '')} aria-pressed=${st.unset ? 'true' : 'false'}
        onClick=${() => set({ unset: !st.unset })}>Show unset knobs</button>`}
      <div class="st-kpis" data-testid="st-kpis">
        <span><b>${entries.length}</b> tools</span>
        <span><b>${files.length}</b> files</span>
        <span><b>${totalRows}</b> settings</span>
        <span data-kpi="agents"><b>${totalAgents}</b> agents</span>
        ${knowsSet && html`<span data-kpi="unset"><b>${totalUnset}</b> unset</span>`}
        <span class=${totalRisky ? 'st-red' : ''}><b>${totalRisky}</b> risky</span>
        <span><b>${audit.status === 'loading' && !audit.audit ? '…' : findings.length}</b> findings</span>
      </div>
    </div>
    ${note && html`<p class="st-wsnote" data-testid="st-wsnote">${note}</p>`}
    ${scopeEmpty && html`<div class="st-scope-empty"><${ToolScopeEmpty} enabledTools=${enabledTools} snap=${snap} what="the settings"/></div>`}
    <div class="st-grid">
      <div class="st-col st-col--nav">${nav}</div>
      <div class="st-col st-col--main">${main}</div>
      <${Inspector} w=${w}/>
    </div>
  </div>`;
}
