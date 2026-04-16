// ─── a11y utilities ───────────────────────────────────────────
// Shared helpers for focus trapping, visually-hidden styling, and
// polite/assertive announcements via a single shared live region.

export const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export const visuallyHidden = 'sr-only';

/**
 * Trap focus within `container` while active. Returns a teardown fn.
 * Dialog primitive has its own trap — use this only for custom widgets
 * that can't use Dialog (e.g. inline menus that want tab-cycling).
 */
export function focusTrap(container) {
  if (!container) return () => {};
  const onKey = (e) => {
    if (e.key !== 'Tab') return;
    const items = container.querySelectorAll(FOCUSABLE_SELECTOR);
    if (!items.length) { e.preventDefault(); return; }
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  };
  container.addEventListener('keydown', onKey);
  return () => container.removeEventListener('keydown', onKey);
}

const LIVE_REGION_ID = 'aictl-a11y-live';
const ASSERTIVE_REGION_ID = 'aictl-a11y-live-assertive';

function ensureRegion(id, politeness) {
  if (typeof document === 'undefined') return null;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', politeness);
    el.setAttribute('aria-atomic', 'true');
    el.className = visuallyHidden;
    document.body.appendChild(el);
  }
  return el;
}

/** Announce a message to screen readers via a shared aria-live region. */
export function announce(msg, priority = 'polite') {
  if (!msg) return;
  const id = priority === 'assertive' ? ASSERTIVE_REGION_ID : LIVE_REGION_ID;
  const el = ensureRegion(id, priority);
  if (!el) return;
  // Clear then set so consecutive identical messages still fire.
  el.textContent = '';
  // Defer so screen readers pick up the change.
  setTimeout(() => { el.textContent = msg; }, 16);
}
