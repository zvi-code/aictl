import { useState, useEffect, useRef, useCallback, useMemo, useReducer } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from './context.js';
import {
  THEMES, THEME_ICONS, RANGES,
  fmtValue, evalExpr, fmtSz,
  COLORS, ICONS, SC, esc,
} from './utils.js';
import { LAYOUT } from './layoutConfig.js';
import ChartCard from './components/ChartCard.js';
import Metric from './components/Metric.js';
import ResourceBar from './components/ResourceBar.js';
import FileViewer from './components/FileViewer.js';
import TabOverview from './components/TabOverview.js';
import TabProcesses, { CoreBars } from './components/TabProcesses.js';
import TabMemory from './components/TabMemory.js';
import TabLive from './components/TabLive.js';
import TabEventsStats from './components/TabEventsStats.js';
import TabBudget from './components/TabBudget.js';
import TabSessions from './components/TabSessions.js';
import TabAnalytics from './components/TabAnalytics.js';
import TabSessionFlow from './components/TabSessionFlow.js';
import TabToolConfig from './components/TabToolConfig.js';
import ContextMap from './components/ContextMap.js';
import CollectorHealth from './components/CollectorHealth.js';
import DatapointTooltip from './components/DatapointTooltip.js';

// ─── Preference persistence (localStorage only) ────────────────
function persistPref(key, value) {
  try { localStorage.setItem('aictl-pref-' + key, JSON.stringify(value)); } catch {}
}
function loadPref(key, fallback) {
  try { const v = localStorage.getItem('aictl-pref-' + key); return v != null ? JSON.parse(v) : fallback; } catch { return fallback; }
}

function toLocalISOString(ts) {
  const d = new Date(ts * 1000);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

// ─── SSE merge helpers ─────────────────────────────────────────
const MAX_GLOBAL = 200;
const MAX_TOOL = 80;

const GLOBAL_KEYS = ['ts','files','tokens','cpu','mem_mb','mcp','mem_tokens',
                     'live_sessions','live_tokens','live_in_rate','live_out_rate'];

function mergeSseSummary(prev, data) {
  if(!prev) return data;
  const toolMap = Object.fromEntries((data.tools || []).map(t => [t.tool, t]));
  return {
    ...prev,
    ...data,
    tools: prev.tools.map(t => {
      const update = toolMap[t.tool];
      if(!update) return t;
      return { ...t, live: update.live, vendor: update.vendor || t.vendor, host: update.host || t.host };
    }),
  };
}

function appendHistory(prev, data) {
  if(!prev) return prev;
  prev.ts.push(data.timestamp);
  prev.files.push(data.total_files);
  prev.tokens.push(data.total_tokens);
  prev.cpu.push(Math.round(data.total_cpu * 10) / 10);
  prev.mem_mb.push(Math.round(data.total_mem_mb * 10) / 10);
  prev.mcp.push(data.total_mcp_servers);
  prev.mem_tokens.push(data.total_memory_tokens);
  prev.live_sessions.push(data.total_live_sessions);
  prev.live_tokens.push(data.total_live_estimated_tokens);
  prev.live_in_rate.push(Math.round((data.total_live_inbound_rate_bps || 0) * 100) / 100);
  prev.live_out_rate.push(Math.round((data.total_live_outbound_rate_bps || 0) * 100) / 100);
  if(prev.ts.length > MAX_GLOBAL) {
    for(const k of GLOBAL_KEYS) prev[k] = prev[k].slice(-MAX_GLOBAL);
  }
  const bt = prev.by_tool || {};
  for(const t of (data.tools || [])) {
    if(t.tool === 'aictl') continue;
    const cpu = t.live?.cpu_percent || 0;
    const mem = t.live?.mem_mb || 0;
    const tok = t.tokens || 0;
    const tr = (t.live?.outbound_rate_bps || 0) + (t.live?.inbound_rate_bps || 0);
    if(!bt[t.tool]) bt[t.tool] = { ts: [], cpu: [], mem_mb: [], tokens: [], traffic: [] };
    const th = bt[t.tool];
    th.ts.push(data.timestamp);
    th.cpu.push(Math.round(cpu * 10) / 10);
    th.mem_mb.push(Math.round(mem * 10) / 10);
    th.tokens.push(tok);
    th.traffic.push(Math.round(tr * 100) / 100);
    if(th.ts.length > MAX_TOOL) {
      for(const k of Object.keys(th)) th[k] = th[k].slice(-MAX_TOOL);
    }
  }
  return { ...prev, by_tool: bt };
}

// ─── Range presets ──────────────────────────────────────────────
const RANGE_PRESETS = [
  {id:'live', label:'Live', seconds:3600},
  {id:'1h', label:'1h', seconds:3600},
  {id:'6h', label:'6h', seconds:21600},
  {id:'24h', label:'24h', seconds:86400},
  {id:'7d', label:'7d', seconds:604800},
];
const RANGE_SECONDS = {};
RANGE_PRESETS.forEach(r => { RANGE_SECONDS[r.id] = r.seconds; });

// ─── Reducer ───────────────────────────────────────────────────
const initialState = {
  snap: null,
  history: null,
  connected: false,
  activeTab: loadPref('active_tab', 'overview'),
  // Global range: {id, since, until} — since/until are unix seconds
  globalRange: (() => {
    const id = loadPref('range', 'live');
    const secs = RANGE_SECONDS[id] || 3600;
    return { id, since: Date.now() / 1000 - secs, until: null };
  })(),
  searchQuery: '',
  theme: (() => { try { return localStorage.getItem('aictl-theme') || 'auto'; } catch { return 'auto'; } })(),
  viewerPath: null,
  events: [],
  enabledTools: loadPref('tool_filter', null),  // null = all enabled
};

function reducer(state, action) {
  switch(action.type) {
    case 'SSE_UPDATE': {
      const data = action.payload;
      const snap = state.snap ? mergeSseSummary(state.snap, data) : data;
      const history = appendHistory(state.history, data);
      return { ...state, snap, history, connected: true };
    }
    case 'SNAP_REPLACE':
      return { ...state, snap: action.payload };
    case 'HISTORY_INIT':
      return { ...state, history: action.payload };
    case 'EVENTS_INIT':
      return { ...state, events: action.payload };
    case 'SET_CONNECTED':
      return { ...state, connected: action.payload };
    case 'SET_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_RANGE':
      return { ...state, globalRange: action.payload };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_VIEWER':
      return { ...state, viewerPath: action.payload };
    case 'SET_TOOL_FILTER':
      return { ...state, enabledTools: action.payload };
    default:
      return state;
  }
}

// ─── Tabs from static config ────────────────────────────────────
const TABS = LAYOUT.tabs;

// ─── Global Range Bar (above tabs) ─────────────────────────────
function RangeBar({globalRange, onPreset, onApplyCustom}) {
  const [showCustom, setShowCustom] = useState(false);
  const startRef = useRef(null);
  const endRef = useRef(null);

  const handleCustomToggle = useCallback(() => {
    setShowCustom(true);
    requestAnimationFrame(() => {
      if (startRef.current && endRef.current) {
        if (globalRange.until != null) {
          startRef.current.value = toLocalISOString(globalRange.since);
          endRef.current.value = toLocalISOString(globalRange.until);
        } else {
          const preset = RANGE_PRESETS.find(r => r.id === globalRange.id);
          const nowTs = Date.now() / 1000;
          const secs = preset?.seconds || 86400;
          startRef.current.value = toLocalISOString(nowTs - secs);
          endRef.current.value = toLocalISOString(nowTs);
        }
      }
    });
  }, [globalRange]);

  const handleApply = useCallback(() => {
    const startVal = startRef.current?.value;
    const endVal = endRef.current?.value;
    if (!startVal || !endVal) return;
    const sinceMs = new Date(startVal).getTime();
    const untilMs = new Date(endVal).getTime();
    if (!Number.isFinite(sinceMs) || !Number.isFinite(untilMs)) return;
    const since = sinceMs / 1000;
    const until = untilMs / 1000;
    if (until <= since) return;
    onApplyCustom(since, until);
    setShowCustom(false);
  }, [onApplyCustom]);

  return html`<div class="global-range-bar">
    <div class="range-bar">
      <span class="range-label">Range:</span>
      ${RANGE_PRESETS.map(r => html`<button key=${r.id}
        class=${globalRange.id === r.id && !showCustom ? 'range-btn active' : 'range-btn'}
        onClick=${() => { onPreset(r.id); setShowCustom(false); }}>${r.label}</button>`)}
      <button class=${showCustom || globalRange.id === 'custom' ? 'range-btn active' : 'range-btn'}
        onClick=${handleCustomToggle}>Custom</button>
    </div>
    ${showCustom && html`<div class="es-custom-range">
      <label><span class="range-label">From</span>
        <input type="datetime-local" class="es-date-input" ref=${startRef} /></label>
      <label><span class="range-label">To</span>
        <input type="datetime-local" class="es-date-input" ref=${endRef} /></label>
      <button class="range-btn active" onClick=${handleApply} style="font-weight:600">Apply</button>
    </div>`}
  </div>`;
}

// ─── Tool Filter Bar ────────────────────────────────────────────
const VERIFIED_TOOLS = new Set([
  'claude-code','claude-desktop',
  'copilot','copilot-vscode','copilot-cli','copilot-jetbrains','copilot-vs','copilot365',
  'codex-cli', 'gemini', 'gemini-cli',
]);

function ToolFilterBar({snap, enabledTools, onToggle, onSetAll}) {
  if (!snap) return null;
  const allTools = snap.tools.filter(t => !t.meta);
  if (!allTools.length) return null;

  const allEnabled = enabledTools === null;
  const count = enabledTools ? enabledTools.length : allTools.length;

  return html`<div class="tool-filter-bar">
    <label class="tool-filter-item">
      <input type="checkbox" checked=${allEnabled}
        onChange=${() => onSetAll(allEnabled ? [] : null)} />
      <span class="text-muted">All (${allTools.length})</span>
    </label>
    ${allTools.sort((a,b)=>a.label.localeCompare(b.label)).map(t => {
      const verified = VERIFIED_TOOLS.has(t.tool);
      const checked = enabledTools === null || enabledTools.includes(t.tool);
      const c = COLORS[t.tool] || 'var(--fg2)';
      const icon = ICONS[t.tool] || '\u{1F539}';
      return html`<label key=${t.tool} class=${'tool-filter-item' + (verified ? '' : ' tool-unverified')}
        title=${verified ? '' : 'Not yet verified — discovery only'}>
        <input type="checkbox" checked=${checked} disabled=${!verified}
          onChange=${() => verified && onToggle(t.tool)} />
        <span style=${'color:' + c}>${icon}</span>
        <span>${t.label}</span>
      </label>`;
    })}
  </div>`;
}

// ─── MCP server mini-list ──────────────────────────────────────
function McpPanel({mcpDetail}) {
  if (!mcpDetail || !mcpDetail.length)
    return html`<div style="color:var(--fg3);font-size:var(--fs-sm);padding:var(--sp-2) 0">None configured</div>`;
  return html`<div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
    ${mcpDetail.map(m => {
      const run = m.status === 'running';
      const dotColor = SC[m.status] || 'var(--fg3)';
      const toolColor = COLORS[m.tool] || 'var(--fg3)';
      return html`<div key=${m.name+m.tool}
        style="display:flex;align-items:center;gap:var(--sp-2);padding:3px var(--sp-3);
               border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent)"
        title=${m.status+(m.pid?' PID '+m.pid:'')+(m.transport?' · '+m.transport:'')}>
        <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${dotColor}"></span>
        <span class="mono" style="font-size:var(--fs-xs);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.name)}</span>
        <span style="font-size:var(--fs-2xs);color:${toolColor};white-space:nowrap;flex-shrink:0">${esc(m.tool)}</span>
      </div>`;
    })}
  </div>`;
}

// ─── MCP inventory metric with hover popover ──────────────────
function McpMetric({label, value, mcpDetail}) {
  const [show, setShow] = useState(false);
  // No data-dp on this metric — McpPanel is the richer tooltip for this box
  return html`<div style="position:relative;cursor:default"
    onMouseEnter=${()=>setShow(true)}
    onMouseLeave=${()=>setShow(false)}>
    <${Metric} label=${label} value=${value} sm=${true}/>
    ${show && html`<div style="position:absolute;top:calc(100% + 6px);left:0;z-index:200;
        min-width:260px;background:var(--bg);border:1px solid var(--border);border-radius:6px;
        box-shadow:0 4px 20px rgba(0,0,0,0.35);padding:var(--sp-3)">
      <div class="metric-group-label" style="padding:0 0 var(--sp-2)">MCP Servers</div>
      ${mcpDetail.length > 0
        ? html`<${McpPanel} mcpDetail=${mcpDetail}/>`
        : html`<div style="color:var(--fg3);font-size:var(--fs-sm)">None configured</div>`}
    </div>`}
  </div>`;
}

// ─── Dashboard Content (sparklines, metrics, bars) ─────────────
function DashboardContent({snap, history, globalRange}) {
  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem('aictl-header-expanded') !== 'false'; } catch { return true; }
  });
  const toggleExpanded = useCallback(() => {
    setExpanded(v => {
      const next = !v;
      try { localStorage.setItem('aictl-header-expanded', String(next)); } catch {}
      return next;
    });
  }, []);

  const sparkFor = (key) => {
    if(!history || !history.ts || history.ts.length<2) return null;
    return [history.ts, history[key]];
  };
  const cores = snap?.cpu_cores || 1;
  const exprVars = {cores};
  return html`
    <div style=${'display:grid;grid-template-columns:repeat('+LAYOUT.sparklines.length+',1fr);gap:var(--sp-4);margin-bottom:var(--sp-4)'}>
      ${LAYOUT.sparklines.map(cfg => {
        const raw = snap ? snap['total_'+cfg.field] ?? snap[cfg.field] ?? '' : '';
        const fmt = fmtValue(raw, cfg.format, cfg.suffix, cfg.multiply);
        const yMax = cfg.yMaxExpr ? evalExpr(cfg.yMaxExpr, exprVars) : undefined;
        const refLines = (cfg.refLines || []).map(r => ({
          value: evalExpr(r.valueExpr, exprVars),
          label: (r.label||'').replace('{cores}', cores),
        })).filter(r => r.value != null);
        return html`<${ChartCard} key=${cfg.field} label=${cfg.label} value=${fmt}
          data=${sparkFor(cfg.field)} chartColor=${cfg.color||'var(--accent)'}
          smooth=${!!cfg.smooth} refLines=${refLines.length?refLines:undefined} yMax=${yMax} dp=${cfg.dp}/>`;
      })}
    </div>

    <div class=${expanded ? 'header-sections header-sections--expanded' : 'header-sections header-sections--collapsed'}>

      <!-- Row 1: (CPU bars + Live traffic) | Live metric boxes -->
      <div class="mb-sm" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4);align-items:start">
        <!-- Left: per-core CPU bars + live traffic bar -->
        <div>
          <div class="metric-group-label">CPU Cores</div>
          <${CoreBars} perCore=${snap?.cpu_per_core||[]}/>
          <div style="margin-top:var(--sp-3)"><${ResourceBar} snap=${snap} mode="traffic"/></div>
        </div>
        <!-- Right: 4 live metric boxes in 2×2 grid -->
        <div>
          <div class="metric-group-label">Live Monitor</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2)">
            ${LAYOUT.liveMetrics.map(cfg => {
              const raw = snap ? snap[cfg.field] ?? '' : '';
              const fmt = fmtValue(raw, cfg.format, cfg.suffix, cfg.multiply);
              return html`<${Metric} key=${cfg.field} label=${cfg.label} value=${fmt} accent=${!!cfg.accent} dp=${cfg.dp} sm=${true}/>`;
            })}
          </div>
        </div>
      </div>

      <!-- Row 2: Inventory — full width; MCP box shows hover popover -->
      <div class="mb-sm">
        <div class="metric-group-label">Inventory</div>
        <div style="display:grid;grid-template-columns:repeat(${LAYOUT.inventory.length},1fr);gap:var(--sp-2)">
          ${LAYOUT.inventory.map(cfg => {
            const raw = snap ? snap[cfg.field] ?? '' : '';
            const fmt = fmtValue(raw, cfg.format, cfg.suffix, cfg.multiply);
            if (cfg.field === 'total_mcp_servers')
              return html`<${McpMetric} key=${cfg.field} label=${cfg.label} value=${fmt} mcpDetail=${snap?.mcp_detail||[]}/>`;
            return html`<${Metric} key=${cfg.field} label=${cfg.label} value=${fmt} accent=${!!cfg.accent} dp=${cfg.dp} sm=${true}/>`;
          })}
        </div>
      </div>

      <!-- Row 3: CSV footprint — full width -->
      <div class="mb-sm"><${ResourceBar} snap=${snap} mode="files"/></div>

    </div>
    <button class="header-toggle" onClick=${toggleExpanded} aria-label="Toggle details">
      ${expanded ? '\u25B2 less' : '\u25BC more'}
    </button>
  `;
}

// ─── App Component ─────────────────────────────────────────────
export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { snap, history, connected, activeTab, globalRange, searchQuery, theme, viewerPath, events, enabledTools } = state;

  const [dbHistory, setDbHistory] = useState(null);
  const searchRef = useRef(null);

  // Theme sync
  useEffect(()=>{
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('aictl-theme', theme); } catch(e){}
  },[theme]);

  const cycleTheme = useCallback(()=>{
    dispatch({ type: 'SET_THEME', payload:
      THEMES[(THEMES.indexOf(theme)+1)%THEMES.length]
    });
  },[theme]);

  // ─── Data fetching on range changes ──────────────────────────
  const fetchForRange = useCallback((range) => {
    const since = range.since;
    const untilParam = range.until != null ? '&until=' + range.until : '';

    // History
    if (range.id === 'live') {
      setDbHistory(null);
    } else if (range.id !== 'custom') {
      fetch('/api/history?range=' + range.id)
        .then(r=>r.json()).then(setDbHistory).catch(()=>{});
    } else {
      fetch('/api/history?since=' + since + untilParam)
        .then(r=>r.json()).then(setDbHistory).catch(()=>{});
    }

    // Events
    fetch('/api/events?since=' + since + untilParam)
      .then(r=>r.json())
      .then(data => dispatch({ type: 'EVENTS_INIT', payload: data }))
      .catch(()=>{});
  }, []);

  // SSE connection + initial fetches
  useEffect(()=>{
    let es, retryDelay=1000, closed=false, snapInflight=false;

    fetch('/api/snapshot')
      .then(r=>r.json())
      .then(data => dispatch({ type: 'SNAP_REPLACE', payload: data }))
      .catch(()=>{});

    fetch('/api/history')
      .then(r=>r.json())
      .then(data => dispatch({ type: 'HISTORY_INIT', payload: data }))
      .catch(()=>{});

    // Initial data for the default range
    fetchForRange(globalRange);

    function connect(){
      if(closed) return;
      es = new EventSource('/api/stream');
      es.onmessage = e => {
        const data = JSON.parse(e.data);
        dispatch({ type: 'SSE_UPDATE', payload: data });
        retryDelay = 1000;
      };
      es.onerror = () => {
        dispatch({ type: 'SET_CONNECTED', payload: false });
        es.close();
        // Reconnect SSE only — no snapshot fetch here.
        // The SSE stream pushes current state on connect (server line 2050-2053),
        // and the 30s interval provides a safety net.
        if(!closed) setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay*2, 30000);
      };
    }
    connect();

    const refreshInterval = setInterval(()=>{
      if(closed || snapInflight) return;
      snapInflight = true;
      fetch('/api/snapshot')
        .then(r=>r.json())
        .then(data => dispatch({ type: 'SNAP_REPLACE', payload: data }))
        .catch(()=>{})
        .finally(()=>{ snapInflight = false; });
    }, 30000);

    return ()=>{ closed=true; if(es) es.close(); clearInterval(refreshInterval); };
  },[]);

  // ─── Range change handlers ───────────────────────────────────
  const handlePreset = useCallback((id) => {
    const secs = RANGE_SECONDS[id] || 3600;
    const range = { id, since: Date.now() / 1000 - secs, until: null };
    dispatch({ type: 'SET_RANGE', payload: range });
    persistPref('range', id);
    fetchForRange(range);
  }, [fetchForRange]);

  const handleCustomRange = useCallback((since, until) => {
    const range = { id: 'custom', since, until };
    dispatch({ type: 'SET_RANGE', payload: range });
    fetchForRange(range);
  }, [fetchForRange]);

  const effectiveHistory = globalRange.id === 'live' ? history : (dbHistory || history);
  const rangeSeconds = globalRange.until
    ? globalRange.until - globalRange.since
    : RANGE_SECONDS[globalRange.id] || 3600;

  // Keyboard shortcuts
  useEffect(()=>{
    const handler = e => {
      if(e.key==='Escape') dispatch({ type: 'SET_VIEWER', payload: null });
      if(e.key==='/'&&document.activeElement!==searchRef.current) { e.preventDefault(); searchRef.current?.focus(); }
      if(document.activeElement!==searchRef.current) {
        const tab = TABS.find(t=>t.key===e.key);
        if(tab) {
          dispatch({ type: 'SET_TAB', payload: tab.id });
          persistPref('active_tab', tab.id);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return ()=>document.removeEventListener('keydown', handler);
  },[]);

  const openViewer = useCallback((path)=>dispatch({ type: 'SET_VIEWER', payload: path }),[]);

  // ─── Tool filter ─────────────────────────────────────────────
  const handleToolToggle = useCallback((toolName) => {
    if (!VERIFIED_TOOLS.has(toolName)) return;
    const verifiedTools = snap ? snap.tools.filter(t => t.tool !== 'aictl' && t.tool !== 'any' && VERIFIED_TOOLS.has(t.tool)).map(t=>t.tool) : [];
    let next;
    if (enabledTools === null) {
      // All were enabled, now disable this one
      next = verifiedTools.filter(t => t !== toolName);
    } else {
      const idx = enabledTools.indexOf(toolName);
      if (idx >= 0) {
        next = enabledTools.filter(t => t !== toolName);
      } else {
        next = [...enabledTools, toolName];
        // If all verified are now enabled, set to null
        if (next.length >= verifiedTools.length) next = null;
      }
    }
    dispatch({ type: 'SET_TOOL_FILTER', payload: next });
    persistPref('tool_filter', next);
  }, [snap, enabledTools]);

  const handleToolSetAll = useCallback((tools) => {
    // null = all verified, array = specific subset
    dispatch({ type: 'SET_TOOL_FILTER', payload: tools });
    persistPref('tool_filter', tools);
  }, []);

  // ─── Filtered snap (search + tool filter) ────────────────────
  const filteredSnap = useMemo(()=>{
    if(!snap) return snap;
    let tools = snap.tools;
    // Always exclude unverified tools
    tools = tools.filter(t => VERIFIED_TOOLS.has(t.tool) || t.tool === 'aictl');
    if (enabledTools !== null) {
      tools = tools.filter(t => enabledTools.includes(t.tool) || t.tool === 'aictl');
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      tools = tools.filter(t=>
        t.label.toLowerCase().includes(q) ||
        t.tool.toLowerCase().includes(q) ||
        (t.vendor && t.vendor.toLowerCase().includes(q)) ||
        t.files.some(f=>f.path.toLowerCase().includes(q)) ||
        t.processes.some(p=>(p.name||'').toLowerCase().includes(q) || (p.cmdline||'').toLowerCase().includes(q)) ||
        (t.live && (
          (t.live.workspaces||[]).some(w=>w.toLowerCase().includes(q)) ||
          (t.live.sources||[]).some(src=>src.toLowerCase().includes(q))
        ))
      );
    }
    return {...snap, tools};
  },[snap, searchQuery, enabledTools]);

  const recentFiles = useMemo(()=>{
    const cutoff = Date.now()/1000 - 300;
    const files = new Map();
    for(const e of events) {
      if(e.kind === 'file_modified' && e.ts >= cutoff && e.detail?.path) {
        const prev = files.get(e.detail.path);
        if(!prev || e.ts > prev.ts) {
          files.set(e.detail.path, {ts:e.ts, growth:e.detail.growth_bytes||0, tool:e.tool});
        }
      }
    }
    return files;
  },[events]);

  const ctxValue = useMemo(()=>({
    snap: filteredSnap, history, openViewer, recentFiles,
    globalRange, rangeSeconds, enabledTools,
  }),[filteredSnap, history, openViewer, recentFiles, globalRange, rangeSeconds, enabledTools]);

  // ─── Tab content ─────────────────────────────────────────────
  const TAB_RENDERERS = {
    overview: () => html`
      <${DashboardContent} snap=${filteredSnap} history=${effectiveHistory}
        globalRange=${globalRange}/>
      <div class="mb-lg"><${CollectorHealth}/></div>
    `,
    procs: () => html`
      <div class="mb-lg"><${TabOverview}/></div>
    `,
    memory: () => html`
      <div class="mb-lg"><${ContextMap}/></div>
      <div class="mb-lg"><${TabMemory}/></div>
    `,
    live: () => html`<div class="mb-lg"><${TabLive}/></div>`,
    events: () => html`<div class="mb-lg"><${TabEventsStats} key=${'events-'+activeTab}/></div>`,
    budget: () => html`<div class="mb-lg"><${TabBudget} key=${'budget-'+activeTab}/></div>`,
    sessions: () => html`<div class="mb-lg"><${TabSessions} key=${'sessions-'+activeTab}/></div>`,
    analytics: () => html`<div class="mb-lg"><${TabAnalytics} key=${'analytics-'+activeTab}/></div>`,
    flow:    () => html`<div class="mb-lg"><${TabSessionFlow} key=${'flow-'+activeTab}/></div>`,
    config:  () => html`<div class="mb-lg"><${TabToolConfig}/></div>`,
  };

  const handleTabChange = useCallback((tabId)=>{
    dispatch({ type: 'SET_TAB', payload: tabId });
    persistPref('active_tab', tabId);
  },[]);

  const handleSessionSelect = useCallback((session)=>{
    dispatch({ type: 'SET_TAB', payload: 'sessions' });
    persistPref('active_tab', 'sessions');
    window.__aictl_selected_session = session.session_id;
    window.dispatchEvent(new CustomEvent('aictl-session-select', {detail: session}));
  },[]);

  // OTel receiver status (poll every 30s)
  const [otelActive, setOtelActive] = useState(false);
  useEffect(()=>{
    let running = true;
    const check = () => fetch('/api/otel-status').then(r=>r.json())
      .then(d=>{ if(running) setOtelActive(d.active||false); })
      .catch(()=>{ if(running) setOtelActive(false); });
    check();
    const id = setInterval(check, 30000);
    return ()=>{ running=false; clearInterval(id); };
  },[]);

  // Anomaly alerts
  const alerts = useMemo(()=>{
    if(!snap) return [];
    const out = [];
    let totalSubagentMb = 0, orphanMcp = 0, headlessBrowser = 0, totalAnomalies = 0;
    for(const t of snap.tools||[]) {
      for(const p of t.processes||[]) {
        const memMb = parseFloat(p.mem_mb) || 0;
        const ptype = (p.process_type||'').toLowerCase();
        if(ptype === 'subagent' || ptype === 'agent') totalSubagentMb += memMb;
        if(ptype === 'mcp-server' && p.zombie_risk && p.zombie_risk !== 'none') orphanMcp++;
        if(ptype === 'browser' || (p.name||'').toLowerCase().includes('headless')) headlessBrowser++;
        if(p.anomalies && p.anomalies.length) totalAnomalies += p.anomalies.length;
      }
    }
    if(totalSubagentMb > 2048) out.push({level:'red', msg:`Subagent memory: ${fmtSz(totalSubagentMb*1048576)} (>2GB) — consider cleanup`});
    if(orphanMcp > 0) out.push({level:'orange', msg:`${orphanMcp} MCP server(s) with dead parent — may be orphaned`});
    if(headlessBrowser > 0) out.push({level:'yellow', msg:`${headlessBrowser} headless browser process(es) detected — check for leaks`});
    if(totalAnomalies > 5) out.push({level:'orange', msg:`${totalAnomalies} process anomalies detected`});
    return out;
  },[snap]);

  return html`<${SnapContext.Provider} value=${ctxValue}>
    <div class="main-wrap">
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <header role="banner">
        <h1>aictl <span>live dashboard</span></h1>
        <div class="hdr-right">
          <input type="text" ref=${searchRef} class="search-box" placeholder="Filter... ( / )"
            aria-label="Filter tools" value=${searchQuery} onInput=${e=>dispatch({ type: 'SET_SEARCH', payload: e.target.value })}/>
          <button class="theme-btn" onClick=${cycleTheme} aria-label="Toggle theme: ${theme}"
            title="Theme: ${theme}">${THEME_ICONS[theme]}</button>
          ${otelActive && html`<span class="conn ok" title="OTel receiver active — Claude Code pushing telemetry">OTel</span>`}
          <span class=${'conn '+(connected?'ok':'err')} role="status" aria-live="polite">${connected?'live':'reconnecting...'}<span class="sr-only">${connected?' — connected to server':' — connection lost, attempting to reconnect'}</span></span>
        </div>
      </header>
      ${alerts.length > 0 && html`<div class="alert-banner" role="alert">
        ${alerts.map((a,i) => html`<div key=${i} class="alert-item" style="color:var(--${a.level})">
          \u26A0 ${a.msg}
        </div>`)}
      </div>`}
      <${RangeBar} globalRange=${globalRange} onPreset=${handlePreset} onApplyCustom=${handleCustomRange}/>
      <main class="main">
        <nav class="tab-nav" role="tablist" aria-label="Dashboard tabs">
          ${TABS.map(t=>html`<button key=${t.id} class="tab-btn" role="tab"
            aria-selected=${activeTab===t.id} onClick=${()=>handleTabChange(t.id)}
            title="Shortcut: ${t.key}">${t.icon ? t.icon+' ' : ''}${t.label}</button>`)}
        </nav>
        <${ToolFilterBar} snap=${snap} enabledTools=${enabledTools}
          onToggle=${handleToolToggle} onSetAll=${handleToolSetAll}/>
        <div id="main-content" role="tabpanel" aria-label=${TABS.find(t=>t.id===activeTab)?.label}>
          ${TAB_RENDERERS[activeTab] ? TAB_RENDERERS[activeTab]() : html`<p class="text-muted">Unknown tab "${activeTab}"</p>`}
        </div>
      </main>
    </div>
    <${FileViewer} path=${viewerPath} onClose=${()=>dispatch({ type: 'SET_VIEWER', payload: null })}/>
    <${DatapointTooltip}/>
  </${SnapContext.Provider}>`;
}
