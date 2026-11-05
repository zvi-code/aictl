// ─── useTheme — auto | light | dark, syncs data-theme attr ─────
import { useState, useEffect, useCallback } from 'preact/hooks';
import { THEMES } from '../utils.js';

const KEY = 'aictl-theme';
const VALID = new Set(THEMES);
const CYCLE = ['auto', 'dark', 'light'];
const EDITORIAL_FONTS = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Serif:wght@400;500;600&display=swap';

/** A local dashboard makes no third-party request unless this theme is chosen. */
function loadEditorialFonts() {
  if (document.getElementById('aictl-editorial-fonts')) return;
  const link = document.createElement('link');
  link.id = 'aictl-editorial-fonts';
  link.rel = 'stylesheet';
  link.href = EDITORIAL_FONTS;
  document.head.appendChild(link);
}

function load() {
  try { const v = localStorage.getItem(KEY); return VALID.has(v) ? v : 'auto'; }
  catch { return 'auto'; }
}

export function useTheme() {
  const [theme, setThemeState] = useState(load);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'editorial') loadEditorialFonts();
    try { localStorage.setItem(KEY, theme); } catch { /* storage disabled */ }
  }, [theme]);

  const setTheme = useCallback((t) => {
    if (VALID.has(t)) setThemeState(t);
  }, []);

  // Editorial is reachable from the command palette only: it also swaps views,
  // so it should not be one click away from the header toggle.
  const cycleTheme = useCallback(() => {
    setThemeState(t => CYCLE[(CYCLE.indexOf(t) + 1) % CYCLE.length]);
  }, []);

  return { theme, setTheme, cycleTheme, themes: THEMES };
}
