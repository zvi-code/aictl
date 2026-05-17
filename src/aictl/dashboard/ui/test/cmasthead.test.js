import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/preact';
import { html } from 'htm/preact';
import { SnapContext } from '../src/context.js';
import CMasthead, { EDITORIAL_TABS } from '../src/components/shell/CMasthead.js';

afterEach(() => cleanup());

const SNAP_WITH_SESSIONS = {
  tools: [
    {
      tool: 'claude-code',
      label: 'Claude Code',
      live: {
        sessions: [
          { session_id: 'cc:proj:a1', active: true },
          { session_id: 'cc:proj:a2', active: true },
        ],
      },
    },
  ],
};

function renderMasthead(activeTab = 'overview', setActiveTab = vi.fn(), snap = null) {
  const ctx = snap ? { snap } : null;
  return render(
    html`<${SnapContext.Provider} value=${ctx}>
      <${CMasthead} activeTab=${activeTab} setActiveTab=${setActiveTab}/>
    </${SnapContext.Provider}>`,
  );
}

describe('CMasthead — editorial tab nav', () => {
  it('renders all four editorial tabs', () => {
    const { getByText } = renderMasthead();
    for (const t of EDITORIAL_TABS) {
      expect(getByText(t.label)).toBeInTheDocument();
    }
  });

  it('applies is-active to the matching editorial tab', () => {
    const { container } = renderMasthead('explorer');
    const buttons = container.querySelectorAll('.cmasthead-tab');
    const active = [...buttons].filter(b => b.classList.contains('is-active'));
    expect(active).toHaveLength(1);
    expect(active[0].textContent).toBe('Sessions');
  });

  it('no tab is-active when activeTab is outside the editorial set', () => {
    const { container } = renderMasthead('procs');
    const active = container.querySelectorAll('.cmasthead-tab.is-active');
    expect(active).toHaveLength(0);
  });

  it('click calls setActiveTab with the correct tab id', () => {
    const setActiveTab = vi.fn();
    const { getByText } = renderMasthead('overview', setActiveTab);
    fireEvent.click(getByText('Sessions'));
    expect(setActiveTab).toHaveBeenCalledWith('explorer');
  });

  it('clicking every tab calls setActiveTab with its mapped id', () => {
    const setActiveTab = vi.fn();
    const { getByText } = renderMasthead('overview', setActiveTab);
    for (const t of EDITORIAL_TABS) {
      fireEvent.click(getByText(t.label));
      expect(setActiveTab).toHaveBeenCalledWith(t.id);
    }
  });
});

describe('CMasthead — masthead header', () => {
  it('renders the editorial kicker with "The aictl daily"', () => {
    const { getByText } = renderMasthead();
    expect(getByText(/The aictl daily/)).toBeInTheDocument();
  });

  it('renders the serif aictl title', () => {
    const { container } = renderMasthead();
    const title = container.querySelector('.cmasthead-title');
    expect(title).toBeTruthy();
    expect(title.textContent).toBe('aictl');
  });
});

describe('CMasthead — Live badge', () => {
  it('shows "Live" badge without session count when no snap', () => {
    const { getByLabelText } = renderMasthead('overview', vi.fn(), null);
    expect(getByLabelText('Live status').textContent).toMatch(/Live/);
  });

  it('shows session count from SnapContext', () => {
    const { getByLabelText } = renderMasthead('overview', vi.fn(), SNAP_WITH_SESSIONS);
    expect(getByLabelText('Live status').textContent).toMatch(/2 sessions/);
  });

  it('uses singular "session" for count of 1', () => {
    const snap = {
      tools: [{ tool: 'claude-code', label: 'Claude Code',
        live: { sessions: [{ session_id: 'x', active: true }] } }],
    };
    const { getByLabelText } = renderMasthead('overview', vi.fn(), snap);
    expect(getByLabelText('Live status').textContent).toMatch(/\b1 session\b/);
  });
});
