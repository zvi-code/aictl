// The hook status line of one tool, from /api/hooks-status: whether aictl's
// hooks are installed and firing, which events are configured or missing,
// and each hook file with its scope. Shown in the Hooks section of By tool.
import { html } from 'htm/preact';
import { fmtAgo } from '../../utils.js';

// Settings tool ids whose hooks the status reports under another id.
const HOOK_TOOL = { copilot: 'copilot-vscode', vscode: 'copilot-vscode' };

/** The status record of one settings tool, or null when the status has none. */
export function hookStatusOf(hooks, toolId) {
  const tools = hooks?.tools;
  if (!tools || typeof tools !== 'object') return null;
  return tools[toolId] || tools[HOOK_TOOL[toolId]] || null;
}

export function hookStatusLabel(status) {
  return {
    active: 'active',
    configured: 'configured',
    disabled: 'host-disabled',
    misconfigured: 'wrong port',
    observed: 'observed',
    missing: 'missing',
  }[status] || status || 'unknown';
}

/** The settings line that turns a host-disabled hook location back on, when the warning names one. */
export function warningConfig(warning) {
  const m = warning?.message || '';
  if (m.includes('~/.copilot/hooks')) return '"chat.hookFilesLocations": { "~/.copilot/hooks": true }';
  if (m.includes('.github/hooks')) return '"chat.hookFilesLocations": { ".github/hooks": true }';
  if (m.includes('chat.useHooks')) return '"chat.useHooks": true';
  return '';
}

const TONE = { active: 'is-ok', configured: 'is-ok', disabled: 'is-warn', misconfigured: 'is-warn', missing: 'is-warn' };

export function HookStatusLine({ status: h }) {
  const events = h.configured_events || [];
  const missing = h.missing_events || [];
  const sources = h.sources || [];
  const warnings = h.warnings || [];
  return html`<div class="st-hookstat" data-testid="st-hookstat">
    <div class="st-hookstat__head">
      <span class=${'st-status ' + (TONE[h.status] || '')} data-testid="st-hookstat-status"
        title=${h.status === 'misconfigured' ? 'The hook commands post to a different port than this dashboard' : undefined}>${hookStatusLabel(h.status)}</span>
      <span>${h.configured_count || events.length} configured</span>
      ${missing.length > 0 && html`<span class="st-warn" title=${missing.join(', ')}>${missing.length} missing: ${missing.join(', ')}</span>`}
      <span>${h.fired_24h || 0} fired in 24 h</span>
      <span title=${h.last_fire_ts ? new Date(h.last_fire_ts * 1000).toLocaleString() : undefined}>last ${h.last_fire_ts ? fmtAgo(h.last_fire_ts) : 'never'}</span>
    </div>
    <div class="st-tools st-hookstat__events">
      ${events.length
        ? events.map(ev => html`<span key=${ev} class="st-chip st-chip--mono st-hookstat__ev">${ev}</span>`)
        : html`<span class="st-dim">No aictl hooks configured</span>`}
    </div>
    ${sources.length > 0 && html`<ul class="st-hookstat__sources">
      ${sources.map(s => html`<li key=${s.path} title=${s.path}>
        <span class="st-mono">${s.scope}</span>
        <span>${s.configured_count || 0} ${s.configured_count === 1 ? 'event' : 'events'}</span>
        <span class=${s.host_enabled === false ? 'st-warn' : 'st-dim'}>${s.host_enabled === false ? 'ignored by the host' : 'loaded'}</span>
      </li>`)}
    </ul>`}
    ${warnings.map(wn => {
      const snippet = warningConfig(wn);
      return html`<div key=${(wn.path || '') + wn.message} class="st-hookstat__warn" role="note">
        ${wn.message}${snippet && html`<code class="st-hookstat__snippet">${snippet}</code>`}
      </div>`;
    })}
  </div>`;
}
