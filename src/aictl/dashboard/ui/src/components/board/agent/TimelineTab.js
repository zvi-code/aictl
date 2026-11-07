// ─── Agent drawer: Timeline — one bar per event, colored by what it was ─
// Bar height is the event's tokens on a log scale. A pause of more than 30 s
// folds into one gap mark. The entity filter and the token mode change only
// what is drawn; hover shows the event in the shared tooltip.
import { html } from 'htm/preact';
import { useMemo, useState } from 'preact/hooks';
import * as api from '../../../api.js';
import { FixedPanel, useDetail } from '../Drawer.js';
import { fmtDur, fmtMs, fmtN } from '../format.js';
import { hideTip, showTip } from '../tip.js';
import { Wait, Seg, SessionNote, clip, clock, isActive, sessionIdOf, slotColor, windowOf } from './common.js';

const KINDS = new Set(['user_message', 'api_call', 'api_response', 'tool_use', 'compaction', 'subagent', 'error', 'hook']);
export const GAP_S = 30;
const BAR_H = 96;
const FIXED = { Prompt: 'var(--good)', Compaction: 'var(--warn)', Error: 'var(--crit)' };

/** What a bar is counted under: the prompt, the model, the tool, the subagent or the hook. */
export function entityOf(t) {
  if (t.type === 'user_message') return 'Prompt';
  if (t.type === 'api_call' || t.type === 'api_response') return t.model || 'Model';
  if (t.type === 'tool_use') return t.to || t.name || 'Tool';
  if (t.type === 'subagent') return t.to || 'Subagent';
  if (t.type === 'compaction') return 'Compaction';
  if (t.type === 'error') return 'Error';
  if (t.type === 'hook') return t.hook_name || 'Hook';
  return t.type || 'Other';
}

const fresh = t => ((t.tokens || {}).input || 0) + ((t.tokens || {}).output || 0);
const cached = t => ((t.tokens || {}).cache_read || 0) + ((t.tokens || {}).cache_creation || 0);
export const tokensFor = (t, mode) => (mode === 'fresh' ? fresh(t) : mode === 'cached' ? cached(t) : fresh(t) + cached(t));

/** Bars and gap marks in time order. */
export function slotsOf(bars) {
  const out = [];
  bars.forEach((b, i) => {
    if (i > 0 && b.ts - bars[i - 1].ts > GAP_S) out.push({ gap: b.ts - bars[i - 1].ts, from: bars[i - 1].ts, to: b.ts });
    out.push({ bar: b });
  });
  return out;
}

const gapText = s => (s < 60 ? Math.round(s) + ' s' : fmtDur(s));

export default function TimelineTab({ a, st, ctx }) {
  const sid = sessionIdOf(a);
  const win = windowOf(a);
  const tick = isActive(st) ? ctx.refreshKey : 0;
  const { data, error } = useDetail(() => api.getSessionFlow(sid, win.since, win.until), 'flow:' + sid, tick);
  const [off, setOff] = useState(() => new Set());
  const [mode, setMode] = useState('all');
  const bars = useMemo(() => (data?.turns || []).filter(t => KINDS.has(t.type)), [data]);
  const entities = useMemo(() => [...new Set(bars.map(entityOf))].sort(), [bars]);
  const colors = useMemo(() => {
    const m = {};
    let i = 0;
    for (const e of entities) m[e] = FIXED[e] || slotColor(i++);
    return m;
  }, [entities]);
  const shown = useMemo(() => bars.filter(b => !off.has(entityOf(b))), [bars, off]);
  if (!data) return html`<${Wait} error=${error} what="the timeline"/>`;
  const toggle = (e) => setOff((prev) => {
    const next = new Set(prev);
    if (next.has(e)) next.delete(e); else next.add(e);
    return next;
  });
  const max = Math.max(1, ...shown.map(b => tokensFor(b, mode)));
  const slots = slotsOf(shown);
  const tip = (b, e) => {
    const tok = b.tokens || {};
    const rows = [{ c: colors[entityOf(b)], label: 'Time', value: clock(b.ts) }];
    if (tok.input || tok.output) rows.push({ c: 'transparent', label: 'Input / output', value: fmtN(tok.input || 0) + ' / ' + fmtN(tok.output || 0) });
    if (tok.cache_read || tok.cache_creation) rows.push({ c: 'transparent', label: 'Cache read / write', value: fmtN(tok.cache_read || 0) + ' / ' + fmtN(tok.cache_creation || 0) });
    if (b.duration_ms > 0) rows.push({ c: 'transparent', label: 'Took', value: fmtMs(b.duration_ms) });
    if (b.type === 'user_message' && b.message) rows.push({ c: 'transparent', label: 'Prompt', value: clip(b.message, 60) });
    if (b.type === 'error') rows.push({ c: 'transparent', label: 'Error', value: clip((b.error_type || '') + ' ' + (b.error_message || ''), 60) });
    if (b.agent_name) rows.push({ c: 'transparent', label: 'Agent', value: b.agent_name });
    showTip(e.clientX, e.clientY, { title: entityOf(b), rows });
  };
  return html`<${SessionNote} a=${a}/>
    <${FixedPanel} id="agtl" title="Timeline" sub=${shown.length + ' of ' + bars.length + ' events. Pauses over 30 s are folded.'}>
      ${!bars.length ? html`<div class="bd-empty">No timeline data for this session. It is built from hook and OpenTelemetry events: run aictl otel enable to send them.</div>` : html`
        <div class="bd-ag-bar">
          <${Seg} label="Tokens" value=${mode} onPick=${setMode} items=${[['all', 'All tokens'], ['fresh', 'Not cached'], ['cached', 'Cached only']]}/>
          <button type="button" class="bd-btn" onClick=${() => setOff(new Set())}>All</button>
          <button type="button" class="bd-btn" onClick=${() => setOff(new Set(entities))}>None</button>
        </div>
        <div class="bd-legend" role="group" aria-label="Show or hide">${entities.map(e => html`<button key=${e} type="button" class="bd-li" aria-pressed=${off.has(e) ? 'false' : 'true'} onClick=${() => toggle(e)}><i class="bd-sw" style=${{ background: colors[e] }}></i>${e}</button>`)}</div>
        ${!shown.length ? html`<div class="bd-empty">No event matches the filter.</div>` : html`<div class="bd-ag-flow" role="list" aria-label="Events by time">
          ${slots.map((s, i) => {
            if (s.gap) return html`<div key=${'g' + i} class="bd-ag-gap" role="listitem" title=${clock(s.from) + ' to ' + clock(s.to) + ', ' + gapText(s.gap) + ' with no event'}><i style=${{ height: BAR_H + 'px' }}></i><span>${gapText(s.gap)}</span></div>`;
            const b = s.bar;
            const ent = entityOf(b);
            const tok = tokensFor(b, mode);
            const h = Math.max(4, Math.max(0.06, Math.log1p(tok) / Math.log1p(max)) * BAR_H);
            const split = mode === 'all' && fresh(b) + cached(b) > 0 ? cached(b) / (fresh(b) + cached(b)) : 0;
            return html`<div key=${i} class="bd-ag-slot" role="listitem" tabindex="0" data-entity=${ent} aria-label=${ent + ' at ' + clock(b.ts) + ', ' + fmtN(tok) + ' tokens'}
              onMouseMove=${e => tip(b, e)} onMouseLeave=${hideTip} onFocus=${e => { const r = e.currentTarget.getBoundingClientRect(); tip(b, { clientX: r.left, clientY: r.top }); }} onBlur=${hideTip}>
              <span class="bd-ag-col" style=${{ height: BAR_H + 'px' }}><b style=${{ height: h + 'px', background: colors[ent] }}>${split > 0 ? html`<u style=${{ height: split * 100 + '%' }}></u>` : null}</b></span>
            </div>`;
          })}
        </div>
        <div class="bd-note">Height is tokens on a log scale. In All tokens, the shaded part of a bar is cached.</div>`}`}
    </${FixedPanel}>`;
}
