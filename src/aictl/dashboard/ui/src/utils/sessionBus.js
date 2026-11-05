// ─── Session-select bus ─────────────────────────────────────────
// The Overview, command palette and CSessionsTab dispatch
// `aictl:select-session` on document (detail = { sessionId, tool }), usually in
// the click that switches to the explorer, so before TabExplorer mounts and,
// since tabs are lazy, possibly before its chunk has loaded. This module is
// imported eagerly by app.js so the request survives until TabExplorer takes it.
//
// It also remembers the session the explorer last showed, so leaving the view
// and coming back returns to the same drill-down, and seeds from `?session=`
// so a copied link opens that session.
let pending = null;
let remembered = null;

if (typeof document !== 'undefined') {
  document.addEventListener('aictl:select-session', (e) => {
    pending = e?.detail?.sessionId ? e.detail : null;
  });
  const fromUrl = new URLSearchParams(window.location.search).get('session');
  if (fromUrl) pending = { sessionId: fromUrl, tool: null };
}

/** Consume the outstanding request, else fall back to the last-shown session. */
export function takePendingSelect() {
  const p = pending || remembered;
  pending = null;
  return p;
}

export function clearPendingSelect() {
  pending = null;
}

export function rememberSession(sessionId, tool) {
  remembered = sessionId ? { sessionId, tool: tool || null } : null;
}
