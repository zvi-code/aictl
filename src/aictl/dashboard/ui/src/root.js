// ─── Root — the board is the only screen ──────────────────────────
// Old links keep working: `?tab=config` opens the board's Settings screen,
// `?tab=explorer&session=<id>` or the `aictl:select-session` bus opens that agent
// in the board's drawer, `?tab=hidden` opens the hidden-context drawer, and any
// other `?tab=` lands on the board. The address is rewritten in place, so Back
// does not return to the old link.
import { html } from 'htm/preact';
import { useEffect } from 'preact/hooks';
import { mergeSearch } from './hooks/urlState.js';
import BoardScreen from './components/board/BoardScreen.js';

/** Old screens that became a screen of the board, by the board's `screen` value. */
const BOARD_SCREENS = { config: 'settings', configuration: 'settings' };
/** Old screens whose `session=` opens the agent drawer. */
const SESSION_TABS = new Set(['explorer', 'sessions', 'session-explorer']);
/** Old tab values the board reads itself. */
const KEPT_TABS = new Set(['hidden']);

const tabOf = search => new URLSearchParams(search || '').get('tab');

/** The board query that opens one agent in the drawer, from any current query. */
export function agentLinkOf(search, sessionId) {
  return mergeSearch(search, { tab: null, session: null, screen: null, agent: sessionId });
}

/** The query that opens the same view on the board, for an old link; null when the link stands. */
export function redirectOf(search) {
  const tab = tabOf(search);
  if (!tab || KEPT_TABS.has(tab)) return null;
  const sid = new URLSearchParams(search || '').get('session');
  if (SESSION_TABS.has(tab) && sid) return agentLinkOf(search, sid);
  const screen = BOARD_SCREENS[tab];
  return mergeSearch(search, screen ? { tab: null, screen } : { tab: null });
}

/**
 * Send every `aictl:select-session` request to the board's agent drawer.
 * The request comes in the click that also switches views, so the move waits
 * for that click to finish. Returns the function that stops listening.
 */
export function listenSelectSession(go = url => window.location.assign(url)) {
  const onSelect = (e) => {
    const sid = e?.detail?.sessionId;
    if (!sid) return;
    setTimeout(() => {
      const loc = window.location;
      go(loc.pathname + agentLinkOf(loc.search, sid) + loc.hash);
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

export default function Root() {
  applyRedirect();
  useEffect(() => listenSelectSession(), []);
  useEffect(() => {
    window.addEventListener('popstate', applyRedirect);
    return () => window.removeEventListener('popstate', applyRedirect);
  }, []);
  return html`<${BoardScreen}/>`;
}
