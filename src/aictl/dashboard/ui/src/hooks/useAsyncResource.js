// ─── useAsyncResource — shared fetch/loading/error state ──────
// The standard session-detail panel effect: fetch on deps change, track
// loading + error, and guard against stale results (a resolved/rejected
// promise from a previous dep-set or an unmounted component never calls
// setState, so a slow old response can't overwrite a newer one).
import { useEffect, useState } from 'preact/hooks';

/**
 * @param {() => Promise<any>} fetchFn  Called whenever deps change (and
 *   enabled is true). Intentionally excluded from the effect deps —
 *   callers pass inline arrows; `deps` names the actual fetch inputs.
 * @param {any[]} deps  Inputs that should trigger a refetch.
 * @param {{enabled?: boolean}} [opts]  When enabled is false, nothing is
 *   fetched and the hook settles at {data: null, loading: false, error: null}.
 * @returns {{data: any, loading: boolean, error: any}}
 */
export function useAsyncResource(fetchFn, deps, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  // Starts true (like the panels this replaces) so the very first frame
  // renders the loading branch; the effect below settles it.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) { setData(null); setLoading(false); setError(null); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchFn()
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setData(null); setError(e); setLoading(false); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchFn is intentionally excluded (inline arrows)
  }, [enabled, ...deps]);

  return { data, loading, error };
}
