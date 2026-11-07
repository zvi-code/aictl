// ─── a11y utilities ───────────────────────────────────────────
// Shared helpers for focus trapping and for telling whether a key press lands in a text field.

const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

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

/** True when a key press lands in a field that takes text, so shortcuts must not fire. */
export function isTypingTarget(el) {
  if (!el) return false;
  const tag = (el.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable === true;
}
