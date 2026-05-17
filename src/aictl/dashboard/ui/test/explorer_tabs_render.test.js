// Regression: after recent api.js / ApiCallsPanel changes, ensure the
// Explorer tab + its sub-tabs still render real content (not stuck at a
// loading skeleton). Simulates a realistic snapshot + sessions + SSE off.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/preact';
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

vi.mock('../src/api.js', () => ({
  getSessionTimeline:   () => Promise.resolve([session]),
  getSessionFlow:       () => Promise.resolve({ turns: [] }),
  getSessionSubprocesses: () => Promise.resolve({ counts: [], recent: [] }),
  getSessionMcpUsage:   () => Promise.resolve({ servers: [], total_calls: 0, configured_servers: 0 }),
  getApiCalls:          () => Promise.resolve({ calls: [], summary: {} }),
  getTranscript:        () => Promise.resolve({ turns: [] }),
  getProjectCosts:      () => Promise.resolve({ per_tool: [] }),
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
