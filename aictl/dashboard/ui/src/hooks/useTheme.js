// ─── useTheme — auto | light | dark, syncs data-theme attr ─────
import { useState, useEffect, useCallback } from 'preact/hooks';
import { THEMES } from '../utils.js';

const KEY = 'aictl-theme';
const VALID = new Set(THEMES);

function load() {
  try { const v = localStorage.getItem(KEY); return VALID.has(v) ? v : 'auto'; }
  catch { return 'auto'; }
}

export function useTheme() {
  const [theme, setThemeState] = useState(load);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(KEY, theme); } catch { /* storage disabled */ }
  }, [theme]);

  const setTheme = useCallback((t) => {
    if (VALID.has(t)) setThemeState(t);
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeState(t => THEMES[(THEMES.indexOf(t) + 1) % THEMES.length]);
  }, []);

  return { theme, setTheme, cycleTheme, themes: THEMES };
}
