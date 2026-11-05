import { useState, useEffect, useRef, useCallback, useMemo } from 'preact/hooks';
import { lazy, Suspense } from 'preact/compat';
import { html } from 'htm/preact';
import { SnapContext } from './context.js';
import { fmtSz } from './utils.js';
import * as api from './api.js';
import { useDashboard } from './hooks/useDashboard.js';
import { usePolledResource } from './hooks/usePolledResource.js';
import { useRange, RANGE_SECONDS, RANGE_PRESETS } from './hooks/useRange.js';
import { useTools } from './hooks/useTools.js';
import { useTabs, isTypingTarget } from './hooks/useTabs.js';
import { useTheme } from './hooks/useTheme.js';
import { useDensity } from './hooks/useDensity.js';
import { useSavedViews } from './hooks/useSavedViews.js';
import { useCommandPalette } from './hooks/useCommandPalette.js';
import { announce } from './utils/a11y.js';
import './utils/sessionBus.js';
import { gateContext } from './utils/gateContext.js';

import FileViewer from './components/FileViewer.js';
import CollectorHealth from './components/CollectorHealth.js';
import DatapointTooltip from './components/DatapointTooltip.js';
import ErrorBoundary from './components/ErrorBoundary.js';
import DashboardContent from './components/DashboardContent.js';
import OverviewNow from './components/OverviewNow.js';
import HiddenContextSlot from './components/HiddenContextSlot.js';
import { Dialog, Kbd } from './components/ui/index.js';
import GlobalHeader from './components/shell/GlobalHeader.js';
import CMasthead from './components/shell/CMasthead.js';
import NavRail from './components/shell/NavRail.js';
import CommandPalette from './components/shell/CommandPalette.js';
import SkipLink from './components/shell/SkipLink.js';
import ToastProvider from './components/ui/ToastProvider.js';
import Skeleton from './components/ui/Skeleton.js';
import { toast } from './components/ui/Toast.js';

// Re-export reducer + initialState so test/reducer.test.js keeps working.
export { reducer, initialState } from './reducer.js';

const VERIFIED_TOOLS = new Set([
  'claude-code', 'claude-desktop',
  'copilot', 'copilot-vscode', 'copilot-cli', 'copilot-jetbrains', 'copilot-vs', 'copilot365',
  'codex-cli', 'gemini', 'gemini-cli',
]);

// Everything but the first screen loads on demand. ECharts is reachable only
// through these chunks, so the Overview never pays for it.
const TabOverview = lazy(() => import('./components/TabOverview.js'));
const TabMemory = lazy(() => import('./components/TabMemory.js'));
const ContextMap = lazy(() => import('./components/ContextMap.js'));
const TabLive = lazy(() => import('./components/TabLive.js'));
const TabEventsStats = lazy(() => import('./components/TabEventsStats.js'));
const TabBudget = lazy(() => import('./components/TabBudget.js'));
const TabAnalytics = lazy(() => import('./components/TabAnalytics.js'));
const TabExplorer = lazy(() => import('./components/TabExplorer.js'));
const TabToolConfig = lazy(() => import('./components/TabToolConfig.js'));
const TabProjectEnv = lazy(() => import('./components/TabProjectEnv.js'));
const CAgentsTab = lazy(() => import('./components/CAgentsTab.js'));
const CDashboardTab = lazy(() => import('./components/CDashboardTab.js'));
const CPromptsTab = lazy(() => import('./components/CPromptsTab.js'));
const CSessionsTab = lazy(() => import('./components/CSessionsTab.js'));

const TabFallback = () => html`<div class="tab-skeleton" aria-busy="true" aria-label="Loading view">
  <${Skeleton} height="120px" radius="var(--radius-sm)"/>
  <${Skeleton} height="200px" radius="var(--radius-sm)"/>
</div>`;

const TabBoundary = ({ tabName, children }) =>
  html`<${ErrorBoundary} key=${tabName}><${Suspense} fallback=${html`<${TabFallback}/>`}>${children}</${Suspense}></${ErrorBoundary}>`;

/** Each view remembers where it was scrolled to while the app is open. */
function useTabScroll(activeTab, ref) {
  const positions = useRef({});
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const target = positions.current[activeTab] || 0;
    el.scrollTop = target;
    // Lazy views grow after their fetch settles: re-apply until the first user
    // scroll, so the restore is not clamped by a still-short page.
    let settled = false;
    const timers = target ? [150, 500, 1200].map(ms => setTimeout(() => {
      if (!settled) el.scrollTop = target;
    }, ms)) : [];
    const stop = () => { settled = true; };
    const onScroll = () => { positions.current[activeTab] = el.scrollTop; };
    el.addEventListener('wheel', stop, { passive: true, once: true });
    el.addEventListener('touchstart', stop, { passive: true, once: true });
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      timers.forEach(clearTimeout);
      el.removeEventListener('wheel', stop);
      el.removeEventListener('touchstart', stop);
      el.removeEventListener('scroll', onScroll);
    };
  }, [activeTab, ref]);
}

function useSearchShortcut(searchRef, setViewerPath) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') setViewerPath(null);
      // Don't steal focus while the user is typing in any input/textarea/
      // select/contenteditable (covers the header search too).
      if (e.key === '/' && !isTypingTarget(e.target)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [searchRef, setViewerPath]);
}

function useOtelStatus() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    let running = true;
    const check = () => api.getOtelStatus()
      .then(d => { if (running) setActive(d.active || false); })
      .catch(() => { if (running) setActive(false); });
    check();
    const id = setInterval(check, 30000);
    return () => { running = false; clearInterval(id); };
  }, []);
  return active;
}

function useRangeBoundData(globalRange) {
  const [dbHistory, setDbHistory] = useState(null);
  const [events, setEvents] = useState([]);
  useEffect(() => {
    const { id, since, until } = globalRange;
    if (id === 'live') setDbHistory(null);
    else if (id !== 'custom') api.getHistory({ range: id }).then(setDbHistory).catch(() => {});
    else api.getHistory({ since, until }).then(setDbHistory).catch(() => {});
    api.getEvents({ since, until }).then(setEvents).catch(() => {});
  }, [globalRange]);
  return { dbHistory, events };
}

/** Fire toasts on SSE disconnect/reconnect (after initial connect). */
function useConnectionToasts(connected) {
  const hasConnectedOnce = useRef(false);
  const prevRef = useRef(connected);
  useEffect(() => {
    if (connected && !hasConnectedOnce.current) {
      hasConnectedOnce.current = true;
      prevRef.current = connected;
      return;
    }
    if (connected !== prevRef.current) {
      if (connected) {
        toast.success('Reconnected');
        announce('Connection restored');
      } else if (hasConnectedOnce.current) {
        toast.error('Disconnected. Retrying…');
        announce('Connection lost, retrying', 'assertive');
      }
      prevRef.current = connected;
    }
  }, [connected]);
}

function computeAlerts(snap) {
  if (!snap) return [];
  const out = [];
  let subMb = 0, orphanMcp = 0, headless = 0, anomalies = 0;
  for (const t of snap.tools || []) {
    for (const p of t.processes || []) {
      const memMb = parseFloat(p.mem_mb) || 0;
      const ptype = (p.process_type || '').toLowerCase();
      if (ptype === 'subagent' || ptype === 'agent') subMb += memMb;
      if (ptype === 'mcp-server' && p.zombie_risk && p.zombie_risk !== 'none') orphanMcp++;
      if (ptype === 'browser' || (p.name || '').toLowerCase().includes('headless')) headless++;
      if (p.anomalies?.length) anomalies += p.anomalies.length;
    }
  }
  if (subMb > 2048)  out.push({ level: 'red',    msg: `Subagent memory: ${fmtSz(subMb * 1048576)} (>2GB) — consider cleanup` });
  if (orphanMcp > 0) out.push({ level: 'orange', msg: `${orphanMcp} MCP server(s) with dead parent — may be orphaned` });
  if (headless > 0)  out.push({ level: 'yellow', msg: `${headless} headless browser process(es) detected — check for leaks` });
  if (anomalies > 5) out.push({ level: 'orange', msg: `${anomalies} process anomalies detected` });
  return out;
}

/** Scope a per-tool list to the filter. Rows with no tool are global: keep them. */
function byTool(list, enabledTools) {
  if (!Array.isArray(list) || enabledTools === null) return list;
  return list.filter(r => !r.tool || enabledTools.includes(r.tool));
}

export function filterSnap(snap, enabledTools, searchQuery) {
  if (!snap) return snap;
  let tools = snap.tools.filter(t => VERIFIED_TOOLS.has(t.tool) || t.tool === 'aictl');
  if (enabledTools !== null) tools = tools.filter(t => enabledTools.includes(t.tool) || t.tool === 'aictl');
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    tools = tools.filter(t =>
      t.label.toLowerCase().includes(q) ||
      t.tool.toLowerCase().includes(q) ||
      (t.vendor && t.vendor.toLowerCase().includes(q)) ||
      (t.files || []).some(f => f.path.toLowerCase().includes(q)) ||
      (t.processes || []).some(p => (p.name || '').toLowerCase().includes(q) || (p.cmdline || '').toLowerCase().includes(q)) ||
      (t.live && (
        (t.live.workspaces || []).some(w => w.toLowerCase().includes(q)) ||
        (t.live.sources || []).some(s => s.toLowerCase().includes(q))
      ))
    );
  }
  // Root cause of "the tool filter applies only sometimes": only snap.tools
  // was filtered, while panels also read these flat per-tool lists.
  return {
    ...snap, tools,
    sessions: byTool(snap.sessions, enabledTools),
    tool_telemetry: byTool(snap.tool_telemetry, enabledTools),
    mcp_detail: byTool(snap.mcp_detail, enabledTools),
    events: byTool(snap.events, enabledTools),
  };
}

function dispatchSessionSelect(sessionId, tool) {
  try {
    document.dispatchEvent(new CustomEvent('aictl:select-session', {
      detail: { sessionId, tool },
    }));
  } catch { /* noop */ }
}

function buildCommands({
  tabs, setActiveTab,
  setPreset, presets,
  allTools, toggleTool,
  setTheme, setDensity,
  views, applyView,
  snap, onShowShortcuts,
}) {
  const out = [];
  tabs.forEach(t => out.push({
    id: 'tab:' + t.id, group: 'Jump to tab', label: t.label,
    shortcut: t.key, action: () => setActiveTab(t.id),
  }));
  presets.forEach(r => out.push({
    id: 'range:' + r.id, group: 'Range', label: 'Set range: ' + r.label,
    action: () => setPreset(r.id),
  }));
  (allTools || []).forEach(tool => out.push({
    id: 'filter:' + tool, group: 'Filter', label: 'Toggle tool: ' + tool,
    action: () => toggleTool(tool),
  }));
  // Root cause of the palette never listing sessions: it read
  // tools[].live.sessions, which the backend does not send. snap.sessions is
  // the live list.
  for (const s of (snap?.sessions || []).slice(0, 40)) {
    if (!s.session_id) continue;
    const project = String(s.project || '').split('/').filter(Boolean).pop() || 'no project';
    out.push({
      id: 'session:' + s.session_id, group: 'Session',
      label: 'Open session: ' + project + ' (' + (s.label || s.tool) + ')',
      action: () => { setActiveTab('explorer'); dispatchSessionSelect(s.session_id, s.tool); },
    });
  }
  views.forEach(v => out.push({
    id: 'view:' + v.id, group: 'View', label: 'Apply view: ' + v.name,
    action: () => applyView(v.id),
  }));
  ['auto', 'dark', 'light', 'editorial'].forEach(th => out.push({
    id: 'theme:' + th, group: 'Appearance', label: 'Theme: ' + th,
    action: () => setTheme(th),
  }));
  ['compact', 'normal', 'spacious'].forEach(d => out.push({
    id: 'density:' + d, group: 'Appearance', label: 'Density: ' + d,
    action: () => setDensity(d),
  }));
  out.push({
    id: 'help:shortcuts', group: 'Shortcuts', label: 'Keyboard shortcuts',
    action: () => { onShowShortcuts && onShowShortcuts(); },
  });
  return out;
}

// ─── Keyboard shortcuts dialog ─────────────────────────────────
function ShortcutsDialog({ open, onClose, tabs }) {
  if (!open) return null;
  const rows = [
    ...tabs.map(t => [t.label, t.key]),
    ['Previous / next view', '[ ]'],
    ['Command palette', '⌘K'],
    ['Focus filter', '/'],
    ['This list', '?'],
    ['Close panels', 'Esc'],
  ];
  return html`<${Dialog} open=${true} onClose=${onClose} ariaLabel="Keyboard shortcuts">
    <h3 style="margin-bottom:var(--sp-5)">Keyboard shortcuts</h3>
    <ul style="list-style:none;margin:0;padding:0;min-width:220px">
      ${rows.map(([label, key]) => html`<li key=${label}
        style="display:flex;justify-content:space-between;align-items:center;gap:var(--sp-6);padding:var(--sp-1) 0">
        <span>${label}</span><${Kbd}>${key}</${Kbd}>
      </li>`)}
    </ul>
  </${Dialog}>`;
}

// ─── App ───────────────────────────────────────────────────────
export default function App() {
  const { snapshot: snap, history, connected } = useDashboard();
  const { range: globalRange, setPreset, setCustom, setRange } = useRange();
  const { activeTab, setActiveTab, tabs } = useTabs();
  const { theme, setTheme, cycleTheme } = useTheme();
  const { density, setDensity } = useDensity();

  const verifiedTools = useMemo(() => (
    snap ? snap.tools.filter(t => t.tool !== 'aictl' && t.tool !== 'any' && VERIFIED_TOOLS.has(t.tool)).map(t => t.tool) : []
  ), [snap]);
  const { selectedTools: enabledTools, toggleTool, setTools } = useTools(verifiedTools);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewerPath, setViewerPath] = useState(null);
  const searchRef = useRef(null);
  useSearchShortcut(searchRef, setViewerPath);
  useConnectionToasts(connected);
  const otelActive = useOtelStatus();
  const { data: selfStatus } = usePolledResource(() => api.getSelfStatus(), [], { pollMs: 60000 });
  const { dbHistory, events } = useRangeBoundData(globalRange);

  const currentViewState = useMemo(() => ({
    tab: activeTab, range: globalRange, tools: enabledTools, density, theme,
  }), [activeTab, globalRange, enabledTools, density, theme]);
  const applyViewState = useCallback((v) => {
    if (v.tab) setActiveTab(v.tab);
    if (v.range) setRange(v.range);
    if (v.tools !== undefined) setTools(v.tools);
    if (v.density) setDensity(v.density);
    if (v.theme) setTheme(v.theme);
  }, [setActiveTab, setRange, setTools, setDensity, setTheme]);
  const { views, saveView, deleteView, applyView, matchingView } =
    useSavedViews(currentViewState, applyViewState);

  const palette = useCommandPalette();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const openShortcuts = useCallback(() => setShortcutsOpen(true), []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '?' && !isTypingTarget(e.target)) setShortcutsOpen(v => !v);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  const mainRef = useRef(null);
  useTabScroll(activeTab, mainRef);
  const openSession = useCallback((id, tool) => {
    setActiveTab('explorer');
    dispatchSessionSelect(id, tool);
  }, [setActiveTab]);

  const commands = useMemo(() => buildCommands({
    tabs, setActiveTab,
    setPreset, presets: RANGE_PRESETS,
    allTools: verifiedTools, toggleTool,
    setTheme, setDensity,
    views, applyView, snap,
    onShowShortcuts: openShortcuts,
  }), [tabs, setActiveTab, setPreset, verifiedTools, toggleTool,
       setTheme, setDensity, views, applyView, snap, openShortcuts]);

  const effectiveHistory = globalRange.id === 'live' ? history : (dbHistory || history);
  const rangeSeconds = globalRange.until
    ? globalRange.until - globalRange.since
    : RANGE_SECONDS[globalRange.id] || 3600;

  const openViewer = useCallback((path, opts = {}) => {
    if (!path) return setViewerPath(null);
    setViewerPath({ path, at: opts.at ?? null });
  }, []);
  const filteredSnap = useMemo(
    () => filterSnap(snap, enabledTools, searchQuery),
    [snap, enabledTools, searchQuery],
  );
  const recentFiles = useMemo(() => {
    const cutoff = Date.now() / 1000 - 300;
    const files = new Map();
    for (const e of events) {
      if (e.kind === 'file_modified' && e.ts >= cutoff && e.detail?.path) {
        const prev = files.get(e.detail.path);
        if (!prev || e.ts > prev.ts)
          files.set(e.detail.path, { ts: e.ts, growth: e.detail.growth_bytes || 0, tool: e.tool });
      }
    }
    return files;
  }, [events]);

  const ctxValue = useMemo(() => ({
    snap: filteredSnap, history, openViewer, recentFiles, globalRange, rangeSeconds, enabledTools,
  }), [filteredSnap, history, openViewer, recentFiles, globalRange, rangeSeconds, enabledTools]);

  const alerts = useMemo(() => computeAlerts(filteredSnap), [filteredSnap]);
  // Views that do not chart live data skip most SSE ticks.
  const gateRef = useRef(null);
  gateRef.current = gateContext(gateRef.current, ctxValue, { activeTab });
  const treeCtx = gateRef.current.value;

  const TAB_RENDERERS = {
    overview:   () => theme === 'editorial'
      ? html`<${TabBoundary} tabName="overview">
          <${CDashboardTab}/>
          <div class="mb-lg" style="margin-top:var(--sp-6)">
            <div class="c-overline" style="margin-bottom:var(--sp-3)">Monitoring</div>
            <${CollectorHealth}/>
          </div>
        </${TabBoundary}>`
      : html`<${TabBoundary} tabName="overview">
          <${OverviewNow} snap=${filteredSnap} enabledTools=${enabledTools}
            connected=${connected} otelActive=${otelActive} alerts=${alerts} selfStatus=${selfStatus}
            onOpenSession=${openSession} onOpenTab=${setActiveTab}/>
          <${DashboardContent} snap=${filteredSnap} history=${effectiveHistory}/>
          <div class="mb-lg"><${CollectorHealth}/></div>
        </${TabBoundary}>`,
    hidden:     () => html`<${TabBoundary} tabName="hidden"><${HiddenContextSlot}/></${TabBoundary}>`,
    procs:      () => html`<${TabBoundary} tabName="procs"><div class="mb-lg"><${TabOverview}/></div></${TabBoundary}>`,
    memory:     () => html`<${TabBoundary} tabName="memory"><div class="mb-lg"><${ContextMap}/></div><div class="mb-lg"><${TabMemory}/></div></${TabBoundary}>`,
    live:       () => html`<${TabBoundary} tabName="live"><div class="mb-lg"><${TabLive}/></div></${TabBoundary}>`,
    events:     () => html`<${TabBoundary} tabName="events"><div class="mb-lg"><${TabEventsStats} key=${'events-' + activeTab}/></div></${TabBoundary}>`,
    budget:     () => html`<${TabBoundary} tabName="budget"><div class="mb-lg"><${TabBudget} key=${'budget-' + activeTab}/></div></${TabBoundary}>`,
    analytics:  () => html`<${TabBoundary} tabName="analytics"><div class="mb-lg"><${TabAnalytics} key=${'analytics-' + activeTab}/></div></${TabBoundary}>`,
    explorer:   () => theme === 'editorial'
      ? html`<${TabBoundary} tabName="explorer"><${CSessionsTab}
          onInspect=${(id, tool) => {
            // Coherent inspect flow: stay on the explorer tab, hand the
            // session id to TabExplorer (it stashes the event if it isn't
            // mounted yet), then leave the editorial theme so TabExplorer
            // renders and picks the session up.
            setActiveTab('explorer');
            dispatchSessionSelect(id, tool);
            setTheme('auto');
          }}
        /></${TabBoundary}>`
      : html`<${TabBoundary} tabName="explorer"><div class="mb-lg"><${TabExplorer} key=${'explorer-' + activeTab}/></div></${TabBoundary}>`,
    config:     () => html`<${TabBoundary} tabName="config">
      <div class="mb-lg"><${TabToolConfig}/></div>
      <div class="mb-lg"><${TabProjectEnv} snap=${snap}/></div>
    </${TabBoundary}>`,
    agents:     () => html`<${TabBoundary} tabName="agents"><${CAgentsTab}
      onViewSessions=${() => setActiveTab('explorer')}
      onViewConfig=${() => setActiveTab('config')}/></${TabBoundary}>`,
    prompts:    () => html`<${TabBoundary} tabName="prompts"><${CPromptsTab}/></${TabBoundary}>`,
  };

  // Once we have a snapshot we can render; SSE drops shouldn't flash a
  // skeleton across the whole dashboard. Connection state is shown via the
  // header badge instead.
  const ready = snap != null;

  return html`<${SnapContext.Provider} value=${treeCtx}>
    <div class="main-wrap">
      <${SkipLink}/>
      <${GlobalHeader}
        searchRef=${searchRef} searchQuery=${searchQuery} onSearchChange=${setSearchQuery}
        theme=${theme} cycleTheme=${cycleTheme}
        density=${density} setDensity=${setDensity}
        otelActive=${otelActive} connected=${connected} selfStatus=${selfStatus}
        globalRange=${globalRange} onPreset=${setPreset} onApplyCustom=${setCustom}
        snap=${snap} enabledTools=${enabledTools}
        onToggleTool=${toggleTool} onSetAllTools=${setTools}
        views=${views} matchingView=${matchingView}
        onApplyView=${applyView} onDeleteView=${deleteView} onSaveView=${saveView}
        onOpenPalette=${palette.open}
      />
      ${theme === 'editorial' && html`<${CMasthead}
        activeTab=${activeTab} setActiveTab=${setActiveTab}
      />`}
      <div class="shell-body">
        <${NavRail} tabs=${tabs} activeTab=${activeTab} setActiveTab=${setActiveTab}/>
        <main class="main" id="main-content" tabindex="0" ref=${mainRef}>
          <div class="main-view" aria-label=${tabs.find(t => t.id === activeTab)?.label}>
            ${!ready
              ? html`<div class="tab-skeleton" aria-busy="true" aria-label="Loading dashboard">
                  <${Skeleton} height="120px" radius="var(--radius-sm)"/>
                  <${Skeleton} height="60px"  radius="var(--radius-sm)"/>
                  <${Skeleton} height="200px" radius="var(--radius-sm)"/>
                </div>`
              : TAB_RENDERERS[activeTab]
                ? TAB_RENDERERS[activeTab]()
                : html`<p class="text-muted">Unknown tab "${activeTab}"</p>`}
          </div>
        </main>
      </div>
    </div>
    <${FileViewer} path=${viewerPath?.path ?? (typeof viewerPath === 'string' ? viewerPath : null)}
      at=${typeof viewerPath === 'object' ? viewerPath?.at : null}
      onClose=${() => setViewerPath(null)}/>
    <${DatapointTooltip}/>
    <${CommandPalette} commands=${commands}
      isOpen=${palette.isOpen} onClose=${palette.close}
      lru=${palette.lru} onRun=${c => palette.recordUse(c.id)}/>
    <${ShortcutsDialog} open=${shortcutsOpen}
      onClose=${() => setShortcutsOpen(false)} tabs=${tabs}/>
    <${ToastProvider}/>
  </${SnapContext.Provider}>`;
}
