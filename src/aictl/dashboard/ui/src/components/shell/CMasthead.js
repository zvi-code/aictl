import { html } from 'htm/preact';
import { useContext, useMemo } from 'preact/hooks';
import { SnapContext } from '../../context.js';

// Editorial tab set — each `id` maps to an existing LAYOUT tab so keyboard
// shortcuts (1-9/h/0) and setActiveTab still work without changes to useTabs.
export const EDITORIAL_TABS = [
  { id: 'overview', label: 'Dashboard', sub: 'live event stream' },
  { id: 'explorer', label: 'Sessions',  sub: 'history & traces' },
  { id: 'agents',   label: 'Agents',    sub: 'instrumentation' },
  { id: 'prompts',  label: 'Prompts',   sub: 'library & workflows' },
];

function fmtKicker() {
  const d = new Date();
  const vol = String(d.getMonth() + 1).padStart(2, '0');
  // Local date, not toISOString (UTC) \u2014 avoids showing yesterday/tomorrow
  // near midnight. en-CA locale yields the same YYYY-MM-DD shape.
  const date = d.toLocaleDateString('en-CA');
  return `The aictl daily \u00b7 vol.\u00a0${vol} \u00b7 ${date}`;
}

export default function CMasthead({ activeTab, setActiveTab }) {
  const ctx = useContext(SnapContext);
  const snap = ctx?.snap;

  const activeSessions = useMemo(() => {
    let n = 0;
    for (const t of (snap?.tools || [])) {
      for (const s of (t.live?.sessions || [])) {
        if (s.active !== false) n++;
      }
    }
    return n;
  }, [snap]);

  const currentTab = EDITORIAL_TABS.find(t => t.id === activeTab);

  const liveBadge = activeSessions > 0
    ? `Live \u00b7 ${activeSessions} session${activeSessions !== 1 ? 's' : ''}`
    : 'Live';

  return html`<div class="cmasthead">
    <div class="cmasthead-top">
      <div class="cmasthead-identity">
        <div class="cmasthead-kicker">${fmtKicker()}</div>
        <div class="cmasthead-headline">
          <span class="cmasthead-title">aictl</span>
          <span class="cmasthead-subtitle">a live record of every agent on this machine</span>
        </div>
      </div>
      <div class="cmasthead-live" role="status" aria-live="polite" aria-label="Live status">
        <span class="cmasthead-live-dot" aria-hidden="true"></span>
        ${liveBadge}
      </div>
    </div>
    <nav class="cmasthead-tabs" role="navigation" aria-label="Editorial tabs">
      ${EDITORIAL_TABS.map(t => html`<button
        key=${t.id}
        type="button"
        class=${'cmasthead-tab' + (activeTab === t.id ? ' is-active' : '')}
        onClick=${() => setActiveTab(t.id)}
        aria-current=${activeTab === t.id ? 'page' : null}
      >${t.label}</button>`)}
      <span class="cmasthead-tabs-sub" aria-hidden="true">
        ${currentTab?.sub ?? ''}
      </span>
    </nav>
  </div>`;
}
