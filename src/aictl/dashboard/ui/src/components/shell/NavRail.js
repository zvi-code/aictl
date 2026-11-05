// ─── NavRail — grouped primary navigation ──────────────────────
// A labelled sidebar on wide screens, a scrolling strip on narrow ones. The
// shortcut digit is printed next to each entry so it can be learned by looking.
import { html } from 'htm/preact';
import { useEffect, useRef } from 'preact/hooks';
import { LAYOUT } from '../../layoutConfig.js';
import { Icon } from '../ui/index.js';

export default function NavRail({ tabs, activeTab, setActiveTab }) {
  const ref = useRef(null);
  // On the narrow strip the active entry can sit off-screen after a deep link.
  useEffect(() => {
    const el = ref.current?.querySelector('[aria-current="page"]');
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [activeTab]);
  return html`<nav class="tab-nav" ref=${ref} aria-label="Dashboard sections">
    ${LAYOUT.navGroups.map(g => html`<div key=${g.id} class="tab-group" role="group" aria-labelledby=${'nav-' + g.id}>
      <div class="tab-group__label" id=${'nav-' + g.id}>${g.label}</div>
      ${tabs.filter(t => t.group === g.id).map(t => html`<button key=${t.id} type="button" class="tab-btn"
        aria-current=${activeTab === t.id ? 'page' : null}
        aria-keyshortcuts=${t.key || null}
        onClick=${() => setActiveTab(t.id)}>
        <span class="tab-btn-icon"><${Icon} name=${t.iconName} size="14"/></span>
        <span class="tab-btn__label">${t.label}</span>
        ${t.key && html`<kbd class="tab-btn__key" aria-hidden="true">${t.key}</kbd>`}
      </button>`)}
    </div>`)}
  </nav>`;
}
