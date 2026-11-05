// ─── ToolScopeEmpty — the tool filter left this screen with nothing ──
// One wording for every screen: it names the selected tools and says what to do.
// An explicit empty selection gets its own message, never a blank panel.
import { html } from 'htm/preact';
import Icon from './Icon.js';
import { isNoneSelected, selectedNames } from '../../utils/toolScope.js';

export default function ToolScopeEmpty({ enabledTools, snap, what = 'this screen' }) {
  const none = isNoneSelected(enabledTools);
  const names = selectedNames(enabledTools, snap);
  return html`<div class="panel-state panel-state--empty" role="status" data-testid="tool-scope-empty">
    <${Icon} name="filter" size="14"/>
    <div>
      <div class="panel-state__title">${none
        ? 'No tools are selected'
        : 'The selected tools have no data here'}</div>
      <div class="panel-state__hint">${none
        ? `The tool filter in the header has no tool ticked, so ${what} shows nothing. Tick a tool, or choose All tools.`
        : `${names.join(', ')} ${names.length === 1 ? 'has' : 'have'} nothing to show on ${what}. Tick more tools in the header filter, or choose All tools.`}</div>
    </div>
  </div>`;
}
