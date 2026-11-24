import { setDefaultNodeScope } from './urlState'

const FLEET_PROBE = '/api/board/nodes?view=nodes&scope=fleet'

export const FLEET_FALLBACK_NOTICE = 'This daemon has no shared history store, so All nodes is not available. Showing This node.'

/**
 * An address without `scope` opens "All nodes" when the daemon can answer fleet reads. Ask once
 * before the first screen; when it cannot (no shared store, old daemon, no answer), the page opens
 * in "This node" and the result says so. Addresses that name a scope are not probed.
 * @returns true when the page fell back to "This node".
 */
export async function resolveDefaultScope(search: string, request: (path: string) => Promise<Response> = path =>
  fetch(path, { signal: AbortSignal.timeout(5000) })): Promise<boolean> {
  const q = new URLSearchParams(search);
  if (q.has('scope') || q.has('node_id')) return false;
  let available = false;
  try {
    const response = await request(FLEET_PROBE);
    const body: unknown = response.ok ? await response.json() : null;
    available = typeof body === 'object' && body !== null && (body as { view?: unknown }).view === 'nodes' &&
      (body as { scope?: unknown }).scope === 'fleet' && (body as { fleet_available?: unknown }).fleet_available === true;
  } catch { /* no answer is the same as no store */ }
  setDefaultNodeScope(available ? 'fleet' : 'local');
  return !available;
}
