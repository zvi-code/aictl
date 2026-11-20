import { html } from 'htm/preact';

export function Stats({ stats }) {
  return html`<div class="bd-stats">${stats.map(st => html`<div key=${st.label} class=${st.cls ? 'bd-' + st.cls : null} title=${st.title || st.label}>
    <span class="bd-l">${st.label}</span><span class="bd-v">${st.value}</span>${st.sub ? html`<span class="bd-d">${st.sub}</span>` : null}
  </div>`)}</div>`;
}

export function Actions({ actions }) {
  return html`<div class="bd-acts">${actions.map(a => (a.href
    ? html`<a key=${a.label} class="bd-btn" href=${a.href}>${a.label}</a>`
    : html`<button key=${a.label} type="button" class=${'bd-btn' + (a.cls ? ' bd-' + a.cls : '')} disabled=${a.disabled} onClick=${a.go}>${a.label}</button>`))}</div>`;
}

