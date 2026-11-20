// ─── useTools — tool filter state ──────────────────────────────
// enabledTools === null means "all verified tools enabled" (no filter).
// An array means "only these tools enabled". The URL wins on load and is kept
// in sync so a filtered view can be shared.
import { useState, useCallback } from 'preact/hooks';
import { loadToolFilter, toolsToParams, writeUrl } from './urlState.js';

const KEY = 'aictl-pref-tool_filter';

function persist(v) {
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage disabled */ }
  writeUrl(toolsToParams(v));
}

export function useTools(verifiedTools = []) {
  const [selectedTools, setSelectedTools] = useState(() => loadToolFilter(window.location.search));

  const setTools = useCallback((v) => {
    setSelectedTools(v);
    persist(v);
  }, []);

  const toggleTool = useCallback((toolName) => {
    setSelectedTools(prev => {
      let next;
      if (prev === null) {
        // All enabled → disable just this one.
        next = verifiedTools.filter(t => t !== toolName);
      } else if (prev.includes(toolName)) {
        next = prev.filter(t => t !== toolName);
      } else {
        next = [...prev, toolName];
        // If all verified are now selected, collapse back to "all" (null).
        if (next.length >= verifiedTools.length) next = null;
      }
      persist(next);
      return next;
    });
  }, [verifiedTools]);

  return { selectedTools, setTools, toggleTool, allTools: verifiedTools };
}
