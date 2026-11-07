// ─── Agent drawer: Events — the raw event stream of the session ───
// Newest first, the newest 500. A kind chip keeps only that kind; a row opens
// its stored detail as JSON.
import { html } from 'htm/preact';
import { useMemo, useState } from 'preact/hooks';
import * as api from '../../../api.js';
import { FixedPanel, useDetail } from '../Drawer.js';
import { fmtN } from '../format.js';
import { Wait, SessionNote, clip, clock, isActive, pretty, sessionIdOf, windowOf } from './common.js';

export const EVENT_LIMIT = 500;

function load(sid, win) {
  const opts = { since: win.since, until: win.until };
  return Promise.all([
    api.getSessionEvents(sid, { ...opts, limit: EVENT_LIMIT }),
    api.getEventsCount({ ...opts, sessionId: sid }).catch(() => ({ count: null })),
  ]).then(([rows, n]) => {
    const list = (Array.isArray(rows) ? rows : []).slice().sort((x, y) => (y.ts || 0) - (x.ts || 0));
    return { rows: list, total: n?.count ?? null };
  });
}

const preview = (detail) => {
  try { return clip(typeof detail === 'string' ? detail : JSON.stringify(detail), 140); } catch { return ''; }
};

export default function EventsTab({ a, st, ctx }) {
  const sid = sessionIdOf(a);
  const win = windowOf(a);
  const tick = isActive(st) ? ctx.refreshKey : 0;
  const { data, error } = useDetail(() => load(sid, win), 'events:' + sid, tick);
  const [kind, setKind] = useState(null);
  const [open, setOpen] = useState(() => new Set());
  const kinds = useMemo(() => {
    const m = new Map();
    for (const ev of data?.rows || []) m.set(ev.kind || '', (m.get(ev.kind || '') || 0) + 1);
    return [...m.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]));
  }, [data]);
  if (!data) return html`<${Wait} error=${error} what="the events"/>`;
  const rows = data.rows.filter(ev => kind == null || (ev.kind || '') === kind);
  const keyOf = (ev, i) => (ev.ts || 0) + ':' + (ev.kind || '') + ':' + (ev.seq ?? i);
  const toggle = k => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });
  const total = data.total;
  const sub = total != null && total > data.rows.length ? 'Newest ' + fmtN(data.rows.length) + ' of ' + fmtN(total) : fmtN(data.rows.length) + ' events';
  return html`<${SessionNote} a=${a}/>
    <${FixedPanel} id="agev" title="Events, newest first" sub=${sub}>
      ${kinds.length ? html`<div class="bd-ag-chips" role="group" aria-label="Kind">
        <button type="button" class="bd-ag-chip" aria-pressed=${kind == null ? 'true' : 'false'} onClick=${() => setKind(null)}>All <em>${data.rows.length}</em></button>
        ${kinds.map(([k, n]) => html`<button key=${k} type="button" class="bd-ag-chip" aria-pressed=${kind === k ? 'true' : 'false'} onClick=${() => setKind(kind === k ? null : k)}>${k || 'no kind'} <em>${n}</em></button>`)}
      </div>` : null}
      ${rows.length ? html`<div class="bd-tw"><table class="bd-t bd-ag-evt">
        <caption>Events</caption>
        <thead><tr><th scope="col" style="width:76px">Time</th><th scope="col" style="width:190px">Kind</th><th scope="col" style="width:100px">Tool</th><th scope="col">Detail</th></tr></thead>
        <tbody>${rows.map((ev, i) => {
          const k = keyOf(ev, i);
          const on = open.has(k);
          const warn = /permission|error|fail/i.test(ev.kind || '');
          return html`<tr key=${k} class=${warn ? 'bd-ag-warnrow' : null}>
              <td><button type="button" class="bd-lnk" aria-expanded=${on ? 'true' : 'false'} aria-label=${'Detail of ' + (ev.kind || 'event') + ' at ' + clock(ev.ts)} onClick=${() => toggle(k)}>${clock(ev.ts)}</button></td>
              <td class="bd-m">${ev.kind || ''}</td><td class="bd-dim">${ev.tool || ''}</td><td class="bd-m bd-dim" title=${preview(ev.detail)}>${preview(ev.detail)}</td>
            </tr>${on ? html`<tr key=${k + ':d'} class="bd-ag-detrow"><td colspan="4"><pre class="bd-ag-pre">${pretty(ev.detail ?? {})}</pre></td></tr>` : null}`;
        })}</tbody>
      </table></div>` : html`<div class="bd-empty">${data.rows.length ? 'No event of this kind.' : 'No events stored for this session.'}</div>`}
    </${FixedPanel}>`;
}
