// ─── Root — the board is the only screen ──────────────────────────
// Old links keep working: `?tab=config` opens the board's Settings screen,
// `?tab=explorer&session=<id>` or the `aictl:select-session` bus opens that agent
// in the board's drawer, `?tab=hidden` opens the hidden-context drawer, and any
// other `?tab=` lands on the board. The address is rewritten in place, so Back
// does not return to the old link.
import { html } from 'htm/preact';
import { render } from 'preact';
import { useEffect } from 'preact/hooks';
import { agentLinkOf, boardNodeScope, redirectOf } from './hooks/urlState.js';
import BoardScreen from './components/board/BoardScreen.js';
export { agentLinkOf, redirectOf } from './hooks/urlState.js';

/**
 * Send every `aictl:select-session` request to the board's agent drawer.
 * The request comes in the click that also switches views, so the move waits
 * for that click to finish. Returns the function that stops listening.
 */
export function listenSelectSession(go = url => window.location.assign(url)) {
  const onSelect = (e) => {
    const sid = e?.detail?.sessionId;
    if (!sid) return;
    const nodeId = e.detail.nodeId || e.detail.node_id;
    setTimeout(() => {
      const loc = window.location;
      // Old local emitters only know a session ID. It is not a fleet-wide identifier.
      if (!nodeId && boardNodeScope(loc.search) !== 'local') return;
      go(loc.pathname + agentLinkOf(loc.search, sid, nodeId) + loc.hash);
    }, 0);
  };
  document.addEventListener('aictl:select-session', onSelect);
  return () => document.removeEventListener('aictl:select-session', onSelect);
}

/** Rewrite the address in place, so Back does not return to the old link. */
export function applyRedirect() {
  const next = redirectOf(window.location.search);
  if (next === null) return;
  try {
    history.replaceState(history.state, '', window.location.pathname + next + window.location.hash);
  } catch { /* sandboxed document: the board still opens, only the address is stale */ }
}

export default function Root({ liveController, startedAt } = {}) {
  applyRedirect();
  useEffect(() => listenSelectSession(), []);
  useEffect(() => {
    window.addEventListener('popstate', applyRedirect, true);
    return () => window.removeEventListener('popstate', applyRedirect, true);
  }, []);
  return html`<${BoardScreen} liveController=${liveController} startedAt=${startedAt}/>`;
}

export function mount(app, liveController, startedAt) {
  render(html`<${Root} liveController=${liveController} startedAt=${startedAt}/>`, app);
}
