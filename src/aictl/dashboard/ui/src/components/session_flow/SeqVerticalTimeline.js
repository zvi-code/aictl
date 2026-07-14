// SeqVerticalTimeline — alternate render for processed session-flow events.
//
// Replaces the horizontal swim-lane (SeqArrow/SeqMarker) with a vertical
// newspaper-column timeline modeled on the Direction-C "Editorial Inspector"
// skeleton in visualization/direction-c.jsx. Each event becomes a row with:
//
//   [ time + cum/rt tokens ] | [ spine dot ] | [ lane + kind + label + meta ] | [ size ]
//
// The dot's shape encodes interaction kind:
//   ◆ return / response   ◇ call / request   ◌ marker / token recv
//
// Selecting a row notifies the parent so the right-side inspector can show
// the full event payload.
import { html } from 'htm/preact';
import { fmtK, esc, fmtDurMs, fmtHHMMSS, shortModel } from '../../utils.js';
import { extractToolArgs } from './helpers.js';

const LANE_KIND = {
  user_message:  { lane: 'user',      kind: 'call'   },
  api_call:      { lane: 'api',       kind: 'call'   },
  api_response:  { lane: 'api',       kind: 'return' },
  error:         { lane: 'api',       kind: 'return' },
  tool_use:      { lane: 'tool',      kind: 'call'   },
  subagent:      { lane: 'agent',     kind: 'call'   },
  hook:          { lane: 'hook',      kind: 'recv'   },
  session_start: { lane: 'session',   kind: 'marker' },
  session_end:   { lane: 'session',   kind: 'marker' },
  compaction:    { lane: 'compact',   kind: 'marker' },
};

const KIND_GLYPH = { call: '\u25C7', return: '\u25C6', recv: '\u25CC', marker: '\u25A0' };

const LANE_COLOR = {
  user:    'var(--accent)',
  api:     'var(--orange)',
  tool:    'var(--cat-commands)',
  agent:   'var(--cat-agent)',
  hook:    'var(--cat-prompt)',
  session: 'var(--green)',
  compact: 'var(--yellow)',
};

function _describe(ev) {
  // Returns {label, meta, size} for the body column.
  if (ev.type === 'user_message') {
    const label = ev.redacted
      ? '\u{1F512} prompt (' + (ev.prompt_length || '?') + ' chars)'
      : (ev.preview || '(prompt)');
    return { label, meta: ev.prompt_length ? ev.prompt_length + ' chars' : '', size: '' };
  }
  if (ev.type === 'api_call') {
    const tok = ev.tokens || {};
    const total = (tok.input || 0) + (tok.output || 0);
    const label = ev.agent_name || shortModel(ev.model) || 'API call';
    let meta = fmtK(total) + 't';
    if (ev.ttft_ms > 0) meta += ' \u00B7 ttft ' + fmtDurMs(ev.ttft_ms);
    else if (ev.duration_ms > 0) meta += ' \u00B7 ' + fmtDurMs(ev.duration_ms);
    if (ev.is_error) meta += ' \u26A0';
    return { label, meta, size: '' };
  }
  if (ev.type === 'api_response') {
    const tok = ev.tokens || {};
    const out = tok.output || 0;
    const label = '\u2190 ' + fmtK(out) + 't' + (ev.response_preview ? ' ' + ev.response_preview.slice(0, 80) : '');
    const meta = [shortModel(ev.model), ev.finish_reason && ev.finish_reason !== 'stop' ? '[' + ev.finish_reason + ']' : '']
      .filter(Boolean).join(' ');
    return { label, meta, size: out ? fmtK(out) + 't' : '' };
  }
  if (ev.type === 'error') {
    return { label: '\u26A0 ' + (ev.error_type || 'error'), meta: (ev.error_message || '').slice(0, 80), size: '' };
  }
  if (ev.type === 'tool_use') {
    const toolName = ev.to || 'tool';
    const argsSummary = extractToolArgs(toolName, ev.params);
    const label = toolName + (argsSummary ? ': ' + argsSummary : '');
    let meta = '';
    if (ev.subtype === 'result') {
      meta = (ev.success === 'true' || ev.success === true ? '\u2713' : '\u2717');
      if (ev.duration_ms > 0) meta += ' ' + fmtDurMs(ev.duration_ms);
    } else if (ev.subtype === 'decision') {
      meta = ev.decision || '';
    }
    const size = ev.result_size ? ev.result_size + 'B' : '';
    return { label, meta, size };
  }
  if (ev.type === 'subagent') {
    return { label: ev.to || 'subagent', meta: '', size: '' };
  }
  if (ev.type === 'hook') {
    return { label: ev.hook_name || 'hook', meta: '', size: '' };
  }
  if (ev.type === 'session_start') {
    return { label: '\u25B6 Session started', meta: ev.cwd || '', size: '' };
  }
  if (ev.type === 'session_end') {
    return { label: '\u25A0 Session ended', meta: '', size: '' };
  }
  if (ev.type === 'compaction') {
    const n = ev.compaction_count ? ' #' + ev.compaction_count : '';
    return { label: '\u27F3 Compaction' + n, meta: ev.duration_ms > 0 ? fmtDurMs(ev.duration_ms) : '', size: '' };
  }
  return { label: ev.type || '(event)', meta: '', size: '' };
}

function _kindWord(kind) {
  return { call: 'requested', return: 'returned', recv: 'tokens', marker: 'marker' }[kind] || '';
}

export default function SeqVerticalTimeline({events, selectedIdx, onSelect}) {
  if (!events || events.length === 0) return null;
  return html`<ul class="sv-list">
    ${events.map((ev, i) => {
      const cls = LANE_KIND[ev.type] || { lane: 'tool', kind: 'call' };
      const color = LANE_COLOR[cls.lane] || 'var(--fg2)';
      const desc = _describe(ev);
      const isSel = i === selectedIdx;
      const isLast = i === events.length - 1;
      return html`<li key=${i} class="sv-li"><button
        type="button"
        class=${'sv-row' + (isSel ? ' sv-row--sel' : '')}
        onClick=${() => onSelect && onSelect(i)}
        aria-current=${isSel ? 'true' : 'false'}>
        <div class="sv-when">
          <div class="sv-when-time">${fmtHHMMSS(ev.ts)}</div>
          ${(ev._cumTok > 0 || ev._rtTok > 0) && html`<div class="sv-when-tok">
            ${ev._cumTok > 0 ? fmtK(ev._cumTok) + ' cum' : ''}
            ${ev._rtTok > 0 ? ' \u00B7 ' + fmtK(ev._rtTok) + ' rt' : ''}
          </div>`}
        </div>
        <div class="sv-spine">
          <span class="sv-spine-line ${isLast ? 'sv-spine-line--last' : ''}"></span>
          <span class="sv-dot" style=${'border-color:' + color + ';color:' + color}>
            ${KIND_GLYPH[cls.kind] || KIND_GLYPH.call}
          </span>
        </div>
        <div class="sv-body">
          <div class="sv-meta-row">
            <span class="sv-lane" style=${'color:' + color}>${cls.lane}</span>
            <span class="sv-kind">${_kindWord(cls.kind)}</span>
          </div>
          <div class="sv-label" title=${desc.label}>${esc(desc.label)}</div>
          ${desc.meta && html`<div class="sv-sub">${esc(desc.meta)}</div>`}
        </div>
        <div class="sv-size">
          ${desc.size && html`<span class="sv-size-chip">${esc(desc.size)}</span>`}
        </div>
      </button></li>`;
    })}
  </ul>`;
}
