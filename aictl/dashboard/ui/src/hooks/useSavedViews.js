// ─── useSavedViews — CRUD + URL persistence for named view presets
import { useState, useCallback, useEffect, useMemo } from 'preact/hooks';

const STORAGE_KEY = 'aictl-views-v1';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function persist(views) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(views)); } catch { /* noop */ }
}

/** Stable, cheap hash of the current state snapshot — used to detect
 *  whether live state matches a saved view. */
function hashState(state) {
  try {
    const s = JSON.stringify({
      tab: state.tab, range: state.range,
      tools: Array.isArray(state.tools) ? [...state.tools].sort() : state.tools,
      density: state.density, theme: state.theme,
    });
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return String(h);
  } catch { return ''; }
}

function newId() {
  return 'v_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

/**
 * @param currentState { tab, range, tools, density, theme }
 * @param apply   callback invoked when applyView runs; receives the view
 */
export function useSavedViews(currentState, apply) {
  const [views, setViews] = useState(load);

  // Apply from URL on first mount (runs once).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('view');
      if (!id) return;
      const v = load().find(x => x.id === id);
      if (v && apply) apply(v);
    } catch { /* noop */ }
    // apply intentionally not in deps — strictly one-shot URL bootstrap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveView = useCallback((name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    const view = {
      id: newId(),
      name: trimmed,
      tab: currentState.tab,
      range: currentState.range,
      tools: currentState.tools,
      density: currentState.density,
      theme: currentState.theme,
      createdAt: Date.now(),
    };
    setViews(prev => {
      const next = [...prev, view];
      persist(next);
      return next;
    });
    return view;
  }, [currentState]);

  const deleteView = useCallback((id) => {
    setViews(prev => {
      const next = prev.filter(v => v.id !== id);
      persist(next);
      return next;
    });
  }, []);

  const applyView = useCallback((id) => {
    const v = views.find(x => x.id === id);
    if (!v) return false;
    if (apply) apply(v);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('view', id);
      window.history.replaceState({}, '', url.toString());
    } catch { /* noop */ }
    return true;
  }, [views, apply]);

  const currentHash = useMemo(() => hashState(currentState), [currentState]);

  const matchingView = useMemo(() => (
    views.find(v => hashState({
      tab: v.tab, range: v.range, tools: v.tools, density: v.density, theme: v.theme,
    }) === currentHash) || null
  ), [views, currentHash]);

  return { views, saveView, deleteView, applyView, currentHash, matchingView };
}
