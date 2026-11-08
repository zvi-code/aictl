// ─── Board: Sessions — search every past session of every tool ─────
// Asks /api/board/sessions on demand: when the panel opens, when the person types
// (after a short pause), when the Tool filter changes, and on "Show more". It does
// not follow the board's time range and it does not poll.
import { html } from 'htm/preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import * as api from '../../api.js';
import { NA, fmtDur, fmtN, fmtUsd, projectName, stamp } from './format.js';
import { normalizeSessions } from './useBoardData.js';
import Table from './Table.js';

export const SEARCH_DEBOUNCE_MS = 250;
export const PAGE_SIZE = 50;

export const MATCH_LABEL = {
  title: 'Title', prompt: 'Prompt', artifact: 'Artifact', file: 'Written file', commit: 'Commit', project: 'Project',
};

/** The table of the search answer. *q* adds the "Matched in" column. */
export function sessionsDef(rows, { q = '', toolName = x => x, open = () => {} } = {}) {
  const cols = [
    { k: 'tool', l: 'Tool', w: '110px' },
    { k: 'title', l: 'Title', minw: 220 },
    { k: 'project', l: 'Project', w: '130px' },
    { k: 'started', l: 'Started', w: '110px' },
    { k: 'dur', l: 'Duration', n: true, w: '78px' },
    { k: 'tokens', l: 'Tokens', n: true, w: '72px' },
    { k: 'cost', l: 'Cost', n: true, w: '64px' },
    { k: 'calls', l: 'Tool calls', n: true, w: '78px' },
    { k: 'prompts', l: 'Prompts', n: true, w: '72px' },
    { k: 'arts', l: 'Artifacts', n: true, w: '76px' },
    { k: 'commits', l: 'Commits', n: true, w: '76px' },
  ];
  if (q) cols.push({ k: 'match', l: 'Matched in', minw: 240, t: 'Where the search text was found, with a short excerpt' });
  return {
    key: 'sessions',
    cols,
    primary: 'title',
    rows: rows.map(r => {
      const dur = r.started_at && r.ended_at ? r.ended_at - r.started_at : null;
      const label = MATCH_LABEL[r.match] || '';
      const matched = label ? label + ': ' + (r.match_text || '') : '';
      return {
        id: r.tool + ':' + r.id,
        go: () => open(r.id),
        sort: { tool: toolName(r.tool), title: r.title || '', project: r.project || '', started: r.started_at, dur, tokens: r.tokens, cost: r.cost_usd, calls: r.tool_calls, prompts: r.prompts, arts: r.artifacts, commits: r.commits, match: matched || null },
        cells: {
          tool: { v: toolName(r.tool), cls: 'dim' },
          title: { v: r.title || r.id, title: (r.title || 'No title') + ', ' + r.id },
          project: { v: r.project ? projectName(r.project) : NA, cls: 'dim', title: r.project || 'No project' },
          started: { v: stamp(r.started_at, true), cls: 'dim', title: r.started_at ? new Date(r.started_at * 1000).toLocaleString() : '' },
          dur: { v: fmtDur(dur), title: r.ended_at ? 'Ended ' + stamp(r.ended_at, true) : 'No end time stored' },
          tokens: { v: fmtN(r.tokens) },
          cost: { v: fmtUsd(r.cost_usd), title: 'List price, not a bill' },
          calls: { v: fmtN(r.tool_calls) },
          prompts: { v: fmtN(r.prompts) },
          arts: { v: fmtN(r.artifacts) },
          commits: { v: fmtN(r.commits) },
          match: { v: matched || NA, cls: matched ? '' : 'dim', title: matched || 'No match text' },
        },
      };
    }),
    sort: { k: 'started', dir: 'desc' },
    none: q ? 'No session matches this text.' : 'No session is stored yet.',
  };
}

export function SessionsView({ ctx }) {
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [state, setState] = useState({ rows: [], total: null, error: null, busy: true });
  const tools = ctx.tools || null;
  const toolKey = tools ? tools.join(',') : '*';
  const toolsRef = useRef(tools);
  toolsRef.current = tools;
  const ctrl = useRef(null);
  const live = useRef({ key: null, rows: [] });

  // The person's typing becomes the search text after a short pause.
  useEffect(() => {
    const id = setTimeout(() => setQ(text.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [text]);

  const load = (key, offset) => {
    if (ctrl.current) ctrl.current.abort();
    const mine = new AbortController();
    ctrl.current = mine;
    setState(s => ({ ...s, busy: true, error: null }));
    api.getBoardSessions({ q, tool: toolsRef.current, limit: PAGE_SIZE, offset }, { signal: mine.signal }).then((raw) => {
      const d = normalizeSessions(raw);
      const rows = offset ? live.current.rows.concat(d.rows) : d.rows;
      live.current = { key, rows };
      setState({ rows, total: d.total, error: null, busy: false });
    }).catch((e) => {
      if (e?.name === 'AbortError') return;
      setState(s => ({ ...s, busy: false, error: e }));
    });
  };

  // A new search or a new Tool filter starts again at the first page.
  useEffect(() => {
    load(q + '|' + toolKey, 0);
    return () => { if (ctrl.current) ctrl.current.abort(); };
  }, [q, toolKey]);

  const open = id => ctx.actions.openDrawer({ type: 'agent', id, tab: 'overview' }, true);
  const def = useMemo(() => sessionsDef(state.rows, { q, toolName: ctx.toolName, open }), [state.rows, q, ctx.toolName]);
  const more = state.total != null && state.rows.length < state.total;
  const toolNote = tools ? (tools.length ? ' Only the tools chosen in the Tool filter.' : ' No tool is chosen in the Tool filter.') : '';
  return html`<div class="bd-sessions">
    <div class="bd-srchrow">
      <input type="search" class="bd-sessq" aria-label="Search all past sessions" placeholder="Search titles, prompts, projects, files and commits"
        value=${text} onInput=${e => setText(e.currentTarget.value)}/>
      <span class="bd-note bd-sessn" role="status">${state.error ? '' : state.total == null ? 'Loading...' : state.rows.length + ' of ' + state.total + (q ? ' sessions match' : ' sessions') + (state.busy ? ', updating' : '') + '.'}${toolNote}</span>
    </div>
    ${state.error ? html`<div class="bd-empty" role="status">Could not load sessions: ${state.error.message}${state.error.status === 404 ? ' This server does not have session search yet. Reinstall and restart the daemon.' : ''}</div>` : null}
    ${state.total != null ? html`<${Table} def=${def} label="Sessions"/>` : null}
    ${more ? html`<button type="button" class="bd-more" disabled=${state.busy} onClick=${() => load(live.current.key, state.rows.length)}>Showing ${state.rows.length} of ${state.total}. Show ${Math.min(PAGE_SIZE, state.total - state.rows.length)} more</button>` : null}
  </div>`;
}

export function panelSessions() {
  return {
    sub: 'All time, for all tools. The board range does not apply here.',
    view: { C: SessionsView, props: {} },
  };
}
