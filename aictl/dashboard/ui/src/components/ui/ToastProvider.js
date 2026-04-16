import { html } from 'htm/preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { subscribe, TOAST_MAX } from './Toast.js';

export default function ToastProvider() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  useEffect(() => {
    const timers = timersRef.current;
    const unsub = subscribe((action) => {
      if (action.type === 'add') {
        setToasts(prev => {
          const next = [...prev, action.toast];
          return next.length > TOAST_MAX ? next.slice(next.length - TOAST_MAX) : next;
        });
        const tid = setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== action.toast.id));
          timers.delete(action.toast.id);
        }, action.toast.ttl);
        timers.set(action.toast.id, tid);
      } else if (action.type === 'remove') {
        const tid = timers.get(action.id);
        if (tid) { clearTimeout(tid); timers.delete(action.id); }
        setToasts(prev => prev.filter(t => t.id !== action.id));
      }
    });
    return () => {
      unsub();
      timers.forEach(tid => clearTimeout(tid));
      timers.clear();
    };
  }, []);

  if (!toasts.length) return null;
  return html`<div class="aictl-ui-toast-stack" role="region" aria-label="Notifications" aria-live="polite">
    ${toasts.map(t => html`<div
      key=${t.id}
      class=${`aictl-ui-toast aictl-ui-toast--${t.variant}`}
      role=${t.variant === 'error' ? 'alert' : 'status'}
    >${t.message}</div>`)}
  </div>`;
}
