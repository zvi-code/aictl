import { describe, it, expect, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/preact';
import { html } from 'htm/preact';
import { SnapContext } from '../src/context.js';
import CSessionsTab from '../src/components/CSessionsTab.js';

vi.mock('../src/api.js', () => ({
  getSessionTimeline: vi.fn(),
}));

import * as api from '../src/api.js';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const NOW = Math.floor(Date.now() / 1000);

const MOCK_SESSIONS = [
  {
    session_id: 'abc:sess-1',
    tool: 'claude-code',
    started_at: NOW - 300,
    ended_at: NOW - 10,
    input_tokens: 4000,
    output_tokens: 1200,
    files_modified: 3,
    duration_s: 290,
    project: '/Users/zvi/Projects/myapp',
    git_branch: 'main',
  },
  {
    session_id: 'def:sess-2',
    tool: 'copilot-vscode',
    started_at: NOW - 900,
    ended_at: null,
    active: true,
    input_tokens: 1000,
    output_tokens: 500,
    files_modified: 1,
    duration_s: null,
    project: '/Users/zvi/Projects/other',
    git_branch: null,
  },
];

const CTX = {
  snap: null,
  globalRange: { id: 'live', since: NOW - 86400, until: null },
  enabledTools: null,
};

function renderTab(sessions = []) {
  api.getSessionTimeline.mockResolvedValue(sessions);
  return render(html`
    <${SnapContext.Provider} value=${CTX}>
      <${CSessionsTab}/>
    </${SnapContext.Provider}>
  `);
}

describe('CSessionsTab — toolbar', () => {
  it('renders filter input', () => {
    const { getByLabelText } = renderTab();
    expect(getByLabelText('Filter sessions')).toBeInTheDocument();
  });

  it('shows session count after loading', async () => {
    const { findByText } = renderTab(MOCK_SESSIONS);
    await findByText('2 sessions');
  });

  it('shows 0 sessions with empty data', async () => {
    const { findByText } = renderTab([]);
    await findByText('0 sessions');
  });

  it('renders status and sort selects', () => {
    const { getAllByRole } = renderTab();
    const selects = getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(3);
  });
});

describe('CSessionsTab — empty / loading states', () => {
  it('shows loading while fetch is pending', () => {
    api.getSessionTimeline.mockReturnValue(new Promise(() => {}));
    const { getByText } = render(html`
      <${SnapContext.Provider} value=${CTX}>
        <${CSessionsTab}/>
      </${SnapContext.Provider}>
    `);
    expect(getByText('Loading sessions…')).toBeInTheDocument();
    cleanup();
  });

  it('shows no session selected when data is empty', async () => {
    const { findByText } = renderTab([]);
    await findByText('No session selected');
  });

  it('shows filter-empty message when filter matches nothing', async () => {
    const { findByText, getByLabelText } = renderTab(MOCK_SESSIONS);
    await findByText('2 sessions');
    fireEvent.input(getByLabelText('Filter sessions'), { target: { value: 'zzz-no-match' } });
    await findByText('No sessions match the current filter.');
  });
});

describe('CSessionsTab — session list', () => {
  it('renders session title derived from project path', async () => {
    const { findByText } = renderTab(MOCK_SESSIONS);
    await findByText('Projects/myapp');
  });

  it('active session shows lifecycle pill with dot', async () => {
    const { findByText, container } = renderTab(MOCK_SESSIONS);
    await findByText('● active');
    expect(container.querySelector('.csessions-status--active')).toBeTruthy();
  });

  it('ended session shows ended lifecycle pill', async () => {
    const { container, findByText } = renderTab(MOCK_SESSIONS);
    await findByText('2 sessions');
    const ended = container.querySelector('.csessions-status--ended');
    expect(ended).toBeTruthy();
    expect(ended.textContent).toBe('ended');
  });

  it('auto-selects first session and shows detail', async () => {
    const { findByText, queryByText } = renderTab(MOCK_SESSIONS);
    await findByText('Projects/myapp');
    await waitFor(() => expect(queryByText('No session selected')).toBeNull());
    await findByText('Projects/myapp', { selector: '.csessions-detail-title' });
  });

  it('clicking a row switches detail pane', async () => {
    const { findByText, container } = renderTab(MOCK_SESSIONS);
    await findByText('2 sessions');
    await waitFor(() =>
      expect(container.querySelector('.csessions-detail-title')).toHaveTextContent('Projects/myapp'));
    const rows = container.querySelectorAll('.csessions-row');
    fireEvent.click(rows[1]);
    await waitFor(() =>
      expect(container.querySelector('.csessions-detail-title')).toHaveTextContent('Projects/other'));
  });

  it('filter by text narrows list', async () => {
    const { getByLabelText, container, queryByText } = renderTab(MOCK_SESSIONS);
    await waitFor(() => expect(container.querySelectorAll('.csessions-row').length).toBe(2));
    fireEvent.input(getByLabelText('Filter sessions'), { target: { value: 'myapp' } });
    await waitFor(() => expect(container.querySelectorAll('.csessions-row').length).toBe(1));
    expect(queryByText('Projects/other')).toBeNull();
    expect(container.querySelector('.csessions-cell-title')).toHaveTextContent('Projects/myapp');
  });
});

describe('CSessionsTab — lifecycle status', () => {
  it('renders lifecycle_status verbatim when the backend provides it', async () => {
    const rows = [{ ...MOCK_SESSIONS[1], lifecycle_status: 'open', active: false }];
    const { container, findByText } = renderTab(rows);
    await findByText('1 sessions');
    const pill = container.querySelector('.csessions-status--open');
    expect(pill).toBeTruthy();
    expect(pill.textContent).toBe('open');
  });

  it('derives imported status from ingester source rows', async () => {
    const rows = [{
      ...MOCK_SESSIONS[0], ended_at: null, duration_s: null,
      source: 'claude-code-jsonl',
    }];
    const { container, findByText } = renderTab(rows);
    await findByText('1 sessions');
    const pill = container.querySelector('.csessions-status--imported');
    expect(pill).toBeTruthy();
    expect(pill.textContent).toBe('imported');
  });

  it('status filter offers only statuses that occur (never error)', async () => {
    const { getByLabelText, findByText } = renderTab(MOCK_SESSIONS);
    await findByText('2 sessions');
    const select = getByLabelText('Filter by status');
    const values = [...select.querySelectorAll('option')].map(o => o.value);
    expect(values).toEqual(['all', 'active', 'ended']);
    expect(values).not.toContain('error');
  });

  it('filtering by a lifecycle status narrows the list', async () => {
    const { getByLabelText, container, findByText } = renderTab(MOCK_SESSIONS);
    await findByText('2 sessions');
    fireEvent.change(getByLabelText('Filter by status'), { target: { value: 'ended' } });
    await waitFor(() => expect(container.querySelectorAll('.csessions-row').length).toBe(1));
    expect(container.querySelector('.csessions-status--ended')).toBeTruthy();
    expect(container.querySelector('.csessions-status--active')).toBeNull();
  });
});

describe('CSessionsTab — detail pane', () => {
  it('shows token count in detail stats', async () => {
    const { findAllByText } = renderTab(MOCK_SESSIONS);
    // first session: 4000 + 1200 = 5200 → "5.2K"
    await findAllByText('5.2K');
  });

  it('shows git branch badge when present', async () => {
    const { findByText } = renderTab(MOCK_SESSIONS);
    await waitFor(async () => {
      const el = await findByText('⎇ main');
      expect(el).toBeInTheDocument();
    });
  });

  it('calls onInspect with session id and tool when button clicked', async () => {
    const onInspect = vi.fn();
    api.getSessionTimeline.mockResolvedValue(MOCK_SESSIONS);
    const { findByText } = render(html`
      <${SnapContext.Provider} value=${CTX}>
        <${CSessionsTab} onInspect=${onInspect}/>
      </${SnapContext.Provider}>
    `);
    const btn = await findByText('Inspect session →');
    fireEvent.click(btn);
    expect(onInspect).toHaveBeenCalledWith('abc:sess-1', 'claude-code');
  });
});
