import { useState, useEffect, useRef, useCallback, useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from './context.js';
import { fmtSz } from './utils.js';
import * as api from './api.js';
import { useDashboard } from './hooks/useDashboard.js';
import { useRange, RANGE_SECONDS, RANGE_PRESETS } from './hooks/useRange.js';
import { useTools } from './hooks/useTools.js';
import { useTabs } from './hooks/useTabs.js';
import { useTheme } from './hooks/useTheme.js';
import { useDensity } from './hooks/useDensity.js';
import { useSavedViews } from './hooks/useSavedViews.js';
import { useCommandPalette } from './hooks/useCommandPalette.js';
import { announce } from './utils/a11y.js';

import FileViewer from './components/FileViewer.js';
import TabOverview from './components/TabOverview.js';
import TabMemory from './components/TabMemory.js';
import TabLive from './components/TabLive.js';
import TabEventsStats from './components/TabEventsStats.js';
import TabBudget from './components/TabBudget.js';
import TabAnalytics from './components/TabAnalytics.js';
import TabSessionFlow from './components/TabSessionFlow.js';
import TabTranscript from './components/TabTranscript.js';
import TabTimelineChart from './components/TabTimelineChart.js';
import TabExplorer from './components/TabExplorer.js';
import TabHeatmap from './components/TabHeatmap.js';
import TabToolConfig from './components/TabToolConfig.js';
import ContextMap from './components/ContextMap.js';
import CollectorHealth from './components/CollectorHealth.js';
import DatapointTooltip from './components/DatapointTooltip.js';
import ErrorBoundary from './components/ErrorBoundary.js';
import DashboardContent from './components/DashboardContent.js';
import RangeBar from './components/RangeBar.js';
import ToolFilterBar from './components/ToolFilterBar.js';
import GlobalHeader from './components/shell/GlobalHeader.js';
import ActivityRail from './components/shell/ActivityRail.js';
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

const TabBoundary = ({ tabName, children }) =>
  html`<${ErrorBoundary} key=${tabName}>${children}</${ErrorBoundary}>`;

function useSearchShortcut(searchRef, setViewerPath) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') setViewerPath(null);
      if (e.key === '/' && document.activeElement !== searchRef.current) {
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

function filterSnap(snap, enabledTools, searchQuery) {
  if (!snap) return snap;
  let tools = snap.tools.filter(t => VERIFIED_TOOLS.has(t.tool) || t.tool === 'aictl');
  if (enabledTools !== null) tools = tools.filter(t => enabledTools.includes(t.tool) || t.tool === 'aictl');
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    tools = tools.filter(t =>
      t.label.toLowerCase().includes(q) ||
      t.tool.toLowerCase().includes(q) ||
      (t.vendor && t.vendor.toLowerCase().includes(q)) ||
      t.files.some(f => f.path.toLowerCase().includes(q)) ||
      t.processes.some(p => (p.name || '').toLowerCase().includes(q) || (p.cmdline || '').toLowerCase().includes(q)) ||
      (t.live && (
        (t.live.workspaces || []).some(w => w.toLowerCase().includes(q)) ||
        (t.live.sources || []).some(s => s.toLowerCase().includes(q))
      ))
    );
  }
  return { ...snap, tools };
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
  snap,
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
  if (snap) {
    for (const t of snap.tools || []) {
      const sessions = (t.live && t.live.sessions) || [];
      for (const s of sessions.slice(0, 20)) {
        if (s.active === false) continue;
        const sid = s.session_id || s.id;
        if (!sid) continue;
        out.push({
          id: 'session:' + sid, group: 'Session',
          label: 'Open session ' + String(sid).split(':').slice(-1)[0] + ' (' + (t.label || t.tool) + ')',
          action: () => { setActiveTab('sessions'); dispatchSessionSelect(sid, t.tool); },
        });
      }
    }
  }
  views.forEach(v => out.push({
    id: 'view:' + v.id, group: 'View', label: 'Apply view: ' + v.name,
    action: () => applyView(v.id),
  }));
  ['auto', 'dark', 'light'].forEach(th => out.push({
    id: 'theme:' + th, group: 'Appearance', label: 'Theme: ' + th,
    action: () => setTheme(th),
  }));
  ['compact', 'normal', 'spacious'].forEach(d => out.push({
    id: 'density:' + d, group: 'Appearance', label: 'Density: ' + d,
    action: () => setDensity(d),
  }));
  out.push({
    id: 'help:shortcuts', group: 'Shortcuts', label: 'Keyboard shortcuts',
    action: () => {
      const lines = tabs.map(t => t.key + ' → ' + t.label).join('\n');
      alert('Tab shortcuts:\n' + lines + '\n\n⌘K — Command palette\n/ — Focus filter\nEsc — Close panels');
    },
  });
  return out;
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

  const commands = useMemo(() => buildCommands({
    tabs, setActiveTab,
    setPreset, presets: RANGE_PRESETS,
    allTools: verifiedTools, toggleTool,
    setTheme, setDensity,
    views, applyView, snap,
  }), [tabs, setActiveTab, setPreset, verifiedTools, toggleTool,
       setTheme, setDensity, views, applyView, snap]);

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

  const alerts = useMemo(() => computeAlerts(snap), [snap]);

  const TAB_RENDERERS = {
    overview:   () => html`<${TabBoundary} tabName="overview">
      <${DashboardContent} snap=${filteredSnap} history=${effectiveHistory}/>
      <div class="mb-lg"><${CollectorHealth}/></div>
    </${TabBoundary}>`,
    procs:      () => html`<${TabBoundary} tabName="procs"><div class="mb-lg"><${TabOverview}/></div></${TabBoundary}>`,
    memory:     () => html`<${TabBoundary} tabName="memory"><div class="mb-lg"><${ContextMap}/></div><div class="mb-lg"><${TabMemory}/></div></${TabBoundary}>`,
    live:       () => html`<${TabBoundary} tabName="live"><div class="mb-lg"><${TabLive}/></div></${TabBoundary}>`,
    events:     () => html`<${TabBoundary} tabName="events"><div class="mb-lg"><${TabEventsStats} key=${'events-' + activeTab}/></div></${TabBoundary}>`,
    budget:     () => html`<${TabBoundary} tabName="budget"><div class="mb-lg"><${TabBudget} key=${'budget-' + activeTab}/></div></${TabBoundary}>`,
    analytics:  () => html`<${TabBoundary} tabName="analytics"><div class="mb-lg"><${TabAnalytics} key=${'analytics-' + activeTab}/></div></${TabBoundary}>`,
    heatmap:    () => html`<${TabBoundary} tabName="heatmap"><div class="mb-lg"><${TabHeatmap} key=${'heatmap-' + activeTab}/></div></${TabBoundary}>`,
    explorer:   () => html`<${TabBoundary} tabName="explorer"><div class="mb-lg"><${TabExplorer} key=${'explorer-' + activeTab}/></div></${TabBoundary}>`,
    config:     () => html`<${TabBoundary} tabName="config"><div class="mb-lg"><${TabToolConfig}/></div></${TabBoundary}>`,
  };

  const ready = connected && snap;

  return html`<${SnapContext.Provider} value=${ctxValue}>
    <div class="main-wrap">
      <${SkipLink}/>
      <${GlobalHeader}
        searchRef=${searchRef} searchQuery=${searchQuery} onSearchChange=${setSearchQuery}
        theme=${theme} cycleTheme=${cycleTheme}
        density=${density} setDensity=${setDensity}
        otelActive=${otelActive} connected=${connected}
        globalRange=${globalRange} onPreset=${setPreset} onApplyCustom=${setCustom}
        snap=${snap} enabledTools=${enabledTools}
        onToggleTool=${toggleTool} onSetAllTools=${setTools}
        views=${views} matchingView=${matchingView}
        onApplyView=${applyView} onDeleteView=${deleteView} onSaveView=${saveView}
        onOpenPalette=${palette.open}
      />
      ${alerts.length > 0 && html`<div class="alert-banner" role="alert">
        ${alerts.map((a, i) => html`<div key=${i} class="alert-item" style="color:var(--${a.level})">\u26A0 ${a.msg}</div>`)}
      </div>`}
      <${RangeBar} globalRange=${globalRange} onPreset=${setPreset} onApplyCustom=${setCustom}/>
      <div class="shell-body">
        <${ActivityRail} snap=${snap}
          onSelectSession=${() => setActiveTab('sessions')}/>
        <main class="main" id="main-content" role="main">
          <nav class="tab-nav" role="navigation" aria-label="Dashboard tabs">
            ${tabs.map(t => html`<button key=${t.id} class="tab-btn"
              aria-current=${activeTab === t.id ? 'page' : null} onClick=${() => setActiveTab(t.id)}
              title="Shortcut: ${t.key}">${t.icon ? t.icon + ' ' : ''}${t.label}</button>`)}
          </nav>
          <${ToolFilterBar} snap=${snap} enabledTools=${enabledTools}
            onToggle=${toggleTool} onSetAll=${setTools}/>
          <div aria-label=${tabs.find(t => t.id === activeTab)?.label}>
            ${!ready
              ? html`<div class="tab-skeleton" aria-busy="true" aria-label="Loading dashboard">
                  <${Skeleton} height="120px" radius="6px"/>
                  <${Skeleton} height="60px"  radius="6px"/>
                  <${Skeleton} height="200px" radius="6px"/>
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
    <${ToastProvider}/>
  </${SnapContext.Provider}>`;
}
