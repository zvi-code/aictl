// ─── Lazy chunks that survive a new build ─────────────────────────
// A page that was open before the UI was built again (a rebuild, or `git pull` under a
// running daemon) asks for chunk files that are gone. The import fails; one reload loads
// the new page. A stamp in this tab's storage stops a loop when the reload does not help.

const RELOAD_KEY = 'aictl.chunkReloadAt';
const RELOAD_GUARD_MS = 60_000;
const STALE = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i;

export const isStaleChunk = e => STALE.test(String(e?.message || e || ''));

/** Reloads the page once for a missing chunk; returns false when it did not (not stale, or reloaded just now). */
export function reloadForStaleChunk(e, { now = Date.now(), storage = globalThis.sessionStorage, reload = () => globalThis.location.reload() } = {}) {
  if (!isStaleChunk(e)) return false;
  let last = 0;
  try { last = Number(storage?.getItem(RELOAD_KEY)) || 0; } catch { /* storage blocked */ }
  if (now - last < RELOAD_GUARD_MS) return false;
  try { storage?.setItem(RELOAD_KEY, String(now)); } catch { /* storage blocked */ }
  reload();
  return true;
}

/** A lazy import that reloads the page once when its chunk is gone; any other error is passed on. */
export function loadChunk(importer) {
  return importer().catch((e) => {
    if (reloadForStaleChunk(e)) return new Promise(() => {}); // the page is reloading
    throw e;
  });
}
