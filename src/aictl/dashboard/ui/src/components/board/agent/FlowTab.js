// ─── Agent drawer: Flow — the session as a sequence of events ─────
// Timeline lists the events down one spine; Swim-lane draws each event as an
// arrow between the user, the tool, the model, tools, subagents and hooks.
// A click opens the event in place; hover shows it in the shared tooltip.
import { html } from 'htm/preact';
import { useMemo, useState } from 'preact/hooks';
import * as api from '../../../api.js';
import { FixedPanel, useDetail } from '../Drawer.js';
import { NA, fmtMs, fmtN, stamp } from '../format.js';
import { Stats } from '../Panel.js';
import { hideTip, showTip } from '../tip.js';
import { Wait, Seg, SessionNote, clock, isActive, pretty, usePref } from './common.js';
import { LANE, LANE_COLOR, describe, flowModel, inputOf, outputOf, tipOf } from './flowModel.js';

/** The stored choice of the old Session Flow screen, kept so the choice carries over. */
export const FLOW_MODE_KEY = 'aictl-pref-session_flow_mode';

function Inspector({ ev, onClose }) {
  const d = describe(ev);
  const tok = ev.tokens || {};
  const size = ev.type === 'api_call' ? fmtN(tok.input || 0) + ' tokens in'
    : ev.type === 'api_response' ? fmtN(tok.output || 0) + ' tokens out'
      : ev.result_size ? ev.result_size + ' B out'
        : ev.prompt_length ? ev.prompt_length + ' characters' : NA;
  const decision = ev.decision || (ev.success === false || ev.success === 'false' ? 'Failed' : ev.success === true || ev.success === 'true' ? 'OK' : NA);
  const meta = [['Type', ev.type || NA], ['Time', stamp(ev.ts, true)], ['Took', ev.duration_ms ? fmtMs(ev.duration_ms) : NA], ['Size', size], ['Model', ev.model || NA], ['Result', decision]];
  const input = pretty(inputOf(ev));
  const output = pretty(outputOf(ev));
  return html`<div class="bd-ag-insp" role="region" aria-label="Selected event">
    <div class="bd-ag-insph"><b title=${d.label}>${d.label}</b><button type="button" class="bd-btn" onClick=${onClose}>Close</button></div>
    <dl class="bd-ag-kv">${meta.map(([k, v]) => html`<div key=${k}><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>
    ${input ? html`<div class="bd-ag-sect">Input</div><pre class="bd-ag-pre">${input}</pre>` : null}
    ${output ? html`<div class="bd-ag-sect">Output</div><pre class="bd-ag-pre">${output}</pre>` : null}
  </div>`;
}

const hoverTip = (ev, color) => e => showTip(e.clientX, e.clientY, tipOf(ev, color));

function TimelineList({ events, sel, onSel }) {
  return html`<ul class="bd-ag-tl" aria-label="Events, oldest first">${events.map((ev, i) => {
    const ln = LANE[ev.type] || { lane: 'tool', kind: 'request' };
    const c = ev.type === 'api_call' && ev.is_error ? LANE_COLOR.error : LANE_COLOR[ln.lane] || 'var(--ink3)';
    const d = describe(ev);
    const on = sel === i;
    return html`<li key=${i}>
      <button type="button" class=${'bd-ag-tlrow' + (on ? ' bd-on' : '')} aria-expanded=${on ? 'true' : 'false'}
        onClick=${() => onSel(on ? null : i)} onMouseMove=${hoverTip(ev, c)} onMouseLeave=${hideTip}>
        <span class="bd-ag-when">${clock(ev.ts)}${ev._cum ? html`<em>${fmtN(ev._cum) + ' total' + (ev._rt ? ', ' + fmtN(ev._rt) + ' this turn' : '')}</em>` : null}</span>
        <span class="bd-ag-dot" style=${{ borderColor: c, background: ln.kind === 'reply' || ln.kind === 'marker' ? c : 'transparent' }}></span>
        <span class="bd-ag-body"><span class="bd-ag-lane" style=${{ color: c }}>${ln.lane}</span><span class="bd-ag-lbl">${d.label}</span>${d.meta ? html`<span class="bd-ag-meta">${d.meta}</span>` : null}</span>
        <span class="bd-ag-size">${d.size || ''}</span>
      </button>
      ${on ? html`<${Inspector} ev=${ev} onClose=${() => onSel(null)}/>` : null}
    </li>`;
  })}</ul>`;
}

function SwimLanes({ events, participants, sel, onSel }) {
  const n = participants.length || 1;
  const col = id => participants.findIndex(p => p.id === id);
  const x = i => ((i + 0.5) / n) * 100;
  return html`<div class="bd-ag-sl" role="list" aria-label="Events between participants, oldest first">
    <div class="bd-ag-slhead" aria-hidden="true"><span>Total</span><span>Turn</span><span>Time</span>
      <span class="bd-ag-slarea">${participants.map((p, i) => html`<b key=${p.id} style=${{ left: x(i) + '%', color: p.color, borderColor: p.color }} title=${p.label}>${p.label}</b>`)}</span>
    </div>
    ${events.map((ev, idx) => {
      const a = col(ev._from);
      const b = col(ev._to);
      const d = describe(ev);
      const on = sel === idx;
      const dest = participants[b];
      const c = ev.type === 'error' || ev.is_error ? LANE_COLOR.error : ev.type === 'user_message' ? LANE_COLOR.user : ev.type === 'api_response' ? LANE_COLOR.api : dest?.color || 'var(--ink2)';
      const lanes = participants.map((p, i) => html`<i key=${p.id} class="bd-ag-lanel" style=${{ left: x(i) + '%' }}></i>`);
      let mark;
      if (a < 0 || b < 0) {
        const mc = LANE_COLOR[(LANE[ev.type] || {}).lane] || 'var(--ink3)';
        mark = html`<span class="bd-ag-marker" style=${{ color: mc, borderColor: mc }}>${d.label}${d.meta ? ' · ' + d.meta : ''}</span>`;
      } else {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        const right = b > a;
        mark = html`<span class="bd-ag-arrow" style=${{ left: x(lo) + '%', width: (x(hi) - x(lo)) + '%', borderColor: c }}>
          <span class=${'bd-ag-head' + (right ? ' bd-r' : ' bd-l')} style=${{ color: c }}></span>
        </span>
        <span class="bd-ag-alabel" style=${{ left: ((x(lo) + x(hi)) / 2) + '%', color: c }} title=${d.label}>${d.label}${d.meta ? html`<em>${d.meta}</em>` : null}</span>`;
      }
      return html`<div key=${idx} role="listitem">
        <button type="button" class=${'bd-ag-slrow' + (on ? ' bd-on' : '')} aria-expanded=${on ? 'true' : 'false'} aria-label=${clock(ev.ts) + ' ' + d.label}
          onClick=${() => onSel(on ? null : idx)} onMouseMove=${hoverTip(ev, c)} onMouseLeave=${hideTip}>
          <span>${ev._cum ? fmtN(ev._cum) : ''}</span><span>${ev._rt ? fmtN(ev._rt) : ''}</span><span>${clock(ev.ts)}</span>
          <span class="bd-ag-slarea">${lanes}${mark}</span>
        </button>
        ${on ? html`<${Inspector} ev=${ev} onClose=${() => onSel(null)}/>` : null}
      </div>`;
    })}
  </div>`;
}

const omitted = data => data?.summary?.omitted_events || 0;
const eventsText = (data) => {
  const shown = (data.turns || []).length;
  return omitted(data) ? 'Newest ' + fmtN(shown) + ' of ' + fmtN(shown + omitted(data)) + ' events' : fmtN(shown) + ' events';
};

/** Events the flow reads at first, and how many more each "older" step adds. */
export const FLOW_EVENTS = 500;
export const FLOW_EVENTS_STEP = 1000;
export const FLOW_EVENTS_MAX = 5000;

export default function FlowTab({ a, st, ctx }) {
  const tick = isActive(st) ? ctx.refreshKey : 0;
  const [limit, setLimit] = useState(FLOW_EVENTS);
  const { data, error } = useDetail(o => api.getBoardAgentFlow(a.id, 'limit=' + limit, o), 'flow:' + a.id + ':' + limit, tick);
  const [mode, setMode] = usePref(FLOW_MODE_KEY, 'timeline', ['timeline', 'swimlane']);
  const [sel, setSel] = useState(null);
  const toolLabel = ctx.toolName ? ctx.toolName(a.tool) : a.tool;
  const m = useMemo(() => flowModel(data?.turns || [], toolLabel, data?.summary), [data, toolLabel]);
  const pick = (v) => { setSel(null); setMode(v); };
  if (!data) return html`<${Wait} error=${error} what="the session flow"/>`;
  const s = m.summary;
  const stats = [
    { label: 'Turns', value: fmtN(s.turns), title: 'Prompts in the session' },
    { label: 'Tool calls', value: fmtN(s.toolCalls) },
    { label: 'Subagents', value: fmtN(s.subagents) },
    { label: 'Hooks', value: fmtN(s.hooks) },
    { label: 'Errors', value: fmtN(s.errors) },
    { label: 'Compactions', value: fmtN(s.compactions) },
    { label: 'Tokens, total', value: fmtN(s.cumulative), title: 'Input and output of every model call, added up' },
    { label: 'Largest turn', value: fmtN(s.roundTrip), title: 'The most input and output tokens between two prompts' },
    { label: 'First token', value: s.ttft == null ? NA : fmtMs(s.ttft), sub: s.ttftCalls ? 'median of ' + s.ttftCalls + ' calls' : '', title: 'Time to first token' },
  ];
  return html`<${SessionNote} a=${a}/>
    <${FixedPanel} id="agfs" title="Summary" sub=${eventsText(data)}><${Stats} stats=${stats}/></${FixedPanel}>
    <${FixedPanel} id="agfl" title="Flow" sub=${omitted(data) ? 'Oldest first. The ' + fmtN(omitted(data)) + ' oldest events are left out; the summary counts them. Select an event to read it.' : 'Oldest first. Select an event to read it.'}>
      <div class="bd-ag-bar"><${Seg} label="Flow view" value=${mode} onPick=${pick} items=${[['timeline', 'Timeline'], ['swimlane', 'Swim-lane']]}/>
        ${omitted(data) && limit < FLOW_EVENTS_MAX ? html`<button type="button" class="bd-btn" onClick=${() => setLimit(l => Math.min(FLOW_EVENTS_MAX, l + FLOW_EVENTS_STEP))}>${'Show ' + fmtN(Math.min(omitted(data), FLOW_EVENTS_STEP)) + ' older events'}</button>` : null}
        ${omitted(data) && limit >= FLOW_EVENTS_MAX ? html`<span class="bd-ag-dim">${'The ' + fmtN(omitted(data)) + ' oldest events stay out; the summary counts them.'}</span>` : null}
      </div>
      ${!m.events.length ? html`<div class="bd-empty">No flow data for this session: aictl has no prompt, model call or tool call of it, and no hook or OpenTelemetry event.</div>`
        : mode === 'swimlane' ? html`<${SwimLanes} events=${m.events} participants=${m.participants} sel=${sel} onSel=${setSel}/>`
          : html`<${TimelineList} events=${m.events} sel=${sel} onSel=${setSel}/>`}
    </${FixedPanel}>`;
}
