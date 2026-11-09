// Keyboard and ARIA regression tests for the shared primitives. The axe ratchet
// of the board runs in board.test.js and board_settings_screen.test.js.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/preact';
import { useState } from 'preact/hooks';
import { html } from 'htm/preact';
import Segmented from '../src/components/ui/Segmented.js';

beforeEach(() => {
  try { localStorage.clear(); } catch { /* noop */ }
});
afterEach(() => cleanup());

// ─── Keyboard operability regression tests ─────────────────────

describe('Segmented — arrow-key navigation', () => {
  function setup() {
    function Wrap() {
      const [v, setV] = useState('a');
      return html`<${Segmented} ariaLabel="Pick"
        options=${[{label:'A',value:'a'},{label:'B',value:'b'},{label:'C',value:'c'}]}
        value=${v} onChange=${setV}/>`;
    }
    return render(html`<${Wrap}/>`);
  }

  it('ArrowRight moves selection and focus; wraps at the end', async () => {
    const { getByText, container } = await setup();
    fireEvent.keyDown(getByText('A'), { key: 'ArrowRight' });
    expect(container.querySelector('[aria-checked="true"]').textContent).toBe('B');
    expect(document.activeElement.textContent).toBe('B');
    fireEvent.keyDown(getByText('B'), { key: 'ArrowRight' });
    fireEvent.keyDown(getByText('C'), { key: 'ArrowRight' }); // wrap C -> A
    expect(container.querySelector('[aria-checked="true"]').textContent).toBe('A');
  });

  it('Home/End jump to first/last option', async () => {
    const { getByText, container } = await setup();
    fireEvent.keyDown(getByText('A'), { key: 'End' });
    expect(container.querySelector('[aria-checked="true"]').textContent).toBe('C');
    fireEvent.keyDown(getByText('C'), { key: 'Home' });
    expect(container.querySelector('[aria-checked="true"]').textContent).toBe('A');
  });

  it('keeps roving tabindex: only the selected option is tabbable', async () => {
    const { container } = await setup();
    const tabbable = [...container.querySelectorAll('[role="radio"]')]
      .filter(b => b.getAttribute('tabindex') === '0');
    expect(tabbable.length).toBe(1);
    expect(tabbable[0].textContent).toBe('A');
  });
});
