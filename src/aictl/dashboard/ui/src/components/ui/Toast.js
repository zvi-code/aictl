// Tiny in-module event emitter for toast notifications.

const listeners = new Set();
let seq = 0;

export const TOAST_MAX = 3;
export const TOAST_TTL_MS = 5000;

function emit(action) {
  listeners.forEach(fn => { try { fn(action); } catch { /* noop */ } });
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function push(variant, message, opts = {}) {
  const id = ++seq;
  emit({ type: 'add', toast: { id, variant, message, ttl: opts.ttl || TOAST_TTL_MS } });
  return id;
}

export function dismiss(id) {
  emit({ type: 'remove', id });
}

export const toast = {
  success: (msg, opts) => push('success', msg, opts),
  error:   (msg, opts) => push('error',   msg, opts),
  info:    (msg, opts) => push('info',    msg, opts),
  dismiss,
};

export default toast;
