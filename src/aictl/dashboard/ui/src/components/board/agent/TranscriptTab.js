// ─── Agent drawer: Transcript — each prompt with its reply and actions ─
// Oldest first. A reply renders as Markdown, with a Source toggle. While the
// agent runs, the transcript is read again every 5 s. The turns come from
// /api/board/agent/transcript, which says when the store keeps no reply text.
import { html } from 'htm/preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import * as api from '../../../api.js';
import TextView from '../../ui/TextView.js';
import { captureHowto } from '../../ui/TextNotRetained.js';
import { FixedPanel, useDetail } from '../Drawer.js';
import { NA, fmtMs, fmtN } from '../format.js';
import { Stats } from '../Panel.js';
import { Wait, SessionNote, clip, clock, isActive } from './common.js';
import { responseOf, visibleTurns } from './transcriptModel.js';

export const REFRESH_MS = 5000;

const KIND_LABEL = { tool_use: 'Tool', api_call: 'Model call', api_response: 'Reply', file_edit: 'Edit', compaction: 'Compaction', subagent: 'Subagent', error: 'Error', hook: 'Hook' };
const KIND_COLOR = { tool_use: 'var(--s3)', api_call: 'var(--s2)', api_response: 'var(--ink3)', file_edit: 'var(--s4)', compaction: 'var(--warn)', subagent: 'var(--s5)', error: 'var(--crit)', hook: 'var(--s4)' };

function TokenBar({ tokens }) {
  const t = tokens || {};
  const parts = [['Input', t.input || 0, 'var(--s1)'], ['Cache read', t.cache_read || 0, 'var(--s3)'], ['Output', t.output || 0, 'var(--s2)']].filter(p => p[1] > 0);
  if (!parts.length) return null;
  return html`<div class="bd-ag-tokbar" role="img" aria-label=${parts.map(p => p[0] + ' ' + fmtN(p[1])).join(', ')}>
    ${parts.map(([label, n, c]) => html`<span key=${label} style=${{ flex: n + ' 1 0', background: c }} title=${label + ': ' + fmtN(n)}>${label.toLowerCase() + ' ' + fmtN(n)}</span>`)}
  </div>`;
}

function ActionRow({ x, turnTs }) {
  const off = x.ts - turnTs;
  const tok = x.tokens ? (x.tokens.input || 0) + (x.tokens.output || 0) : 0;
  const result = x.success === false ? 'Failed' : x.success === true ? 'OK' : '';
  return html`<li class="bd-ag-act">
    <span class="bd-ag-actk" style=${{ color: KIND_COLOR[x.kind] || 'var(--ink3)' }}>${KIND_LABEL[x.kind] || x.kind}</span>
    <span class="bd-ag-actn">${x.name || NA}</span>
    <span class="bd-ag-acta" title=${x.input_summary || ''}>${clip(x.input_summary, 90)}${x.output_summary ? html`<em title=${x.output_summary}>${' → ' + clip(x.output_summary, 70)}</em>` : null}</span>
    <span class="bd-ag-actm">${[off > 0 ? '+' + (off < 10 ? off.toFixed(1) : Math.round(off)) + ' s' : '', x.duration_ms > 0 ? fmtMs(x.duration_ms) : '', tok ? fmtN(tok) + ' tokens' : ''].filter(Boolean).join(', ')}${result ? html` <b class=${result === 'Failed' ? 'bd-ag-bad' : ''}>${result}</b>` : null}</span>
  </li>`;
}

function TurnCard({ turn, n, open, onToggle, withheld, replyNote }) {
  const actions = turn.actions || [];
  const reply = responseOf(turn);
  const tok = turn.tokens || {};
  const total = (tok.input || 0) + (tok.output || 0);
  const wall = turn.wall_ms || turn.duration_ms || 0;
  const count = k => actions.filter(x => x.kind === k).length;
  const stats = [
    total ? fmtN(total) + ' tokens' : '',
    count('tool_use') || turn.tool_use_count ? (count('tool_use') || turn.tool_use_count) + ' tool calls' : '',
    count('subagent') ? count('subagent') + ' subagents' : '',
    count('hook') ? count('hook') + ' hooks' : '',
    count('error') ? count('error') + ' errors' : '',
  ].filter(Boolean).join(', ');
  const prompt = turn.prompt || '';
  const noText = withheld ? 'Text not kept.' : 'No prompt captured.';
  return html`<li class=${'bd-ag-turn' + (open ? ' bd-open' : '')}>
    <button type="button" class="bd-ag-turnh" aria-expanded=${open ? 'true' : 'false'} onClick=${onToggle}>
      <b>${n}</b><span>${clock(turn.ts)}</span>${turn.model ? html`<span class="bd-ag-dim">${turn.model}</span>` : null}${wall > 0 ? html`<span class="bd-ag-dim">${fmtMs(wall)}</span>` : null}
      <span class="bd-ag-turns">${stats}</span>
    </button>
    <div class="bd-ag-msg"><span class="bd-ag-who">You</span>
      ${prompt ? html`<div class="bd-ag-text">${open ? prompt : clip(turn.prompt_preview || prompt, 160)}</div>` : html`<div class="bd-ag-text bd-ag-dim">${noText}</div>`}
    </div>
    ${reply ? html`<div class="bd-ag-msg"><span class="bd-ag-who">Reply</span>
      ${open ? html`<div class="bd-ag-reply"><${TextView} text=${reply} path="reply.md" source=${html`<div class="bd-ptext">${reply}</div>`}/></div>` : html`<div class="bd-ag-text">${clip(turn.response_preview || reply, 200)}</div>`}
    </div>` : open ? html`<div class="bd-ag-msg"><span class="bd-ag-who">Reply</span><div class="bd-ag-text bd-ag-dim">${withheld ? 'Text not kept.' : replyNote || 'No reply captured.'}</div></div>` : null}
    <${TokenBar} tokens=${tok}/>
    ${open && actions.length ? html`<ul class="bd-ag-acts" aria-label=${'Actions of turn ' + n}>${actions.map((x, i) => html`<${ActionRow} key=${i} x=${x} turnTs=${turn.ts}/>`)}</ul>` : null}
  </li>`;
}

export default function TranscriptTab({ a, st, ctx }) {
  const live = isActive(st);
  const [auto, setAuto] = useState(true);
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    if (!live || !auto) return undefined;
    const t = setInterval(() => setBeat(b => b + 1), REFRESH_MS);
    return () => clearInterval(t);
  }, [live, auto]);
  const { data, error } = useDetail(o => api.getBoardAgentTranscript(a.id, o), 'transcript:' + a.id, beat);
  const [open, setOpen] = useState(() => new Set());
  const mode = data?.capture_mode ?? ctx.data?.capture_mode;
  const withheld = (mode != null && mode !== 'full') || data?.content_retained === false;
  const turns = useMemo(() => visibleTurns(data, withheld), [data, withheld]);
  if (!data) return html`<${Wait} error=${error} what="the transcript"/>`;
  const allOpen = turns.length > 0 && open.size >= turns.length;
  const toggle = i => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });
  const s = data.summary || {};
  const replyNote = data.replies_kept === false ? (data.reply_note || 'The reply text is not kept') + '.' : null;
  return html`<${SessionNote} a=${a}/>
    ${withheld ? html`<div class="bd-banner bd-ag-capture" role="status">${'Text is not kept: the capture mode is ' + (mode && mode !== 'full' ? mode : 'not full') + ' for this session. Counts, times, models and tool calls are still shown. ' + captureHowto()}</div>` : null}
    <${FixedPanel} id="agtrs" title="Summary" sub=${s.source || ''}>
      <${Stats} stats=${[{ label: 'Turns', value: fmtN(s.total_turns ?? turns.length) }, { label: 'Model calls', value: fmtN(s.total_api_calls) }, { label: 'Tool calls', value: fmtN(s.total_tool_uses) }, { label: 'Tokens', value: fmtN(s.total_tokens) }, { label: 'Errors', value: fmtN(s.errors) }, { label: 'Subagents', value: fmtN(s.subagents) }, { label: 'Compactions', value: fmtN(s.compactions) }]}/>
    </${FixedPanel}>
    <${FixedPanel} id="agtr" title="Transcript, oldest first" sub=${live ? (auto ? 'Read again every 5 s while the agent runs' : 'Not refreshing') : ''}>
      <div class="bd-ag-bar">
        ${turns.length ? html`<button type="button" class="bd-btn" onClick=${() => setOpen(allOpen ? new Set() : new Set(turns.map((_, i) => i)))}>${allOpen ? 'Collapse all' : 'Expand all'}</button>` : null}
        ${live ? html`<label class="bd-ag-check"><input type="checkbox" checked=${auto} onChange=${e => setAuto(e.currentTarget.checked)}/>Refresh while it runs</label>` : null}
      </div>
      ${replyNote && !withheld && turns.length ? html`<div class="bd-note" role="status">${replyNote} The prompts, model calls, tool calls and tokens of each turn are shown.</div>` : null}
      ${turns.length ? html`<ol class="bd-ag-turnl">${turns.map((t, i) => html`<${TurnCard} key=${i} turn=${t} n=${i + 1} open=${open.has(i)} onToggle=${() => toggle(i)} withheld=${withheld} replyNote=${replyNote}/>`)}</ol>`
        : html`<div class="bd-empty">${withheld ? 'No turn has times or tokens to show.' : 'No turn for this session: aictl has no prompt, model call or tool call of it.'}</div>`}
    </${FixedPanel}>`;
}
