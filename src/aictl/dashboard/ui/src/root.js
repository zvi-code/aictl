// ─── Root — which screen a URL opens ──────────────────────────────
// The board is the default. `?tab=` opens one of the detail screens, and old links
// keep working. Each side loads on demand with its own styles, so the board does
// not pay for the old screens. Crossing between them reloads the page, so the two
// stylesheets are never active together.
import { html } from 'htm/preact';
import { useEffect, useState } from 'preact/hooks';
import { LAYOUT } from './layoutConfig.js';
import { resolveTabId } from './hooks/urlState.js';

const TAB_IDS = LAYOUT.tabs.map(t => t.id);
// One import() per function: the build lists each one's files to preload by call site.
const LOADERS = {
  board: () => import('./components/board/BoardScreen.js'),
  detail: () => import('./app.js'),
};

/** Screens the board shows itself. `?tab=hidden` opens the same view in its drawer. */
const ON_BOARD = new Set(['overview', 'hidden']);

/** "detail" when the URL names a screen the board does not replace, else "board". */
export function routeOf(search) {
  const id = resolveTabId(new URLSearchParams(search || '').get('tab'), TAB_IDS);
  return id && !ON_BOARD.has(id) ? 'detail' : 'board';
}

export default function Root() {
  const [route] = useState(() => routeOf(window.location.search));
  const [View, setView] = useState(null);
  useEffect(() => {
    LOADERS[route]().then(m => setView(() => m.default));
  }, [route]);
  useEffect(() => {
    const check = () => { if (routeOf(window.location.search) !== route) window.location.reload(); };
    window.addEventListener('popstate', check);
    window.addEventListener('aictl:route', check);
    return () => {
      window.removeEventListener('popstate', check);
      window.removeEventListener('aictl:route', check);
    };
  }, [route]);
  return View ? html`<${View}/>` : null;
}
