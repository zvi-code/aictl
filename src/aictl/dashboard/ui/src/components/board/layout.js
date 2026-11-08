// ─── Board layout — default arrangement, storage and pure layout moves ─
export const DEFAULT_LAYOUT = [
  { id: 'agents', title: 'Agents', anchor: 'sec-agents', panels: [['attention', 12], ['agentsT', 12], ['byModel', 8], ['byRole', 4]] },
  { id: 'sessions', title: 'Sessions', anchor: 'sec-sessions', panels: [['sessionsT', 12]] },
  { id: 'usage', title: 'Usage and cost', anchor: 'sec-usage', panels: [['tokens', 8], ['cacheRate', 4], ['cost', 6], ['messages', 6], ['projects', 12]] },
  { id: 'prompts', title: 'Prompts and skills', anchor: 'sec-prompts', panels: [['promptsL', 6], ['pprompts', 3], ['skills', 3], ['workflows', 12]] },
  { id: 'context', title: 'Context', anchor: 'sec-context', panels: [['budget', 12], ['tokenSplit', 6], ['ctxMap', 6], ['memory', 6], ['dailyModels', 6], ['inventory', 12], ['lifetime', 12]] },
  { id: 'tools', title: 'Tools, failures and speed', anchor: 'sec-tools', panels: [['toolCalls', 7], ['confirms', 5], ['errors', 5], ['latency', 7], ['loops', 12]] },
  { id: 'changes', title: 'Changes and testing', anchor: 'sec-changes', panels: [['changesT', 6], ['tests', 6], ['memfiles', 12]] },
  { id: 'resources', title: 'Machine', anchor: 'sec-resources', panels: [['cpu', 6], ['ram', 6], ['alerts', 12], ['procs', 12], ['traffic', 12]] },
  { id: 'effect', title: 'Settings in effect', anchor: 'sec-effect', panels: [['findings', 12], ['settings', 12]] },
  { id: 'sources', title: 'Where the data comes from', anchor: 'sec-sources', panels: [['sources', 7], ['self', 5], ['collectors', 6], ['quality', 6], ['coverage', 12]] },
];
export const TITLES = {
  sessionsT: 'Find a session', attention: 'Needs you now', agentsT: 'Agents and subagents', byModel: 'Usage by model', byRole: 'Main agents and subagents',
  tokens: 'Tokens, cached and not cached', cacheRate: 'Cache hit rate', cost: 'Cost', messages: 'Messages', projects: 'Projects',
  promptsL: 'Prompts', pprompts: 'Project prompts', skills: 'Skills used', workflows: 'Workflows and prompt files',
  budget: 'Context window budget', tokenSplit: 'Tokens by category', ctxMap: 'Context window map', memory: 'Agent memory',
  dailyModels: 'Daily usage by model', inventory: 'Files each tool reads', lifetime: 'Lifetime totals each tool reports',
  toolCalls: 'Tool calls', confirms: 'Tool confirmations', errors: 'Failures and errors', latency: 'Latency and durations', loops: 'Loops',
  changesT: 'Changes', tests: 'Testing', memfiles: 'Memory and instruction files',
  cpu: 'CPU', ram: 'RAM', alerts: 'Needs a look', procs: 'Processes', traffic: 'Network, tokens and files',
  findings: 'Hidden changes and conflicts', settings: 'Values in force',
  sources: 'Data sources', self: 'aictl itself', collectors: 'Collectors', quality: 'Ingesters and data quality', coverage: 'What each tool reports',
};
export const GROWS = { tokens: 1, cacheRate: 1, cost: 1, messages: 1, cpu: 1, ram: 1 };
export const HEIGHT = { attention: 'none', coverage: '470px', agentsT: '420px', sessionsT: '520px', projects: '300px', promptsL: '320px', pprompts: '320px', skills: '320px', toolCalls: '360px', confirms: '360px', errors: '360px', latency: '360px', loops: '220px', changesT: '360px', tests: '360px', memfiles: '200px', workflows: '260px', budget: '420px', tokenSplit: '420px', ctxMap: '460px', memory: '460px', dailyModels: '460px', inventory: '480px', lifetime: '420px', alerts: '220px', procs: '360px', traffic: '280px', settings: '340px', sources: '280px', collectors: '320px', quality: '360px', byModel: '280px', byRole: '280px' };
export const WIDTHS = [3, 4, 6, 8, 12];

export const LS_KEY = 'aictl-board-layout-v1';
const DEFAULT_HIDDEN_COLS = { agentsT: { spark: 1 } };

export const freshLayout = () => DEFAULT_LAYOUT.map(s => ({
  id: s.id, open: true, panels: s.panels.map(([id, span]) => ({ id, span, open: true })),
}));
export const freshUi = () => ({ layout: freshLayout(), hidden: [], hiddenCols: DEFAULT_HIDDEN_COLS, density: 'compact', railMini: false });

/** Keep a stored layout usable after panels are added or removed in a later version. */
export function sanitizeLayout(stored) {
  const fresh = freshLayout();
  if (!Array.isArray(stored)) return fresh;
  const known = new Set(fresh.flatMap(s => s.panels.map(p => p.id)));
  const seen = new Set();
  const secIds = new Set(fresh.map(s => s.id));
  const out = stored.filter(s => s && secIds.has(s.id)).map(s => ({
    id: s.id,
    open: s.open !== false,
    panels: (Array.isArray(s.panels) ? s.panels : []).filter(p => {
      if (!p || !known.has(p.id) || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    }).map(p => ({ ...p, span: Math.max(2, Math.min(12, Number(p.span) || 6)), open: p.open !== false })),
  }));
  for (const sec of fresh) {
    let target = out.find(s => s.id === sec.id);
    if (!target) {
      target = { id: sec.id, open: true, panels: [] };
      // A new section goes after the section that precedes it in the default order.
      const prev = fresh[fresh.indexOf(sec) - 1];
      const at = prev ? out.findIndex(s => s.id === prev.id) : -1;
      if (at >= 0) out.splice(at + 1, 0, target); else out.push(target);
    }
    for (const p of sec.panels) if (!seen.has(p.id)) { seen.add(p.id); target.panels.push(p); }
  }
  return out;
}

export function loadUi(storage = globalThis.localStorage) {
  const base = freshUi();
  try {
    const raw = storage?.getItem(LS_KEY);
    if (!raw) return base;
    const s = JSON.parse(raw);
    if (!s || typeof s !== 'object') return base;
    return {
      layout: sanitizeLayout(s.layout),
      hidden: Array.isArray(s.hidden) ? s.hidden.filter(id => TITLES[id]) : [],
      hiddenCols: s.hiddenCols && typeof s.hiddenCols === 'object' ? s.hiddenCols : base.hiddenCols,
      density: s.density === 'comfortable' ? 'comfortable' : 'compact',
      railMini: !!s.railMini,
    };
  } catch { return base; }
}
export function saveUi(ui, storage = globalThis.localStorage) {
  try { storage?.setItem(LS_KEY, JSON.stringify(ui)); return true; } catch { return false; }
}

export function findPanel(layout, id) {
  for (const sec of layout) {
    const i = sec.panels.findIndex(p => p.id === id);
    if (i >= 0) return { sec, i, panel: sec.panels[i] };
  }
  return null;
}
const clone = layout => layout.map(s => ({ ...s, panels: [...s.panels] }));

export function updatePanel(layout, id, patch) {
  return layout.map(s => ({ ...s, panels: s.panels.map(p => (p.id === id ? { ...p, ...patch } : p)) }));
}
/** Move a panel before or after another panel, or to the end of a section. */
export function movePanel(layout, id, targetId, after, secId) {
  if (id === targetId) return layout;
  const next = clone(layout);
  const from = findPanel(next, id);
  if (!from) return layout;
  const [pn] = from.sec.panels.splice(from.i, 1);
  if (targetId) {
    const to = findPanel(next, targetId);
    if (!to) return layout;
    to.sec.panels.splice(to.i + (after ? 1 : 0), 0, pn);
  } else {
    const sec = next.find(s => s.id === secId);
    if (!sec) return layout;
    sec.panels.push(pn);
  }
  return next;
}
export function stepPanel(layout, id, dir) {
  const next = clone(layout);
  const from = findPanel(next, id);
  if (!from) return layout;
  const j = from.i + dir;
  if (j < 0 || j >= from.sec.panels.length) return layout;
  const [pn] = from.sec.panels.splice(from.i, 1);
  from.sec.panels.splice(j, 0, pn);
  return next;
}
export function moveSection(layout, id, dir) {
  const next = [...layout];
  const i = next.findIndex(s => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= next.length) return layout;
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
export function isDefaultLayout(ui) {
  if (ui.hidden.length) return false;
  const shape = l => JSON.stringify(l.map(s => ({ id: s.id, panels: s.panels.map(p => ({ id: p.id, span: p.span, h: p.h || 0 })) })));
  return shape(freshLayout()) === shape(ui.layout);
}
