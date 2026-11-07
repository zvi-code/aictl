// ─── Board command palette and keyboard shortcuts ─────────────────
// Cmd/Ctrl+K opens the palette: go to a section or screen, set the time range,
// show or hide a tool, open an agent, change the theme or row height, reset the
// layout. The commands used last come first. `?` lists the keyboard shortcuts.
import { html } from 'htm/preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { focusTrap } from '../../utils/a11y.js';
import { Ico, PATHS } from './icons.js';

export const RECENT_KEY = 'aictl-board-palette-recent-v1';
export const RECENT_MAX = 6;

export function loadRecent(storage = globalThis.localStorage) {
  try {
    const v = JSON.parse(storage?.getItem(RECENT_KEY) || '[]');
    return Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, RECENT_MAX) : [];
  } catch { return []; }
}
export function saveRecent(ids, storage = globalThis.localStorage) {
  try { storage?.setItem(RECENT_KEY, JSON.stringify(ids)); } catch { /* storage unavailable: the order is kept for this page only */ }
}
export const pushRecent = (list, id) => [id, ...list.filter(x => x !== id)].slice(0, RECENT_MAX);

/** How well a command matches the query. 0 is no match; a label that starts with it ranks first. */
export function scoreCommand(cmd, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return 1;
  const label = String(cmd.label || '').toLowerCase();
  const hay = label + ' ' + String(cmd.group || '').toLowerCase() + ' ' + String(cmd.keywords || '').toLowerCase();
  if (label.startsWith(q)) return 1000 - label.length;
  const word = label.indexOf(' ' + q);
  if (word >= 0) return 800 - word;
  const at = label.indexOf(q);
  if (at >= 0) return 600 - at;
  if (hay.includes(q)) return 300;
  const words = q.split(/\s+/);
  if (words.length > 1 && words.every(w => hay.includes(w))) return 200;
  let j = 0;
  for (const ch of label) {
    if (ch === q[j]) j += 1;
    if (j === q.length) return 50;
  }
  return 0;
}

/** The commands in the order shown: with no query the recent ones first, else the best matches first. */
export function rankCommands(commands, query, recent = []) {
  const byId = new Map(commands.map(c => [c.id, c]));
  if (!String(query || '').trim()) {
    const first = recent.map(id => byId.get(id)).filter(Boolean).map(c => ({ ...c, group: 'Recent' }));
    return first.concat(commands.filter(c => !recent.includes(c.id)));
  }
  return commands
    .map((c, i) => ({ c, i, s: scoreCommand(c, query) + (recent.includes(c.id) ? 5 : 0) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map(x => x.c);
}

const PIVOTS = [['tool', 'By tool'], ['topic', 'By topic'], ['files', 'Files'], ['findings', 'Findings']];

/** Every command of the board, from the sections, the filters and the agents it shows now. */
export function boardCommands({ sections, ranges, rangeId, tools, agents, theme, density, screen, go }) {
  const out = [];
  sections.forEach((s, i) => out.push({ id: 'sec:' + s.id, group: 'Go to', label: 'Go to ' + s.title, keywords: s.keywords || '', shortcut: i < 9 ? String(i + 1) : '', run: () => go.section(s.id) }));
  out.push({ id: 'screen:board', group: 'Screens', label: 'Board', keywords: 'overview home', run: () => go.screen('board'), on: screen === 'board' });
  out.push({ id: 'screen:settings', group: 'Screens', label: 'Settings', shortcut: 's', run: () => go.screen('settings'), on: screen === 'settings' });
  for (const [p, label] of PIVOTS) out.push({ id: 'settings:' + p, group: 'Screens', label: 'Settings: ' + label, run: () => go.settings(p) });
  for (const r of ranges) out.push({ id: 'range:' + r.id, group: 'Time range', label: 'Show the last ' + r.label, keywords: 'range time ' + r.id, run: () => go.range(r.id), on: rangeId === r.id });
  for (const t of tools) out.push({ id: 'tool:' + t.id, group: 'Tools', label: (t.on ? 'Hide ' : 'Show ') + t.label, keywords: 'tool filter ' + t.id, run: () => go.tool(t.id) });
  for (const a of agents) {
    if (a.placeholder) continue;
    const name = a.parent_id ? (a.role || a.title) + ' (subagent)' : a.title;
    out.push({ id: 'agent:' + a.id, group: 'Agents', label: 'Open agent ' + (name || a.id), keywords: [a.id, a.short, a.tool, a.project].filter(Boolean).join(' '), run: () => go.agent(a.id) });
  }
  for (const [id, label] of [['dark', 'Dark'], ['light', 'Light']]) out.push({ id: 'theme:' + id, group: 'Display', label: 'Theme: ' + label, run: () => go.theme(id), on: theme === id });
  for (const [id, label] of [['compact', 'Compact'], ['comfortable', 'Comfortable']]) out.push({ id: 'density:' + id, group: 'Display', label: 'Row height: ' + label, keywords: 'density', run: () => go.density(id), on: density === id });
  out.push({ id: 'layout:reset', group: 'Layout', label: 'Reset layout', keywords: 'default panels', run: () => go.resetLayout() });
  out.push({ id: 'help:shortcuts', group: 'Help', label: 'Keyboard shortcuts', shortcut: '?', run: () => go.shortcuts() });
  return out;
}

function useDialogFocus(ref, selector) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const before = document.activeElement;
    el.querySelector(selector)?.focus();
    const release = focusTrap(el);
    return () => { release(); before?.focus?.({ preventScroll: true }); };
  }, [ref, selector]);
}

export default function CommandPalette({ commands, recent, onRun, onClose }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const ref = useRef(null);
  const listRef = useRef(null);
  useDialogFocus(ref, 'input');
  const list = useMemo(() => rankCommands(commands, query, recent), [commands, query, recent]);
  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    listRef.current?.querySelector('[data-i="' + active + '"]')?.scrollIntoView?.({ block: 'nearest' });
  }, [active]);
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(list.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)); }
    else if (e.key === 'Home' && e.ctrlKey) { e.preventDefault(); setActive(0); }
    else if (e.key === 'End' && e.ctrlKey) { e.preventDefault(); setActive(Math.max(0, list.length - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (list[active]) onRun(list[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); }
  };
  const groups = [];
  list.forEach((c, i) => {
    const last = groups[groups.length - 1];
    if (last && last.name === c.group) last.items.push([c, i]);
    else groups.push({ name: c.group, items: [[c, i]] });
  });
  return html`<div class="bd-modalw bd-palw" onMouseDown=${(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div class="bd-pal" role="dialog" aria-modal="true" aria-label="Command palette" ref=${ref}>
      <div class="bd-palin"><${Ico} d=${PATHS.search}/>
        <input type="text" value=${query} placeholder="Go to a section, set the range, open an agent" aria-label="Search commands"
          role="combobox" aria-expanded="true" aria-controls="bd-pal-list" aria-autocomplete="list" aria-activedescendant=${list.length ? 'bd-pal-' + active : undefined}
          onInput=${e => setQuery(e.target.value)} onKeyDown=${onKey}/>
        <kbd class="bd-kbd">Esc</kbd>
      </div>
      <div class="bd-pall" id="bd-pal-list" role="listbox" aria-label="Commands" ref=${listRef}>
        ${list.length ? groups.map((g, gi) => html`<div key=${g.name + gi} role="group" aria-label=${g.name}>
          <div class="bd-palg" aria-hidden="true">${g.name}</div>
          ${g.items.map(([c, i]) => html`<button key=${c.id} type="button" id=${'bd-pal-' + i} data-i=${i} role="option" tabindex="-1"
            aria-selected=${i === active ? 'true' : 'false'} class=${'bd-palo' + (i === active ? ' bd-on' : '')}
            onMouseMove=${() => { if (i !== active) setActive(i); }} onClick=${() => onRun(c)}>
            <span class="bd-pall-l">${c.label}</span>${c.on ? html`<span class="bd-palnow">now</span>` : null}${c.shortcut ? html`<kbd class="bd-kbd">${c.shortcut}</kbd>` : null}
          </button>`)}
        </div>`) : html`<div class="bd-empty" role="status">No command matches "${query}".</div>`}
      </div>
      <div class="bd-palfoot"><kbd class="bd-kbd">↑</kbd><kbd class="bd-kbd">↓</kbd> move, <kbd class="bd-kbd">Enter</kbd> run, <kbd class="bd-kbd">Esc</kbd> close</div>
    </div>
  </div>`;
}

export const SHORTCUTS = [
  ['/', 'Find agents, prompts, files and tools'],
  ['Cmd/Ctrl+K', 'Command palette'],
  ['Esc', 'Close a menu, dialog or drawer'],
  ['1 to 9', 'Go to that section'],
  ['[ and ]', 'Previous and next section'],
  ['s', 'Settings'],
  ['?', 'This list'],
];

export function ShortcutsDialog({ onClose }) {
  const ref = useRef(null);
  useDialogFocus(ref, 'button');
  return html`<div class="bd-modalw" onMouseDown=${(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div class="bd-modal bd-keys" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" ref=${ref}
      onKeyDown=${(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); } }}>
      <h2>Keyboard shortcuts</h2>
      <dl>${SHORTCUTS.map(([k, what]) => html`<div key=${k}><dt><kbd class="bd-kbd">${k}</kbd></dt><dd>${what}</dd></div>`)}</dl>
      <p>Keys other than Cmd/Ctrl+K and Esc do nothing while you type in a field.</p>
      <div class="bd-acts"><button type="button" class="bd-btn bd-p" onClick=${onClose}>Close</button></div>
    </div>
  </div>`;
}
