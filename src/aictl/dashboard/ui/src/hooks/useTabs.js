// ─── useTabs — active tab, URL sync, keyboard shortcuts ────────
import { useState, useCallback, useEffect, useRef } from 'preact/hooks';
import { LAYOUT } from '../layoutConfig.js';
import { readUrl, resolveTabId, tabToParams, writeUrl } from './urlState.js';

const KEY = 'aictl-pref-active_tab';
const TABS = LAYOUT.tabs;
const TAB_IDS = TABS.map(t => t.id);
const DEFAULT_TAB = TABS[0]?.id || 'overview';

function load() {
  const fromUrl = resolveTabId(readUrl().tab, TAB_IDS);
  if (fromUrl) return fromUrl;
  try {
    const v = localStorage.getItem(KEY);
    // Unknown persisted ids (removed tabs) fall back instead of rendering
    // "Unknown tab" until localStorage is cleared.
    return resolveTabId(v != null ? JSON.parse(v) : null, TAB_IDS) || DEFAULT_TAB;
  } catch { return DEFAULT_TAB; }
}

export function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export function useTabs() {
  const [activeTab, setActiveTabState] = useState(load);
  const activeRef = useRef(activeTab);
  activeRef.current = activeTab;

  const setActiveTab = useCallback((id) => {
    setActiveTabState(id);
    writeUrl(tabToParams(id, DEFAULT_TAB), { push: true });
    try { localStorage.setItem(KEY, JSON.stringify(id)); } catch { /* storage disabled */ }
  }, []);

  useEffect(() => {
    const onPop = () => setActiveTabState(load());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (isTypingTarget(e.target)) return;
      // Respect modifier keys so shortcuts don't fire on Cmd+1, etc.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '[' || e.key === ']') {
        const step = e.key === ']' ? 1 : -1;
        const at = TAB_IDS.indexOf(activeRef.current);
        setActiveTab(TAB_IDS[(at + step + TAB_IDS.length) % TAB_IDS.length]);
        return;
      }
      const tab = TABS.find(t => t.key && t.key === e.key);
      if (tab) setActiveTab(tab.id);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setActiveTab]);

  return { activeTab, setActiveTab, tabs: TABS };
}
