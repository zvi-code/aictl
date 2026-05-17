import { html } from 'htm/preact';

export default function Badge({
  variant = 'neutral', size = 'sm', dot = false,
  class: klass, className, children, ...rest
}) {
  const cls = [
    'aictl-ui-badge',
    `aictl-ui-badge--${variant}`,
    size === 'md' ? 'aictl-ui-badge--md' : null,
    klass, className,
  ].filter(Boolean).join(' ');
  return html`<span class=${cls} ...${rest}>
    ${dot ? html`<span class="aictl-ui-badge__dot" aria-hidden="true"></span>` : null}
    ${children}
  </span>`;
}
