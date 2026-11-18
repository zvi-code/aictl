import { html } from 'htm/preact';
import { useState } from 'preact/hooks';
import { parseCustomRange, toLocalISOString } from '../../utils/customRange.js';
import { RANGES, windowOf } from './filters.js';

function CustomRange({ range, onApply, onClose }) {
  const win = windowOf(range);
  const [start, setStart] = useState(toLocalISOString(win.since));
  const [end, setEnd] = useState(toLocalISOString(win.until));
  const [err, setErr] = useState('');
  const apply = e => {
    e.preventDefault();
    const r = parseCustomRange(start, end);
    if (r.error) { setErr(r.error); return; }
    onApply(r.since, r.until);
    onClose();
  };
  return html`<form class="bd-menu bd-crange" style="left:0;top:32px" onSubmit=${apply}>
    <label>From <input type="datetime-local" value=${start} onInput=${e => setStart(e.target.value)}/></label>
    <label>To <input type="datetime-local" value=${end} onInput=${e => setEnd(e.target.value)}/></label>
    <div class="bd-crange-err" aria-live="polite">${err}</div>
    <button type="submit" class="bd-btn bd-p">Apply</button>
  </form>`;
}

export default function BoardRange({ range, open, onToggle, onRange, onCustom, onClose }) {
  return html`<div class="bd-anch">
    <div class="bd-seg" role="group" aria-label="Time range">
      ${RANGES.map(r => html`<button key=${r.id} type="button" aria-pressed=${range.id === r.id} onClick=${() => onRange(r.id)}>${r.label}</button>`)}
      <button type="button" aria-pressed=${range.id === 'custom'} aria-expanded=${open} onClick=${onToggle}>Custom</button>
    </div>
    ${open && html`<${CustomRange} range=${range} onApply=${onCustom} onClose=${onClose}/>`}
  </div>`;
}
