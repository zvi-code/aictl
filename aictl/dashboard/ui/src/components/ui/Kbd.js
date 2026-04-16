import { html } from 'htm/preact';

export default function Kbd({ class: klass, className, children, ...rest }) {
  const cls = ['aictl-ui-kbd', klass, className].filter(Boolean).join(' ');
  return html`<kbd class=${cls} ...${rest}>${children}</kbd>`;
}
