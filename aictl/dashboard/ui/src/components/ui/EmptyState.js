import { html } from 'htm/preact';
import Icon from './Icon.js';

export default function EmptyState({
  icon, title, description, action,
  class: klass, className, ...rest
}) {
  const cls = ['aictl-ui-empty', klass, className].filter(Boolean).join(' ');
  return html`<div class=${cls} role="status" ...${rest}>
    ${icon ? html`<div class="aictl-ui-empty__icon">
      ${typeof icon === 'string' ? html`<${Icon} name=${icon} size="32"/>` : icon}
    </div>` : null}
    ${title ? html`<div class="aictl-ui-empty__title">${title}</div>` : null}
    ${description ? html`<div class="aictl-ui-empty__desc">${description}</div>` : null}
    ${action ? html`<div>${action}</div>` : null}
  </div>`;
}
