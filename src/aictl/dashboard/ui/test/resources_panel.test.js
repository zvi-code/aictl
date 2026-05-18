import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/preact';
import { html } from 'htm/preact';

import ResourcesPanel from '../src/components/session_detail/ResourcesPanel.js';
import * as api from '../src/api.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ResourcesPanel skill and subagent report', () => {
  it('renders session skill calls and subagents from session stats', async () => {
    vi.spyOn(api, 'getSessions').mockResolvedValue([]);
    vi.spyOn(api, 'getSessionSubprocesses').mockResolvedValue({ total: 0, counts: [], recent: [] });
    vi.spyOn(api, 'getSessionStats').mockResolvedValue({
      session_id: 's1',
      skill_calls: 3,
      skill_call_breakdown: { 'review-pr': 2, backlog: 1 },
      tool_calls: 8,
      agents: [
        { agent_id: 'agent-a', state: 'ended', task: 'Review hooks' },
        { agent_id: 'agent-b', state: 'active', task: 'Verify UI' },
      ],
    });

    render(html`<${ResourcesPanel} session=${{
      session_id: 's1', tool: 'claude-code', exact_input_tokens: 10, exact_output_tokens: 5,
    }}/>`);

    await waitFor(() => expect(screen.getByText('Skills and subagents')).toBeInTheDocument());
    expect(screen.getByText('review-pr')).toBeInTheDocument();
    expect(screen.getByText('agent-a')).toBeInTheDocument();
    expect(screen.getByText('agent-b')).toBeInTheDocument();
    expect(screen.getByText('Tool Calls')).toBeInTheDocument();
  });
});
