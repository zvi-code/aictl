// ─── useRange — global time-range state ────────────────────────
// Owns: selected preset (live/1h/6h/24h/7d/custom). The URL wins on load and
// is kept in sync; localStorage holds the last preset for a bare URL.
import { useState, useCallback, useEffect } from 'preact/hooks';
import { rangeToParams, readUrl, writeUrl } from './urlState.js';

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
  try {
    const v = localStorage.getItem(KEY);
    const id = v != null ? JSON.parse(v) : 'live';
    return RANGE_SECONDS[id] ? id : 'live';
  } catch { return 'live'; }
}
function persistId(id) {
  try { localStorage.setItem(KEY, JSON.stringify(id)); } catch { /* storage disabled */ }
}

function buildFromPreset(id) {
  const secs = RANGE_SECONDS[id] || 3600;
  return { id, since: Date.now() / 1000 - secs, until: null };
}

function loadRange() {
  const fromUrl = readUrl().range;
  if (fromUrl?.id === 'custom') return fromUrl;
  if (fromUrl && RANGE_SECONDS[fromUrl.id]) return buildFromPreset(fromUrl.id);
  return buildFromPreset(loadId());
}

export function useRange() {
  const [range, setRangeState] = useState(loadRange);

  // A bare URL restored from localStorage should still be copyable as-is.
  useEffect(() => { writeUrl(rangeToParams(range)); }, [range]);

  const setPreset = useCallback((id) => {
    setRangeState(buildFromPreset(id));
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
