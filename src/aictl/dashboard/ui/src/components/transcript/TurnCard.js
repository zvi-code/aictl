import { html } from 'htm/preact';
import { fmtK, fmtDurMs, fmtHHMMSS, shortModel } from '../../utils.js';
import { truncate } from './helpers.js';
import ActionRow from './ActionRow.js';
import { Icon } from '../ui/index.js';

function collectResponseText(turn, actions) {
  const chunks = [];
  const add = (value) => {
    const text = String(value || '').trim();
    if (text && !chunks.includes(text)) chunks.push(text);
  };
  add(turn.response);
  for (const action of actions) {
    if (action.kind !== 'api_response') continue;
    add(action.detail?.response || action.response || action.output_summary);
  }
  return chunks.join('\n\n');
}

export default function TurnCard({ turn, index, expanded, onToggle }) {
  const hasPrompt = turn.prompt && turn.prompt.length > 0;
  const actions = turn.actions || [];
  const responseText = collectResponseText(turn, actions);
  const hasResponse = responseText.length > 0;
  const toolUses = actions.filter(a => a.kind === 'tool_use');
  const apiCalls = actions.filter(a => a.kind === 'api_call');
  const errors = actions.filter(a => a.kind === 'error');
  const tokens = turn.tokens || {};
  const totalTok = (tokens.input || 0) + (tokens.output || 0);
  const wallMs = turn.wall_ms || turn.duration_ms || 0;

  return html`<div class="tr-turn ${expanded ? 'tr-turn-expanded' : ''}">
    <button type="button" class="tr-turn-header" onClick=${onToggle} aria-expanded=${expanded}>
      <span class="tr-turn-num">${index + 1}</span>
      <span class="tr-turn-meta">
        <span class="tr-turn-time">${fmtHHMMSS(turn.ts)}</span>
        ${turn.model ? html`<span class="tr-turn-model">${shortModel(turn.model)}</span>` : null}
        ${wallMs > 0 ? html`<span class="tr-turn-dur">${fmtDurMs(wallMs)}</span>` : null}
      </span>
      <span class="tr-turn-stats">
        ${totalTok > 0 ? html`<span class="tr-stat" title="Tokens"><${Icon} name="coins" size="0.9em"/> ${fmtK(totalTok)}</span>` : null}
        ${toolUses.length > 0 ? html`<span class="tr-stat" title="Tool uses"><${Icon} name="wrench" size="0.9em"/> ${toolUses.length}</span>` : null}
        ${apiCalls.length > 0 ? html`<span class="tr-stat" title="API calls"><${Icon} name="globe" size="0.9em"/> ${apiCalls.length}</span>` : null}
        ${errors.length > 0 ? html`<span class="tr-stat tr-stat-err" title="Errors"><${Icon} name="x" size="0.9em"/> ${errors.length}</span>` : null}
      </span>
      <span class="tr-turn-chevron" aria-hidden="true">${expanded ? '\u25BE' : '\u25B8'}</span>
    </button>

    ${hasPrompt ? html`<div class="tr-prompt ${expanded ? 'tr-prompt-full' : ''}">
      <div class="tr-prompt-icon"><${Icon} name="user" size="1em"/></div>
      <div class="tr-prompt-text">${expanded ? turn.prompt : truncate(turn.prompt_preview || turn.prompt, 120)}</div>
    </div>` : html`<div class="tr-prompt tr-prompt-empty">
      <div class="tr-prompt-icon"><${Icon} name="user" size="1em"/></div>
      <div class="tr-prompt-text text-muted">(no prompt captured)</div>
    </div>`}

    ${hasResponse ? html`<div class="tr-response ${expanded ? 'tr-response-full' : ''}">
      <div class="tr-response-icon">AI</div>
      <div class="tr-response-text">${expanded ? responseText : truncate(turn.response_preview || responseText, 160)}</div>
    </div>` : expanded ? html`<div class="tr-response tr-response-empty">
      <div class="tr-response-icon">AI</div>
      <div class="tr-response-text text-muted">(no response captured)</div>
    </div>` : null}

    ${expanded && actions.length > 0 ? html`<div class="tr-actions">
      ${actions.map((a, i) => html`<${ActionRow} key=${i} action=${a} turnTs=${turn.ts}/>`)}
    </div>` : null}

    ${expanded && totalTok > 0 ? html`<div class="tr-token-bar">
      <div class="tr-token-seg tr-tok-in"
        style="flex:${tokens.input || 0}" title="Input: ${fmtK(tokens.input || 0)}">
        ${tokens.input > 0 ? 'in ' + fmtK(tokens.input) : ''}
      </div>
      ${tokens.cache_read > 0 ? html`<div class="tr-token-seg tr-tok-cache"
        style="flex:${tokens.cache_read}" title="Cache read: ${fmtK(tokens.cache_read)}">
        cache ${fmtK(tokens.cache_read)}
      </div>` : null}
      <div class="tr-token-seg tr-tok-out"
        style="flex:${tokens.output || 0}" title="Output: ${fmtK(tokens.output || 0)}">
        ${tokens.output > 0 ? 'out ' + fmtK(tokens.output) : ''}
      </div>
    </div>` : null}
  </div>`;
}
