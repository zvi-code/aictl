import { describe, it, expect } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/preact';
import { html } from 'htm/preact';
import { SnapContext } from '../src/context.js';
import CPromptsTab from '../src/components/CPromptsTab.js';

afterEach(() => cleanup());

const SNAP_WITH_PROMPTS = {
  tools: [
    {
      tool: 'copilot-vscode', label: 'Copilot VS Code',
      processes: [], mcp_servers: [],
      files: [
        { path: '/proj/.github/prompts/refactor.prompt.md', kind: 'command', size: 512, tokens: 64, mtime: Date.now()/1000 - 300 },
        { path: '/proj/.github/prompts/review.prompt.md',   kind: 'command', size: 256, tokens: 32, mtime: Date.now()/1000 - 600 },
      ],
      live: { session_count: 0, pid_count: 0, token_estimate: 0, files_touched: 0, sessions: [] },
    },
  ],
};

function renderTab(snap = null) {
  return render(
    html`<${SnapContext.Provider} value=${{ snap }}>
      <${CPromptsTab}/>
    </${SnapContext.Provider}>`,
  );
}

describe('CPromptsTab — toolbar', () => {
  it('renders Prompts and Workflows segment buttons', () => {
    const { getByText } = renderTab();
    expect(getByText('Prompts')).toBeInTheDocument();
    expect(getByText('Workflows')).toBeInTheDocument();
  });

  it('Prompts button is active by default', () => {
    const { getByText } = renderTab();
    expect(getByText('Prompts').classList.contains('is-active')).toBe(true);
    expect(getByText('Workflows').classList.contains('is-active')).toBe(false);
  });

  it('clicking Workflows switches active view', () => {
    const { getByText } = renderTab();
    fireEvent.click(getByText('Workflows'));
    expect(getByText('Workflows').classList.contains('is-active')).toBe(true);
    expect(getByText('Prompts').classList.contains('is-active')).toBe(false);
  });

  it('filter input is present and labeled', () => {
    const { getByLabelText } = renderTab();
    expect(getByLabelText('Filter prompts')).toBeInTheDocument();
  });

  it('filter label updates when view switches to Workflows', () => {
    const { getByText, getByLabelText } = renderTab();
    fireEvent.click(getByText('Workflows'));
    expect(getByLabelText('Filter workflows')).toBeInTheDocument();
  });

  it('count badge shows 0 when no snap', () => {
    const { getByText } = renderTab(null);
    expect(getByText('0 prompts')).toBeInTheDocument();
  });

  it('count badge shows discovered prompts when snap has prompt files', () => {
    const { getByText } = renderTab(SNAP_WITH_PROMPTS);
    expect(getByText('2 prompts')).toBeInTheDocument();
  });

  it('count badge shows 0 workflows', () => {
    const { getByText } = renderTab(SNAP_WITH_PROMPTS);
    fireEvent.click(getByText('Workflows'));
    expect(getByText('0 workflows')).toBeInTheDocument();
  });
});

describe('CPromptsTab — empty state', () => {
  it('shows empty state when no snap', () => {
    const { getByText } = renderTab(null);
    expect(getByText('No prompts yet')).toBeInTheDocument();
  });

  it('empty state note mentions .prompt.md', () => {
    const { container } = renderTab(null);
    const note = container.querySelector('.cprompts-empty-note');
    expect(note).toBeTruthy();
    expect(note.textContent).toContain('.prompt.md');
  });

  it('workflows empty state shows after switching', () => {
    const { getByText } = renderTab(SNAP_WITH_PROMPTS);
    fireEvent.click(getByText('Workflows'));
    expect(getByText('No workflows yet')).toBeInTheDocument();
  });

  it('workflows empty note references .workflow.md', () => {
    const { getByText, container } = renderTab(null);
    fireEvent.click(getByText('Workflows'));
    const note = container.querySelector('.cprompts-empty-note');
    expect(note.textContent).toContain('.workflow.md');
  });

  it('detail pane shows "Nothing selected" when no prompt selected', () => {
    const { getByText } = renderTab();
    expect(getByText('Nothing selected')).toBeInTheDocument();
  });
});

describe('CPromptsTab — prompt list', () => {
  it('shows discovered prompt names from snap', () => {
    const { getByText } = renderTab(SNAP_WITH_PROMPTS);
    expect(getByText('refactor')).toBeInTheDocument();
    expect(getByText('review')).toBeInTheDocument();
  });

  it('clicking a prompt row shows detail pane', () => {
    const { getByText, queryByText } = renderTab(SNAP_WITH_PROMPTS);
    expect(queryByText('Nothing selected')).toBeInTheDocument();
    fireEvent.click(getByText('refactor'));
    expect(queryByText('Nothing selected')).toBeNull();
    expect(getByText('refactor', { selector: '.cprompts-detail-title' })).toBeInTheDocument();
  });

  it('filter narrows list by name', () => {
    const { getByLabelText, queryByText } = renderTab(SNAP_WITH_PROMPTS);
    const input = getByLabelText('Filter prompts');
    fireEvent.input(input, { target: { value: 'refactor' } });
    expect(queryByText('review')).toBeNull();
    expect(queryByText('refactor')).toBeInTheDocument();
  });
});
