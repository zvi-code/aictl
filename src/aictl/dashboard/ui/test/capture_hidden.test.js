// Text-not-retained state for capture modes: absent fields must stay harmless.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { html } from 'htm/preact';
import TextNotRetained, { textWithheld, retentionTitle } from '../src/components/ui/TextNotRetained.js';

afterEach(() => cleanup());

describe('text not retained', () => {
  it('names the mode and how to change it, distinct from empty and error', () => {
    const { getByRole } = render(html`<${TextNotRetained} mode="metadata"/>`);
    const el = getByRole('status');
    expect(el.textContent).toContain('Text not retained: capture=metadata');
    expect(el.textContent).toContain('capture = "full"');
    expect(el.classList.contains('panel-state--withheld')).toBe(true);
  });
  it('only an explicit false withholds: older servers omit the field', () => {
    expect(textWithheld({})).toBe(false);
    expect(textWithheld(null)).toBe(false);
    expect(textWithheld({ content_retained: false })).toBe(true);
  });
  it('is accurate when capture is full now but the session predates it', () => {
    expect(retentionTitle('off')).toContain('capture=off');
    expect(retentionTitle('full')).not.toContain('capture=full');
    expect(retentionTitle(undefined)).toContain('not full');
  });
});
