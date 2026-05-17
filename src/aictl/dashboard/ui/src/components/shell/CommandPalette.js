import { html } from 'htm/preact';
import { useState, useEffect, useMemo, useRef, useCallback } from 'preact/hooks';
import Dialog from '../ui/Dialog.js';
import EmptyState from '../ui/EmptyState.js';
import Kbd from '../ui/Kbd.js';
import { Search } from 'lucide-preact';

/**
 * Fuzzy-score a command against a query. Higher is better.
 * - 0 when no match
 * - Boosted when query prefixes label
 * - Sub-string match across label + group
 */
function score(cmd, q) {
  if (!q) return 1;
  const ql = q.toLowerCase();
  const label = (cmd.label || '').toLowerCase();
  const group = (cmd.group || '').toLowerCase();
  if (label.startsWith(ql)) return 1000 - label.length;
  if (label.includes(ql))  return 500  - label.indexOf(ql);
  if (group.startsWith(ql)) return 300;
  if (group.includes(ql))  return 150;
  // char-subsequence match
  let i = 0;
  for (const ch of label) { if (ch === ql[i]) i++; if (i === ql.length) break; }
  if (i === ql.length) return 50;
  return 0;
}

export default function CommandPalette({ commands = [], isOpen, onClose, lru = [], onRun }) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  useEffect(() => { if (isOpen) { setQuery(''); setActiveIdx(0); } }, [isOpen]);
  useEffect(() => { if (isOpen && inputRef.current) inputRef.current.focus(); }, [isOpen]);

  const filtered = useMemo(() => {
    if (!query) {
      // LRU first (preserve LRU order), then the rest
      const byId = new Map(commands.map(c => [c.id, c]));
      const lruCmds = lru.map(id => byId.get(id)).filter(Boolean);
      const rest = commands.filter(c => !lru.includes(c.id));
      return [...lruCmds, ...rest];
    }
    return commands
      .map(c => ({ c, s: score(c, query) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map(x => x.c);
  }, [commands, query, lru]);

  useEffect(() => { setActiveIdx(0); }, [query]);

  const run = useCallback((cmd) => {
    if (!cmd) return;
    if (onRun) onRun(cmd);
    try { cmd.action && cmd.action(); } catch (err) { console.error('Command failed:', err); }
    onClose && onClose();
  }, [onRun, onClose]);

  const onKey = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(filtered[activeIdx]);
    }
  }, [filtered, activeIdx, run]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-cmd-idx="${activeIdx}"]`);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  // Group filtered by cmd.group, but preserve relevance order.
  const grouped = useMemo(() => {
    const out = [];
    const seen = new Map();
    filtered.forEach((c) => {
      const g = c.group || 'Commands';
      if (!seen.has(g)) { seen.set(g, out.length); out.push({ group: g, items: [] }); }
      out[seen.get(g)].items.push(c);
    });
    return out;
  }, [filtered]);

  let idxCounter = -1;

  return html`<${Dialog} open=${isOpen} onClose=${onClose} ariaLabel="Command palette" class="cmdk-dialog">
    <div class="cmdk">
      <div class="cmdk-input-row">
        <${Search} size="16" aria-hidden="true"/>
        <input
          ref=${inputRef}
          type="text"
          class="cmdk-input"
          placeholder="Type a command or search…"
          value=${query}
          onInput=${e => setQuery(e.target.value)}
          onKeyDown=${onKey}
          aria-label="Search commands"
          aria-controls="cmdk-list"
          role="combobox"
          aria-expanded="true"
          aria-autocomplete="list"
        />
        <${Kbd}>Esc</${Kbd}>
      </div>
      <div id="cmdk-list" class="cmdk-list" role="listbox" ref=${listRef}>
        ${filtered.length === 0
          ? html`<${EmptyState} icon="search" title="No commands"
              description=${query ? 'No commands match "' + query + '"' : 'Start typing…'}/>`
          : grouped.map(g => html`<div key=${g.group} class="cmdk-group">
              <div class="cmdk-group-label">${g.group}</div>
              ${g.items.map(c => {
                idxCounter += 1;
                const i = idxCounter;
                const active = i === activeIdx;
                return html`<button key=${c.id}
                  type="button"
                  class=${'cmdk-item' + (active ? ' cmdk-item--active' : '')}
                  role="option"
                  aria-selected=${active ? 'true' : 'false'}
                  data-cmd-idx=${i}
                  onMouseEnter=${() => setActiveIdx(i)}
                  onClick=${() => run(c)}
                >
                  <span class="cmdk-item__label">${c.label}</span>
                  ${c.shortcut ? html`<${Kbd}>${c.shortcut}</${Kbd}>` : null}
                </button>`;
              })}
            </div>`)
        }
      </div>
      <div class="cmdk-foot">
        <${Kbd}>↑</${Kbd}><${Kbd}>↓</${Kbd}> navigate
        · <${Kbd}>↵</${Kbd}> run
        · <${Kbd}>Esc</${Kbd}> close
      </div>
    </div>
  </${Dialog}>`;
}
