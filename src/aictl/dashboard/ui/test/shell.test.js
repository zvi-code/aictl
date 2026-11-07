import { describe, it, expect, beforeEach } from 'vitest';
import { focusTrap } from '../src/utils/a11y.js';

beforeEach(() => {
  try { localStorage.clear(); } catch { /* noop */ }
});

describe('a11y utils', () => {
  it('focusTrap returns a teardown fn', () => {
    const div = document.createElement('div');
    const teardown = focusTrap(div);
    expect(typeof teardown).toBe('function');
    teardown();
  });
});
