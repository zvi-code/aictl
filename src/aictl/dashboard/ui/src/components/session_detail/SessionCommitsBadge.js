/**
 * SessionCommitsBadge — git commit attribution badge for the Explorer
 * SessionHeader.
 *
 * Renders nothing unless the session has at least one attributed
 * commit. Clicking the badge toggles an inline dropdown listing up
 * to 20 commits; commits not reachable from the session's recorded
 * branch are dimmed with a "not on <branch>" hint.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { html } from 'htm/preact';
import { esc } from '../../utils.js';
import * as api from '../../api.js';

const MAX_ROWS = 20;

export default function SessionCommitsBadge({ session }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null); // {commits, branch}
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const rootRef = useRef(null);

  const count = session && session.commit_count
    ? session.commit_count
    : (data ? data.commits.length : 0);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Fetch on first open.
  useEffect(() => {
    if (!open || data || loading) return;
    if (!session || !session.session_id) return;
    setLoading(true);
    api.getSessionCommits(session.session_id).then((d) => {
      setData(d && d.commits ? d : { commits: [], branch: '' });
      setLoading(false);
    }).catch((e) => {
      setErr(String(e));
      setLoading(false);
    });
  }, [open, data, loading, session]);

  if (!session) return null;
  if (!count) return null;
  if (!session.project) return null;

  const label = count === 1 ? '1 commit' : count + ' commits';

  return html`<span ref=${rootRef} class="scb-root" style="position:relative">
    <button type="button"
      class="badge text-xs"
      aria-expanded=${open}
      aria-label="Show ${label} for this session"
      onClick=${() => setOpen(v => !v)}
      style="background:var(--bg2);color:var(--fg);border:1px solid var(--bd);
             cursor:pointer;padding:1px 6px;border-radius:3px">
      <span aria-hidden="true" style="margin-right:3px">⎇</span>${esc(label)}
    </button>
    ${open && html`<div class="scb-dropdown" role="menu"
      style="position:absolute;top:calc(100% + 4px);left:0;z-index:50;
             min-width:280px;max-width:480px;max-height:320px;overflow:auto;
             background:var(--bg1);border:1px solid var(--bd);
             border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.25);
             padding:var(--sp-1)">
      ${loading && html`<div class="text-muted text-xs" style="padding:var(--sp-2)">Loading…</div>`}
      ${err && html`<div class="text-muted text-xs" style="padding:var(--sp-2);color:var(--red)">
        ${esc(err)}
      </div>`}
      ${!loading && !err && data && _renderList(data)}
    </div>`}
  </span>`;
}

function _renderList(data) {
  const commits = (data.commits || []).slice(0, MAX_ROWS);
  const branch = data.branch || '';
  if (commits.length === 0) {
    return html`<div class="text-muted text-xs" style="padding:var(--sp-2)">
      No commits attributed.
    </div>`;
  }
  return html`<ul class="scb-list" role="none"
    style="list-style:none;margin:0;padding:0">
    ${commits.map(c => _row(c, branch))}
    ${(data.commits || []).length > MAX_ROWS && html`<li class="text-muted text-xs"
      style="padding:var(--sp-1) var(--sp-2)">
      …and ${(data.commits || []).length - MAX_ROWS} more
    </li>`}
  </ul>`;
}

function _row(c, branch) {
  const offBranch = branch && !c.current_branch_match;
  const dimStyle = offBranch ? 'opacity:0.55;' : '';
  const title = offBranch && branch
    ? 'not on ' + branch
    : (c.author_name ? c.author_name + ' <' + c.author_email + '>' : '');
  const style = 'display:flex;gap:var(--sp-2);align-items:baseline;'
    + 'padding:3px var(--sp-2);font-size:var(--fs-xs);' + dimStyle;
  return html`<li class="scb-row" role="menuitem"
    title=${title}
    style=${style}>
    <code class="mono"
      style="color:var(--fg2);flex:0 0 auto">${esc(c.short_sha)}</code>
    <span class="text-ellipsis"
      style="flex:1 1 auto;min-width:0">${esc(c.subject || '(no subject)')}</span>
    ${offBranch && html`<span class="text-muted text-xs"
      style="flex:0 0 auto;font-style:italic">not on ${esc(branch)}</span>`}
  </li>`;
}
