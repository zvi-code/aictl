// ─── Agent drawer tabs — shared helpers ───────────────────────────
// The session views read the legacy session routes, which take a session id.
// A subagent shares the session of its main agent.
import { html } from 'htm/preact';
import { useState } from 'preact/hooks';
import { NA, isLive } from '../format.js';

/** The session id of a board agent: its own id, or its parent's for a subagent. */
export const sessionIdOf = a => a.parent_id || a.id;

/** The time of the agent with a minute of slack on each side, in whole seconds. */
export function windowOf(a, now = Date.now() / 1000) {
  const start = a.started_at || now - 86400;
  return { since: Math.floor(start - 60), until: Math.ceil((a.ended_at || now) + 60) };
}

/** Running, looping or waiting: the agent still writes to its session. */
export const isActive = st => st === 'running' || st === 'looping' || st === 'waiting';
export { isLive };

const pad = n => String(n).padStart(2, '0');
/** "14:20:05" for a time in seconds. */
export function clock(ts) {
  if (ts == null || !Number.isFinite(ts)) return NA;
  const d = new Date(ts * 1000);
  return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

/** JSON text indented, or the value as text when it is not JSON. */
export function pretty(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string') {
    try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
  }
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

export const clip = (s, n) => {
  const t = String(s == null ? '' : s);
  return t.length > n ? t.slice(0, n) + '…' : t;
};

/** Buttons of which one is on. */
export function Seg({ label, items, value, onPick }) {
  return html`<div class="bd-seg bd-seg-sm" role="group" aria-label=${label}>
    ${items.map(([id, text]) => html`<button key=${id} type="button" aria-pressed=${value === id ? 'true' : 'false'} onClick=${() => onPick(id)}>${text}</button>`)}
  </div>`;
}

/** A value kept in this browser. Storage that is blocked keeps it for the page only. */
export function usePref(key, fallback, allowed) {
  const [value, setValue] = useState(() => {
    try {
      const v = localStorage.getItem(key);
      return allowed.includes(v) ? v : fallback;
    } catch { return fallback; }
  });
  const set = (v) => {
    setValue(v);
    try { localStorage.setItem(key, v); } catch { /* storage blocked */ }
  };
  return [value, set];
}

/** For a subagent: the session views show the whole session. */
export const SessionNote = ({ a }) => (a.parent_id
  ? html`<div class="bd-note bd-ag-top">This view shows the whole session of the main agent, with every subagent.</div>`
  : null);

/** A message when a route gave no data or failed. */
export const Failed = ({ error, what }) => html`<div class="bd-empty" role="status">Could not load ${what}: ${error?.message || 'unknown error'}</div>`;

/** The palette slot of the n-th name, so each name keeps one color in a view. */
const SLOTS = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)'];
export const slotColor = i => SLOTS[((i % SLOTS.length) + SLOTS.length) % SLOTS.length];

/** Loading or failed, across the whole drawer width. */
export const Wait = ({ error, what }) => html`<div class="bd-ag-top"><div class="bd-empty" role="status">${error ? 'Could not load ' + what + ': ' + (error.message || 'unknown error') : 'Loading...'}</div></div>`;
