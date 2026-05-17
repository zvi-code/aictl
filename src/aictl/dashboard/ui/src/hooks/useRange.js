// ─── useRange — global time-range state ────────────────────────
// Owns: selected preset (live/1h/6h/24h/7d/custom) + localStorage persistence.
import { useState, useCallback } from 'preact/hooks';

export const RANGE_PRESETS = [
  { id: 'live', label: 'Live', seconds: 3600 },
  { id: '1h',   label: '1h',   seconds: 3600 },
  { id: '6h',   label: '6h',   seconds: 21600 },
  { id: '24h',  label: '24h',  seconds: 86400 },
  { id: '7d',   label: '7d',   seconds: 604800 },
];
export const RANGE_SECONDS = Object.fromEntries(RANGE_PRESETS.map(r => [r.id, r.seconds]));
const KEY = 'aictl-pref-range';

function loadId() {
  try { const v = localStorage.getItem(KEY); return v != null ? JSON.parse(v) : 'live'; }
  catch { return 'live'; }
}
function persistId(id) {
  try { localStorage.setItem(KEY, JSON.stringify(id)); } catch { /* storage disabled */ }
}

function buildFromPreset(id) {
  const secs = RANGE_SECONDS[id] || 3600;
  return { id, since: Date.now() / 1000 - secs, until: null };
}

export function useRange() {
  const [range, setRangeState] = useState(() => buildFromPreset(loadId()));

  const setPreset = useCallback((id) => {
    const next = buildFromPreset(id);
    setRangeState(next);
    persistId(id);
  }, []);

  const setCustom = useCallback((since, until) => {
    setRangeState({ id: 'custom', since, until });
  }, []);

  // Accepts a preset id string OR a full range object (for restore / external sync).
  const setRange = useCallback((r) => {
    if (typeof r === 'string') setPreset(r);
    else if (r && typeof r === 'object') setRangeState(r);
  }, [setPreset]);

  return { range, setRange, setPreset, setCustom, presets: RANGE_PRESETS };
}
