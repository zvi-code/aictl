// ─── Global range selector bar ─────────────────────────────────
import { useState, useRef, useCallback } from 'preact/hooks';
import { html } from 'htm/preact';
import { RANGE_PRESETS } from '../hooks/useRange.js';
import { parseCustomRange, toLocalISOString } from '../utils/customRange.js';

export default function RangeBar({ globalRange, onPreset, onApplyCustom }) {
  const [showCustom, setShowCustom] = useState(false);
  const [rangeError, setRangeError] = useState('');
  const startRef = useRef(null);
  const endRef = useRef(null);

  const toggleCustom = useCallback(() => {
    setShowCustom(true);
    setRangeError('');
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
    const { since, until, error } = parseCustomRange(startRef.current?.value, endRef.current?.value);
    if (error) { setRangeError(error); return; }
    setRangeError('');
    onApplyCustom(since, until);
    setShowCustom(false);
  }, [onApplyCustom]);

  return html`<div class="global-range-bar">
    <div class="range-bar" role="group" aria-label="Time range">
      ${RANGE_PRESETS.map(r => html`<button key=${r.id}
        class=${globalRange.id === r.id && !showCustom ? 'range-btn active' : 'range-btn'}
        aria-pressed=${globalRange.id === r.id && !showCustom ? 'true' : 'false'}
        onClick=${() => { onPreset(r.id); setShowCustom(false); setRangeError(''); }}>${r.label}</button>`)}
      <button class=${showCustom || globalRange.id === 'custom' ? 'range-btn active' : 'range-btn'}
        onClick=${toggleCustom}>Custom</button>
    </div>
    ${showCustom && html`<div class="es-custom-range">
      <label><span class="range-label">From</span>
        <input type="datetime-local" class="es-date-input" ref=${startRef} /></label>
      <label><span class="range-label">To</span>
        <input type="datetime-local" class="es-date-input" ref=${endRef} /></label>
      <button class="range-btn active" onClick=${apply} style="font-weight:600">Apply</button>
      <span class="error-state" aria-live="polite"
        style="padding:0 var(--sp-2);font-size:var(--fs-xs)">${rangeError}</span>
    </div>`}
  </div>`;
}
