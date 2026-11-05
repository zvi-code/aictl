// ─── TextNotRetained — capture mode kept counts but not words ──
// A deliberate state, distinct from "no data" and from an error: the session
// happened, its metadata is here, its text was not stored by policy.
import { html } from 'htm/preact';
import Icon from './Icon.js';

/** How to change it. Single source, so it tracks the real config key. */
export const CAPTURE_HOWTO = 'Set capture_mode = "full" under [storage] in ~/.config/aictl/config.toml. It applies to new sessions.';

/** True only on an explicit false: older servers omit the field and keep text. */
export function textWithheld(row) {
  return row?.content_retained === false;
}

export function retentionTitle(mode) {
  if (mode && mode !== 'full') return `Text not retained: capture=${mode}`;
  // capture=full now, but this session was recorded under another mode.
  if (mode === 'full') return 'Text not retained for this session';
  return 'Text not retained: capture mode is not full';
}

export default function TextNotRetained({ mode }) {
  return html`<div class="panel-state panel-state--withheld" role="status">
    <${Icon} name="file-text" size="14"/>
    <div>
      <div class="panel-state__title">${retentionTitle(mode)}</div>
      <div class="panel-state__hint">Prompts and replies for this session were not stored. Counts, timing, models and tool calls are still shown.</div>
      <code class="panel-state__fix">${CAPTURE_HOWTO}</code>
    </div>
  </div>`;
}
