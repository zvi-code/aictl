import { useRef } from 'preact/hooks';
import { html } from 'htm/preact';
import Icon from './Icon.js';

export default function Segmented({
  options = [], value, onChange, ariaLabel,
  class: klass, className, ...rest
}) {
  const cls = ['aictl-ui-segmented', klass, className].filter(Boolean).join(' ');
  const btnRefs = useRef([]);

  // Roving-tabindex radiogroup: arrow keys move selection + focus.
  const onKeyDown = (e) => {
    if (!options.length) return;
    const cur = Math.max(0, options.findIndex(o => o.value === value));
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (cur + 1) % options.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (cur - 1 + options.length) % options.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = options.length - 1;
    if (next == null) return;
    e.preventDefault();
    if (onChange) onChange(options[next].value);
    btnRefs.current[next]?.focus();
  };

  return html`<div
    class=${cls}
    role="radiogroup"
    aria-label=${ariaLabel || null}
    ...${rest}
  >${options.map((opt, i) => {
    const selected = opt.value === value;
    return html`<button
      key=${opt.value}
      ref=${(el) => { btnRefs.current[i] = el; }}
      type="button"
      class="aictl-ui-segmented__btn"
      role="radio"
      aria-checked=${selected ? 'true' : 'false'}
      tabindex=${selected ? '0' : '-1'}
      onClick=${() => onChange && onChange(opt.value)}
      onKeyDown=${onKeyDown}
    >${opt.icon ? html`<${Icon} name=${opt.icon} size="0.9em"/>` : null}${opt.label}</button>`;
  })}</div>`;
}
