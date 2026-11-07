// ─── Root — which screen a URL opens ──────────────────────────────
// The board is the default. `?tab=` opens one of the detail screens, and old links
// keep working: `?tab=config` opens the board's Settings screen, and
// `?tab=explorer&session=<id>` or the `aictl:select-session` bus opens that agent
// in the board's drawer. Each side loads on demand with its own styles, so the board does
// not pay for the old screens. Crossing between them reloads the page, so the two
// stylesheets are never active together.
import { html } from 'htm/preact';
import { useEffect, useState } from 'preact/hooks';
import { LAYOUT } from './layoutConfig.js';
import { mergeSearch, resolveTabId } from './hooks/urlState.js';

const TAB_IDS = LAYOUT.tabs.map(t => t.id);
// One import() per function: the build lists each one's files to preload by call site.
const LOADERS = {
  board: () => import('./components/board/BoardScreen.js'),
  detail: () => import('./app.js'),
};

/** Screens the board shows itself. `?tab=hidden` opens the same view in its drawer. */
const ON_BOARD = new Set(['overview', 'hidden']);

/** Detail screens that became a screen of the board, by the board's `screen` value. */
const BOARD_SCREENS = { config: 'settings' };

const tabOf = search => resolveTabId(new URLSearchParams(search || '').get('tab'), TAB_IDS);

/** The session an explorer link names, or null. The agent drawer replaced that view. */
const explorerSession = (search) => {
  if (tabOf(search) !== 'explorer') return null;
  return new URLSearchParams(search || '').get('session') || null;
};

/** "detail" when the URL names a screen the board does not replace, else "board". */
export function routeOf(search) {
  const id = tabOf(search);
  if (explorerSession(search)) return 'board';
  return id && !ON_BOARD.has(id) && !BOARD_SCREENS[id] ? 'detail' : 'board';
}

/** The board query that opens one agent in the drawer, from any current query. */
export function agentLinkOf(search, sessionId) {
  return mergeSearch(search, { tab: null, session: null, screen: null, agent: sessionId });
}

/** The query that opens the same view on the board, for a tab the board took over; else null. */
export function redirectOf(search) {
  const sid = explorerSession(search);
  if (sid) return agentLinkOf(search, sid);
  const screen = BOARD_SCREENS[tabOf(search)];
  return screen ? mergeSearch(search, { tab: null, screen }) : null;
}

/**
 * Send every `aictl:select-session` request to the board's agent drawer.
 * The request comes in the click that also switches tabs, so the move waits
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
function applyRedirect() {
  const next = redirectOf(window.location.search);
  if (next === null) return;
  try {
    history.replaceState(history.state, '', window.location.pathname + next + window.location.hash);
  } catch { /* sandboxed document: the board still opens, only the address is stale */ }
}

export default function Root() {
  const [route] = useState(() => {
    applyRedirect();
    return routeOf(window.location.search);
  });
  const [View, setView] = useState(null);
  useEffect(() => {
    LOADERS[route]().then(m => setView(() => m.default));
  }, [route]);
  useEffect(() => listenSelectSession(), []);
  useEffect(() => {
    const check = () => {
      applyRedirect();
      if (routeOf(window.location.search) !== route) window.location.reload();
    };
    window.addEventListener('popstate', check);
    window.addEventListener('aictl:route', check);
    return () => {
      window.removeEventListener('popstate', check);
      window.removeEventListener('aictl:route', check);
    };
  }, [route]);
  return View ? html`<${View}/>` : null;
}
