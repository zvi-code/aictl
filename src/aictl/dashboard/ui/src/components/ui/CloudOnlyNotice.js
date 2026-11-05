// ─── CloudOnlyNotice — a tool with nothing local to read ───────
// A cloud-hosted tool has no local sessions, processes or files. That is a fact
// about where it runs, so it gets a reason rather than a zero or an empty chart.
import { html } from 'htm/preact';
import Icon from './Icon.js';

export default function CloudOnlyNotice({ tool, tools }) {
  const names = (tools || [tool]).filter(Boolean).map(t => t.label || t.tool).join(', ');
  return html`<div class="panel-state panel-state--withheld" role="status">
    <${Icon} name="radio" size="14"/>
    <div>
      <div class="panel-state__title">Not available from this machine</div>
      <div class="panel-state__hint">${names} runs in the vendor's cloud, so it leaves no local sessions, processes, tokens or files for aictl to read. Its activity is visible only in the vendor's admin reports.</div>
    </div>
  </div>`;
}
