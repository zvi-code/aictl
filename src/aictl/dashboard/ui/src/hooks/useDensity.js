// ─── useDensity — compact | normal | spacious, syncs data-density
import { useState, useEffect, useCallback } from 'preact/hooks';

export const DENSITIES = ['compact', 'normal', 'spacious'];
const KEY = 'aictl-density';
const VALID = new Set(DENSITIES);

function load() {
  try { const v = localStorage.getItem(KEY); return VALID.has(v) ? v : 'normal'; }
  catch { return 'normal'; }
}

export function useDensity() {
  const [density, setDensityState] = useState(load);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
    try { localStorage.setItem(KEY, density); } catch { /* storage disabled */ }
  }, [density]);

  const setDensity = useCallback((d) => {
    if (VALID.has(d)) setDensityState(d);
  }, []);

  return { density, setDensity, densities: DENSITIES };
}
