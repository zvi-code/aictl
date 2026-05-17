import { html } from 'htm/preact';
import { useEffect, useRef, useCallback } from 'preact/hooks';

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function Dialog({
  open, onClose, ariaLabel, labelledBy, children,
  closeOnBackdrop = true, class: klass, className, ...rest
}) {
  const dialogRef = useRef(null);
  const prevFocusRef = useRef(null);

  const handleClose = useCallback(() => { onClose && onClose(); }, [onClose]);

  useEffect(() => {
    if (!open) return;
    prevFocusRef.current = document.activeElement;
    const d = dialogRef.current;
    if (!d) return;
    const first = d.querySelector(FOCUSABLE) || d;
    first.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); handleClose(); return; }
      if (e.key === 'Tab') {
        const items = d.querySelectorAll(FOCUSABLE);
        if (!items.length) { e.preventDefault(); return; }
        const firstEl = items[0], lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (prevFocusRef.current && prevFocusRef.current.focus) prevFocusRef.current.focus();
    };
  }, [open, handleClose]);

  if (!open) return null;
  const onBackdrop = (e) => {
    if (!closeOnBackdrop) return;
    if (e.target === e.currentTarget) handleClose();
  };
  const cls = ['aictl-ui-dialog', klass, className].filter(Boolean).join(' ');
  return html`<div class="aictl-ui-dialog-backdrop" onMouseDown=${onBackdrop}>
    <div
      ref=${dialogRef}
      class=${cls}
      role="dialog"
      aria-modal="true"
      aria-label=${ariaLabel || null}
      aria-labelledby=${labelledBy || null}
      tabindex="-1"
      ...${rest}
    >${children}</div>
  </div>`;
}
