// ─── AllToolsNote — a panel the tool filter cannot scope ───────
// Some figures are recorded machine-wide with no per-tool split. Under a filter
// they must say so, or they read as the selected tool's numbers.
import { html } from 'htm/preact';
import Icon from './Icon.js';

export default function AllToolsNote({ enabledTools, what }) {
  if (enabledTools === null || enabledTools === undefined) return null;
  return html`<div class="panel-state panel-state--note" role="note">
    <${Icon} name="filter" size="12"/>
    <span>${what} cover all tools: the tool filter does not apply, because these figures have no per-tool split.</span>
  </div>`;
}
