import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { html } from 'htm/preact';
import ErrorBoundary from '../src/components/ErrorBoundary.js';

function Thrower({ msg }) {
  throw new Error(msg || 'boom');
}

describe('ErrorBoundary', () => {
  let errSpy;
  beforeEach(() => { errSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { errSpy.mockRestore(); cleanup(); });

  it('renders children when no error', () => {
    const { getByText } = render(html`<${ErrorBoundary}><div>ok</div></${ErrorBoundary}>`);
    expect(getByText('ok')).toBeInTheDocument();
  });

  it('renders fallback when a child throws', () => {
    const { getByText } = render(html`<${ErrorBoundary}><${Thrower} msg="kaboom"/></${ErrorBoundary}>`);
    expect(getByText('Something went wrong')).toBeInTheDocument();
    expect(getByText(/kaboom/)).toBeInTheDocument();
  });

  it('isolates errors to the wrapped subtree (sibling still renders)', () => {
    const { getByText } = render(html`
      <div>
        <${ErrorBoundary}><${Thrower}/></${ErrorBoundary}>
        <div>sibling-ok</div>
      </div>
    `);
    expect(getByText('Something went wrong')).toBeInTheDocument();
    expect(getByText('sibling-ok')).toBeInTheDocument();
  });
});
