import { describe, it, expect, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { html } from 'htm/preact';

import ResourceBar from '../src/components/ResourceBar.js';

beforeEach(() => cleanup());

// Regression for the "Cannot read properties of undefined (reading 'length')"
// overview crash: a snapshot tool object that lacks a `files` array (e.g. a
// partial payload, or a tool that reports no scanned files) must not crash the
// overview. The component should simply skip tools without files.
describe('ResourceBar with tools missing files', () => {
  it('does not throw when a tool has no files array', () => {
    const snap = {
      tools: [
        { tool: 'claude-code', label: 'Claude Code' }, // no files
        { tool: 'copilot', label: 'Copilot', files: [{ path: '/a', tokens: 1 }] },
      ],
    };
    expect(() => render(html`<${ResourceBar} snap=${snap} mode="files"/>`)).not.toThrow();
  });

  it('renders the file footprint only for tools that have files', () => {
    const snap = {
      tools: [
        { tool: 'claude-code', label: 'Claude Code' }, // no files
        { tool: 'copilot', label: 'Copilot', files: [{ path: '/a', tokens: 1 }] },
      ],
    };
    const { container } = render(html`<${ResourceBar} snap=${snap} mode="files"/>`);
    expect(container.textContent).toContain('Copilot');
    expect(container.textContent).not.toContain('Claude Code');
  });
});
