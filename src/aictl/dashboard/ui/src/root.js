// ─── Root — which screen a URL opens ──────────────────────────────
// The board is the default. `?tab=` opens one of the detail screens, and old links
// keep working: `?tab=config` opens the board's Settings screen. Each side loads on demand with its own styles, so the board does
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

/** "detail" when the URL names a screen the board does not replace, else "board". */
export function routeOf(search) {
  const id = tabOf(search);
  return id && !ON_BOARD.has(id) && !BOARD_SCREENS[id] ? 'detail' : 'board';
}

/** The query that opens the same view on the board, for a tab the board took over; else null. */
export function redirectOf(search) {
  const screen = BOARD_SCREENS[tabOf(search)];
  return screen ? mergeSearch(search, { tab: null, screen }) : null;
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
