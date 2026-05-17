// Slice 1.4 — verify SessionHeader renders git_branch + short git_commit
// badges when present, and omits them silently when absent.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { html } from 'htm/preact';

import { SessionHeader } from '../src/components/TabExplorer.js';

afterEach(() => cleanup());

describe('SessionHeader git badges', () => {
  it('renders branch name and short commit with full SHA in title', () => {
    const session = {
      session_id: 's1',
      tool: 'claude-code',
      started_at: 1_700_000_000,
      ended_at: 1_700_000_100,
      git_branch: 'feature/x',
      git_commit: 'abcdef1234567890',
    };
    const { container } = render(html`<${SessionHeader} session=${session}/>`);
    const text = container.textContent;
    expect(text).toContain('feature/x');
    expect(text).toContain('abcdef1');
    // Full SHA must not leak into rendered text — only short form.
    expect(text).not.toContain('abcdef1234567890');
    // Full SHA is preserved in the title attribute for hover.
    const commitBadge = Array.from(container.querySelectorAll('[title]'))
      .find(el => el.getAttribute('title') === 'abcdef1234567890');
    expect(commitBadge).toBeTruthy();
  });

  it('omits both badges when git_branch/git_commit are empty', () => {
    const session = {
      session_id: 's2',
      tool: 'claude-code',
      started_at: 1_700_000_000,
      ended_at: 1_700_000_100,
      git_branch: null,
      git_commit: undefined,
    };
    const { container } = render(html`<${SessionHeader} session=${session}/>`);
    const titles = Array.from(container.querySelectorAll('[title]'))
      .map(el => el.getAttribute('title'));
    expect(titles).not.toContain('git branch');
    // Header must render (tool label present) but no "undefined" leaked.
    expect(container.textContent).toContain('claude-code');
    expect(container.textContent).not.toContain('undefined');
  });
});
