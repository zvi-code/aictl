import { html } from 'htm/preact';

export default function Button({
  variant = 'secondary', size = 'md', loading = false, disabled = false,
  type = 'button', onClick, class: klass, className, children, ...rest
}) {
  const cls = [
    'aictl-ui-btn',
    `aictl-ui-btn--${variant}`,
    size === 'sm' ? 'aictl-ui-btn--sm' : null,
    klass, className,
  ].filter(Boolean).join(' ');
  const isDisabled = disabled || loading;
  const handleClick = isDisabled ? undefined : onClick;
  return html`<button
    type=${type}
    class=${cls}
    disabled=${isDisabled}
    aria-busy=${loading ? 'true' : null}
    onClick=${handleClick}
    ...${rest}
  >${loading ? html`<span class="aictl-ui-btn__spinner" aria-hidden="true"></span>` : null}${children}</button>`;
}
