import { html } from 'htm/preact';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { subscribe, dismiss, TOAST_MAX } from './Toast.js';

export default function ToastProvider() {
  const [toasts, setToasts] = useState([]);
  // id → { tid, expiresAt, remaining } — remaining is set while paused.
  const timersRef = useRef(new Map());

  useEffect(() => {
    const timers = timersRef.current;
    const clearFor = (id) => {
      const entry = timers.get(id);
      if (entry?.tid) clearTimeout(entry.tid);
      timers.delete(id);
    };
    const unsub = subscribe((action) => {
      if (action.type === 'add') {
        setToasts(prev => {
          const next = [...prev, action.toast];
          if (next.length > TOAST_MAX) {
            // Evicted toasts must not leak their TTL timers.
            next.slice(0, next.length - TOAST_MAX).forEach(t => clearFor(t.id));
            return next.slice(next.length - TOAST_MAX);
          }
          return next;
        });
        const tid = setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== action.toast.id));
          timers.delete(action.toast.id);
        }, action.toast.ttl);
        timers.set(action.toast.id, { tid, expiresAt: Date.now() + action.toast.ttl, remaining: null });
      } else if (action.type === 'remove') {
        clearFor(action.id);
        setToasts(prev => prev.filter(t => t.id !== action.id));
      }
    });
    return () => {
      unsub();
      timers.forEach(entry => { if (entry.tid) clearTimeout(entry.tid); });
      timers.clear();
    };
  }, []);

  // Pause the TTL while the pointer or keyboard focus is on a toast.
  const pause = useCallback((id) => {
    const timers = timersRef.current;
    const entry = timers.get(id);
    if (!entry || entry.tid == null) return;
    clearTimeout(entry.tid);
    entry.tid = null;
    entry.remaining = Math.max(500, entry.expiresAt - Date.now());
  }, []);

  const resume = useCallback((id) => {
    const timers = timersRef.current;
    const entry = timers.get(id);
    if (!entry || entry.tid != null) return;
    const remaining = entry.remaining ?? 500;
    entry.expiresAt = Date.now() + remaining;
    entry.remaining = null;
    entry.tid = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timers.delete(id);
    }, remaining);
  }, []);

  if (!toasts.length) return null;
  // No aria-live on the stack: each toast carries its own role=status/alert,
  // so a container live region would double-announce.
  return html`<div class="aictl-ui-toast-stack" role="region" aria-label="Notifications">
    ${toasts.map(t => html`<div
      key=${t.id}
      class=${`aictl-ui-toast aictl-ui-toast--${t.variant}`}
      role=${t.variant === 'error' ? 'alert' : 'status'}
      onMouseEnter=${() => pause(t.id)}
      onMouseLeave=${() => resume(t.id)}
      onFocusIn=${() => pause(t.id)}
      onFocusOut=${() => resume(t.id)}
    >
      <span class="aictl-ui-toast__msg">${t.message}</span>
      <button type="button" class="aictl-ui-toast__dismiss"
        aria-label="Dismiss notification"
        onClick=${() => dismiss(t.id)}>×</button>
    </div>`)}
  </div>`;
}
