// ─── useTabs — active tab + keyboard shortcuts ─────────────────
import { useState, useCallback, useEffect } from 'preact/hooks';
import { LAYOUT } from '../layoutConfig.js';

const KEY = 'aictl-pref-active_tab';
const TABS = LAYOUT.tabs;
const DEFAULT_TAB = TABS[0]?.id || 'overview';

function load() {
  try {
    const v = localStorage.getItem(KEY);
    const id = v != null ? JSON.parse(v) : DEFAULT_TAB;
    // Guard against a persisted tab id that no longer exists in the
    // registry (e.g. the removed 'sessions' id) — otherwise the app is
    // stuck rendering "Unknown tab" until localStorage is cleared.
    return TABS.some(t => t.id === id) ? id : DEFAULT_TAB;
  }
  catch { return DEFAULT_TAB; }
}

export function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export function useTabs() {
  const [activeTab, setActiveTabState] = useState(load);

  const setActiveTab = useCallback((id) => {
    setActiveTabState(id);
    try { localStorage.setItem(KEY, JSON.stringify(id)); } catch { /* storage disabled */ }
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (isTypingTarget(e.target)) return;
      // Respect modifier keys so shortcuts don't fire on Cmd+1, etc.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tab = TABS.find(t => t.key === e.key);
      if (tab) setActiveTab(tab.id);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setActiveTab]);

  return { activeTab, setActiveTab, tabs: TABS };
}
