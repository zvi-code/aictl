import { html } from 'htm/preact';
import { useState, useRef, useEffect, useCallback } from 'preact/hooks';

function computePosition(anchorRect, popRect, placement) {
  const gap = 6;
  let top = 0, left = 0;
  switch (placement) {
    case 'top':    top = anchorRect.top - popRect.height - gap; left = anchorRect.left; break;
    case 'left':   top = anchorRect.top; left = anchorRect.left - popRect.width - gap; break;
    case 'right':  top = anchorRect.top; left = anchorRect.right + gap; break;
    case 'bottom':
    default:       top = anchorRect.bottom + gap; left = anchorRect.left; break;
  }
  const vw = window.innerWidth, vh = window.innerHeight;
  left = Math.max(4, Math.min(left, vw - popRect.width - 4));
  top = Math.max(4, Math.min(top, vh - popRect.height - 4));
  return { top, left };
}

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function Popover({
  trigger, placement = 'bottom', open: controlledOpen, onOpenChange, children,
  class: klass, className, ...rest
}) {
  const [uOpen, setUOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : uOpen;
  const setOpen = useCallback((v) => {
    if (controlledOpen === undefined) setUOpen(v);
    onOpenChange && onOpenChange(v);
  }, [controlledOpen, onOpenChange]);

  const anchorRef = useRef(null);
  const popRef = useRef(null);
  const [pos, setPos] = useState({ top: -9999, left: -9999 });

  useEffect(() => {
    if (!open) return;
    const a = anchorRef.current, p = popRef.current;
    if (!a || !p) return;
    const update = () => setPos(computePosition(a.getBoundingClientRect(), p.getBoundingClientRect(), placement));
    update();
    const onDocDown = (e) => {
      if (!p.contains(e.target) && !a.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); a.focus && a.focus(); return; }
      if (e.key === 'Tab') {
        const items = p.querySelectorAll(FOCUSABLE);
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', update);
    const first = p.querySelector(FOCUSABLE);
    if (first) first.focus(); else p.focus();
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', update);
    };
  }, [open, placement, setOpen]);

  const onTriggerClick = (e) => {
    e.stopPropagation();
    setOpen(!open);
  };
  const popCls = ['aictl-ui-popover', klass, className].filter(Boolean).join(' ');
  return html`<span style="display:inline-flex;position:relative" ...${rest}>
    <span ref=${anchorRef} onClick=${onTriggerClick}>${trigger}</span>
    ${open ? html`<div
      ref=${popRef}
      class=${popCls}
      role="dialog"
      tabindex="-1"
      style=${`top:${pos.top}px;left:${pos.left}px`}
    >${children}</div>` : null}
  </span>`;
}
