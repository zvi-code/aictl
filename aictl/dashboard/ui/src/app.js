import { useState, useEffect, useRef, useCallback, useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from './context.js';
import { THEME_ICONS, fmtSz } from './utils.js';
import * as api from './api.js';
import { useDashboard } from './hooks/useDashboard.js';
import { useRange, RANGE_SECONDS } from './hooks/useRange.js';
import { useTools } from './hooks/useTools.js';
import { useTabs } from './hooks/useTabs.js';
import { useTheme } from './hooks/useTheme.js';
import { useDensity } from './hooks/useDensity.js';

import FileViewer from './components/FileViewer.js';
import TabOverview from './components/TabOverview.js';
import TabMemory from './components/TabMemory.js';
import TabLive from './components/TabLive.js';
import TabEventsStats from './components/TabEventsStats.js';
import TabBudget from './components/TabBudget.js';
import TabSessions from './components/TabSessions.js';
import TabAnalytics from './components/TabAnalytics.js';
import TabSessionFlow from './components/TabSessionFlow.js';
import TabTranscript from './components/TabTranscript.js';
import TabTimelineChart from './components/TabTimelineChart.js';
import TabToolConfig from './components/TabToolConfig.js';
import ContextMap from './components/ContextMap.js';
import CollectorHealth from './components/CollectorHealth.js';
import DatapointTooltip from './components/DatapointTooltip.js';
import ErrorBoundary from './components/ErrorBoundary.js';
import DashboardContent from './components/DashboardContent.js';
import RangeBar from './components/RangeBar.js';
import ToolFilterBar from './components/ToolFilterBar.js';

// Re-export reducer + initialState so test/reducer.test.js keeps working;
// the active App consumes hooks instead.
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

// ─── App ───────────────────────────────────────────────────────
export default function App() {
  const { snapshot: snap, history, connected } = useDashboard();
  const { range: globalRange, setPreset, setCustom } = useRange();
  const { activeTab, setActiveTab, tabs } = useTabs();
  const { theme, cycleTheme } = useTheme();
  useDensity();

  const verifiedTools = useMemo(() => (
    snap ? snap.tools.filter(t => t.tool !== 'aictl' && t.tool !== 'any' && VERIFIED_TOOLS.has(t.tool)).map(t => t.tool) : []
  ), [snap]);
  const { selectedTools: enabledTools, toggleTool, setTools } = useTools(verifiedTools);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewerPath, setViewerPath] = useState(null);
  const searchRef = useRef(null);
  useSearchShortcut(searchRef, setViewerPath);
  const otelActive = useOtelStatus();
  const { dbHistory, events } = useRangeBoundData(globalRange);

  const effectiveHistory = globalRange.id === 'live' ? history : (dbHistory || history);
  const rangeSeconds = globalRange.until
    ? globalRange.until - globalRange.since
    : RANGE_SECONDS[globalRange.id] || 3600;

  const openViewer = useCallback(path => setViewerPath(path), []);
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
    sessions:   () => html`<${TabBoundary} tabName="sessions"><div class="mb-lg"><${TabSessions} key=${'sessions-' + activeTab}/></div></${TabBoundary}>`,
    analytics:  () => html`<${TabBoundary} tabName="analytics"><div class="mb-lg"><${TabAnalytics} key=${'analytics-' + activeTab}/></div></${TabBoundary}>`,
    flow:       () => html`<${TabBoundary} tabName="flow"><div class="mb-lg"><${TabSessionFlow} key=${'flow-' + activeTab}/></div></${TabBoundary}>`,
    transcript: () => html`<${TabBoundary} tabName="transcript"><div class="mb-lg"><${TabTranscript} key=${'transcript-' + activeTab}/></div></${TabBoundary}>`,
    timeline:   () => html`<${TabBoundary} tabName="timeline"><div class="mb-lg"><${TabTimelineChart} key=${'timeline-' + activeTab}/></div></${TabBoundary}>`,
    config:     () => html`<${TabBoundary} tabName="config"><div class="mb-lg"><${TabToolConfig}/></div></${TabBoundary}>`,
  };

  return html`<${SnapContext.Provider} value=${ctxValue}>
    <div class="main-wrap">
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <header role="banner">
        <h1>aictl <span>live dashboard</span></h1>
        <div class="hdr-right">
          <input type="text" ref=${searchRef} class="search-box" placeholder="Filter... ( / )"
            aria-label="Filter tools" value=${searchQuery}
            onInput=${e => setSearchQuery(e.target.value)}/>
          <button class="theme-btn" onClick=${cycleTheme} aria-label="Toggle theme: ${theme}"
            title="Theme: ${theme}">${THEME_ICONS[theme]}</button>
          ${otelActive && html`<span class="conn ok" title="OTel receiver active">OTel</span>`}
          <span class=${'conn ' + (connected ? 'ok' : 'err')} role="status" aria-live="polite">
            ${connected ? 'live' : 'reconnecting...'}
            <span class="sr-only">${connected ? ' — connected' : ' — connection lost, reconnecting'}</span>
          </span>
        </div>
      </header>
      ${alerts.length > 0 && html`<div class="alert-banner" role="alert">
        ${alerts.map((a, i) => html`<div key=${i} class="alert-item" style="color:var(--${a.level})">\u26A0 ${a.msg}</div>`)}
      </div>`}
      <${RangeBar} globalRange=${globalRange} onPreset=${setPreset} onApplyCustom=${setCustom}/>
      <main class="main">
        <nav class="tab-nav" role="tablist" aria-label="Dashboard tabs">
          ${tabs.map(t => html`<button key=${t.id} class="tab-btn" role="tab"
            aria-selected=${activeTab === t.id} onClick=${() => setActiveTab(t.id)}
            title="Shortcut: ${t.key}">${t.icon ? t.icon + ' ' : ''}${t.label}</button>`)}
        </nav>
        <${ToolFilterBar} snap=${snap} enabledTools=${enabledTools}
          onToggle=${toggleTool} onSetAll=${setTools}/>
        <div id="main-content" role="tabpanel" aria-label=${tabs.find(t => t.id === activeTab)?.label}>
          ${TAB_RENDERERS[activeTab]
            ? TAB_RENDERERS[activeTab]()
            : html`<p class="text-muted">Unknown tab "${activeTab}"</p>`}
        </div>
      </main>
    </div>
    <${FileViewer} path=${viewerPath} onClose=${() => setViewerPath(null)}/>
    <${DatapointTooltip}/>
  </${SnapContext.Provider}>`;
}
