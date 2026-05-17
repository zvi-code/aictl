// ─── Global range selector bar ─────────────────────────────────
import { useState, useRef, useCallback } from 'preact/hooks';
import { html } from 'htm/preact';
import { RANGE_PRESETS } from '../hooks/useRange.js';

function toLocalISOString(ts) {
  const d = new Date(ts * 1000);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export default function RangeBar({ globalRange, onPreset, onApplyCustom }) {
  const [showCustom, setShowCustom] = useState(false);
  const startRef = useRef(null);
  const endRef = useRef(null);

  const toggleCustom = useCallback(() => {
    setShowCustom(true);
    requestAnimationFrame(() => {
      if (!startRef.current || !endRef.current) return;
      if (globalRange.until != null) {
        startRef.current.value = toLocalISOString(globalRange.since);
        endRef.current.value = toLocalISOString(globalRange.until);
      } else {
        const preset = RANGE_PRESETS.find(r => r.id === globalRange.id);
        const now = Date.now() / 1000;
        const secs = preset?.seconds || 86400;
        startRef.current.value = toLocalISOString(now - secs);
        endRef.current.value = toLocalISOString(now);
      }
    });
  }, [globalRange]);

  const apply = useCallback(() => {
    const s = startRef.current?.value, e = endRef.current?.value;
    if (!s || !e) return;
    const since = new Date(s).getTime() / 1000;
    const until = new Date(e).getTime() / 1000;
    if (!Number.isFinite(since) || !Number.isFinite(until) || until <= since) return;
    onApplyCustom(since, until);
    setShowCustom(false);
  }, [onApplyCustom]);

  return html`<div class="global-range-bar">
    <div class="range-bar">
      <span class="range-label">Range:</span>
      ${RANGE_PRESETS.map(r => html`<button key=${r.id}
        class=${globalRange.id === r.id && !showCustom ? 'range-btn active' : 'range-btn'}
        onClick=${() => { onPreset(r.id); setShowCustom(false); }}>${r.label}</button>`)}
      <button class=${showCustom || globalRange.id === 'custom' ? 'range-btn active' : 'range-btn'}
        onClick=${toggleCustom}>Custom</button>
    </div>
    ${showCustom && html`<div class="es-custom-range">
      <label><span class="range-label">From</span>
        <input type="datetime-local" class="es-date-input" ref=${startRef} /></label>
      <label><span class="range-label">To</span>
        <input type="datetime-local" class="es-date-input" ref=${endRef} /></label>
      <button class="range-btn active" onClick=${apply} style="font-weight:600">Apply</button>
    </div>`}
  </div>`;
}
