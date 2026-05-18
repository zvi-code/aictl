// SessionsListV2 — filterable, sortable, two-pane session browser.
//
// Replaces the legacy "active cards + history DataTable" pair from
// TabSessions with the editorial-style layout from Direction-C
// (c-tab-sessions.jsx): a toolbar with search / status / agent / sort
// controls above a 1fr | 420px grid of table + sticky inspector.
//
// Inputs (props):
//   sessions  - merged list of active + historical sessions. Each row is
//               expected to have at minimum: session_id, tool, project,
//               started_at, ended_at, duration_s, active, plus optional
//               input_tokens / output_tokens / files_modified / preview.
//   onSelect  - optional callback(session) when the user picks a row.
//   selectedId - controlled selection id (string) for the right pane.
//   detailRenderer - render function (session) => htm — defaults to a
//               built-in editorial summary card.
//
// The component does its own filtering and sorting in-memory; pagination
// is intentionally deferred until row counts force it.
import { useState, useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import { fmtK, esc, fmtTime, fmtAgo, COLORS, ICONS } from '../utils.js';

function _fmtDur(sec) {
  if (sec == null || isNaN(sec)) return '\u2014';
  const s = Math.round(sec);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ' + (s % 60) + 's';
  const h = Math.floor(m / 60);
  return h + 'h ' + (m % 60) + 'm';
}

// Best-effort human title for a session. The skeleton hand-crafts titles
// in mock data; for real sessions we derive a reasonable default from
// project basename + first prompt preview (if available).
function _title(sess) {
  if (sess.title) return sess.title;
  if (sess.preview) return sess.preview;
  if (sess.first_prompt) return sess.first_prompt.slice(0, 80);
  if (sess.project) {
    const base = sess.project.replace(/\\/g, '/').split('/').filter(Boolean).pop();
    if (base) return base;
  }
  return sess.session_id || '(session)';
}

function _statusOf(sess) {
  if (sess.active) return 'live';
  if (sess.had_error || sess.error_count > 0) return 'error';
  return 'done';
}

function _tokens(sess) {
  return (sess.exact_input_tokens || sess.input_tokens || 0)
       + (sess.exact_output_tokens || sess.output_tokens || 0);
}

function _files(sess) {
  return sess.file_events || sess.files_modified || (sess.files_touched ? sess.files_touched.length : 0) || 0;
}

const STATUS_OPTIONS = [
  { value: 'all',   label: 'all status' },
  { value: 'live',  label: 'live' },
  { value: 'done',  label: 'done' },
  { value: 'error', label: 'error' },
];

const SORT_OPTIONS = [
  { value: 'time-desc',   label: 'newest first',  cmp: (a, b) => (b.started_at || 0) - (a.started_at || 0) },
  { value: 'time-asc',    label: 'oldest first',  cmp: (a, b) => (a.started_at || 0) - (b.started_at || 0) },
  { value: 'tokens-desc', label: 'most tokens',   cmp: (a, b) => _tokens(b) - _tokens(a) },
  { value: 'files-desc',  label: 'most files',    cmp: (a, b) => _files(b) - _files(a) },
  { value: 'dur-desc',    label: 'longest',       cmp: (a, b) => (b.duration_s || 0) - (a.duration_s || 0) },
];

function _statusPill(status) {
  if (status === 'live')  return html`<span class="sl-pill sl-pill--live">\u25CF Live</span>`;
  if (status === 'error') return html`<span class="sl-pill sl-pill--error">Err</span>`;
  return html`<span class="sl-pill sl-pill--done">Done</span>`;
}

function _defaultDetail(session) {
  if (!session) {
    return html`<div class="sl-detail sl-detail--empty">
      <div class="sl-detail-empty-tag">No selection</div>
      <div class="sl-detail-empty-msg">Pick a session to view its summary.</div>
    </div>`;
  }
  const tool = session.tool || '\u2014';
  const tokens = _tokens(session);
  const files = _files(session);
  const status = _statusOf(session);
  const cells = [
    ['Tokens',   fmtK(tokens)],
    ['Files',    String(files)],
    ['Duration', _fmtDur(session.duration_s)],
    ['Status',   status],
    ['ID',       session.session_id ? session.session_id.slice(0, 18) + (session.session_id.length > 18 ? '\u2026' : '') : '\u2014'],
    ['Tool',     tool],
  ];
  return html`<div class="sl-detail">
    <div class="sl-detail-overline">Session \u00B7 ${session.started_at ? fmtTime(session.started_at) : ''}</div>
    <div class="sl-detail-title">${esc(_title(session))}</div>
    <div class="sl-detail-tool">
      <span class="sl-detail-tool-dot" style=${'background:' + (COLORS[tool] || 'var(--fg2)')}></span>
      <span>${esc(tool)}</span>
      ${session.project && html`<span class="sl-detail-tool-proj text-muted">${esc(session.project)}</span>`}
    </div>
    <div class="sl-detail-rule"><span>Summary</span></div>
    <div class="sl-detail-grid">
      ${cells.map(([k, v]) => html`<div class="sl-detail-cell" key=${k}>
        <span class="sl-detail-cell-k">${k}</span>
        <span class="sl-detail-cell-v">${esc(String(v || '\u2014'))}</span>
      </div>`)}
    </div>
  </div>`;
}

export default function SessionsListV2({
  sessions = [],
  onSelect,
  selectedId = null,
  detailRenderer = _defaultDetail,
}) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [agent, setAgent] = useState('all');
  const [sort, setSort] = useState('time-desc');

  const agents = useMemo(() => {
    const s = new Set();
    for (const r of sessions) if (r.tool) s.add(r.tool);
    return [...s].sort();
  }, [sessions]);

  const filtered = useMemo(() => {
    const cmp = (SORT_OPTIONS.find(o => o.value === sort) || SORT_OPTIONS[0]).cmp;
    const q = search.trim().toLowerCase();
    return sessions
      .filter(r => status === 'all' || _statusOf(r) === status)
      .filter(r => agent === 'all' || r.tool === agent)
      .filter(r => !q || (
        (_title(r) || '').toLowerCase().includes(q)
        || (r.session_id || '').toLowerCase().includes(q)
        || (r.tool || '').toLowerCase().includes(q)
        || (r.project || '').toLowerCase().includes(q)
      ))
      .slice() // copy before sort
      .sort(cmp);
  }, [sessions, search, status, agent, sort]);

  const selected = filtered.find(r => r.session_id === selectedId) || null;

  return html`<div class="sl">
    <div class="sl-toolbar">
      <label class="sl-search">
        <span class="sl-search-icon" aria-hidden="true">\u2315</span>
        <input
          type="search"
          value=${search}
          onInput=${e => setSearch(e.target.value)}
          placeholder="Search sessions, titles, tools..."
          aria-label="Search sessions"/>
      </label>

      <select class="sl-select" aria-label="Status filter"
        value=${status} onChange=${e => setStatus(e.target.value)}>
        ${STATUS_OPTIONS.map(o => html`<option key=${o.value} value=${o.value}>${o.label}</option>`)}
      </select>

      <select class="sl-select" aria-label="Tool filter"
        value=${agent} onChange=${e => setAgent(e.target.value)}>
        <option value="all">all tools</option>
        ${agents.map(t => html`<option key=${t} value=${t}>${t}</option>`)}
      </select>

      <div class="sl-toolbar-spacer"></div>

      <select class="sl-select" aria-label="Sort order"
        value=${sort} onChange=${e => setSort(e.target.value)}>
        ${SORT_OPTIONS.map(o => html`<option key=${o.value} value=${o.value}>${o.label}</option>`)}
      </select>
      <span class="sl-count" aria-live="polite">${filtered.length} sessions</span>
    </div>

    <div class="sl-split">
      <div class="sl-pane" role="region" aria-label="Sessions table">
        <div class="sl-thead" role="row">
          <div role="columnheader">When</div>
          <div role="columnheader">Status</div>
          <div role="columnheader">Title</div>
          <div role="columnheader">Tool</div>
          <div role="columnheader" style="text-align:right">Tokens</div>
          <div role="columnheader" style="text-align:right">Files</div>
          <div role="columnheader" style="text-align:right">Duration</div>
        </div>
        ${filtered.length === 0
          ? html`<div class="sl-empty">
              No sessions match these filters.
              <small class="empty-state-source">/api/sessions</small>
            </div>`
          : filtered.map(r => {
              const isSel = r.session_id === selectedId;
              const tool = r.tool || '\u2014';
              const c = COLORS[tool] || 'var(--fg2)';
              const ic = ICONS[tool] || '\u{1F539}';
              return html`<button
                key=${r.session_id || (r.tool + r.started_at)}
                type="button"
                role="row"
                class=${'sl-row' + (isSel ? ' sl-row--sel' : '')}
                onClick=${() => onSelect && onSelect(r)}
                aria-current=${isSel ? 'true' : 'false'}>
                <div class="sl-cell sl-cell--when">${r.started_at ? fmtTime(r.started_at) : '\u2014'}</div>
                <div class="sl-cell">${_statusPill(_statusOf(r))}</div>
                <div class="sl-cell sl-cell--title" title=${_title(r)}>${esc(_title(r))}</div>
                <div class="sl-cell sl-cell--tool">
                  <span class="sl-tool-dot" style=${'background:' + c} aria-hidden="true"></span>
                  <span class="sl-tool-icon" aria-hidden="true">${ic}</span>
                  <span class="sl-tool-name">${esc(tool)}</span>
                </div>
                <div class="sl-cell sl-cell--num">${fmtK(_tokens(r))}</div>
                <div class="sl-cell sl-cell--num">${_files(r) || '\u2014'}</div>
                <div class="sl-cell sl-cell--num">${_fmtDur(r.duration_s)}</div>
              </button>`;
            })}
      </div>

      <aside class="sl-aside" role="complementary" aria-label="Session detail">
        ${detailRenderer(selected)}
      </aside>
    </div>
  </div>`;
}
