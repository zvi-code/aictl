import { html } from 'htm/preact';

export default function Card({
  variant = 'default', density, title, subtitle, actions, footer,
  class: klass, className, children, ...rest
}) {
  const cls = [
    'aictl-ui-card',
    variant !== 'default' ? `aictl-ui-card--${variant}` : null,
    klass, className,
  ].filter(Boolean).join(' ');
  const resolvedDensity = density || (typeof document !== 'undefined'
    ? (document.documentElement.style.getPropertyValue('--density') || null)
    : null);
  const hasHeader = title || subtitle || actions;
  return html`<section
    class=${cls}
    data-density=${resolvedDensity || null}
    ...${rest}
  >
    ${hasHeader ? html`<header class="aictl-ui-card__hdr">
      <div class="aictl-ui-card__titles">
        ${title ? html`<div class="aictl-ui-card__title">${title}</div>` : null}
        ${subtitle ? html`<div class="aictl-ui-card__subtitle">${subtitle}</div>` : null}
      </div>
      ${actions ? html`<div class="aictl-ui-card__actions">${actions}</div>` : null}
    </header>` : null}
    <div class="aictl-ui-card__body">${children}</div>
    ${footer ? html`<footer class="aictl-ui-card__footer">${footer}</footer>` : null}
  </section>`;
}
