import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/preact';
import { html } from 'htm/preact';
import { useState } from 'preact/hooks';

import Segmented from '../src/components/ui/Segmented.js';
import Icon from '../src/components/ui/Icon.js';

afterEach(() => cleanup());

describe('Segmented', () => {
  function Wrap() {
    const [v, setV] = useState('a');
    return html`<${Segmented} options=${[{label:'A',value:'a'},{label:'B',value:'b'}]} value=${v} onChange=${setV}/>`;
  }
  it('toggles value on click', () => {
    const { getByText, container } = render(html`<${Wrap}/>`);
    fireEvent.click(getByText('B'));
    const checked = container.querySelectorAll('[aria-checked="true"]');
    expect(checked.length).toBe(1);
    expect(checked[0].textContent).toBe('B');
  });
});

describe('Icon', () => {
  it('renders a lucide SVG for a valid name', () => {
    const { container } = render(html`<${Icon} name="activity" size="16"/>`);
    expect(container.querySelector('svg')).toBeTruthy();
  });
  it('falls back to raw text for an unknown name', () => {
    const { getByText } = render(html`<${Icon} name="⚠"/>`);
    expect(getByText('⚠')).toBeInTheDocument();
  });
});
