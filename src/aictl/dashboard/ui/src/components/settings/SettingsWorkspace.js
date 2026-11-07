// ─── Settings workspace ──────────────────────────────────────────
// Four pivots over the same settings: By tool, By topic, Files, Findings. A
// navigator on the left, a table in the middle, an inspector on the right.
// The pivot and the selection live in the URL query, so a link opens the same view.
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../../context.js';
import { getContextAudit, getSettingsFiles } from '../../api.js';
import { scopeAudit } from '../../utils/auditScope.js';
import { isFiltered } from '../../utils/toolScope.js';
import { writeUrl } from '../../hooks/urlState.js';
import { isTypingTarget } from '../../hooks/useTabs.js';
import { Icon, Segmented } from '../ui/index.js';
import ToolScopeEmpty from '../ui/ToolScopeEmpty.js';
import {
  CLEAR_PARAMS, aictlEntry, labelOf, mergeFiles, projectRoots, readSettingsUrl, rowFilter,
  samePath, settingsParams, toolEntries, withFindingIds,
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

function useAudit() {
  const [gen, setGen] = useState(0);
  const [res, setRes] = useState({ status: 'loading', audit: null, scan: null, error: null });
  useEffect(() => {
    let live = true;
    setRes(s => ({ ...s, status: 'loading', error: null }));
    getContextAudit(gen > 0, scan => { if (live) setRes(s => ({ ...s, scan })); }).then(
      audit => { if (live) setRes({ status: 'ready', audit, scan: null, error: null }); },
      e => { if (live) setRes(s => ({ ...s, status: 'error', scan: null, error: String(e?.message || e) })); },
    );
    return () => { live = false; };
  }, [gen]);
  const rescan = useCallback(() => setGen(g => g + 1), []);
  return { ...res, rescan };
}

export default function SettingsWorkspace() {
  const ctx = useContext(SnapContext) || {};
  const { snap, openViewer, enabledTools = null, recentFiles } = ctx;
  const [st, set] = useSettingsState();
  const [q, setQ] = useState('');
  const [nonDefault, setNonDefault] = useState(false);
  const [riskyOnly, setRiskyOnly] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const searchRef = useRef(null);
  const filesRes = useFiles();
  const audit = useAudit();

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
  const pass = useMemo(() => rowFilter({ q, nonDefault, risky: riskyOnly }), [q, nonDefault, riskyOnly]);
  const files = useMemo(() => mergeFiles(filesRes.files, entries, roots, enabledTools), [filesRes.files, entries, roots, enabledTools]);
  const scoped = useMemo(() => scopeAudit(audit.audit, enabledTools), [audit.audit, enabledTools]);
  const findings = useMemo(() => withFindingIds(scoped?.findings || []), [scoped]);

  const openAt = useCallback((path, line = 0) => {
    if (!path || !openViewer) return;
    openViewer(path, line > 0 ? { line } : {});
  }, [openViewer]);
  const select = useCallback(patch => { set(patch); setDrawer(true); }, [set]);
  const closeDrawer = useCallback(() => setDrawer(false), []);
  const labelFor = useCallback(id => labelOf(id, snap), [snap]);
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
    st, set, select, q, pass, entries, aictl, toolId, files, filesStatus: filesRes.status,
    findings, audit: scoped, auditStatus: audit.status, auditError: audit.error, scan: audit.scan, rescan: audit.rescan,
    selected, selectedFile, selectedFinding, openAt, labelOf: labelFor, mtimeOf, recentFiles,
    drawer, closeDrawer,
  };

  const totalRows = entries.reduce((n, e) => n + e.rows.length, 0);
  const totalRisky = entries.reduce((n, e) => n + e.risky, 0);
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
      <div class="st-kpis" data-testid="st-kpis">
        <span><b>${entries.length}</b> tools</span>
        <span><b>${files.length}</b> files</span>
        <span><b>${totalRows}</b> settings</span>
        <span class=${totalRisky ? 'st-red' : ''}><b>${totalRisky}</b> risky</span>
        <span><b>${audit.status === 'loading' && !audit.audit ? '…' : findings.length}</b> findings</span>
      </div>
    </div>
    ${scopeEmpty && html`<div class="st-scope-empty"><${ToolScopeEmpty} enabledTools=${enabledTools} snap=${snap} what="the settings"/></div>`}
    <div class="st-grid">
      <div class="st-col st-col--nav">${nav}</div>
      <div class="st-col st-col--main">${main}</div>
      <${Inspector} w=${w}/>
    </div>
  </div>`;
}
