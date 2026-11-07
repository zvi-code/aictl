// A setting's value drawn as the control that will change it: a switch for a
// flag, a select box for a text setting with a few options, an item count for
// a list or map. Every control is read-only.
import { useState } from 'preact/hooks';
import { html } from 'htm/preact';
import { DASH, inferKind, isOn, optionsFor } from './model.js';

function itemText(v) {
  if (v === null || v === undefined) return DASH;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function Items({ value, compact }) {
  const [open, setOpen] = useState(false);
  const list = Array.isArray(value);
  const entries = list ? value.map((v, i) => [i, v]) : Object.entries(value || {});
  const n = entries.length;
  if (!n) return html`<span class="st-none">none</span>`;
  const chip = html`<span class="st-chip st-chip--mono st-items">${n} ${n === 1 ? 'item' : 'items'}</span>`;
  if (compact) return chip;
  return html`<span class="st-itemsbox">
    ${chip}
    <button type="button" class="st-link" aria-expanded=${open ? 'true' : 'false'}
      onClick=${e => { e.stopPropagation(); setOpen(!open); }}>${open ? 'hide' : 'show'}</button>
    ${open && html`<ul class="st-itemlist">
      ${entries.map(([k, v]) => html`<li key=${k} class="st-mono" title=${list ? itemText(v) : `${k}: ${itemText(v)}`}>
        ${list ? itemText(v) : html`<span class="st-itemkey">${k}:</span> ${itemText(v)}`}</li>`)}
    </ul>`}
  </span>`;
}

export function Value({ row, value, compact = false }) {
  const v = value !== undefined ? value : row.value;
  const kind = row.kind || inferKind(v);
  const risky = !!row.risky;
  if (kind === 'flag' || typeof v === 'boolean') {
    if (v === null || v === undefined) return html`<span class="st-none">${DASH}</span>`;
    const on = isOn(v);
    return html`<span class=${'st-flag' + (on ? ' is-on' : '') + (risky ? ' is-risky' : '')}>
      <span class="st-switch" aria-hidden="true"></span><span class="st-flag__text">${on ? 'on' : 'off'}</span>
    </span>`;
  }
  if (v === null || v === undefined || v === '') return html`<span class="st-none">${DASH}</span>`;
  if (kind === 'list' || kind === 'map' || typeof v === 'object') return html`<${Items} value=${v} compact=${compact}/>`;
  const text = String(v);
  const opts = optionsFor({ ...row, value: v });
  if (opts) {
    return html`<span class=${'st-select' + (risky ? ' is-risky' : '')} title=${'Options: ' + opts.join(', ')}>${text}</span>`;
  }
  if (kind === 'path') return html`<span class="st-v st-path" title=${text}>${text}</span>`;
  return html`<span class=${'st-v' + (risky ? ' is-risky' : '')} title=${text}>${text}</span>`;
}

export function ScopeChip({ scope }) {
  const s = scope || 'default';
  return html`<span class=${'st-chip st-scope st-scope--' + s.replace(/[^a-z-]/gi, '')}>${s}</span>`;
}

export default Value;
