// ─── useCommandPalette — Cmd/Ctrl+K toggle + LRU tracking
import { useState, useEffect, useCallback } from 'preact/hooks';

const LRU_KEY = 'aictl-cmdpalette-lru-v1';
const LRU_MAX = 5;

function loadLRU() {
  try {
    const raw = localStorage.getItem(LRU_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(0, LRU_MAX) : [];
  } catch { return []; }
}
function persistLRU(ids) {
  try { localStorage.setItem(LRU_KEY, JSON.stringify(ids)); } catch { /* noop */ }
}

export function useCommandPalette() {
  const [isOpen, setOpen] = useState(false);
  const [lru, setLru] = useState(loadLRU);

  const open   = useCallback(() => setOpen(true),  []);
  const close  = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen(v => !v), []);

  const recordUse = useCallback((id) => {
    if (!id) return;
    setLru(prev => {
      const next = [id, ...prev.filter(x => x !== id)].slice(0, LRU_MAX);
      persistLRU(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen(v => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return { isOpen, open, close, toggle, lru, recordUse };
}
