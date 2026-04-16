import { html } from 'htm/preact';
import Icon from './Icon.js';

export default function Segmented({
  options = [], value, onChange, ariaLabel,
  class: klass, className, ...rest
}) {
  const cls = ['aictl-ui-segmented', klass, className].filter(Boolean).join(' ');
  return html`<div
    class=${cls}
    role="radiogroup"
    aria-label=${ariaLabel || null}
    ...${rest}
  >${options.map(opt => {
    const selected = opt.value === value;
    return html`<button
      key=${opt.value}
      type="button"
      class="aictl-ui-segmented__btn"
      role="radio"
      aria-checked=${selected ? 'true' : 'false'}
      tabindex=${selected ? '0' : '-1'}
      onClick=${() => onChange && onChange(opt.value)}
    >${opt.icon ? html`<${Icon} name=${opt.icon} size="0.9em"/>` : null}${opt.label}</button>`;
  })}</div>`;
}
