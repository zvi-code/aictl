import { html } from 'htm/preact';
import { useState, useRef, useEffect, useCallback, useId } from 'preact/hooks';

function computePosition(anchorRect, tipRect, placement) {
  const gap = 6;
  let top = 0, left = 0;
  switch (placement) {
    case 'top':    top = anchorRect.top - tipRect.height - gap; left = anchorRect.left + (anchorRect.width - tipRect.width) / 2; break;
    case 'bottom': top = anchorRect.bottom + gap; left = anchorRect.left + (anchorRect.width - tipRect.width) / 2; break;
    case 'left':   top = anchorRect.top + (anchorRect.height - tipRect.height) / 2; left = anchorRect.left - tipRect.width - gap; break;
    case 'right':
    default:       top = anchorRect.top + (anchorRect.height - tipRect.height) / 2; left = anchorRect.right + gap; break;
  }
  // Clamp to viewport
  const vw = window.innerWidth, vh = window.innerHeight;
  left = Math.max(4, Math.min(left, vw - tipRect.width - 4));
  top = Math.max(4, Math.min(top, vh - tipRect.height - 4));
  return { top, left };
}

export default function Tooltip({
  content, placement = 'top', open: controlledOpen, onOpenChange, children,
  class: klass, className, ...rest
}) {
  const [uOpen, setUOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : uOpen;
  const setOpen = useCallback((v) => {
    if (controlledOpen === undefined) setUOpen(v);
    onOpenChange && onOpenChange(v);
  }, [controlledOpen, onOpenChange]);

  const anchorRef = useRef(null);
  const tipRef = useRef(null);
  const id = useId();
  const [pos, setPos] = useState({ top: -9999, left: -9999 });

  useEffect(() => {
    if (!open) return;
    const a = anchorRef.current, t = tipRef.current;
    if (!a || !t) return;
    const update = () => setPos(computePosition(a.getBoundingClientRect(), t.getBoundingClientRect(), placement));
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, placement, content]);

  const show = () => setOpen(true);
  const hide = () => setOpen(false);

  const wrapCls = ['aictl-ui-tooltip-wrap', klass, className].filter(Boolean).join(' ');
  return html`<span
    ref=${anchorRef}
    class=${wrapCls}
    onMouseEnter=${show}
    onMouseLeave=${hide}
    onFocusIn=${show}
    onFocusOut=${hide}
    aria-describedby=${open ? id : null}
    ...${rest}
  >
    ${children}
    ${open ? html`<span
      ref=${tipRef}
      id=${id}
      role="tooltip"
      class="aictl-ui-tooltip"
      style=${`top:${pos.top}px;left:${pos.left}px`}
    >${content}</span>` : null}
  </span>`;
}
