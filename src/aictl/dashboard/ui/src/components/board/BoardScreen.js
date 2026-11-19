// ─── BoardScreen — the default screen: shell, sections, panels, drawer ─
import { html } from 'htm/preact';
import { loadChunk } from './lazy.js';

// The daemon answers 503 while it collects its first snapshot after a start; the board polls again.
export const STARTING = 'aictl is starting: it is collecting its first snapshot. The board fills in when it is ready.';
import { memo } from 'preact/compat';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import * as api from '../../api.js';
import { useTheme } from '../../hooks/useTheme.js';
import { nextTools, useBoardFilters } from '../../hooks/useBoardFilters.js';
import { boardNodeScope, mergeSearch, writeUrl } from '../../hooks/urlState.js';
import { focusTrap } from '../../utils/a11y.js';
import { listedTools, toolFilterLabel, canClear, clearedFilters, RANGES, STATUSES, windowOf, boardQuery } from './filters.js';
import { buildFindings, buildSettings } from './findings.js';
import CommandPalette, { ShortcutsDialog, boardCommands, loadRecent, pushRecent, saveRecent } from './CommandPalette.js';
import { colorFor, projectName, stamp } from './format.js';
import { Ico, PATHS } from './icons.js';
import {
  DEFAULT_LAYOUT, TITLES, findPanel, freshUi, isDefaultLayout, loadUi, moveSection, movePanel, saveUi, stepPanel, updatePanel,
} from './layout.js';
import Panel, { Stats } from './Panel.js';
import { buildPanel, reportingNode } from './panels.js';
import Table from './Table.js';
import { kpiList, sectionSummary, streamPill } from './summary.js';
import { bindTip } from './tip.js';
import { useBoardData } from './useBoardData.js';
import { useBoardHealth } from './useBoardHealth.js';
import { HealthOverview, healthSources, healthStatus } from './health.js';
import BoardRange from './BoardRange.js';
import { NodeScopePicker, scopeLabel, useNodeView } from './NodeScope.js';
import { nodeActivity, overlayReportedAgents, useNodeRuntime } from './nodeRuntime.js';
import { LiveProvider } from '../../live/context.js';
import LiveStatus from '../../live/Status.js';
import { historyFailure, historyReady, topicData } from '../../live/model.js';
import { isStoredToolSelected } from '../../utils/toolScope.js';
import { settingsSummary, snapOf, toolEntries } from '../settings/model.js';
import './board.css';

const SECTIONS = DEFAULT_LAYOUT.map(s => ({ id: s.id, title: s.title, anchor: s.anchor }));
const SEC_BY_ID = Object.fromEntries(SECTIONS.map(s => [s.id, s]));

// The board's own screens, in the `screen` query value. The board screen has none.
const SCREENS = new Set(['board', 'settings', 'health']);
export function readScreen(search) {
  const v = new URLSearchParams(search || '').get('screen');
  return SCREENS.has(v) ? v : 'board';
}
// The settings are read again once the board's data is this much newer.
// The settings are read again when the board says they changed (settings_at); without that word, this often.
const SETTINGS_REFRESH_S = 300;
const SETTINGS_NOTE = 'Settings are the current values on this machine; the time range does not apply';

/** "12 set · 2 risky · 3 agents" for the rail, under the Tool filter. */
function settingsLine(res, tools) {
  const d = res.data;
  if (!d) return res.error ? 'Could not read the settings' : '…';
  const snap = snapOf({ toolConfigs: d.tool_configs || [], tools: d.tools || [], monitor: d.monitor || {}, enabledTools: tools });
  const n = settingsSummary(toolEntries(snap));
  return n.set + ' set · ' + n.risky + ' risky · ' + n.agents + ' agents';
}

function useResolvedTheme(theme) {
  const [dark, setDark] = useState(() => {
    try { return matchMedia('(prefers-color-scheme: dark)').matches; } catch { return true; }
  });
  useEffect(() => {
    let mq = null;
    try { mq = matchMedia('(prefers-color-scheme: dark)'); } catch { return undefined; }
    const on = e => setDark(e.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  return dark ? 'dark' : 'light';
}

const Check = ({ on }) => html`<span class=${'bd-check' + (on ? ' bd-on' : '')}>${on ? html`<${Ico} d=${PATHS.check}/>` : null}</span>`;

function HealthCollectionDetails({ ctx }) {
  const [folded, setFolded] = useState({});
  const local = { folded, setFold: (key, on) => setFolded(value => ({ ...value, [key]: on })) };
  return html`<details class="bd-healthdetails" id="health-source-details">
    <summary>Collection details <span>Sources, collectors, ingesters and data quality</span></summary>
    <div class="bd-healthcollectiondetails">${['self', 'sources', 'collectors', 'quality'].map(id => {
      const body = buildPanel(id, ctx, local, {});
      return html`<section key=${id} id=${'p-' + id} aria-label=${TITLES[id]}>
        <h2>${TITLES[id]}</h2>
        ${body.banner ? html`<div class="bd-pbanner" role="alert">${body.banner}</div>` : null}
        ${body.stats ? html`<${Stats} stats=${body.stats}/>` : null}
        ${body.table ? html`<${Table} def=${body.table} label=${TITLES[id]}/>` : null}
      </section>`;
    })}</div>
  </details>`;
}

// Rail, TopBar and FilterRow are memo components: their props keep their identity
// while only `busy` changes. The range summary is a prop so the rail follows it.
const Rail = memo(({ ui, data, series, loaded, findingsCount, attention, screen, settingsSum, healthSum, rangeSum, act }) => {
  const mini = ui.railMini;
  const railLabel = mini ? 'Show section names' : 'Hide section names';
  const items = [{ id: 'top', label: 'Overview', anchor: 'sec-top', sum: rangeSum, icon: PATHS.top }].concat(ui.layout.filter(sec => sec.id !== 'health').map(sec => ({
    id: sec.id, label: SEC_BY_ID[sec.id].title, anchor: SEC_BY_ID[sec.id].anchor, sum: !loaded && !['agents', 'sessions'].includes(sec.id) ? '' : sectionSummary(sec.id, data, series, findingsCount), icon: PATHS[sec.id],
  })));
  return html`<aside class=${'bd-rail' + (mini ? ' bd-mini' : '')} aria-label="Sections">
    <div class="bd-brandrow">
      <span class="bd-brand-t">aictl</span>
      <button type="button" class="bd-ib-btn" aria-label=${railLabel} title=${railLabel} onClick=${act.toggleRail}><${Ico} d=${PATHS.menu}/></button>
    </div>
    <nav aria-label="Sections of this screen" class="bd-railnav">
      <a class="bd-navi" href=${mergeSearch(window.location.search, { screen: 'health' })} aria-current=${screen === 'health' ? 'page' : undefined}
        title="Live collection, ingestion, store capacity and requests" onClick=${e => { e.preventDefault(); act.setScreen('health'); }}>
        <${Ico} d=${PATHS.health}/><span class="bd-rl"><b>aictl Health</b><span>${healthSum}</span></span>
      </a>
      ${items.map(it => html`<a key=${it.id} class=${'bd-navi' + (it.id === 'agents' && attention ? ' bd-alert' : '')} href=${mergeSearch(window.location.search, { screen: null }) + '#' + it.anchor} title=${it.sum ? it.label + ': ' + it.sum : it.label} onClick=${e => act.openSection(it.id, e, it.anchor)}>
        <${Ico} d=${it.icon}/><span class="bd-rl"><b>${it.label}</b>${it.sum && html`<span>${it.sum}</span>`}</span>
      </a>`)}
      <a key="settings" class="bd-navi" href=${mergeSearch(window.location.search, { screen: 'settings' })} aria-current=${screen === 'settings' ? 'page' : undefined}
        title=${'Settings: ' + settingsSum} onClick=${(e) => { e.preventDefault(); act.setScreen('settings'); }}>
        <${Ico} d=${PATHS.settings}/><span class="bd-rl"><b>Settings</b><span>${settingsSum}</span></span>
      </a>
    </nav>
    <span class="bd-spacer"></span>
    <div class="bd-railfoot bd-rl">Layout and options stay when you reload.</div>
  </aside>`;
});

const TopBar = memo(({ f, board, menu, ui, resolvedTheme, setTheme, live, act, screen, picker }) => {
  const { filters } = board;
  const hiddenPanels = ui.hidden;
  const changed = !isDefaultLayout(ui);
  const customOpen = menu === 'custom';
  const liveTitle = live ? 'Updates every 5 s. Click to pause.' : 'Click to resume live updates';
  return html`<div class="bd-bar" role="region" aria-label=${screen === 'health' ? 'Health controls' : 'Time and layout'}>
    ${picker}
    ${screen !== 'health' && html`<${BoardRange} range=${filters.range} open=${customOpen} onToggle=${() => act.toggleMenu('custom')}
      onRange=${act.setRange} onCustom=${act.setCustom} onClose=${act.closeMenu}/>`}
    <button type="button" class="bd-ctl" aria-pressed=${live ? 'true' : 'false'} onClick=${act.toggleLive} title=${liveTitle}><i class=${'bd-live' + (live ? '' : ' bd-off')}></i>${live ? 'Live' : 'Paused'}</button>
    ${screen !== 'health' ? html`<label class="bd-srch"><${Ico} d=${PATHS.search}/><input id="bd-find" aria-label="Find agents, prompts, files and tools" placeholder="Find agent, prompt, file, tool" value=${f.q} onInput=${e => act.setFind(e.target.value)}/></label>` : null}
    <button type="button" class="bd-ctl" aria-label="Open the command palette" title="Command palette (Cmd/Ctrl+K). Press ? for the keyboard shortcuts." onClick=${act.openPalette}><${Ico} d=${PATHS.command}/>Commands</button>
    <span class="bd-sp"></span>
    ${screen !== 'health' ? html`<div class="bd-anch">
      <button type="button" class="bd-ctl" aria-expanded=${menu === 'layout' ? 'true' : 'false'} onClick=${() => act.toggleMenu('layout')}><${Ico} d=${PATHS.layout}/><span class="bd-k">Layout</span>${changed ? 'Changed' : 'Default'}</button>
      ${menu === 'layout' ? html`<div class="bd-menu" style="right:0;top:32px">
        <button type="button" class="bd-mi" onClick=${() => act.foldAll(false)}>Fold all sections</button>
        <button type="button" class="bd-mi" onClick=${() => act.foldAll(true)}>Unfold all sections</button>
        <button type="button" class="bd-mi" onClick=${act.resetLayout}>Reset to the default layout</button>
        <div class="bd-mdiv"></div>
        <h4>Hidden panels (${hiddenPanels.length})</h4>
        ${hiddenPanels.map(id => html`<button key=${id} type="button" class="bd-mi" onClick=${() => act.show(id)}>Show ${TITLES[id]}</button>`)}
        ${hiddenPanels.length ? null : html`<div class="bd-mi bd-muted">None. Use the panel menu to hide one.</div>`}
      </div>` : null}
    </div>` : null}
    <div class="bd-anch">
      <button type="button" class="bd-ctl" aria-expanded=${menu === 'display' ? 'true' : 'false'} onClick=${() => act.toggleMenu('display')}><span class="bd-k">Display</span>${(resolvedTheme === 'dark' ? 'Dark' : 'Light') + ', ' + ui.density}</button>
      ${menu === 'display' ? html`<div class="bd-menu" style="right:0;top:32px">
        <h4>Theme</h4>
        ${[['dark', 'Dark'], ['light', 'Light']].map(([id, label]) => html`<button key=${id} type="button" class="bd-mi" aria-pressed=${resolvedTheme === id ? 'true' : 'false'} onClick=${() => { setTheme(id); act.closeMenu(); }}><${Check} on=${resolvedTheme === id}/>${label}</button>`)}
        <h4>Row height</h4>
        ${[['compact', 'Compact'], ['comfortable', 'Comfortable']].map(([id, label]) => html`<button key=${id} type="button" class="bd-mi" aria-pressed=${ui.density === id ? 'true' : 'false'} onClick=${() => act.setDensity(id)}><${Check} on=${ui.density === id}/>${label}</button>`)}
      </div>` : null}
    </div>
  </div>`;
});

const agentsLabel = n => (n == null ? '' : n + ' agents');

function FilterMenu({ fkey, label, value, active, menu, items, act }) {
  const open = menu === fkey;
  return html`<div class="bd-anch">
    <button type="button" class=${'bd-ctl' + (active ? ' bd-on' : '')} aria-expanded=${open ? 'true' : 'false'} onClick=${() => act.toggleMenu(fkey)}><span class="bd-k">${label}</span>${value}<${Ico} d=${PATHS.down}/></button>
    ${open ? html`<div class="bd-menu" style="left:0;top:32px">
      ${items.map(m => html`<button key=${m.id} type="button" class="bd-mi" title=${m.title} aria-pressed=${m.on ? 'true' : 'false'} onClick=${m.pick}><${Check} on=${m.on}/>${m.sw ? html`<i class="bd-sw" style=${{ background: m.sw }}></i>` : null}${m.label}<span class="bd-ct">${m.count}</span></button>`)}
    </div>` : null}
  </div>`;
}

const FilterRow = memo(({ board, data, ctx, menu, act, subscription, loaded, screen }) => {
  const { filters, tools } = board;
  const opts = data.options;
  const toolIds = opts.tools.map(t => t.id);
  const toolValue = toolFilterLabel(tools, toolIds, ctx.toolName);
  const allAgents = data.scope.all_agents;
  const statusCounts = {};
  if (filters.status === 'all') {
    for (const a of data.agents) if (!a.parent_id) {
      const state = a.running === true && a.status === 'unknown' ? 'running' : a.status;
      statusCounts[state] = (statusCounts[state] || 0) + 1;
    }
    statusCounts.active = (statusCounts.running || 0) + (statusCounts.looping || 0) + (statusCounts.waiting || 0) + (statusCounts.idle || 0);
  }
  const selValue = filters.sel ? stamp(filters.sel.since, true) + ' to ' + stamp(filters.sel.until, true) : '';
  const clearable = canClear(filters, tools);
  const shown = data.scope.shown_agents;
  const queryable = loaded && (subscription?.mode !== 'incremental' || historyReady(subscription));
  const runtimeOnly = data.agents.filter(agent => agent.runtime_present && agent.queryable === false).length;
  const scope = (screen !== 'board' ? 'Historical activity is shown on Overview' : queryable ? (shown === allAgents ? 'Showing all ' + allAgents + ' recorded agents in this time' : 'Showing ' + shown + ' of ' + allAgents + ' recorded agents in this time') : historyFailure(subscription) ? 'Queryable history is unavailable' : 'Queryable history is not ready')
    + (runtimeOnly ? ' · ' + runtimeOnly + ' live runtime ' + (runtimeOnly === 1 ? 'agent' : 'agents') + ' not yet in this history' : '');
  // Tool calls, tests and errors belong to a session, not to one model or project.
  const narrowed = filters.model !== 'all' || filters.project !== 'all';
  const scopeNote = narrowed ? ' Tokens and cost follow this filter. Tool calls, tests and errors count the whole session.' : '';
  return html`<div class="bd-bar" role="region" aria-label="Filters">
    <${FilterMenu} fkey="tools" label="Tool" value=${toolValue} active=${!!listedTools(tools, toolIds)} menu=${menu} act=${act}
      items=${opts.tools.map(t => ({ id: t.id, label: t.label || t.id, sw: colorFor('tool', t.id), on: !tools || tools.includes(t.id), count: agentsLabel(t.agents), pick: () => act.toggleTool(t.id, toolIds) }))}/>
    <${FilterMenu} fkey="project" label="Project" value=${filters.project === 'all' ? 'All' : projectName(filters.project)} active=${filters.project !== 'all'} menu=${menu} act=${act}
      items=${[{ id: 'all', label: 'All projects', on: filters.project === 'all', count: agentsLabel(allAgents), pick: () => act.setFilter('project', 'all') }].concat(opts.projects.map(p => ({ id: p.id, label: projectName(p.id), title: p.id, sw: colorFor('project', p.id), on: filters.project === p.id, count: agentsLabel(p.agents), pick: () => act.setFilter('project', p.id) })))}/>
    <${FilterMenu} fkey="model" label="Model" value=${filters.model === 'all' ? 'All' : filters.model} active=${filters.model !== 'all'} menu=${menu} act=${act}
      items=${[{ id: 'all', label: 'All models', on: filters.model === 'all', count: agentsLabel(allAgents), pick: () => act.setFilter('model', 'all') }].concat(opts.models.map(p => ({ id: p.id, label: p.id, sw: colorFor('model', p.id), on: filters.model === p.id, count: agentsLabel(p.agents), pick: () => act.setFilter('model', p.id) })))}/>
    <${FilterMenu} fkey="status" label="Status" value=${(STATUSES.find(s => s[0] === filters.status) || [0, 'All'])[1]} active=${filters.status !== 'all'} menu=${menu} act=${act}
      items=${STATUSES.map(([id, label]) => ({ id, label, on: filters.status === id, count: filters.status === 'all' && id !== 'all' ? (statusCounts[id] || 0) : '', pick: () => act.setFilter('status', id) }))}/>
    ${filters.sel ? html`<span class="bd-chip">Time selected: ${selValue}<button type="button" aria-label="Clear the time selection" onClick=${() => act.select(null)}><${Ico} d=${PATHS.close}/></button></span>` : null}
    <span class="bd-sp"></span>
    <span class="bd-muted">${scope}${scopeNote}</span>
    ${clearable ? html`<button type="button" class="bd-link" onClick=${act.clearAll}>Clear filters</button>` : null}
  </div>`;
});

function Kpis({ data, pill }) {
  const list = useMemo(() => kpiList(data), [data]);
  return html`<div class="bd-kpis" id="sec-top">${pill ? html`<div class=${'bd-kpipill bd-' + pill.sev} role="status" title=${pill.title}><${Ico} d=${PATHS.warn}/>${pill.text}</div>` : null}${list.map(k => html`<a key=${k.label} class="bd-kpi" href=${k.href} title=${k.title}>
    <span class="bd-l">${k.label}</span>
    <span class="bd-v">${k.value}</span>
    <span class="bd-d"><span>${k.delta}</span><svg viewBox="0 0 54 16" preserveAspectRatio="none" aria-hidden="true"><path d=${k.spark}></path></svg></span>
  </a>`)}</div>`;
}

/** The Settings screen in the board's main area: the workspace once its code and data are here. */
function SettingsArea({ Workspace, res, source }) {
  if (res.error && !res.data) {
    return html`<div class="bd-banner" role="alert"><${Ico} d=${PATHS.warn}/>${res.error.status === 503 ? STARTING : 'Could not read the settings: ' + (res.error.message || String(res.error)) + '.'}</div>`;
  }
  if (!Workspace || !source) return html`<div class="bd-sk" role="status">Loading the settings...</div>`;
  return html`${res.error ? html`<div class="bd-banner" role="alert"><${Ico} d=${PATHS.warn}/>Could not update the settings: ${res.error.message || String(res.error)}. Showing the last values.</div>` : null}
    <${Workspace} source=${source} note=${source.readonly ? 'Reported settings for the selected nodes; the time range does not apply' : SETTINGS_NOTE}/>`;
}

function Modal({ modal, onCancel }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const before = document.activeElement;
    el.querySelector('button')?.focus();
    const release = focusTrap(el);
    return () => { release(); before?.focus?.(); };
  }, []);
  const apply = async () => {
    setBusy(true);
    try { await modal.apply(); } finally { setBusy(false); }
  };
  return html`<div class="bd-modalw" role="dialog" aria-modal="true" aria-label=${modal.title}>
    <div class="bd-modal" ref=${ref}>
      <h2>${modal.title}</h2>
      <p>${modal.lead}</p>
      <pre>${modal.command}</pre>
      <div class="bd-acts"><button type="button" class="bd-btn" onClick=${onCancel}>Cancel</button><button type="button" class="bd-btn bd-p" disabled=${busy} onClick=${apply}>${modal.applyLabel}</button></div>
    </div>
  </div>`;
}

/** When the code on disk changed after the daemon started, or null (see aictl.code_age). */
export function staleCode(data) {
  const self = data?.machine?.pipeline?.self;
  return self && typeof self.code_changed_at === 'number' ? self.code_changed_at : null;
}

export default function BoardScreen({ liveController }) {
  const [search, setSearch] = useState(() => window.location.search);
  const { theme, setTheme } = useTheme();
  const resolvedTheme = useResolvedTheme(theme);
  useEffect(() => {
    const onPop = () => setSearch(window.location.search);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const navigate = useCallback(patch => {
    const next = mergeSearch(window.location.search, patch);
    writeUrl(patch, { push: true });
    setSearch(next);
  }, []);
  const scope = boardNodeScope(search);
  const screen = readScreen(search);
  const nodeId = scope === 'node' ? (new URLSearchParams(search).get('node_id') || '').trim().toLowerCase() : null;
  const [visited, setVisited] = useState([]);
  useEffect(() => {
    if (nodeId) setVisited(ids => ids.includes(nodeId) ? ids : [nodeId, ...ids].slice(0, 20));
  }, [nodeId]);
  const picker = html`<${NodeScopePicker} scope=${scope} nodeId=${nodeId} visited=${visited} onSelect=${(s, id) => navigate({
    scope: s === 'local' ? null : s, node_id: s === 'node' ? id : null,
    ...CLEAR_DRAWER, row: null, session_id: null, session: null,
  })}/>`;
  const content = html`<${BoardContent}
    ...${{ screen, picker, navigate, resolvedTheme, setTheme, nodeScope: scope, nodeId, scopeName: scopeLabel(scope, nodeId) }}/>`;
  return html`<${LiveProvider} controller=${liveController} enabled=${scope === 'local'}>${content}<//>`;
}

const CLEAR_DRAWER = { agent: null, tab: null, show: null, detail: null, record: null, detail_ts: null, detail_session: null };
function readDrawer() {
  const q = new URLSearchParams(window.location.search);
  if (q.get('tab') === 'hidden') return [{ type: 'hidden' }];
  const id = q.get('agent');
  if (id) return [{ type: 'agent', id, tab: q.get('tab') || 'flow', initialPrompts: q.get('show') === 'prompts', initialSkills: q.get('show') === 'skills' }];
  const type = q.get('detail'), record = q.get('record');
  if (type === 'file' && record) return [{ type, path: record, record: q.get('detail_session') }];
  if (type === 'tool' || type === 'skill') return record ? [{ type, name: record }] : [];
  if (type === 'error') return record ? [{ type, key: record }] : [];
  if (type === 'prompt' && record) return [{ type, session_id: record, ts: Number(q.get('detail_ts')) }];
  return [];
}

function drawerParams(d) {
  if (!d) return CLEAR_DRAWER;
  if (d.type === 'agent') return { ...CLEAR_DRAWER, agent: d.id, tab: d.tab, show: d.initialSkills ? 'skills' : d.initialPrompts ? 'prompts' : null };
  if (d.type === 'hidden') return { ...CLEAR_DRAWER, tab: 'hidden' };
  return { ...CLEAR_DRAWER, detail: d.type, record: d.path ?? d.name ?? d.key ?? d.session_id,
    detail_ts: d.ts, detail_session: d.record };
}

function BoardContent({ screen, picker, navigate, resolvedTheme, setTheme, nodeScope = 'local', nodeId = null, scopeName }) {
  const remote = nodeScope !== 'local';
  const board = useBoardFilters();
  const { filters, applied, tools, update, setFind } = board;
  const [ui, setUi] = useState(() => loadUi());
  const [live, setLive] = useState(true);
  const [menu, setMenu] = useState(null);
  const [drawer, setDrawer] = useState(readDrawer);
  useEffect(() => {
    setDrawer(readDrawer());
    setModal(null);
    setMenu(null);
    setPalette(false);
    setShortcuts(false);
  }, [nodeScope, nodeId]);
  useEffect(() => {
    const onPop = () => setDrawer(window.history.state?.boardDrawers || readDrawer());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const [DrawerC, setDrawerC] = useState(null);
  const [SettingsC, setSettingsC] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [over, setOver] = useState(null);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [stopped, setStopped] = useState({});
  const [palette, setPalette] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [recent, setRecent] = useState(() => loadRecent());
  const pausedRef = useRef(false);
  pausedRef.current = !!dragId;

  const { data, chartSeries, chartRange, loaded, busy, error, refresh, connected, everConnected, subscription, analyticsError } = useBoardData({
    filters: applied, tools, live, pausedRef, enabled: remote ? screen === 'board' : screen !== 'health', history: screen === 'board',
    scope: nodeScope, nodeId,
    requiredTopics: screen === 'health' ? ['runtime.health'] : screen === 'settings' ? ['configuration.file'] : ['history.board', 'runtime.machine'],
  });
  const incremental = subscription.mode === 'incremental';
  const landOnFlow = useRef(!window.location.search && !window.location.hash);
  useEffect(() => {
    if (!landOnFlow.current) return;
    if (screen !== 'board' || drawer.length) { landOnFlow.current = false; return; }
    if (!loaded) return;
    const sessions = data.agents.filter(a => a.id && !a.parent_id && !a.placeholder && a.queryable !== false);
    const selected = sessions.find(a => a.status === 'running') || sessions[0];
    if (selected) {
      landOnFlow.current = false;
      setDrawer(current => current.length ? current : [{ type: 'agent', id: selected.id, tab: 'flow' }]);
    }
  }, [screen, drawer.length, loaded, data.agents]);
  const configured = topicData(subscription, 'configuration.file', 'current');
  const loadedConfiguration = subscription.topics?.get('configuration.loaded');
  const runtimeConfiguration = useMemo(() => [...(loadedConfiguration?.values() || [])]
    .map(entity => ({ id: entity.id, ...entity.data }))
    .filter(record => isStoredToolSelected(record.tool, tools)), [loadedConfiguration, tools]);
  const health = useBoardHealth({ enabled: screen === 'health', live, scope: nodeScope, nodeId });
  const { data: identity } = useNodeView({ view: 'identity', scope: 'local', enabled: !remote && screen !== 'health' });
  const runtimeReport = useNodeRuntime(nodeScope, nodeId, live, screen !== 'health');
  const localHost = !remote ? (screen === 'health' ? health.data?.resources?.host : topicData(subscription, 'runtime.health', 'local')?.resources?.host) : null;
  const activityReport = screen === 'health' ? health.data?.node_report : runtimeReport?.data;
  const activityClock = live ? Math.floor(Date.now() / 5000) * 5 : activityReport?.generated_at ?? health.data?.generated_at;
  const activity = useMemo(() => nodeActivity(activityReport, localHost, activityClock ?? Date.now() / 1000),
    [activityReport, localHost, activityClock]);
  const boardData = useMemo(() => ({
    ...data, history_ready: loaded, live_activity: activity, runtime_error: runtimeReport?.error || null,
    ...(remote ? { agents: overlayReportedAgents(data.agents, activity, applied, tools) } : {}),
  }), [data, loaded, activity, remote, applied, tools, runtimeReport]);
  const healthState = useMemo(() => healthStatus(health.data, health.error, health.nowS), [health.data, health.error, health.nowS]);
  const pill = streamPill({ live, connected, everConnected, ageS: data.machine?.pipeline?.stream?.snapshot_age_s });

  // Layout is stored shortly after the last change, so a drag writes once.
  useEffect(() => {
    const t = setTimeout(() => saveUi(ui), 120);
    return () => clearTimeout(t);
  }, [ui]);

  // Time from data arrival to the frame that shows it, for the budget check.
  useEffect(() => {
    if (!loaded) return undefined;
    const r = requestAnimationFrame(() => {
      try {
        performance.measure('board-apply', 'board-data');
        performance.clearMarks('board-data');
      } catch { /* no data mark, or no timing api */ }
    });
    return () => cancelAnimationFrame(r);
  }, [data, loaded]);

  // Hidden findings: the existing audit routes, after the first paint of the board.
  const [settingsRaw, setSettingsRaw] = useState({ loading: true });
  const lifetime = useMemo(() => new AbortController(), []);
  useEffect(() => () => lifetime.abort(), [lifetime]);
  // The scan follows the Project filter. A later scan replaces an answer still on its way.
  const scanProject = applied.project === 'all' ? null : applied.project;
  const scanController = useRef(null);
  useEffect(() => () => scanController.current?.abort(), []);
  const loadFindings = useCallback((fresh) => {
    if (remote || lifetime.signal.aborted) return;
    scanController.current?.abort();
    if (incremental && !fresh) { setSettingsRaw(s => ({ ...s, loading: false })); return; }
    const ctrl = new AbortController();
    scanController.current = ctrl;
    const current = () => !ctrl.signal.aborted;
    const opts = { signal: ctrl.signal };
    // Each answer shows when it arrives, so a slow scan holds up nothing else.
    const put = (key, promise) => promise.then(
      value => { if (current()) setSettingsRaw(s => ({ ...s, [key]: value })); },
      () => { if (current()) setSettingsRaw(s => ({ ...s, [key]: null })); },
    );
    setSettingsRaw(s => ({ ...s, loading: true, error: null }));
    if (!incremental) put('effective', api.getEffectiveModels(opts));
    put('hooks', api.getHooksStatus(opts));
    put('otel', api.getOtelStatus(opts));
    api.getContextAudit(fresh, scan => { if (current()) setSettingsRaw(s => ({ ...s, scan })); }, { project: scanProject, ...opts }).then(
      audit => { if (current()) setSettingsRaw(s => ({ ...s, audit, scan: null, loading: false })); },
      e => { if (current()) setSettingsRaw(s => ({ ...s, audit: null, scan: null, loading: false, error: e?.message })); },
    );
  }, [scanProject, incremental, lifetime, remote]);
  // The findings and the settings wait for an idle moment after the board's first data.
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if (!loaded || idle) return undefined;
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(() => setIdle(true), { timeout: 3000 });
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(() => setIdle(true), 1500);
    return () => clearTimeout(t);
  }, [loaded, idle]);
  useEffect(() => { if (idle) loadFindings(false); }, [idle, loadFindings]);
  useEffect(() => { if (remote) scanController.current?.abort(); }, [remote]);

  // Every tool's settings, for the Settings screen and its rail line. Read at the idle
  // moment after the board's first data, or at once when the screen opens first, again as soon
  // as the board reports a change in them (settings_at), and otherwise once the board's data is
  // SETTINGS_REFRESH_S newer. The last answer stays on screen meanwhile.
  const [settingsRes, setSettingsRes] = useState({ data: null, error: null });
  const settingsAt = useRef(undefined);
  const settingsVersion = useRef(undefined);
  const settingsWanted = !remote && (idle || screen === 'settings');
  const boardAt = data.generated_at || 0;
  const changedAt = data.settings_at || 0;
  const loadSettings = useCallback(() => {
    if (remote) return Promise.resolve();
    if (incremental && !configured) return Promise.resolve();
    if (lifetime.signal.aborted) return Promise.resolve();
    const request = incremental ? Promise.resolve(configured) : api.getSettingsTools({ signal: lifetime.signal });
    return request.then(
    d => { if (!lifetime.signal.aborted) setSettingsRes({ data: d || {}, error: null }); },
    (e) => { if (!lifetime.signal.aborted) setSettingsRes(s => ({ ...s, error: e })); },
    );
  }, [incremental, configured, lifetime, remote]);
  useEffect(() => {
    if (incremental && settingsWanted && configured) loadSettings();
  }, [incremental, settingsWanted, configured, loadSettings]);
  useEffect(() => {
    if (!settingsWanted || incremental || subscription.mode === 'pending') return;
    const last = settingsAt.current;
    const changed = settingsVersion.current !== undefined && changedAt !== settingsVersion.current;
    settingsVersion.current = changedAt;
    if (last !== undefined && !changed) {
      // A read made before the board had data counts as made at the board's first data.
      if (!last) { settingsAt.current = boardAt; return; }
      if (boardAt - last <= SETTINGS_REFRESH_S) return;
    }
    settingsAt.current = boardAt;
    loadSettings();
  }, [settingsWanted, boardAt, changedAt, loadSettings, incremental, subscription.mode]);
  // The hook status for the Settings screen's Hooks sections, read once when the screen first opens.
  const [hooksStatus, setHooksStatus] = useState(null);
  const hooksAsked = useRef(false);
  useEffect(() => {
    if (remote || screen !== 'settings' || hooksAsked.current || subscription.mode === 'pending') return;
    hooksAsked.current = true;
    api.getHooksStatus({ signal: lifetime.signal }).then(
      (h) => { if (!lifetime.signal.aborted && h && typeof h === 'object') setHooksStatus(h); },
      () => {},
    );
  }, [screen, subscription.mode, lifetime, remote]);

  const toolIds = useMemo(() => data.options.tools.map(t => t.id), [data.options]);
  // Settings apply whether or not a tool ran in this time, so its data sources count too.
  const settingToolIds = useMemo(() => [...new Set([...toolIds, ...data.sources.map(s => s.tool)])], [toolIds, data.sources]);
  const toolLabels = useMemo(() => ({ ...(data.tool_labels || {}), ...Object.fromEntries(data.options.tools.map(t => [t.id, t.label || t.id])) }), [data.options, data.tool_labels]);
  const toolName = useCallback(id => toolLabels[id] || id || 'n/a', [toolLabels]);
  const findings = useMemo(() => {
    const raw = remote ? {} : settingsRaw;
    const list = buildFindings({ ...raw, tools });
    const { rows, note } = buildSettings({ ...raw, toolIds: settingToolIds });
    return { list, settings: rows, note, loading: !remote && raw.loading, error: raw.error, scan: raw.scan, audit: raw.audit, incomplete: raw.audit?.incomplete || [], failed: raw.audit?.failed_steps || [],
      unavailable: remote ? 'Settings files and local policy findings are available only on This node.' : null };
  }, [settingsRaw, tools, settingToolIds, remote]);

  // Latest values for handlers that keep one identity, so panels do not re-render for them.
  const latest = useRef({});
  latest.current = { ...latest.current, ui, filters, tools, menu, drawer, dragId, modal, over, screen, palette, shortcuts,
    remote, nodeId, nodeScope, loadFindings, refresh };

  const notice = useCallback((text, undo) => {
    clearTimeout(latest.current.toastTimer);
    setToast({ text, undo });
    latest.current.toastTimer = setTimeout(() => setToast(null), undo ? 6000 : 3500);
  }, []);

  const actRef = useRef(null);
  if (!actRef.current) {
    const L = latest;
    const patchUi = patch => setUi(u => ({ ...u, ...patch }));
    const closeMenu = () => setMenu(null);
    const a = {
      closeMenu,
      toggleMenu: (id) => {
        L.current.menuTrigger = document.activeElement;
        setMenu(m => (m === id ? null : id));
      },
      toggleRail: () => setUi(u => ({ ...u, railMini: !u.railMini })),
      toggleLive: () => setLive(v => !v),
      setDensity: density => { patchUi({ density }); closeMenu(); },
      setRange: id => update({ range: { id }, sel: null }),
      setCustom: (since, until) => update({ range: { id: 'custom', since, until }, sel: null }),
      setFilter: (k, v) => { update({ [k]: v }); closeMenu(); },
      toggleFilter: (k, v) => update({ [k]: L.current.filters[k] === v ? 'all' : v }),
      toggleTool: (id, all) => update({}, nextTools(L.current.tools, id, all)),
      setFind,
      select: (sel) => update({ sel }),
      clearAll: () => {
        const prev = L.current;
        update(clearedFilters(prev.filters), null);
        notice('Filters cleared', () => { update(prev.filters, prev.tools); setToast(null); });
      },
      rangeSummary: () => {
        const f = L.current.filters;
        if (f.sel) return 'Time selected';
        return (f.range.id === 'custom' ? 'Custom' : (RANGES.find(r => r.id === f.range.id) || RANGES[3]).label) + ' summary';
      },
      setScreen: (next) => {
        closeMenu();
        if (L.current.screen === next) return;
        L.current.screen = next;
        navigate({ screen: next === 'board' ? null : next });
        document.getElementById('main-area')?.scrollTo?.(0, 0);
      },
      openSection: (id, e, anchor) => {
        // From the Settings screen a section link goes back to the board, then to its place.
        if (L.current.screen !== 'board') {
          e?.preventDefault();
          a.setScreen('board');
          if (anchor) setTimeout(() => document.getElementById(anchor)?.scrollIntoView?.(), 0);
        }
        if (id === 'top') return;
        setUi(u => ({ ...u, layout: u.layout.map(s => (s.id === id ? { ...s, open: true } : s)) }));
      },
      toggleSection: id => setUi(u => ({ ...u, layout: u.layout.map(s => (s.id === id ? { ...s, open: !s.open } : s)) })),
      moveSection: (id, dir) => setUi(u => ({ ...u, layout: moveSection(u.layout, id, dir) })),
      foldAll: open => { setUi(u => ({ ...u, layout: u.layout.map(s => ({ ...s, open })) })); closeMenu(); },
      resetLayout: () => {
        const prev = L.current.ui;
        const fresh = freshUi();
        setUi(u => ({ ...u, layout: fresh.layout, hidden: [], hiddenCols: fresh.hiddenCols }));
        closeMenu();
        notice('Layout reset', () => { setUi(u => ({ ...u, layout: prev.layout, hidden: prev.hidden, hiddenCols: prev.hiddenCols })); setToast(null); });
      },
      show: id => { setUi(u => ({ ...u, hidden: u.hidden.filter(h => h !== id) })); closeMenu(); },
      hide: (id) => {
        setUi(u => ({ ...u, hidden: [...u.hidden, id] }));
        closeMenu();
        notice('Hid ' + TITLES[id], () => { setUi(u => ({ ...u, hidden: u.hidden.filter(h => h !== id) })); setToast(null); });
      },
      toggleFold: id => setUi((u) => {
        const f = findPanel(u.layout, id);
        return f ? { ...u, layout: updatePanel(u.layout, id, { open: !f.panel.open }) } : u;
      }),
      setSpan: (id, span) => setUi(u => ({ ...u, layout: updatePanel(u.layout, id, { span }) })),
      growBy: (id, dy) => setUi((u) => {
        const f = findPanel(u.layout, id);
        if (!f) return u;
        const node = document.querySelector('#p-' + id + ' .bd-pb');
        const cur = f.panel.h || (node ? node.offsetHeight : 200);
        return { ...u, layout: updatePanel(u.layout, id, { h: Math.max(70, cur + dy), h0: f.panel.h0 || cur }) };
      }),
      step: (id, dir) => { setUi(u => ({ ...u, layout: stepPanel(u.layout, id, dir) })); closeMenu(); },
      moveToSection: (id, secId) => { setUi(u => ({ ...u, layout: movePanel(u.layout, id, null, false, secId) })); closeMenu(); },
      sectionOf: id => findPanel(L.current.ui.layout, id)?.sec.id,
      toggleCol: (id, k) => setUi((u) => {
        const cur = u.hiddenCols[id] || {};
        return { ...u, hiddenCols: { ...u.hiddenCols, [id]: { ...cur, [k]: cur[k] ? 0 : 1 } } };
      }),
      dragStart: (e, id) => {
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', id); } catch { /* some browsers refuse */ }
        setDragId(id);
      },
      dragEnd: () => { setDragId(null); setOver(null); },
      dragOverPanel: (e, id) => {
        const drag = L.current.dragId;
        if (!drag) return;
        e.preventDefault();
        e.stopPropagation();
        const r = e.currentTarget.getBoundingClientRect();
        const after = e.clientX > r.left + r.width / 2;
        const cur = L.current.over;
        if (!cur || cur.id !== id || cur.after !== after) setOver({ id, after });
      },
      dropOnPanel: (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        const drag = L.current.dragId;
        if (!drag) return;
        const r = e.currentTarget.getBoundingClientRect();
        setUi(u => ({ ...u, layout: movePanel(u.layout, drag, id, e.clientX > r.left + r.width / 2) }));
        setDragId(null);
        setOver(null);
      },
      dropOnSection: (e, secId) => {
        e.preventDefault();
        const drag = L.current.dragId;
        if (!drag) return;
        setUi(u => ({ ...u, layout: movePanel(u.layout, drag, null, false, secId) }));
        setDragId(null);
        setOver(null);
      },
      startResize: (e, id, span) => {
        e.preventDefault();
        e.stopPropagation();
        const panel = e.currentTarget.closest('.bd-panel');
        const colW = (panel.parentElement.getBoundingClientRect().width + 8) / 12;
        const h0 = panel.querySelector('.bd-pb').offsetHeight;
        const x0 = e.clientX;
        const y0 = e.clientY;
        const start = findPanel(L.current.ui.layout, id).panel;
        const base = start.h0 || h0;
        const mv = (ev) => {
          const nx = Math.max(2, Math.min(12, Math.round(span + (ev.clientX - x0) / colW)));
          const dy = ev.clientY - y0;
          const nh = Math.abs(dy) < 8 ? start.h : Math.max(70, Math.round((h0 + dy) / 10) * 10);
          setUi((u) => {
            const f = findPanel(u.layout, id);
            if (!f || (f.panel.span === nx && f.panel.h === nh)) return u;
            return { ...u, layout: updatePanel(u.layout, id, { span: nx, h: nh, h0: nh ? base : undefined }) };
          });
        };
        const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', mv);
        window.addEventListener('mouseup', up);
      },
      openPalette: () => { closeMenu(); setShortcuts(false); setPalette(true); },
      runPaletteCommand: (cmd) => {
        setPalette(false);
        setRecent((r) => { const next = pushRecent(r, cmd.id); saveRecent(next); return next; });
        // After the palette has closed and given focus back.
        setTimeout(() => cmd.run(), 0);
      },
      jumpTo: (id) => {
        const sec = SEC_BY_ID[id];
        if (!sec) return;
        if (id === 'health') { a.setScreen('health'); return; }
        a.lastSection = id;
        const onBoard = L.current.screen === 'board';
        a.openSection(id, null, sec.anchor);
        if (onBoard) setTimeout(() => document.getElementById(sec.anchor)?.scrollIntoView?.({ block: 'start' }), 0);
      },
      stepSection: (dir) => {
        const order = L.current.ui.layout.filter(sec => sec.id !== 'health').map(sec => sec.id);
        const area = document.getElementById('main-area');
        const top = area ? area.getBoundingClientRect().top : 0;
        const tops = order.map(id => document.getElementById(SEC_BY_ID[id].anchor)?.getBoundingClientRect().top);
        // With no layout to measure (all sections at one place), the last section jumped to counts.
        const measured = tops.some(t => t !== tops[0]);
        const here = measured ? tops.reduce((best, t, k) => (t != null && t - top <= 8 ? k : best), -1) : order.indexOf(a.lastSection);
        const next = Math.max(0, Math.min(order.length - 1, here + dir));
        if (order[next]) a.jumpTo(order[next]);
      },
      settingsPivot: (pivot) => {
        a.setScreen('settings');
        writeUrl({ pivot: pivot === 'tool' ? null : pivot });
        // The Settings screen reads its pivot from the URL when the history moves.
        try { window.dispatchEvent(new PopStateEvent('popstate')); } catch { /* no PopStateEvent: the pivot applies on the next visit */ }
      },
      openDrawer: (d, reset) => {
        if (L.current.remote && d.type === 'hidden') { notice('Local findings are available only on This node.'); return; }
        if (L.current.remote && d.type === 'file' && !d.record) {
          const parent = L.current.drawer.at(-1);
          const node = L.current.nodeId || reportingNode(parent?.id || parent?.session_id || parent?.record);
          if (!node) { notice('Select a reporting node to inspect this file.'); return; }
          d = { ...d, record: JSON.stringify([node, d.path]) };
        }
        landOnFlow.current = false;
        const next = reset ? [d] : [...L.current.drawer, d];
        setDrawer(next);
        writeUrl(drawerParams(d), { push: true, state: { boardDrawers: next } });
        closeMenu();
      },
      setDrawerTab: tab => {
        const next = L.current.drawer.map((d, i, s) => i === s.length - 1 ? { ...d, tab: tab === 'evidence' ? 'flow' : tab, initialEvidence: tab === 'evidence', turnId: undefined, flowRef: undefined } : d);
        setDrawer(next);
        writeUrl(drawerParams(next.at(-1)), { state: { boardDrawers: next } });
      },
      drawerBack: () => {
        const next = L.current.drawer.slice(0, -1);
        setDrawer(next);
        writeUrl(drawerParams(next.at(-1)), { state: { boardDrawers: next } });
      },
      drawerClose: () => { setDrawer([]); writeUrl(CLEAR_DRAWER, { state: null }); },
      rescan: () => L.current.loadFindings(true),
      openFile: (path, line) => { if (path) a.openDrawer({ type: 'file', path, line: line > 0 ? line : undefined }); },
      copy: (text, done) => {
        try { navigator.clipboard?.writeText(text); notice(done); } catch { notice('Could not copy. ' + text); }
      },
      runCommand: spec => !L.current.remote && setModal({
        ...spec,
        apply: async () => {
          try {
            if (lifetime.signal.aborted || L.current.remote) return;
            await api.boardAction(spec.action, spec.args || {});
            if (lifetime.signal.aborted) return;
            setModal(null);
            notice(spec.done);
            L.current.loadFindings(true);
            L.current.refresh();
          } catch (e) {
            setModal(null);
            notice('Could not run this: ' + e.message);
          }
        },
      }),
      runFinding: (f) => {
        if (f.command) a.runCommand({ title: f.fix, lead: f.lead, command: f.command, applyLabel: 'Run this command', action: f.action, done: f.done });
        else if (f.path) a.openDrawer({ type: 'file', path: f.path, line: f.line }, true);
      },
      stopAgent: (ag) => !L.current.remote && setModal({
        title: 'Stop this agent?',
        lead: 'This stops ' + ag.title + ((ag.pids || []).length ? ' (processes ' + ag.pids.join(', ') + ')' : '') + '. Its files stay as they are, and the session can be resumed in its tool.',
        command: 'aictl session kill ' + ag.id,
        applyLabel: 'Stop agent',
        apply: async () => {
          try {
            if (lifetime.signal.aborted || L.current.remote) return;
            const r = await api.killSession(ag.id);
            if (lifetime.signal.aborted) return;
            setModal(null);
            setStopped(s => ({ ...s, [ag.id]: 1 }));
            const failed = (r.failed || []).length;
            notice('Stopped ' + ag.title + ': ' + (r.signaled || []).length + ' processes' + (failed ? ', ' + failed + ' could not be stopped' : ''));
            L.current.refresh();
          } catch (e) {
            setModal(null);
            notice('Could not stop this agent: ' + e.message);
          }
        },
      }),
    };
    actRef.current = a;
  }
  const act = actRef.current;

  // A closed menu gives focus back to the button that opened it.
  useEffect(() => {
    if (menu) return;
    const t = latest.current.menuTrigger;
    if (t && (document.activeElement === document.body || !document.activeElement) && t.isConnected) t.focus();
    latest.current.menuTrigger = null;
  }, [menu]);

  useEffect(() => {
    if (!drawer.length || DrawerC) return;
    loadChunk(() => import('./Drawer.js')).then(m => setDrawerC(() => m.default));
  }, [drawer.length, DrawerC]);

  useEffect(() => {
    if (screen !== 'settings' || SettingsC) return;
    loadChunk(() => import('../settings/SettingsWorkspace.js')).then(m => setSettingsC(() => m.default));
  }, [screen, SettingsC]);

  useEffect(() => {
    // Cmd/Ctrl+K and Esc work everywhere. The other keys do nothing while typing,
    // with a modifier held, or while a dialog is open.
    const onKey = (e) => {
      const typing = e.target && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable);
      const s = latest.current;
      if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setShortcuts(false);
        setMenu(null);
        setPalette(v => !v);
        return;
      }
      if (e.key === 'Escape') {
        if (s.palette) setPalette(false);
        else if (s.shortcuts) setShortcuts(false);
        else if (s.modal) setModal(null);
        else if (s.menu) setMenu(null);
        else if (s.drawer.length) act.drawerBack();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey || s.palette || s.shortcuts || s.modal) return;
      if (e.key === '/') {
        e.preventDefault();
        document.getElementById('bd-find')?.focus();
      } else if (e.key === '?') {
        e.preventDefault();
        setMenu(null);
        setShortcuts(true);
      } else if (/^[1-9]$/.test(e.key)) {
        const sec = s.ui.layout.filter(section => section.id !== 'health')[Number(e.key) - 1];
        if (sec) { e.preventDefault(); actRef.current.jumpTo(sec.id); }
      } else if (e.key === '[' || e.key === ']') {
        e.preventDefault();
        actRef.current.stepSection(e.key === ']' ? 1 : -1);
      } else if (e.key === 's') {
        e.preventDefault();
        actRef.current.setScreen('settings');
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const nowS = screen === 'health' ? health.nowS : data.generated_at || Date.now() / 1000;
  const viewData = useMemo(() => screen === 'health' ? {
    ...boardData, health: health.data, machine: health.data || data.machine,
    sources: health.data ? healthSources(health.data) : [],
  } : boardData, [screen, boardData, data.machine, health.data]);
  const query = useMemo(() => {
    const win = applied.sel || (data.range?.until > data.range?.since ? data.range : windowOf(applied.range));
    return boardQuery(applied, tools, { since: Math.floor(win.since), until: Math.floor(win.until), buckets: win.bucket_starts?.length || win.buckets });
  }, [applied, tools, data.range]);

  const ctx = useMemo(() => ({
    data: viewData, series: chartSeries, range: chartRange, chartRange, sel: applied.sel, filters: applied, tools, toolIds, settingToolIds, toolName, nowS, stopped, findings, actions: act, query, refreshKey: incremental ? 0 : data.generated_at,
    nodeScope, nodeId, scopeName, remote, localNode: identity?.local_node?.node_id || runtimeReport?.data?.local_node?.node_id,
  }), [viewData, data.generated_at, chartSeries, chartRange, applied, tools, toolIds, settingToolIds, toolName, nowS, stopped, findings, query, act, incremental, nodeScope, nodeId, scopeName, remote, identity, runtimeReport]);

  const settingsFindings = useMemo(() => ({ ...findings, rescan: act.rescan }), [findings, act]);
  const settingsSource = useMemo(() => (remote ? {
    toolConfigs: [], readonly: true, keepUnsetControl: true, unavailable: 'Tool configuration files and policy findings are not reported for this scope.',
    findings: { loading: false }, toolName, enabledTools: tools, configuredOnly: true,
  } : settingsRes.data ? {
    toolConfigs: settingsRes.data.tool_configs || [],
    tools: settingsRes.data.tools || [],
    monitor: settingsRes.data.monitor || {},
    enabledTools: tools,
    toolName,
    openFile: act.openFile,
    findings: settingsFindings,
    refresh: loadSettings,
    hooks: hooksStatus || undefined,
    configuredOnly: true,
    keepUnsetControl: true,
    runtimeConfiguration,
  } : null), [settingsRes.data, tools, toolName, act, settingsFindings, loadSettings, hooksStatus, runtimeConfiguration, remote]);
  const settingsSum = useMemo(() => remote ? 'Reported daemon settings' : settingsLine(settingsRes, tools), [settingsRes, tools, remote]);

  const hiddenIds = useMemo(() => new Set(ui.hidden), [ui.hidden]);
  const attention = boardData.attention.filter(i => !stopped[i.agent_id]).length;

  return html`<div class="bd-app" tabindex="-1" data-theme=${resolvedTheme} data-density=${ui.density} aria-busy=${(screen === 'health' ? health.busy : busy) ? 'true' : 'false'}>
    <${Rail} ui=${ui} data=${boardData} series=${chartSeries} loaded=${loaded} findingsCount=${findings.unavailable ? null : findings.list.length} attention=${attention} screen=${screen} settingsSum=${settingsSum} healthSum=${health.data ? healthState.label : 'Collection, ingestion and store'} rangeSum=${act.rangeSummary()} act=${act}/>
    <div class="bd-main">
      <${TopBar} f=${filters} board=${board} menu=${menu} ui=${ui} resolvedTheme=${resolvedTheme} setTheme=${setTheme} live=${live} act=${act} screen=${screen} picker=${picker}/>
      ${screen !== 'health' ? html`<${FilterRow} board=${board} data=${boardData} ctx=${ctx} menu=${menu} act=${act} subscription=${subscription} loaded=${loaded} screen=${screen}/>` : null}
      <div class="bd-body">
        <main class=${'bd-area' + (screen === 'health' ? ' bd-healtharea' : '')} id="main-area" aria-label=${screen === 'settings' ? 'Settings' : screen === 'health' ? 'aictl Health' : undefined}>
          ${screen !== 'health' && html`<div class="bd-muted" role="status">
            Node scope: ${scopeName}${!remote && ctx.localNode ? html` (<code>${ctx.localNode}</code>)` : ''}.
            ${remote ? ` Historical ${nodeScope === 'fleet' ? 'fleet' : nodeId} data and the latest monitor reports. Local-only measurements are not substituted.` : ''}
          </div>`}
          ${screen !== 'health' && !remote && html`<${LiveStatus} state=${subscription} history=${screen === 'board'}/>`}
          ${screen === 'board' && analyticsError ? html`<div class="bd-banner" role="alert">Could not read on-demand historical data: ${analyticsError.message}. Runtime fields update independently.</div>` : null}
          ${screen === 'settings' ? html`<${SettingsArea} Workspace=${SettingsC} res=${remote ? {} : settingsRes} source=${settingsSource}/>` : html`
          ${screen === 'health' ? html`<${HealthOverview} health=${health.data} status=${healthState} error=${health.error} nowS=${nowS} localNode=${ctx.localNode}>
            <${HealthCollectionDetails} ctx=${ctx}/>
            ${!remote && html`<${LiveStatus} state=${subscription} history=${false}/>`}
          <//>
          ` : html`
          ${error && (remote || subscription.mode === 'legacy') ? html`<div class="bd-banner" role=${!remote && error.status === 503 ? 'status' : 'alert'}><${Ico} d=${PATHS.warn}/>${!remote && error.status === 503 ? STARTING : 'Could not update the board: ' + error.message + (loaded ? '. Showing the last data for this scope.' : '')}</div>` : null}
          ${remote && loaded && !error && !data.scope.all_agents ? html`<p class="bd-muted" role="status">No historical agent records in the selected time range. This does not mean the node has no live sessions.</p>` : null}
          ${staleCode(data) ? html`<div class="bd-banner" role="alert"><${Ico} d=${PATHS.warn}/>aictl was updated on disk at ${stamp(staleCode(data), true)}, after this daemon started at ${stamp(data.machine.pipeline.self.started_at, true)}. The page is new and the daemon runs the old code, so new parts of the board may fail. Restart the daemon: stop it, then run aictl daemon serve again.</div>` : null}
          ${!loaded && !error ? html`<div class="bd-sk" role="status">Loading the board...</div>` : null}
          <${Kpis} data=${boardData} pill=${pill}/>`}
          ${ui.layout.filter(sec => screen !== 'health' && sec.id !== 'health').map((sec) => {
            const def = SEC_BY_ID[sec.id];
            return html`<section key=${sec.id} class=${'bd-sec' + (sec.id === 'health' ? ' bd-health' : '')} id=${def.anchor} aria-label=${def.title}>
              <div class="bd-sech">
                <button type="button" class="bd-sect" aria-expanded=${sec.open ? 'true' : 'false'} onClick=${() => act.toggleSection(sec.id)}><${Ico} d=${PATHS.chev} cls=${'bd-chev' + (sec.open ? ' bd-open' : '')}/>${def.title}</button>
                <span class="bd-sum">${sec.open ? '' : sectionSummary(sec.id, data, chartSeries, findings.unavailable ? null : findings.list.length)}</span>
                <span class="bd-secacts">
                  <button type="button" class="bd-ib-btn" aria-label=${'Move ' + def.title + ' up'} title="Move this section up" onClick=${() => act.moveSection(sec.id, -1)}><${Ico} d=${PATHS.up}/></button>
                  <button type="button" class="bd-ib-btn" aria-label=${'Move ' + def.title + ' down'} title="Move this section down" onClick=${() => act.moveSection(sec.id, 1)}><${Ico} d=${PATHS.dn}/></button>
                </span>
              </div>
              ${sec.open ? html`<div class="bd-grid" onDragOver=${(e) => { if (dragId) e.preventDefault(); }} onDrop=${e => act.dropOnSection(e, sec.id)}>
                ${sec.panels.filter(p => !hiddenIds.has(p.id)).map(pn => html`<${Panel} key=${pn.id} pn=${pn} ctx=${ctx} hiddenCols=${ui.hiddenCols[pn.id]}
                  menuOpen=${menu === 'panel:' + pn.id} over=${over && over.id === pn.id ? (over.after ? 'after' : 'before') : null} dragging=${dragId === pn.id} act=${act} sections=${SECTIONS.filter(s => screen === 'health' ? s.id === 'health' : s.id !== 'health')}/>`)}
              </div>` : null}
            </section>`;
          })}`}
        </main>
        ${drawer.length && DrawerC ? html`<${DrawerC} key=${JSON.stringify([nodeScope, nodeId])} stack=${drawer} ctx=${ctx} act=${act}/>` : null}
      </div>
    </div>
    ${menu ? html`<button type="button" class="bd-scrim" aria-label="Close the menu" onClick=${act.closeMenu}></button>` : null}
    <div class="bd-tip" ref=${bindTip} hidden></div>
    ${modal ? html`<${Modal} modal=${modal} onCancel=${() => setModal(null)}/>` : null}
    ${palette ? html`<${CommandPalette} recent=${recent} onRun=${act.runPaletteCommand} onClose=${() => setPalette(false)} commands=${boardCommands({
      sections: ui.layout.map(sec => ({ ...SEC_BY_ID[sec.id], keywords: sec.panels.map(pn => TITLES[pn.id]).join(' ') })), ranges: RANGES, rangeId: filters.range.id,
      tools: data.options.tools.map(t => ({ id: t.id, label: t.label || t.id, on: !tools || tools.includes(t.id) })),
      agents: data.agents, theme: resolvedTheme, density: ui.density, screen,
      go: {
        section: act.jumpTo, screen: act.setScreen, settings: act.settingsPivot, range: act.setRange,
        tool: id => act.toggleTool(id, toolIds), agent: id => act.openDrawer({ type: 'agent', id, tab: 'flow' }, true),
        theme: setTheme, density: act.setDensity, resetLayout: act.resetLayout, shortcuts: () => setShortcuts(true),
      },
    })}/>` : null}
    ${shortcuts ? html`<${ShortcutsDialog} onClose=${() => setShortcuts(false)}/>` : null}
    ${toast ? html`<div class="bd-toast" role="status">${toast.text}${toast.undo ? html`<button type="button" onClick=${toast.undo}>Undo</button>` : null}</div>` : null}
  </div>`;
}
