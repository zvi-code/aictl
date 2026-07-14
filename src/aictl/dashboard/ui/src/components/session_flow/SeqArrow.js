import { html } from 'htm/preact';
import { fmtK, esc, fmtDurMs, fmtHHMMSS, shortModel } from '../../utils.js';
import { extractToolArgs } from './helpers.js';
import SeqTooltip from './SeqTooltip.js';
import { Icon } from '../ui/index.js';

export default function SeqArrow({event, participants, hoveredIdx, idx, onHover}) {
  const fromIdx = participants.findIndex(p => p.id === event._from);
  const toIdx = participants.findIndex(p => p.id === event._to);
  if (fromIdx < 0 || toIdx < 0) return null;

  const isRight = toIdx > fromIdx;
  const left = Math.min(fromIdx, toIdx);
  const right = Math.max(fromIdx, toIdx);
  const isHovered = hoveredIdx === idx;

  const destParticipant = participants.find(p => p.id === event._to);
  const colors = {
    user_message: 'var(--green)',
    api_call: event.is_error ? 'var(--red)' : 'var(--accent)',
    api_response: 'var(--green)',
    error: 'var(--red)',
    tool_use: destParticipant?.color || 'var(--cat-commands)',
    subagent: destParticipant?.color || 'var(--yellow)',
    hook: 'var(--orange)',
  };
  const color = colors[event.type] || 'var(--fg2)';

  let label = '';
  let sublabel = '';
  if (event.type === 'user_message') {
    if (event.redacted) {
      label = 'prompt (' + (event.prompt_length || '?') + ' chars)';
    } else {
      label = event.preview || '(prompt)';
      if (event.prompt_length) sublabel = event.prompt_length + ' chars';
    }
  } else if (event.type === 'api_call') {
    const tok = event.tokens || {};
    label = event.agent_name || shortModel(event.model) || 'API call';
    sublabel = fmtK((tok.input || 0) + (tok.output || 0)) + 't';
    if (event.ttft_ms > 0) sublabel += ' ttft:' + fmtDurMs(event.ttft_ms);
    else if (event.duration_ms > 0) sublabel += ' ' + fmtDurMs(event.duration_ms);
    if (event.is_error) sublabel += ' \u26A0';
  } else if (event.type === 'api_response') {
    const tok = event.tokens || {};
    label = '\u2190 ' + fmtK(tok.output || 0) + 't';
    if (event.response_preview) {
      label += ' ' + event.response_preview.slice(0, 60);
    }
    sublabel = shortModel(event.model) || '';
    if (event.finish_reason && event.finish_reason !== 'stop') sublabel += ' [' + event.finish_reason + ']';
  } else if (event.type === 'error') {
    label = '\u26A0 ' + (event.error_type || 'error');
    sublabel = event.error_message ? event.error_message.slice(0, 60) : '';
  } else if (event.type === 'tool_use') {
    const toolName = event.to || 'tool';
    const argsSummary = extractToolArgs(toolName, event.params);
    label = toolName + (argsSummary ? ': ' + argsSummary : '');
    if (event.subtype === 'result') {
      sublabel = (event.success === 'true' || event.success === true ? '\u2713' : '\u2717');
      if (event.duration_ms > 0) sublabel += ' ' + fmtDurMs(event.duration_ms);
      if (event.result_size) sublabel += ' ' + event.result_size + 'B';
    } else if (event.subtype === 'decision') {
      sublabel = event.decision || '';
    }
  } else if (event.type === 'subagent') {
    label = event.to || 'subagent';
  } else if (event.type === 'hook') {
    label = event.hook_name || 'hook';
  }

  const colW = 100 / participants.length;
  const arrowLeft = (left + 0.5) * colW;
  const arrowRight = (right + 0.5) * colW;

  return html`<div class="sf-seq-row ${isHovered ? 'hovered' : ''}"
    onMouseEnter=${() => onHover(idx)} onMouseLeave=${() => onHover(null)}>
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok">${event._cumTok > 0 ? fmtK(event._cumTok) : ''}</span>
      <span class="sf-seq-rttok">${event._rtTok > 0 ? fmtK(event._rtTok) : ''}</span>
    </div>
    <div class="sf-seq-time">${fmtHHMMSS(event.ts)}</div>
    <div class="sf-seq-arrow-area">
      ${participants.map((_, i) => html`<div key=${i} class="sf-seq-lane"
        style="left:${(i + 0.5) * colW}%"></div>`)}
      <div class="sf-seq-arrow-line" style="
        left:${arrowLeft}%;
        width:${(arrowRight - arrowLeft)}%;
        border-color:${color};
      "></div>
      <div class="sf-seq-arrowhead" style="
        left:${isRight ? arrowRight : arrowLeft}%;
        border-${isRight ? 'left' : 'right'}-color:${color};
        transform:translateX(${isRight ? '-100%' : '0'});
      "></div>
      <div class="sf-seq-label" style="
        left:${((arrowLeft + arrowRight) / 2)}%;
        color:${color};
      "><span class="sf-seq-label-text" title=${label}>${event.type === 'user_message' && event.redacted ? html`<${Icon} name="lock" size="0.85em"/> ` : ''}${esc(label)}</span>
        ${sublabel && html`<span class="sf-seq-sublabel">${sublabel}</span>`}
      </div>
    </div>
    ${isHovered && html`<${SeqTooltip} event=${event}/>`}
  </div>`;
}
