// ─── useBoardFilters — board filters, kept in the URL ─────────────
// Each choice is one history entry, so Back undoes it. Typing in the find box
// replaces the entry instead of adding one per key.
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useTools } from './useTools.js';
import { filtersToParams, parseFilters } from '../components/board/filters.js';
import { readUrl, toolsToParams, writeUrl } from './urlState.js';

const FIND_DELAY_MS = 250;
const search = () => (typeof window !== 'undefined' ? window.location.search : '');

/** Same rule as the Tool filter on every screen: all selected collapses to "no filter". */
export function nextTools(prev, id, all) {
  const cur = prev === null || prev === undefined ? all : prev;
  const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
  // A saved choice can name tools that this time range does not list: count only the listed ones.
  return next.filter(x => all.includes(x)).length >= all.length ? null : next;
}

export function useBoardFilters() {
  const [filters, setFilters] = useState(() => parseFilters(search()));
  const { selectedTools: tools, setTools } = useTools();
  const toolsRef = useRef(tools);
  toolsRef.current = tools;
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  // What the data hook reads: the find box text arrives after a short delay.
  const [applied, setApplied] = useState(filters);
  const findTimer = useRef(null);

  // A stored tool filter on a bare URL should still be copyable.
  useEffect(() => { writeUrl(toolsToParams(toolsRef.current)); }, []);

  useEffect(() => {
    const onPop = () => {
      const next = parseFilters(search());
      clearTimeout(findTimer.current);
      setFilters(next);
      setApplied(next);
      const urlTools = readUrl().tools;
      setTools(urlTools === undefined ? null : urlTools);
    };
    window.addEventListener('popstate', onPop);
    return () => { window.removeEventListener('popstate', onPop); clearTimeout(findTimer.current); };
  }, [setTools]);

  const update = useCallback((patch, nextToolsValue) => {
    const next = { ...filtersRef.current, ...patch };
    const urlPatch = { ...filtersToParams(next) };
    if (nextToolsValue !== undefined) Object.assign(urlPatch, toolsToParams(nextToolsValue));
    writeUrl(urlPatch, { push: true });
    clearTimeout(findTimer.current);
    filtersRef.current = next;
    setFilters(next);
    setApplied(next);
    if (nextToolsValue !== undefined) setTools(nextToolsValue);
  }, [setTools]);

  const setFind = useCallback((q) => {
    const next = { ...filtersRef.current, q };
    filtersRef.current = next;
    setFilters(next);
    clearTimeout(findTimer.current);
    findTimer.current = setTimeout(() => {
      writeUrl(filtersToParams(filtersRef.current));
      setApplied(filtersRef.current);
    }, FIND_DELAY_MS);
  }, []);

  return useMemo(() => ({ filters, applied, tools, update, setFind }), [filters, applied, tools, update, setFind]);
}
