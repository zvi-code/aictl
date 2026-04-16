import { html } from 'htm/preact';

export default function Skeleton({
  height = '1em', width = '100%', radius = '4px', count = 1,
  class: klass, className, style, ...rest
}) {
  const cls = ['aictl-ui-skel', klass, className].filter(Boolean).join(' ');
  const base = { height, width, borderRadius: radius };
  if (count <= 1) {
    return html`<span class=${cls} style=${{ ...base, ...(style || {}) }} aria-hidden="true" ...${rest}></span>`;
  }
  const items = [];
  for (let i = 0; i < count; i++) items.push(i);
  return html`<span style="display:flex;flex-direction:column;gap:var(--sp-2)" aria-hidden="true" ...${rest}>
    ${items.map(i => html`<span key=${i} class=${cls} style=${{ ...base, ...(style || {}) }}></span>`)}
  </span>`;
}
