// ─── Agent drawer: Flow — the session as a sequence of events ─────
// Timeline lists the events down one spine; Swim-lane draws each event as an
// arrow between the user, the tool, the model, tools, subagents and hooks.
// A click opens the event in place; hover shows it in the shared tooltip.
import { html } from 'htm/preact';
import { useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';
import * as api from '../../../api.js';
import { FixedPanel, useDetail } from '../Drawer.js';
import { NA, fmtMs, fmtN, stamp } from '../format.js';
import { Stats } from '../Panel.js';
import { hideTip, showTip } from '../tip.js';
import { Wait, Seg, SessionNote, clock, isActive, pretty, usePref } from './common.js';
import { LANE, LANE_COLOR, describe, flowModel, inputOf, outputOf, skillPhase, swimLayout, tipOf } from './flowModel.js';
import EvidenceTab from './EvidenceTab.js';
import SessionKql from './SessionKql.js';
import { parseCustomRange, toLocalISOString } from '../../../utils/customRange.js';

/** The stored choice of the old Session Flow screen, kept so the choice carries over. */
export const FLOW_MODE_KEY = 'aictl-pref-session_flow_mode';

function correlatedKql(ev, sessionId) {
  if (!sessionId) return '';
  const sid = JSON.stringify(String(sessionId));
  if (ev.type === 'tool_use') {
    const toolPred = ev.to ? ` and tool_name == ${JSON.stringify(String(ev.to))}` : '';
    const errPred = ev.success === false ? ' and is_error == 1' : '';
    return `tool_invocations\n| where session_id == ${sid}${toolPred}${errPred}\n| top 100 by ts desc\n| project event_time=unixtime_seconds_todatetime(ts), tool_name, duration_ms, is_error`;
  }
  if (ev.type === 'api_call') {
    const modPred = ev.model ? ` and model == ${JSON.stringify(String(ev.model))}` : '';
    return `requests\n| where session_id == ${sid}${modPred}\n| top 100 by ts desc\n| project event_time=unixtime_seconds_todatetime(ts), model, input_tokens, output_tokens, cost_usd`;
  }
  if (ev.type === 'skill_event') {
    return `OTELTraces\n| where SessionId == ${sid} and isnotempty(ReportedSkillNames)\n| project StartTime, OperationName, Model, ToolName, ReportedSkillNames`;
  }
  return `session_steps\n| where session_id == ${sid}\n| top 100 by ts desc\n| project event_time=unixtime_seconds_todatetime(ts), step_key, ['kind'], phase, name, agent_id, turn_id`;
}

function Inspector({ ev, sessionId, onClose }) {
  const d = describe(ev);
  const tok = ev.tokens || {};
  const size = ev.type === 'api_call' ? fmtN(tok.input || 0) + ' tokens in'
    : ev.type === 'api_response' ? fmtN(tok.output || 0) + ' tokens out'
      : ev.result_size ? ev.result_size + ' B out'
        : ev.prompt_length ? ev.prompt_length + ' characters' : NA;
  const decision = ev.decision || (ev.success === false || ev.success === 'false' ? 'Failed' : ev.success === true || ev.success === 'true' ? 'OK' : NA);
  const meta = [['Type', ev.type === 'user_message' ? 'User input prompt' : ev.type || NA], ['Time', stamp(ev.ts, true)], ['Took', ev.duration_ms ? fmtMs(ev.duration_ms) : NA], ['Size', size], ['Model', ev.model || NA], ['Result', decision]];
  if (ev._rt) meta.push(['Turn tokens', fmtN(ev._rt)]);
  if (ev._cum) meta.push(['Session cumulative', fmtN(ev._cum)]);
  if (ev.agent_id && ev.type !== 'skill_event') meta.push(['Subagent ID', ev.agent_id]);
  if (ev.type === 'skill_event') {
    meta.splice(0, meta.length, ['Skill', ev.name], ['Evidence', skillPhase(ev.phase)], ['Source', ev.source],
      [ev.phase === 'reported' ? 'First reported in range' : 'Time', stamp(ev.ts, true)]);
    if (ev.phase === 'reported') meta.push(['Last reported in range', stamp(ev.last_ts, true)], ['Distinct spans', fmtN(ev.reported_spans)]);
    if (ev.agent_id) meta.push(['Agent ID', ev.agent_id]);
  }
  if (ev.type === 'user_message') meta.push(['Source', ev.source || NA], ['Text', ev.text_status || (ev.redacted ? 'Not retained' : 'Recorded')]);
  const input = pretty(inputOf(ev));
  const output = pretty(outputOf(ev));
  const kqlSnippet = correlatedKql(ev, sessionId);
  const ln = LANE[ev.type] || { lane: 'tool' };
  const isErr = (ev.type === 'api_call' && ev.is_error) || ev.type === 'error' || (ev.type === 'tool_use' && ev.success === false);
  const c = isErr ? LANE_COLOR.error : ev.type === 'skill_event' ? 'var(--warn)' : LANE_COLOR[ln.lane] || 'var(--ink3)';
  return html`<aside class="bd-ag-insp bd-flow-side" role="region" aria-label="Selected event">
    <div class="bd-ag-insph">
      <span class="bd-ag-lane" style=${{ color: c, borderColor: c }}>${ev.type === 'skill_event' ? 'skill' : ln.lane}</span>
      <b title=${d.label}>${d.label}</b>
      ${ev._turnIndex > 0 && html`<span class="bd-flow-turn-num">Turn #${ev._turnIndex}</span>`}
      <button type="button" class="bd-btn" onClick=${onClose}>Close</button>
    </div>
    <dl class="bd-ag-kv">${meta.map(([k, v]) => html`<div key=${k}><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>
    ${input ? html`<div class="bd-ag-sect">${ev.type === 'user_message' ? 'Your prompt' : 'Input'}</div><pre class="bd-ag-pre">${input}</pre>` : null}
    ${output ? html`<div class="bd-ag-sect">Output</div><pre class="bd-ag-pre">${output}</pre>` : null}
    ${kqlSnippet ? html`<div class="bd-ag-sect">Correlated KQL Snippet</div><pre class="bd-ag-pre bd-insp-kql">${kqlSnippet}</pre>` : null}
  </aside>`;
}

const hoverTip = (ev, color) => e => showTip(e.clientX, e.clientY, tipOf(ev, color));

// An anonymous legacy event is selected only for this response. Its position,
// timestamp, turn and tool-call IDs do not uniquely identify it on refresh.
const eventKey = e => e.step_key || e.event_id || e;

function TurnScrubber({ turnGroups, activeTurn, onSelectTurn }) {
  if (!turnGroups || turnGroups.length < 2) return null;
  const maxTok = Math.max(1, ...turnGroups.map(g => g.tokens || 0));
  const peakTurn = turnGroups.reduce((best, g) => (!best || (g.tokens || 0) > (best.tokens || 0) ? g : best), null);
  return html`<div class="bd-flow-scrubber" role="region" aria-label="Session turn scrubber">
    <div class="bd-flow-scrub-meta">
      <strong>Turn Scrubber (${fmtN(turnGroups.length)} turns)</strong>
      ${peakTurn && peakTurn.tokens > 0 ? html`<span>Peak: Turn #${peakTurn.turnIndex} (${fmtN(peakTurn.tokens)} tok)</span>` : null}
      ${activeTurn != null ? html`<button type="button" class="bd-btn bd-flow-scrub-clear" onClick=${() => onSelectTurn(null)}>Turn #${activeTurn} selected ×</button>` : null}
    </div>
    <div class="bd-flow-scrub-track">
      ${turnGroups.map(g => {
        const h = Math.max(16, Math.round(((g.tokens || 1) / maxTok) * 100));
        const isPeak = peakTurn && g.turnIndex === peakTurn.turnIndex && g.tokens > 0;
        const isSel = activeTurn === g.turnIndex;
        const cls = [
          'bd-flow-sbar',
          isPeak ? 'bd-peak' : '',
          g.errors > 0 ? 'bd-has-err' : '',
          g.skills.length > 0 ? 'bd-has-skill' : '',
          isSel ? 'bd-on' : '',
        ].filter(Boolean).join(' ');
        const title = `Turn #${g.turnIndex} (${clock(g.startTs)}): ${fmtN(g.tokens)} tok` +
          (g.errors ? ` · ${g.errors} failed` : '') +
          (g.skills.length ? ` · skill: ${g.skills.join(', ')}` : '') +
          (g.promptText ? ` — ${g.promptText.slice(0, 80)}` : '');
        return html`<button type="button" key=${g.turnIndex} class=${cls} style=${{ height: h + '%' }}
          title=${title} aria-label=${`Turn ${g.turnIndex}`} aria-pressed=${isSel ? 'true' : 'false'}
          onClick=${() => onSelectTurn(isSel ? null : g.turnIndex)}/>`;
      })}
    </div>
  </div>`;
}

function TimelineList({ events, sel, onSel }) {
  const [collapsedTurns, setCollapsedTurns] = useState({});
  const toggleTurn = idx => setCollapsedTurns(prev => ({ ...prev, [idx]: !prev[idx] }));
  return html`<div class="bd-flow-colhdr" aria-hidden="true">
    <span>Time</span>
    <span>Actor / Kind</span>
    <span>Step / Command / Target</span>
    <span class="bd-flow-colhdr-r">Tokens</span>
    <span>Turn Timeline Waterfall</span>
  </div>
  <ul class="bd-ag-tl" aria-label="Events, oldest first">${events.map((ev, i) => {
    const ln = LANE[ev.type] || { lane: 'tool', kind: 'request' };
    const isErr = (ev.type === 'api_call' && ev.is_error) || ev.type === 'error' || (ev.type === 'tool_use' && ev.success === false);
    const c = isErr ? LANE_COLOR.error : ev.type === 'skill_event' ? 'var(--warn)' : LANE_COLOR[ln.lane] || 'var(--ink3)';
    const d = describe(ev);
    const on = sel === eventKey(ev);
    const g = ev._turnGroup;
    const isCollapsed = g && collapsedTurns[g.turnIndex] && !ev._isTurnStart && !on;
    const wfDur = ev.duration_ms > 0 ? fmtMs(ev.duration_ms) : '';
    return html`<li key=${ev.step_key || ev.event_id || i} hidden=${Boolean(isCollapsed)}>
      ${ev._isTurnStart && g && html`<div class="bd-flow-turn-hdr">
        <button type="button" class="bd-flow-turn-toggle" onClick=${() => toggleTurn(g.turnIndex)}
          aria-expanded=${collapsedTurns[g.turnIndex] ? 'false' : 'true'}>
          <span class="bd-flow-turn-chev">${collapsedTurns[g.turnIndex] ? '▸' : '▾'}</span>
          <span class="bd-flow-turn-num">Turn #${g.turnIndex}${g.isPartialStart ? ' · CONT.' : ''}</span>
          <span class="bd-flow-turn-ts">${clock(g.startTs)}${g.endTs > g.startTs ? ' → ' + clock(g.endTs) : ''}</span>
          <span class="bd-flow-turn-prompt">${g.promptText}</span>
        </button>
        <div class="bd-flow-turn-badges">
          ${g.skills.length > 0 && html`<span class="bd-flow-tbadge bd-warn">★ ${g.skills.join(', ')}</span>`}
          ${g.errors > 0 && html`<span class="bd-flow-tbadge bd-crit">${g.errors} ${g.errors === 1 ? 'Failure' : 'Failures'}</span>`}
          ${g.subagents > 0 && html`<span class="bd-flow-tbadge">${g.subagents} ${g.subagents === 1 ? 'Subagent' : 'Subagents'}</span>`}
          ${g.apiCalls > 0 && html`<span class="bd-flow-tbadge">${fmtN(g.apiCalls)} API</span>`}
          ${g.tokens > 0 && html`<span class="bd-flow-tbadge bd-focus">${fmtN(g.tokens)} tok</span>`}
          ${g.durationMs > 0 && html`<span class="bd-flow-tbadge">${fmtMs(g.durationMs)}</span>`}
        </div>
      </div>`}
      <button type="button" class=${'bd-ag-tlrow' + (on ? ' bd-on' : '') + (isErr ? ' bd-err-row' : '')} aria-expanded=${on ? 'true' : 'false'}
        onClick=${() => onSel(on ? null : eventKey(ev))} onMouseMove=${hoverTip(ev, c)} onMouseLeave=${hideTip}>
        <span class="bd-ag-when">${clock(ev.ts)}${ev._cum ? html`<em>${fmtN(ev._cum) + ' total' + (ev._rt ? ', ' + fmtN(ev._rt) + ' this turn' : '')}</em>` : null}</span>
        <span class="bd-ag-body-actor">
          <span class="bd-ag-dot" style=${{ borderColor: c, background: ln.kind === 'reply' || ln.kind === 'marker' ? c : 'transparent' }}></span>
          <span class="bd-ag-lane" style=${{ color: c, borderColor: c }}>${ev.type === 'skill_event' ? 'skill' : ln.lane}</span>
        </span>
        <span class="bd-ag-body">
          <span class="bd-ag-body-top">
            ${ev.agent_id && html`<span class="bd-flow-subtag" title=${ev.agent_id}>agent:${String(ev.agent_id).slice(0, 8)}</span>`}
            <span class="bd-ag-lbl">${d.label}</span>
          </span>
          ${d.meta ? html`<span class="bd-ag-meta">${d.meta}</span>` : null}
        </span>
        <span class="bd-ag-size">${d.size || (ev.tokens?.input ? '+' + fmtN((ev.tokens.input || 0) + (ev.tokens.output || 0)) + ' tok' : '')}</span>
        <span class="bd-ag-wf" aria-hidden="true">
          <span class="bd-ag-wftrack"><i class="bd-ag-wfbar" style=${{ left: (ev._wfOffsetPct || 0) + '%', width: (ev._wfWidthPct || 8) + '%', background: c }}></i></span>
          <span class="bd-ag-wfdur">${wfDur}</span>
        </span>
      </button>
    </li>`;
  })}</ul>`;
}

function SwimLanes({ events, participants: all, filtered, sel, onSel, toolLabel }) {
  const [streamMode, setStreamMode] = useState(false);
  const [laneMode, setLaneMode] = usePref('aictl-pref-flow-lanes', 'individual', ['individual', 'grouped']);
  const agentStreams = useMemo(() => {
    const ids = ['main'];
    for (const ev of events) {
      if (ev.agent_id && !ids.includes(ev.agent_id)) ids.push(ev.agent_id);
    }
    return ids;
  }, [events]);
  const { lanes: participants, columns } = useMemo(() => swimLayout(events, all, filtered, laneMode === 'grouped'), [events, all, filtered, laneMode]);
  const n = participants.length || 1;
  const col = id => columns.get(id) ?? -1;
  const x = i => ((i + 0.5) / n) * 100;

  if (streamMode && agentStreams.length > 1) {
    return html`<div class="bd-ag-bar bd-flow-slmode">
      <${Seg} label="Swim-lane layout" value="streams" onPick=${v => setStreamMode(v === 'streams')}
        items=${[['participants', 'Participant arrows'], ['streams', 'Session & Subagent streams']]}/>
      <span class="bd-ag-dim">Each column is an execution stream (Main session + Subagents); models and tools render inline without wasting columns.</span>
    </div>
    <div class="bd-ag-sl bd-ag-sl-streams" role="list" aria-label="Events between participants, oldest first">
      <div class="bd-flow-stream-hdr" style=${{ gridTemplateColumns: `68px repeat(${agentStreams.length}, minmax(210px, 1fr))` }}>
        <span>Time</span>
        ${agentStreams.map((aid, idx) => html`<b key=${aid} class="bd-flow-stream-colh">
          <i class="bd-sw" style=${{ background: idx === 0 ? 'var(--s1)' : 'var(--s5)', marginRight: '5px' }}/>
          ${aid === 'main' ? `Main Session (${toolLabel || 'root'})` : `Subagent ${String(aid).slice(0, 8)}`}
        </b>`)}
      </div>
      ${events.map((ev, idx) => {
        const d = describe(ev);
        const on = sel === eventKey(ev);
        const isErr = ev.type === 'error' || ev.is_error || (ev.type === 'tool_use' && ev.success === false);
        const c = isErr ? LANE_COLOR.error : ev.type === 'skill_event' ? 'var(--warn)' : LANE_COLOR[(LANE[ev.type] || {}).lane] || 'var(--ink2)';
        const activeStream = ev.agent_id && agentStreams.includes(ev.agent_id) ? ev.agent_id : 'main';
        return html`<div key=${ev.step_key || ev.event_id || idx} role="listitem">
          <button type="button" class=${'bd-flow-stream-row' + (on ? ' bd-on' : '')}
            style=${{ gridTemplateColumns: `68px repeat(${agentStreams.length}, minmax(210px, 1fr))` }}
            aria-expanded=${on ? 'true' : 'false'} aria-label=${clock(ev.ts) + ' ' + d.label}
            onClick=${() => onSel(on ? null : eventKey(ev))} onMouseMove=${hoverTip(ev, c)} onMouseLeave=${hideTip}>
            <span class="bd-flow-stream-ts">${clock(ev.ts)}</span>
            ${agentStreams.map(aid => html`<span key=${aid} class="bd-flow-stream-cell">
              ${aid === activeStream ? html`<span class=${'bd-flow-stream-card' + (isErr ? ' bd-err' : ev.type === 'skill_event' ? ' bd-skill' : '')}>
                <span class="bd-flow-sc-top"><strong><i class="bd-sw" style=${{ background: c, marginRight: '5px' }}/>${d.label}</strong>${ev.duration_ms > 0 ? html`<em>${fmtMs(ev.duration_ms)}</em>` : null}</span>
                ${d.meta ? html`<span class="bd-flow-sc-meta">${d.meta}</span>` : null}
              </span>` : null}
            </span>`)}
          </button>
        </div>`;
      })}
    </div>`;
  }

  return html`<div class="bd-ag-bar bd-flow-slmode">
    ${agentStreams.length > 1 && html`<${Seg} label="Swim-lane layout" value="participants" onPick=${v => setStreamMode(v === 'streams')}
      items=${[['participants', 'Participant arrows'], ['streams', 'Session & Subagent streams (' + agentStreams.length + ')']]}/>`}
    <${Seg} label="Participant lanes" value=${laneMode} onPick=${setLaneMode}
      items=${[['individual', 'Individual lanes'], ['grouped', 'Group lanes']]}/>
  </div>
  <div class="bd-ag-sl" style=${{ '--flow-diagram-width': (158 + n * 96) + 'px', '--flow-lane-pitch': (100 / n) + '%' }} tabindex="0" role="list" aria-label="Events between participants, oldest first">
    <div class="bd-ag-slhead" aria-hidden="true"><span>Total</span><span>Turn</span><span>Time</span>
      <span class="bd-ag-slarea">${participants.map((p, i) => html`<b key=${p.id} style=${{ left: x(i) + '%', color: p.color, borderColor: p.color }} title=${p.label}>${p.label}</b>`)}</span>
    </div>
    ${events.map((ev, idx) => {
      const a = col(ev._from);
      const b = col(ev._to);
      const d = describe(ev);
      const on = sel === eventKey(ev);
      const dest = participants[b];
      const c = ev.type === 'error' || ev.is_error ? LANE_COLOR.error : ev.type === 'user_message' ? LANE_COLOR.user : ev.type === 'api_response' ? LANE_COLOR.api : dest?.color || 'var(--ink2)';
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
      return html`<div key=${ev.step_key || ev.event_id || idx} role="listitem">
        <button type="button" class=${'bd-ag-slrow' + (on ? ' bd-on' : '')} aria-expanded=${on ? 'true' : 'false'} aria-label=${clock(ev.ts) + ' ' + d.label}
          onClick=${() => onSel(on ? null : eventKey(ev))} onMouseMove=${hoverTip(ev, c)} onMouseLeave=${hideTip}>
          <span>${ev._cum ? fmtN(ev._cum) : ''}</span><span>${ev._rt ? fmtN(ev._rt) : ''}</span><span>${clock(ev.ts)}</span>
          <span class="bd-ag-slarea">${mark}</span>
        </button>
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

const EMPTY_FILTERS = { q: '', category: '', tool_name: '', flow_agent: '', skill_name: '', skill_phase: '', failed: false, range: 'whole', start: '', end: '' };
const CATEGORIES = ['prompts', 'messages', 'models', 'tools', 'skills', 'agents', 'context', 'hooks', 'lifecycle'];

function FlowFilters({ apply, scope, bounds, initialCategory, activeCategory, activeFailed }) {
  const [f, set] = useState(() => ({ ...EMPTY_FILTERS, category: initialCategory }));
  const [problem, setProblem] = useState('');
  const id = useId();
  const change = (key, value) => { set(prev => ({ ...prev, [key]: value })); setProblem(''); };
  const submit = e => {
    e.preventDefault();
    const p = new URLSearchParams();
    const keys = ['q', 'category', 'flow_agent', ...(f.category === 'skills' ? ['skill_name', 'skill_phase'] : ['tool_name'])];
    for (const key of keys) if (f[key].trim()) p.set(key, f[key].trim());
    if (f.failed && f.category !== 'skills') p.set('failed', '1');
    let times;
    if (f.range === 'custom') times = parseCustomRange(f.start, f.end);
    else if (f.range !== 'whole') {
      if (!Number.isFinite(bounds.end)) { setProblem('The session end time has not been reported.'); return; }
      times = { since: bounds.end - Number(f.range), until: bounds.end };
    }
    if (times?.error) { setProblem(times.error); return; }
    if (times) { p.set('since', Math.floor(times.since)); p.set('until', Math.ceil(times.until)); }
    setProblem(''); apply(p.toString());
  };
  const range = value => {
    if (value !== 'custom') { change('range', value); return; }
    setProblem('');
    set(prev => ({ ...prev, range: value,
      start: prev.start || (Number.isFinite(bounds.start) ? toLocalISOString(bounds.start) : ''),
      end: prev.end || (Number.isFinite(bounds.end) ? toLocalISOString(Math.ceil(bounds.end / 60) * 60) : ''),
    }));
  };
  const quick = category => {
    const next = { ...EMPTY_FILTERS, category: activeCategory === category ? '' : category };
    set(next); setProblem(''); apply(next.category ? 'category=' + category : '');
  };
  const quickFailed = () => {
    const nextFailed = !activeFailed;
    const next = { ...EMPTY_FILTERS, failed: nextFailed };
    set(next); setProblem(''); apply(nextFailed ? 'failed=1' : '');
  };
  return html`<form class="bd-flow-filters" role="search" aria-label="Flow filters" onSubmit=${submit}>
    <div class="bd-flow-quickbar">
      <button type="button" class=${'bd-btn bd-flow-qpill' + (!activeCategory && !activeFailed ? ' bd-on' : '')}
        aria-pressed=${!activeCategory && !activeFailed} onClick=${() => { set(EMPTY_FILTERS); setProblem(''); apply(''); }}>All events</button>
      <button type="button" class=${'bd-btn bd-flow-qpill' + (activeCategory === 'prompts' ? ' bd-on' : '')}
        aria-pressed=${activeCategory === 'prompts'} onClick=${() => quick('prompts')}>User prompts</button>
      <button type="button" class=${'bd-btn bd-flow-qpill' + (activeCategory === 'models' ? ' bd-on' : '')}
        aria-pressed=${activeCategory === 'models'} onClick=${() => quick('models')}>Model rounds</button>
      <button type="button" class=${'bd-btn bd-flow-qpill' + (activeCategory === 'tools' ? ' bd-on' : '')}
        aria-pressed=${activeCategory === 'tools'} onClick=${() => quick('tools')}>Tool uses</button>
      <button type="button" class=${'bd-btn bd-flow-qpill' + (activeCategory === 'agents' ? ' bd-on' : '')}
        aria-pressed=${activeCategory === 'agents'} onClick=${() => quick('agents')}>Subagents</button>
      <button type="button" class=${'bd-btn bd-flow-qpill bd-flow-qskill' + (activeCategory === 'skills' ? ' bd-on' : '')}
        aria-pressed=${activeCategory === 'skills'} onClick=${() => quick('skills')}>Skills</button>
      <button type="button" class=${'bd-btn bd-flow-qpill bd-flow-qerr' + (activeFailed ? ' bd-on' : '')}
        aria-pressed=${Boolean(activeFailed)} onClick=${quickFailed}>Failed steps</button>
      <label class="bd-flow-search"><span class="bd-flow-srchlbl">${f.category === 'prompts' ? 'Search prompt text' : 'Search events'}</span><input type="search" placeholder=${f.category === 'prompts' ? 'Words you wrote in this session' : 'Search prompt, tool, path, error...'} value=${f.q} onInput=${e => change('q', e.currentTarget.value)}/></label>
    </div>
    <div class="bd-flow-filter-row">
      <label><span>Category</span><select value=${f.category} onChange=${e => change('category', e.currentTarget.value)}>
        <option value="">All categories</option>${CATEGORIES.map(c => html`<option key=${c} value=${c}>${c === 'prompts' ? 'User prompts only' : c[0].toUpperCase() + c.slice(1)}</option>`)}
      </select></label>
      ${f.category === 'skills' ? html`<label><span>Skill name</span><input list=${id + '-skills'} placeholder="Any skill" value=${f.skill_name} onInput=${e => change('skill_name', e.currentTarget.value)}/></label>
        <datalist id=${id + '-skills'}>${scope?.skills?.map(s => html`<option value=${s} key=${s}/>` )}</datalist>
        <label><span>Skill evidence</span><select value=${f.skill_phase} onChange=${e => change('skill_phase', e.currentTarget.value)}>
          <option value="">All evidence</option>${['loaded', 'invoked', 'reported', 'resolved'].map(k => html`<option key=${k} value=${k}>${skillPhase(k)}</option>`)}
        </select></label>` : html`<label><span>Tool name</span><input list=${id + '-tools'} placeholder="Any tool" value=${f.tool_name} onInput=${e => change('tool_name', e.currentTarget.value)}/></label>`}
      <datalist id=${id + '-tools'}>${scope?.tools?.map(t => html`<option key=${t} value=${t}/>`)}</datalist>
      <label><span>Agent ID</span><input list=${id + '-agents'} placeholder="Any agent" value=${f.flow_agent} onInput=${e => change('flow_agent', e.currentTarget.value)}/></label>
      <datalist id=${id + '-agents'}>${scope?.agents?.map(t => html`<option key=${t} value=${t}/>`)}</datalist>
      <label><span>Time range</span><select value=${f.range} onChange=${e => range(e.currentTarget.value)}>
        <option value="whole">Whole session</option><option value="900" disabled=${!Number.isFinite(bounds.end)}>Last 15 min of session</option>
        <option value="3600" disabled=${!Number.isFinite(bounds.end)}>Last hour of session</option><option value="custom">Custom range</option>
      </select></label>
      ${f.range === 'custom' && html`<label><span>From (local)</span><input type="datetime-local" value=${f.start} onInput=${e => change('start', e.currentTarget.value)}/></label>
        <label><span>To (local)</span><input type="datetime-local" value=${f.end} onInput=${e => change('end', e.currentTarget.value)}/></label>`}
      <div class="bd-flow-actions">${f.category !== 'skills' && html`<label class="bd-ag-check"><input type="checkbox" checked=${f.failed} onChange=${e => change('failed', e.currentTarget.checked)}/>Failures only</label>`}
        <button type="submit" class="bd-btn bd-p">Apply filters</button>
        <button type="button" class="bd-btn" onClick=${() => { set(EMPTY_FILTERS); setProblem(''); apply(''); }}>Reset filters</button>
      </div>
    </div>
    ${problem && html`<span class="bd-ag-bad" role="alert">${problem}</span>`}
  </form>`;
}

function kustoUrl(value) {
  if (!value) return null;
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; } catch { return null; }
}

export default function FlowTab(props) {
  return html`<${SessionFlow} key=${props.a.id} ...${props}/>`;
}

function SessionFlow({ a, st, ctx, act, flowRef, sid, captureMode, initialEvidence = false, initialPrompts = false, initialSkills = false, agentData }) {
  const tick = isActive(st) ? ctx.refreshKey : 0;
  const [limit, setLimit] = useState(FLOW_EVENTS);
  const initialCategory = initialPrompts ? 'prompts' : initialSkills ? 'skills' : '';
  const [filters, setFilters] = useState(initialCategory ? 'category=' + initialCategory : '');
  const query = 'limit=' + limit + (filters ? '&' + filters : '');
  const { data, error } = useDetail(o => api.getBoardAgentFlow(a.id, query, o), JSON.stringify(['flow', a.id, query]), tick);
  const [diagram, setDiagram] = usePref(FLOW_MODE_KEY, 'timeline', ['timeline', 'swimlane']);
  const [source, setSource] = useState(initialEvidence);
  const [visited, setVisited] = useState(initialEvidence);
  const [activeTurn, setActiveTurn] = useState(null);
  useEffect(() => { setSource(initialEvidence); if (initialEvidence) setVisited(true); }, [initialEvidence]);
  const mode = source ? 'source' : diagram;
  const [sel, setSel] = useState(null);
  const whole = useRef({});
  if (data && !new URLSearchParams(filters).has('since') && !new URLSearchParams(filters).has('until') && (!filters || !whole.current.end)) whole.current = { start: data.scope?.start ?? a.started_at, end: data.scope?.end ?? a.ended_at ?? data.turns?.at(-1)?.ts };
  const bounds = { start: whole.current.start ?? a.started_at, end: whole.current.end ?? a.ended_at };
  const toolLabel = ctx.toolName ? ctx.toolName(a.tool) : a.tool;
  const m = useMemo(() => flowModel(data?.turns || [], toolLabel, data?.summary), [data, toolLabel]);
  const baseEvents = useMemo(() => flowRef ? m.events.filter(e => e[flowRef.field] === flowRef.id && (!flowRef.traceId || e.trace_id === flowRef.traceId)) : m.events, [m, flowRef]);
  const events = useMemo(() => activeTurn != null ? baseEvents.filter(e => e._turnIndex === activeTurn) : baseEvents, [baseEvents, activeTurn]);
  const selectedEvent = useMemo(() => (sel != null ? events.find(e => eventKey(e) === sel) || null : null), [events, sel]);
  const pick = v => { setSource(v === 'source'); if (v === 'source') setVisited(true); else setDiagram(v); };
  const apply = value => { if (value !== filters) { setSel(null); setActiveTurn(null); setFilters(value); setLimit(FLOW_EVENTS); } };
  const kusto = kustoUrl(data?.session_kql_url);
  const scope = data?.scope;
  const sessionId = sid || data?.session_id;
  const agents = ctx.data?.agents;
  const sessions = useMemo(() => [...new Set([sessionId, ...(agents || []).map(row => {
    if (row.native_session_id) return row.native_session_id;
    if (row.placeholder || row.id?.startsWith('live:') || (row.runtime_present && !row.queryable)) return null;
    return row.session_id || row.parent_id || row.id;
  })].filter(Boolean))], [sessionId, agents]);
  const applied = new URLSearchParams(filters);
  const since = applied.has('since') ? Number(applied.get('since')) : null;
  const until = applied.has('until') ? Number(applied.get('until')) : null;
  const sourceSid = sid === undefined ? a.native_session_id || a.session_id || data?.session_id : sid;
  const sub = filters ? 'Summary counts all events in the selected time span.' : data && eventsText(data);
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
    ${data && !data.summary?.skill_evidence && html`<${FixedPanel} key="summary" id="agfs" title="Summary" sub=${sub}><${Stats} stats=${stats}/></${FixedPanel}>`}
    <${FixedPanel} key="flow" id="agfl" title="Flow" sub=${source ? 'Search retained source records separately from flow events.' : omitted(data) && !filters ? 'Oldest first. The ' + fmtN(omitted(data)) + ' oldest events are left out; the summary counts them.' : 'Oldest first. Select an event to read it.'}>
      <div class="bd-ag-bar bd-flow-toolbar">
        <${Seg} label="Flow view" value=${mode} onPick=${pick} items=${[['timeline', 'Timeline'], ['swimlane', 'Swim-lane'], ['source', 'Source steps']]}/>
        ${data && !source && html`<span class="bd-flow-status" role="status">${scope && scope.matched != null && scope.total != null
          ? `Showing ${events.length.toLocaleString()} · ${scope.matched.toLocaleString()} matched of ${scope.total.toLocaleString()} events in range`
          : eventsText(data)}</span>`}
        ${data && !source && omitted(data) && limit < FLOW_EVENTS_MAX ? html`<button type="button" class="bd-btn" onClick=${() => setLimit(l => Math.min(FLOW_EVENTS_MAX, l + FLOW_EVENTS_STEP))}>${'Show ' + Math.min(omitted(data), FLOW_EVENTS_STEP).toLocaleString('en-US') + ' older events'}</button>` : null}
        ${data && !source && omitted(data) && limit >= FLOW_EVENTS_MAX ? html`<span class="bd-ag-dim">${fmtN(omitted(data))} older matching events remain outside the display limit.</span>` : null}
        ${kusto && html`<a class="bd-btn bd-flow-kusto" href=${kusto} target="_blank" rel="noopener noreferrer">Open session in Kusto</a>`}
      </div>
      ${kusto && html`<${SessionKql} url=${data.session_kql_url} sessionId=${sessionId} sessions=${sessions}
        models=${scope?.models?.length ? scope.models : a.models || []} tools=${scope?.tools || []} since=${since} until=${until}
        flowFilters=${Object.fromEntries(applied)}/>`}
      <div hidden=${source}>
        <${FlowFilters} scope=${scope} bounds=${bounds} apply=${apply} initialCategory=${initialCategory}
          activeCategory=${applied.get('category')} activeFailed=${applied.get('failed') === '1'}/>
        ${data && html`<${TurnScrubber} turnGroups=${m.turnGroups} activeTurn=${activeTurn} onSelectTurn=${setActiveTurn}/>`}
        ${applied.get('category') === 'skills' && html`<p class="bd-note">Loaded files and invocations are separate records. “Reported in context” groups OTel spans by skill; it does not count skill loads.</p>`}
        ${applied.get('category') === 'prompts' && html`<p class="bd-note">User input only. Select a row to read the retained prompt. Assistant replies and delegated instructions are not included.</p>`}
        ${flowRef && html`<div class="bd-ag-bar"><span>${flowRef.label} ID: ${flowRef.id}</span><button type="button" class="bd-btn" onClick=${() => { setSel(null); act.setDrawerTab('flow'); }}>Show full flow</button></div>`}
        ${!data ? html`<${Wait} error=${error} what="the session flow"/>` : !events.length ? html`<div class="bd-empty">${flowRef ? 'No event in the loaded flow reports this source ID.' : filters ? 'No events match these flow filters.' : 'No flow data for this session: aictl has no prompt, model call or tool call of it, and no hook or OpenTelemetry event.'}</div>`
          : !source && html`<div class=${'bd-flow-workspace' + (selectedEvent ? ' bd-has-insp' : '')}>
            <div class="bd-flow-main">
              ${diagram === 'swimlane'
                ? html`<${SwimLanes} events=${events} participants=${m.participants} filtered=${!!(filters || flowRef)} sel=${sel} onSel=${setSel} toolLabel=${toolLabel}/>`
                : html`<${TimelineList} events=${events} sel=${sel} onSel=${setSel}/>`}
            </div>
            ${selectedEvent && html`<${Inspector} ev=${selectedEvent} sessionId=${sessionId} onClose=${() => setSel(null)}/>`}
          </div>`}
      </div>
      ${visited && html`<div hidden=${!source}><${EvidenceTab} inline=${true} a=${a} sid=${sourceSid} data=${agentData} act=${act} captureMode=${captureMode ?? ctx.data?.capture_mode}/></div>`}
    </${FixedPanel}>`;
}
