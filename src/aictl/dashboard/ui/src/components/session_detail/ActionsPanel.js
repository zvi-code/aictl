import { useState, useEffect, useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import { esc, fmtAgo } from '../../utils.js';
import * as api from '../../api.js';

const KIND_COLOR = {
  tool_call: 'var(--accent)', file_modified: 'var(--green)',
  error: 'var(--red)', anomaly: 'var(--orange)',
  session_start: 'var(--blue)', session_end: 'var(--fg3)',
  'hook:PreToolUse': 'var(--accent)', 'hook:PostToolUse': 'var(--accent)',
  'hook:tool_use': 'var(--accent)',
};

// Stringify an arbitrary detail value for display. Returns empty string
// when the value is null / undefined / empty.
function toDisplay(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

// Join adjacent PreToolUse/PostToolUse events for the same tool into a
// single logical row so the user sees input and result together on one
// toggle. Unmatched Pre/Post events pass through unchanged. Walks the
// events in order and pairs each Pre with the nearest later Post sharing
// tool_name within a small look-ahead window.
function mergePrePostEvents(events) {
  const out = [];
  const consumed = new Set();
  const WINDOW = 6;
  for (let i = 0; i < events.length; i++) {
    if (consumed.has(i)) continue;
    const ev = events[i];
    if (ev.kind === 'hook:PreToolUse') {
      const preName = (ev.detail && ev.detail.tool_name) || '';
      let matchIdx = -1;
      for (let j = i + 1; j < Math.min(events.length, i + 1 + WINDOW); j++) {
        const cand = events[j];
        if (consumed.has(j)) continue;
        if (cand.kind !== 'hook:PostToolUse') continue;
        const postName = (cand.detail && cand.detail.tool_name) || '';
        if (preName && postName && preName !== postName) continue;
        matchIdx = j;
        break;
      }
      if (matchIdx >= 0) {
        const post = events[matchIdx];
        consumed.add(matchIdx);
        const preDetail = ev.detail || {};
        const postDetail = post.detail || {};
        out.push({
          ...ev,
          kind: 'hook:tool_use',
          ts: ev.ts,
          end_ts: post.ts,
          detail: {
            ...preDetail,
            tool_name: preDetail.tool_name || postDetail.tool_name || '',
            tool_input:
              preDetail.tool_input != null ? preDetail.tool_input : preDetail.input,
            result_summary:
              postDetail.result_summary != null
                ? postDetail.result_summary
                : postDetail.tool_response != null
                  ? postDetail.tool_response
                  : postDetail.result,
          },
        });
        continue;
      }
    }
    out.push(ev);
  }
  return out;
}

export default function ActionsPanel({sessionId}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (!sessionId) { setEvents([]); setLoading(false); setError(null); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setExpanded({});
    // When scoping to a session, don't restrict by time — older sessions
    // would otherwise appear empty because a 24-hour window cuts off their
    // events. `since=0` means "whole history for this session" (same
    // convention as ApiCallsPanel).
    const since = 0;
    api.getEvents({ sessionId, limit: 200, since })
      .then(data => {
        if (cancelled) return;
        setEvents((Array.isArray(data) ? data : []).reverse());
        setLoading(false);
      })
      .catch(e => { if (!cancelled) { setEvents([]); setError(e); setLoading(false); } });
    return () => { cancelled = true; };
  }, [sessionId]);

  const mergedEvents = useMemo(() => mergePrePostEvents(events), [events]);

  if (loading) return html`<p class="loading-state">Loading events...</p>`;
  if (error) return html`<p class="error-state">Failed to load session actions${error.message ? ` (${error.message})` : ''}.</p>`;
  if (!mergedEvents.length) return html`<p class="empty-state">No events recorded for this session.</p>`;

  return html`<div class="sd-events">
    ${mergedEvents.map((ev) => {
      const c = KIND_COLOR[ev.kind] || 'var(--fg3)';
      const detail = ev.detail || {};
      const desc = detail.path || detail.name || detail.tool_name || ev.kind;
      const inputRaw = detail.tool_input != null ? detail.tool_input : detail.input;
      const resultRaw = detail.result_summary != null
        ? detail.result_summary
        : (detail.tool_response != null ? detail.tool_response : detail.result);
      const inputStr = toDisplay(inputRaw);
      const resultStr = toDisplay(resultRaw);
      const hasDetail = inputStr !== '' || resultStr !== '';
      // Stable expansion key so refetch / reorder doesn't flip open/closed
      // rows based on array index.
      const key = `${ev.ts}-${ev.kind}`;
      const isOpen = !!expanded[key];
      const inputPrev = inputStr ? inputStr.slice(0, 80) + (inputStr.length > 80 ? '\u2026' : '') : '';
      const resultPrev = resultStr ? resultStr.slice(0, 80) + (resultStr.length > 80 ? '\u2026' : '') : '';
      const collapsedText = inputPrev || resultPrev;
      return html`<div key=${key} class="sd-event-row-wrap">
        <div class="sd-event-row">
          <span class="sd-event-time">${fmtAgo(ev.ts)}</span>
          <span class="sd-event-dot" style="background:${c}"></span>
          <span class="sd-event-kind">${ev.kind}</span>
          <span class="sd-event-desc mono text-muted">${esc(String(desc))}</span>
        </div>
        ${hasDetail && html`<div class="sd-event-detail">
          <button type="button"
            class="sd-event-toggle"
            aria-expanded=${isOpen ? 'true' : 'false'}
            onClick=${() => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))}
            style="background:none;border:none;padding:0;cursor:pointer;color:var(--fg2);font-size:var(--fs-xs);text-align:left;font-family:inherit">
            <span style="display:inline-block;width:1em">${isOpen ? '\u02C5' : '\u203A'}</span>
            ${isOpen
              ? html`<span class="text-muted">hide</span>`
              : html`<span class="mono text-muted" title=${inputStr || resultStr}>${esc(collapsedText)}</span>`}
          </button>
          ${isOpen && html`<pre class="mono" style="font-size:var(--fs-xs);max-height:16rem;overflow:auto;white-space:pre-wrap;margin:var(--sp-1) 0 0 1em;padding:var(--sp-2);background:var(--bg2);border-radius:var(--radius-sm)">${esc(
            (inputStr ? 'input: ' + inputStr : '') +
            (inputStr && resultStr ? '\n\n' : '') +
            (resultStr ? 'result: ' + resultStr : '')
          )}</pre>`}
        </div>`}
      </div>`;
    })}
  </div>`;
}

