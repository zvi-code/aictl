// ─── usePolledResource — fetch + poll, keeping the last good data ──
// Unlike useAsyncResource (one fetch per dep change, cleared on failure), a
// failed refresh here keeps the previous data and records the error, so the
// panel can render it as stale. Polling pauses while the page is hidden.
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

export function usePolledResource(fetchFn, deps = [], { pollMs = 0 } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: true, updatedAt: null });
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;
  const generation = useRef(0);

  const load = useCallback(() => {
    const gen = ++generation.current;
    setState(s => ({ ...s, loading: true }));
    return Promise.resolve()
      .then(() => fetchRef.current())
      .then(data => {
        if (gen === generation.current) setState({ data, error: null, loading: false, updatedAt: Date.now() });
      })
      .catch(error => {
        if (gen === generation.current) setState(s => ({ ...s, error, loading: false }));
      });
  }, []);

  useEffect(() => {
    load();
    if (!pollMs) return () => { generation.current++; };
    const id = setInterval(() => { if (!document.hidden) load(); }, pollMs);
    return () => { clearInterval(id); generation.current++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps name the fetch inputs
  }, [load, pollMs, ...deps]);

  return { ...state, reload: load };
}
