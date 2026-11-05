// ─── gateContext — stop re-rendering static views on every SSE tick ──
// Every SnapContext consumer re-renders when the context value changes. Views
// that do not chart live data (budget, config, context files...) only need a
// periodic refresh, so they keep the previous value between refreshes. Filter
// and tab changes pass through at once.

export const LIVE_TABS = new Set(['overview', 'live', 'procs', 'events', 'explorer']);
export const STATIC_REFRESH_MS = 30000;

/**
 * @param {{value: object, at: number, tab: string}|null} prev  previous gate state
 * @param {object} next  freshly computed context value
 * @param {{activeTab: string, now?: number}} opts
 */
export function gateContext(prev, next, { activeTab, now = Date.now() }) {
  const open = { value: next, at: now, tab: activeTab };
  if (!prev || LIVE_TABS.has(activeTab) || prev.tab !== activeTab) return open;
  const hadSnap = !!prev.value?.snap;
  if (!hadSnap && next.snap) return open;
  const sameScope = prev.value.enabledTools === next.enabledTools
    && prev.value.globalRange === next.globalRange
    && prev.value.openViewer === next.openViewer
    && prev.value.recentFiles === next.recentFiles;
  if (!sameScope || now - prev.at >= STATIC_REFRESH_MS) return open;
  return prev;
}
