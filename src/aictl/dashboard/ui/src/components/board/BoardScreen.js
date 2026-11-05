// ─── BoardScreen — the default screen: shell, sections, panels, drawer ─
import { html } from 'htm/preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import * as api from '../../api.js';
import { useTheme } from '../../hooks/useTheme.js';
import { nextTools, useBoardFilters } from '../../hooks/useBoardFilters.js';
import { writeUrl } from '../../hooks/urlState.js';
import { LAYOUT } from '../../layoutConfig.js';
import { focusTrap } from '../../utils/a11y.js';
import { parseCustomRange, toLocalISOString } from '../../utils/customRange.js';
import { canClear, clearedFilters, RANGES, STATUSES, windowOf, boardQuery } from './filters.js';
import { buildFindings, buildSettings } from './findings.js';
import { colorFor, projectName, stamp } from './format.js';
import { Ico, PATHS } from './icons.js';
import {
  DEFAULT_LAYOUT, TITLES, findPanel, freshUi, isDefaultLayout, loadUi, moveSection, movePanel, saveUi, stepPanel, updatePanel,
} from './layout.js';
import Panel from './Panel.js';
import { kpiList, sectionSummary } from './summary.js';
import { bindTip } from './tip.js';
import { useBoardData } from './useBoardData.js';
import './board.css';

const SECTIONS = DEFAULT_LAYOUT.map(s => ({ id: s.id, title: s.title, anchor: s.anchor }));
const SEC_BY_ID = Object.fromEntries(SECTIONS.map(s => [s.id, s]));
// Screens the board does not replace. Overview became the board itself.
const DETAIL_SCREENS = LAYOUT.tabs.filter(t => t.id !== 'overview');

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
  if (theme === 'light' || theme === 'editorial') return 'light';
  return dark ? 'dark' : 'light';
}

const Check = ({ on }) => html`<span class=${'bd-check' + (on ? ' bd-on' : '')}>${on ? html`<${Ico} d=${PATHS.check}/>` : null}</span>`;

function Rail({ ui, data, series, findingsCount, attention, act }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const mini = ui.railMini;
  const railLabel = mini ? 'Show section names' : 'Hide section names';
  const rangeSum = act.rangeSummary();
  const items = [{ id: 'top', label: 'Overview', anchor: 'sec-top', sum: rangeSum, icon: PATHS.top }].concat(ui.layout.map(sec => ({
    id: sec.id, label: SEC_BY_ID[sec.id].title, anchor: SEC_BY_ID[sec.id].anchor, sum: sectionSummary(sec.id, data, series, findingsCount), icon: PATHS[sec.id],
  })));
  return html`<aside class=${'bd-rail' + (mini ? ' bd-mini' : '')} aria-label="Sections">
    <div class="bd-brandrow">
      <span class="bd-brand-t">aictl</span>
      <button type="button" class="bd-ib-btn" aria-label=${railLabel} title=${railLabel} onClick=${act.toggleRail}><${Ico} d=${PATHS.menu}/></button>
    </div>
    <nav aria-label="Sections of this screen" class="bd-railnav">
      ${items.map(it => html`<a key=${it.id} class=${'bd-navi' + (it.id === 'agents' && attention ? ' bd-alert' : '')} href=${'#' + it.anchor} title=${it.label + ': ' + it.sum} onClick=${() => act.openSection(it.id)}>
        <${Ico} d=${it.icon}/><span class="bd-rl"><b>${it.label}</b><span>${it.sum}</span></span>
      </a>`)}
    </nav>
    <span class="bd-spacer"></span>
    <div class="bd-detail">
      <button type="button" class="bd-detail-t" aria-expanded=${detailOpen ? 'true' : 'false'} onClick=${() => setDetailOpen(!detailOpen)}><${Ico} d=${PATHS.chev} cls=${'bd-chev' + (detailOpen ? ' bd-open' : '')}/>Detail screens</button>
      ${detailOpen ? html`<nav aria-label="Detail screens">${DETAIL_SCREENS.map(t => html`<a key=${t.id} href=${'?tab=' + t.id}>${t.label}</a>`)}</nav>` : null}
    </div>
    <div class="bd-railfoot bd-rl">Layout and options stay when you reload.</div>
  </aside>`;
}

function CustomRange({ range, onApply, onClose }) {
  const win = windowOf(range);
  const [start, setStart] = useState(toLocalISOString(win.since));
  const [end, setEnd] = useState(toLocalISOString(win.until));
  const [err, setErr] = useState('');
  const apply = (e) => {
    e.preventDefault();
    const r = parseCustomRange(start, end);
    if (r.error) { setErr(r.error); return; }
    onApply(r.since, r.until);
    onClose();
  };
  return html`<form class="bd-menu bd-crange" style="left:0;top:32px" onSubmit=${apply}>
    <label>From <input type="datetime-local" value=${start} onInput=${e => setStart(e.target.value)}/></label>
    <label>To <input type="datetime-local" value=${end} onInput=${e => setEnd(e.target.value)}/></label>
    <div class="bd-crange-err" aria-live="polite">${err}</div>
    <button type="submit" class="bd-btn bd-p">Apply</button>
  </form>`;
}

function TopBar({ f, board, menu, ui, resolvedTheme, setTheme, live, act }) {
  const { filters } = board;
  const hiddenPanels = ui.hidden;
  const changed = !isDefaultLayout(ui);
  const customOpen = menu === 'custom';
  const liveTitle = live ? 'Updates every 5 s. Click to pause.' : 'Click to resume live updates';
  return html`<div class="bd-bar" role="region" aria-label="Time and layout">
    <div class="bd-anch">
      <div class="bd-seg" role="group" aria-label="Time range">
        ${RANGES.map(r => html`<button key=${r.id} type="button" aria-pressed=${filters.range.id === r.id ? 'true' : 'false'} onClick=${() => act.setRange(r.id)}>${r.label}</button>`)}
        <button type="button" aria-pressed=${filters.range.id === 'custom' ? 'true' : 'false'} aria-expanded=${customOpen ? 'true' : 'false'} onClick=${() => act.toggleMenu('custom')}>Custom</button>
      </div>
      ${customOpen ? html`<${CustomRange} range=${filters.range} onApply=${act.setCustom} onClose=${act.closeMenu}/>` : null}
    </div>
    <button type="button" class="bd-ctl" aria-pressed=${live ? 'true' : 'false'} onClick=${act.toggleLive} title=${liveTitle}><i class=${'bd-live' + (live ? '' : ' bd-off')}></i>${live ? 'Live' : 'Paused'}</button>
    <label class="bd-srch"><${Ico} d=${PATHS.search}/><input id="bd-find" aria-label="Find agents, prompts, files and tools" placeholder="Find agent, prompt, file, tool" value=${f.q} onInput=${e => act.setFind(e.target.value)}/></label>
    <span class="bd-sp"></span>
    <div class="bd-anch">
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
    </div>
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
}

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

function FilterRow({ board, data, ctx, menu, act }) {
  const { filters, tools } = board;
  const opts = data.options;
  const toolIds = opts.tools.map(t => t.id);
  const toolValue = !tools ? 'All ' + toolIds.length : tools.length <= 2 ? (tools.map(ctx.toolName).join(', ') || 'None') : tools.length + ' of ' + toolIds.length;
  const allAgents = data.scope.all_agents;
  const statusCounts = {};
  if (filters.status === 'all') {
    for (const a of data.agents) if (!a.parent_id) statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
    statusCounts.active = (statusCounts.running || 0) + (statusCounts.looping || 0) + (statusCounts.waiting || 0);
  }
  const selValue = filters.sel ? stamp(filters.sel.since, true) + ' to ' + stamp(filters.sel.until, true) : '';
  const clearable = canClear(filters, tools);
  const shown = data.scope.shown_agents;
  const scope = shown === allAgents ? 'Showing all ' + allAgents + ' agents in this time' : 'Showing ' + shown + ' of ' + allAgents + ' agents in this time';
  return html`<div class="bd-bar" role="region" aria-label="Filters">
    <${FilterMenu} fkey="tools" label="Tool" value=${toolValue} active=${!!tools} menu=${menu} act=${act}
      items=${opts.tools.map(t => ({ id: t.id, label: t.label || t.id, sw: colorFor('tool', t.id), on: !tools || tools.includes(t.id), count: agentsLabel(t.agents), pick: () => act.toggleTool(t.id, toolIds) }))}/>
    <${FilterMenu} fkey="project" label="Project" value=${filters.project === 'all' ? 'All' : projectName(filters.project)} active=${filters.project !== 'all'} menu=${menu} act=${act}
      items=${[{ id: 'all', label: 'All projects', on: filters.project === 'all', count: agentsLabel(allAgents), pick: () => act.setFilter('project', 'all') }].concat(opts.projects.map(p => ({ id: p.id, label: projectName(p.id), title: p.id, sw: colorFor('project', p.id), on: filters.project === p.id, count: agentsLabel(p.agents), pick: () => act.setFilter('project', p.id) })))}/>
    <${FilterMenu} fkey="model" label="Model" value=${filters.model === 'all' ? 'All' : filters.model} active=${filters.model !== 'all'} menu=${menu} act=${act}
      items=${[{ id: 'all', label: 'All models', on: filters.model === 'all', count: agentsLabel(allAgents), pick: () => act.setFilter('model', 'all') }].concat(opts.models.map(p => ({ id: p.id, label: p.id, sw: colorFor('model', p.id), on: filters.model === p.id, count: agentsLabel(p.agents), pick: () => act.setFilter('model', p.id) })))}/>
    <${FilterMenu} fkey="status" label="Status" value=${(STATUSES.find(s => s[0] === filters.status) || [0, 'All'])[1]} active=${filters.status !== 'all'} menu=${menu} act=${act}
      items=${STATUSES.map(([id, label]) => ({ id, label, on: filters.status === id, count: filters.status === 'all' && id !== 'all' ? (statusCounts[id] || 0) : '', pick: () => act.setFilter('status', id) }))}/>
    ${filters.sel ? html`<span class="bd-chip">Time selected: ${selValue}<button type="button" aria-label="Clear the time selection" onClick=${() => act.select(null)}><${Ico} d=${PATHS.close}/></button></span>` : null}
    <span class="bd-sp"></span>
    <span class="bd-muted">${scope}</span>
    ${clearable ? html`<button type="button" class="bd-link" onClick=${act.clearAll}>Clear filters</button>` : null}
  </div>`;
}

function Kpis({ data }) {
  const list = useMemo(() => kpiList(data), [data]);
  return html`<div class="bd-kpis" id="sec-top">${list.map(k => html`<a key=${k.label} class="bd-kpi" href=${k.href} title=${k.title}>
    <span class="bd-l">${k.label}</span>
    <span class="bd-v">${k.value}</span>
    <span class="bd-d"><span>${k.delta}</span><svg viewBox="0 0 54 16" preserveAspectRatio="none" aria-hidden="true"><path d=${k.spark}></path></svg></span>
  </a>`)}</div>`;
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

export default function BoardScreen() {
  const board = useBoardFilters();
  const { filters, applied, tools, update, setFind } = board;
  const { theme, setTheme } = useTheme();
  const resolvedTheme = useResolvedTheme(theme);
  const [ui, setUi] = useState(() => loadUi());
  const [live, setLive] = useState(true);
  const [menu, setMenu] = useState(null);
  const [drawer, setDrawer] = useState(() => {
    try {
      const id = new URLSearchParams(window.location.search).get('agent');
      return id ? [{ type: 'agent', id, tab: 'overview' }] : [];
    } catch { return []; }
  });
  const [DrawerC, setDrawerC] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [over, setOver] = useState(null);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [stopped, setStopped] = useState({});
  const pausedRef = useRef(false);
  pausedRef.current = !!dragId;

  const { data, chartSeries, chartRange, loaded, busy, error, refresh } = useBoardData({ filters: applied, tools, live, pausedRef });

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
  const loadFindings = useCallback((fresh) => {
    Promise.allSettled([api.getContextAudit(fresh), api.getEffectiveModels(), api.getHooksStatus(), api.getOtelStatus()]).then(([a, e, h, o]) => {
      setSettingsRaw({
        loading: false,
        audit: a.status === 'fulfilled' ? a.value : null,
        effective: e.status === 'fulfilled' ? e.value : null,
        hooks: h.status === 'fulfilled' ? h.value : null,
        otel: o.status === 'fulfilled' ? o.value : null,
        error: a.status === 'rejected' ? a.reason?.message : null,
      });
    });
  }, []);
  useEffect(() => {
    if (!loaded) return undefined;
    const t = setTimeout(() => loadFindings(false), 300);
    return () => clearTimeout(t);
  }, [loaded, loadFindings]);

  const toolIds = useMemo(() => data.options.tools.map(t => t.id), [data.options]);
  const toolLabels = useMemo(() => Object.fromEntries(data.options.tools.map(t => [t.id, t.label || t.id])), [data.options]);
  const toolName = useCallback(id => toolLabels[id] || id || 'n/a', [toolLabels]);
  const findings = useMemo(() => {
    const list = buildFindings({ ...settingsRaw, tools });
    const { rows, note } = buildSettings({ ...settingsRaw, toolIds });
    return { list, settings: rows, note, loading: settingsRaw.loading, error: settingsRaw.error };
  }, [settingsRaw, tools, toolIds]);

  // Latest values for handlers that keep one identity, so panels do not re-render for them.
  const latest = useRef({});
  latest.current = { ui, filters, tools, menu, drawer, dragId, modal, over };

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
      openSection: id => {
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
      openDrawer: (d, reset) => { setDrawer(s => (reset ? [d] : [...s, d])); closeMenu(); },
      setDrawerTab: tab => setDrawer(s => s.map((d, i) => (i === s.length - 1 ? { ...d, tab } : d))),
      drawerBack: () => setDrawer(s => s.slice(0, -1)),
      drawerClose: () => { setDrawer([]); writeUrl({ agent: null }); },
      copy: (text, done) => {
        try { navigator.clipboard?.writeText(text); notice(done); } catch { notice('Could not copy. ' + text); }
      },
      runCommand: spec => setModal({
        ...spec,
        apply: async () => {
          try {
            await api.boardAction(spec.action, spec.args || {});
            setModal(null);
            notice(spec.done);
            loadFindings(true);
            refresh();
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
      stopAgent: (ag) => setModal({
        title: 'Stop this agent?',
        lead: 'This stops ' + ag.title + '. Its files stay as they are, and the session can be resumed in its tool.',
        command: 'aictl session kill ' + ag.id,
        applyLabel: 'Stop agent',
        apply: async () => {
          try {
            await api.killSession(ag.id);
            setModal(null);
            setStopped(s => ({ ...s, [ag.id]: 1 }));
            notice('Stopped ' + ag.title);
            refresh();
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
    import('./Drawer.js').then(m => setDrawerC(() => m.default));
  }, [drawer.length, DrawerC]);

  useEffect(() => {
    const onKey = (e) => {
      const typing = e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        document.getElementById('bd-find')?.focus();
      } else if (e.key === 'Escape') {
        const s = latest.current;
        if (s.modal) setModal(null);
        else if (s.menu) setMenu(null);
        else if (s.drawer.length) setDrawer(d => d.slice(0, -1));
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const nowS = data.generated_at || Date.now() / 1000;
  const query = useMemo(() => {
    const win = applied.sel ? { since: applied.sel.since, until: applied.sel.until } : windowOf(applied.range);
    return boardQuery(applied, tools, { since: Math.floor(win.since), until: Math.floor(win.until) });
  }, [applied.range, applied.sel, applied.project, applied.model, applied.status, applied.q, tools]);

  const ctx = useMemo(() => ({
    data, series: chartSeries, range: chartRange, chartRange, sel: applied.sel, filters: applied, tools, toolIds, toolName, nowS, stopped, findings, actions: act, query, refreshKey: data.generated_at,
  }), [data, chartSeries, chartRange, applied, tools, toolIds, toolName, nowS, stopped, findings, query]);

  const hiddenIds = useMemo(() => new Set(ui.hidden), [ui.hidden]);
  const attention = data.attention.filter(i => !stopped[i.agent_id]).length;

  return html`<div class="bd-app" tabindex="-1" data-theme=${resolvedTheme} data-density=${ui.density} aria-busy=${busy ? 'true' : 'false'}>
    <${Rail} ui=${ui} data=${data} series=${chartSeries} findingsCount=${findings.list.length} attention=${attention} act=${act}/>
    <div class="bd-main">
      <${TopBar} f=${filters} board=${board} menu=${menu} ui=${ui} resolvedTheme=${resolvedTheme} setTheme=${setTheme} live=${live} act=${act}/>
      <${FilterRow} board=${board} data=${data} ctx=${ctx} menu=${menu} act=${act}/>
      <div class="bd-body">
        <main class="bd-area" id="main-area">
          ${error ? html`<div class="bd-banner" role="alert"><${Ico} d=${PATHS.warn}/>Could not update the board: ${error.message}. Showing the last data.</div>` : null}
          ${!loaded && !error ? html`<div class="bd-sk" role="status">Loading the board...</div>` : null}
          <${Kpis} data=${data}/>
          ${ui.layout.map((sec) => {
            const def = SEC_BY_ID[sec.id];
            return html`<section key=${sec.id} class="bd-sec" id=${def.anchor} aria-label=${def.title}>
              <div class="bd-sech">
                <button type="button" class="bd-sect" aria-expanded=${sec.open ? 'true' : 'false'} onClick=${() => act.toggleSection(sec.id)}><${Ico} d=${PATHS.chev} cls=${'bd-chev' + (sec.open ? ' bd-open' : '')}/>${def.title}</button>
                <span class="bd-sum">${sec.open ? '' : sectionSummary(sec.id, data, chartSeries, findings.list.length)}</span>
                <span class="bd-secacts">
                  <button type="button" class="bd-ib-btn" aria-label=${'Move ' + def.title + ' up'} title="Move this section up" onClick=${() => act.moveSection(sec.id, -1)}><${Ico} d=${PATHS.up}/></button>
                  <button type="button" class="bd-ib-btn" aria-label=${'Move ' + def.title + ' down'} title="Move this section down" onClick=${() => act.moveSection(sec.id, 1)}><${Ico} d=${PATHS.dn}/></button>
                </span>
              </div>
              ${sec.open ? html`<div class="bd-grid" onDragOver=${(e) => { if (dragId) e.preventDefault(); }} onDrop=${e => act.dropOnSection(e, sec.id)}>
                ${sec.panels.filter(p => !hiddenIds.has(p.id)).map(pn => html`<${Panel} key=${pn.id} pn=${pn} ctx=${ctx} hiddenCols=${ui.hiddenCols[pn.id]}
                  menuOpen=${menu === 'panel:' + pn.id} over=${over && over.id === pn.id ? (over.after ? 'after' : 'before') : null} dragging=${dragId === pn.id} act=${act} sections=${SECTIONS}/>`)}
              </div>` : null}
            </section>`;
          })}
        </main>
        ${drawer.length && DrawerC ? html`<${DrawerC} stack=${drawer} ctx=${ctx} act=${act}/>` : null}
      </div>
    </div>
    ${menu ? html`<button type="button" class="bd-scrim" aria-label="Close the menu" onClick=${act.closeMenu}></button>` : null}
    <div class="bd-tip" ref=${bindTip} hidden></div>
    ${modal ? html`<${Modal} modal=${modal} onCancel=${() => setModal(null)}/>` : null}
    ${toast ? html`<div class="bd-toast" role="status">${toast.text}${toast.undo ? html`<button type="button" onClick=${toast.undo}>Undo</button>` : null}</div>` : null}
  </div>`;
}
