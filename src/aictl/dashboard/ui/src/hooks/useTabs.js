// ─── useTabs — active tab + keyboard shortcuts ─────────────────
import { useState, useCallback, useEffect } from 'preact/hooks';
import { LAYOUT } from '../layoutConfig.js';

const KEY = 'aictl-pref-active_tab';
const TABS = LAYOUT.tabs;

function load() {
  try { const v = localStorage.getItem(KEY); return v != null ? JSON.parse(v) : 'overview'; }
  catch { return 'overview'; }
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
