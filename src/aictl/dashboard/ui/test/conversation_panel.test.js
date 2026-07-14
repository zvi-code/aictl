// ConversationPanel — /api/session-messages wiring (OTel prompts merged
// with copilot/cursor/vscode ingested chats).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/preact';
import { html } from 'htm/preact';

vi.mock('../src/api.js', () => ({
  getSessionMessages: vi.fn(),
}));

import * as api from '../src/api.js';
import ConversationPanel from '../src/components/session_detail/ConversationPanel.js';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const NOW = Math.floor(Date.now() / 1000);

describe('ConversationPanel', () => {
  it('renders chronological role-differentiated messages with source tags', async () => {
    api.getSessionMessages.mockResolvedValue({
      session_id: 's1',
      messages: [
        { role: 'user', content: 'Fix the flaky test', ts: NOW - 300, source: 'otel' },
        { role: 'assistant', content: 'On it — reading the suite.', ts: NOW - 290, source: 'copilot_store' },
      ],
      sources: { otel: 1, copilot_store: 1, cursor: 0, vscode_chat: 0 },
    });
    const { container, findByText } = render(html`<${ConversationPanel} sessionId="s1"/>`);
    await findByText('Fix the flaky test');
    expect(await findByText('On it — reading the suite.')).toBeInTheDocument();
    expect(await findByText('user')).toBeInTheDocument();
    expect(await findByText('assistant')).toBeInTheDocument();
    expect(await findByText('otel')).toBeInTheDocument();
    expect(await findByText('copilot_store')).toBeInTheDocument();
    expect(api.getSessionMessages).toHaveBeenCalledWith('s1');
    // No expand button for short messages.
    expect(container.querySelector('button[aria-expanded]')).toBeNull();
  });

  it('truncates long messages and expands per message', async () => {
    const long = 'x'.repeat(300);
    api.getSessionMessages.mockResolvedValue({
      session_id: 's1',
      messages: [{ role: 'user', content: long, ts: NOW - 10, source: 'cursor' }],
      sources: { otel: 0, copilot_store: 0, cursor: 1, vscode_chat: 0 },
    });
    const { container, findByText } = render(html`<${ConversationPanel} sessionId="s1"/>`);
    const btn = await findByText('Show all 300 chars');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(container.textContent).toContain('x'.repeat(240) + '…');
    expect(container.textContent).not.toContain(long);

    fireEvent.click(btn);
    await waitFor(() => expect(btn.getAttribute('aria-expanded')).toBe('true'));
    expect(container.textContent).toContain(long);
    expect(btn.textContent).toContain('Show less');
  });

  it('shows the empty state when no conversation was captured', async () => {
    api.getSessionMessages.mockResolvedValue({
      session_id: 's1', messages: [],
      sources: { otel: 0, copilot_store: 0, cursor: 0, vscode_chat: 0 },
    });
    const { findByText } = render(html`<${ConversationPanel} sessionId="s1"/>`);
    await findByText('No conversation captured for this session.');
  });

  it('shows an error state when the fetch fails', async () => {
    api.getSessionMessages.mockRejectedValue(new Error('boom'));
    const { findByText } = render(html`<${ConversationPanel} sessionId="s1"/>`);
    await findByText('Failed to load conversation (boom).');
  });
});
