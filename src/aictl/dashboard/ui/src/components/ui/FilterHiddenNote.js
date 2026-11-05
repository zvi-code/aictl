// ─── FilterHiddenNote — rows the filter hides without being able to offer them ──
// A tool id that is not in the filter list (unattributed `any`, or a tool that is
// not verified) cannot be ticked, so any filter hides its rows. Say so, instead
// of letting them vanish.
import { html } from 'htm/preact';
import Icon from './Icon.js';

export default function FilterHiddenNote({ count }) {
  if (!count) return null;
  return html`<div class="panel-state panel-state--note" role="note" data-testid="filter-hidden-note">
    <${Icon} name="filter" size="12"/>
    <span>${count} row${count === 1 ? '' : 's'} from unattributed or unverified tools ${count === 1 ? 'is' : 'are'} hidden while the tool filter is on. Choose All tools to see ${count === 1 ? 'it' : 'them'}.</span>
  </div>`;
}
