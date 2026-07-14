// Regression: after recent api.js / ApiCallsPanel changes, ensure the
// Explorer tab + its sub-tabs still render real content (not stuck at a
// loading skeleton). Simulates a realistic snapshot + sessions + SSE off.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor, act } from '@testing-library/preact';
import { html } from 'htm/preact';

const session = {
  session_id: 'sess-xyz',
  tool: 'copilot-vscode',
  started_at: 1_776_507_000,
  ended_at: null,
  duration_s: 1000,
  files_modified: 2,
  files_loaded: [],
  files_touched: [],
  exact_input_tokens: 123,
  exact_output_tokens: 45,
  project: '/tmp/proj',
};

// Distinct enough (2h earlier, ended) that dedupeSessions must not merge it.
const olderSession = {
  ...session,
  session_id: 'sess-old',
  started_at: 1_776_500_000,
  ended_at: 1_776_503_600,
  duration_s: 3600,
};

vi.mock('../src/api.js', () => ({
  getSessionTimeline:   vi.fn(() => Promise.resolve([session])),
  getSessionFlow:       () => Promise.resolve({ turns: [] }),
  getSessionSubprocesses: () => Promise.resolve({ counts: [], recent: [] }),
  getSessionMcpUsage:   () => Promise.resolve({ servers: [], total_calls: 0, configured_servers: 0 }),
  getApiCalls:          () => Promise.resolve({ calls: [], summary: {} }),
  getTranscript:        () => Promise.resolve({ turns: [] }),
  getProjectCosts:      () => Promise.resolve({ per_tool: [] }),
  getSessionRuns:       () => Promise.resolve([]),
  getSessionCommits:    () => Promise.resolve({ commits: [] }),
  getSessionMemoryDiff: () => Promise.resolve({ before: '', after: '' }),
  getEvents:            () => Promise.resolve([]),
  getHistory:           () => Promise.resolve({ timestamps: [], series: {} }),
  getFile:              () => Promise.resolve({ content: '' }),
}));

// Stub out the SnapContext provider by stubbing app.js imports isn't
// straightforward — instead render TabExplorer with a minimal provider.
import { SnapContext } from '../src/context.js';

beforeEach(() => { try { localStorage.clear(); } catch { /* noop */ } });
afterEach(() => cleanup());

describe('Explorer tab renders sessions and sub-tabs', () => {
  it('shows sub-tabs and picks the first session automatically', async () => {
    const { default: TabExplorer } = await import('../src/components/TabExplorer.js');
    const ctx = {
      globalRange: null,
      enabledTools: null,
      tools: [{ tool: 'copilot-vscode', label: 'Copilot VS Code' }],
      density: 'normal', theme: 'auto',
    };
    const { container } = render(html`
      <${SnapContext.Provider} value=${ctx}>
        <${TabExplorer}/>
      <//>
    `);

    try {
      await waitFor(() => {
        const subtabs = container.querySelectorAll('.explorer-subtab-btn');
        expect(subtabs.length).toBeGreaterThan(0);
        // Once the session list loads, the loading-state text must go away.
        const stillLoading = container.querySelector('.loading-state');
        expect(stillLoading?.textContent || '').not.toMatch(/Loading session/i);
      }, { timeout: 3000 });
    } catch (e) {
      /* eslint-disable no-console */
      console.log('---FULL HTML---');
      console.log(container.innerHTML);
      console.log('---END HTML---');
      throw e;
    }
  });
});

// Regression: `aictl:select-session` (ActivityRail / command palette /
// CSessionsTab "Inspect session →") used to have no listener at all — the
// event vanished and the explorer kept its auto-selected session.
describe('Explorer select-session wiring', () => {
  const ctx = {
    globalRange: null,
    enabledTools: null,
    tools: [{ tool: 'copilot-vscode', label: 'Copilot VS Code' }],
    density: 'normal', theme: 'auto',
  };

  it('honors an event dispatched BEFORE mount (stashed, applied after load)', async () => {
    const { default: TabExplorer } = await import('../src/components/TabExplorer.js');
    const api = await import('../src/api.js');
    api.getSessionTimeline.mockResolvedValueOnce([session, olderSession]);

    // The tab switch that accompanies the dispatch means TabExplorer is not
    // mounted yet when the event fires.
    document.dispatchEvent(new CustomEvent('aictl:select-session', {
      detail: { sessionId: 'sess-old', tool: 'copilot-vscode' },
    }));

    const { container } = render(html`
      <${SnapContext.Provider} value=${ctx}>
        <${TabExplorer}/>
      <//>
    `);

    await waitFor(() => {
      const active = container.querySelector('.sf-sess-tab.active');
      expect(active?.title).toBe('sess-old');
    }, { timeout: 3000 });
  });

  it('honors an event dispatched while mounted', async () => {
    const { default: TabExplorer } = await import('../src/components/TabExplorer.js');
    const api = await import('../src/api.js');
    api.getSessionTimeline.mockResolvedValueOnce([session, olderSession]);

    const { container } = render(html`
      <${SnapContext.Provider} value=${ctx}>
        <${TabExplorer}/>
      <//>
    `);

    // Auto-select picks the newest session first.
    await waitFor(() => {
      expect(container.querySelector('.sf-sess-tab.active')?.title).toBe('sess-xyz');
    }, { timeout: 3000 });

    await act(async () => {
      document.dispatchEvent(new CustomEvent('aictl:select-session', {
        detail: { sessionId: 'sess-old', tool: 'copilot-vscode' },
      }));
    });

    await waitFor(() => {
      expect(container.querySelector('.sf-sess-tab.active')?.title).toBe('sess-old');
    }, { timeout: 3000 });
  });
});
