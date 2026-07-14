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

  it('renders tool-call breakdown, prompts, rate and context-state chip', async () => {
    vi.spyOn(api, 'getSessions').mockResolvedValue([]);
    vi.spyOn(api, 'getSessionSubprocesses').mockResolvedValue({ total: 0, counts: [], recent: [] });
    vi.spyOn(api, 'getSessionStats').mockResolvedValue({
      session_id: 's1',
      tool_calls: 8,
      tool_call_breakdown: { Bash: 5, Read: 3 },
      skill_calls: 0,
      skill_call_breakdown: {},
      prompt_count: 4,
      tool_call_rate: 2.5,
      context_state: 'filling',
      agents: [],
    });

    const { container } = render(html`<${ResourcesPanel} session=${{
      session_id: 's1', tool: 'claude-code', exact_input_tokens: 10, exact_output_tokens: 5,
    }}/>`);

    await waitFor(() => expect(screen.getByText('Prompts')).toBeInTheDocument());
    // Stat cards carry the deduced values.
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Tool calls/min')).toBeInTheDocument();
    expect(screen.getByText('2.5')).toBeInTheDocument();
    // Per-tool breakdown rows (same pattern as skill_call_breakdown).
    expect(screen.getByText('By tool')).toBeInTheDocument();
    expect(screen.getByText('Bash')).toBeInTheDocument();
    expect(screen.getByText('Read')).toBeInTheDocument();
    // '5' also matches the output-token stat — assert the breakdown rows.
    const rows = [...container.querySelectorAll('.lm-usage-row')];
    expect(rows.some(r => r.textContent.includes('Bash') && r.textContent.includes('5'))).toBe(true);
    expect(rows.some(r => r.textContent.includes('Read') && r.textContent.includes('3'))).toBe(true);
    // Context-state chip renders verbatim.
    expect(screen.getByText('context: filling')).toBeInTheDocument();
    // No skills → no "By skill" section.
    expect(container.textContent).not.toContain('By skill');
  });

  it('omits breakdown sections and chip when stats lack the fields', async () => {
    vi.spyOn(api, 'getSessions').mockResolvedValue([]);
    vi.spyOn(api, 'getSessionSubprocesses').mockResolvedValue({ total: 0, counts: [], recent: [] });
    vi.spyOn(api, 'getSessionStats').mockResolvedValue({
      session_id: 's1', tool_calls: 0, skill_calls: 0, agents: [],
    });

    const { container } = render(html`<${ResourcesPanel} session=${{
      session_id: 's1', tool: 'claude-code', exact_input_tokens: 10, exact_output_tokens: 5,
    }}/>`);

    await waitFor(() => expect(screen.getByText('Prompts')).toBeInTheDocument());
    expect(container.textContent).not.toContain('By tool');
    expect(container.textContent).not.toContain('context:');
    // tool_call_rate missing → em dash placeholder, not 0-as-fake-data.
    expect(screen.getByText('Tool calls/min')).toBeInTheDocument();
  });
});
