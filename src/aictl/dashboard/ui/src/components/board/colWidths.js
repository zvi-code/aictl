// ─── Column widths a person sets by dragging a column border ─
// Kept per table in this browser. Every header cell names its column in data-col.
import { html } from 'htm/preact';
import { useRef, useState } from 'preact/hooks';

const KEY = 'aictl.colw.';
export const MIN_COL_PX = 40;
const STEP_PX = 10;

function load(id) {
  if (!id) return {};
  try { return JSON.parse(localStorage.getItem(KEY + id)) || {}; } catch { return {}; }
}

function save(id, widths) {
  if (!id) return;
  try {
    if (Object.keys(widths).length) localStorage.setItem(KEY + id, JSON.stringify(widths));
    else localStorage.removeItem(KEY + id);
  } catch { /* storage off: widths last for this page only */ }
}

/** The drawn width of every column of the header row, for the columns with no width yet.
 * The first drag fixes them all, so only the dragged column changes. */
function frozen(th, widths) {
  const out = { ...widths };
  for (const cell of th.parentElement.children) {
    const k = cell.dataset.col;
    if (k && out[k] == null) out[k] = Math.round(cell.getBoundingClientRect().width) || 100;
  }
  return out;
}

/** Widths for table *id*: {widths, set, grip(colKey), reset}. Put grip(k) inside each th. */
export function useColumnWidths(id) {
  const [widths, setWidths] = useState(() => load(id));
  const live = useRef(widths);
  live.current = widths;
  const apply = next => { live.current = next; setWidths(next); };

  const begin = (e, key) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    let next = frozen(e.currentTarget.closest('th'), live.current);
    const x0 = e.clientX;
    const w0 = next[key];
    const move = ev => { next = { ...next, [key]: Math.max(MIN_COL_PX, Math.round(w0 + ev.clientX - x0)) }; apply(next); };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.classList.remove('bd-resizing');
      save(id, next);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    document.body.classList.add('bd-resizing');
    apply(next);
  };

  const reset = () => { apply({}); save(id, {}); };

  const key = (e, col) => {
    const d = e.key === 'ArrowLeft' ? -STEP_PX : e.key === 'ArrowRight' ? STEP_PX : 0;
    if (!d) return;
    e.preventDefault();
    e.stopPropagation();
    const next = frozen(e.currentTarget.closest('th'), live.current);
    next[col] = Math.max(MIN_COL_PX, next[col] + d);
    apply(next);
    save(id, next);
  };

  // A focusable separator states its value: the column's width in pixels, 0 while it is natural.
  const grip = col => html`<span class="bd-colgrip" role="separator" aria-orientation="vertical" tabIndex="0"
    aria-valuemin="0" aria-valuenow=${widths[col] || 0}
    aria-label="Column width. Drag or use the arrow keys. Double-click resets every column of this table."
    title="Drag to change the width. Double-click to reset."
    onPointerDown=${e => begin(e, col)} onKeyDown=${e => key(e, col)}
    onClick=${e => e.stopPropagation()} onDblClick=${e => { e.stopPropagation(); reset(); }}></span>`;

  return { widths, set: Object.keys(widths).length > 0, grip, reset };
}
