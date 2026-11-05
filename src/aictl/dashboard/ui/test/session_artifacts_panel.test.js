import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'preact';
import { html } from 'htm/preact';
import { act } from 'preact/test-utils';

vi.mock('../src/api.js', () => ({ fetchJson: vi.fn() }));
import { fetchJson } from '../src/api.js';
import SessionArtifactsPanel from '../src/components/SessionArtifactsPanel.js';

async function mount() {
  const host = document.createElement('div');
  await act(async () => { render(html`<${SessionArtifactsPanel} sessionId="s1"/>`, host); });
  await act(async () => { await Promise.resolve(); });
  return host;
}

describe('SessionArtifactsPanel', () => {
  beforeEach(() => { fetchJson.mockReset(); });

  it('shows a loading state first', async () => {
    fetchJson.mockReturnValue(new Promise(() => {}));
    const host = await mount();
    expect(host.textContent).toContain('Loading session files');
  });

  it('shows backslash paths and concrete values unchanged', async () => {
    fetchJson.mockResolvedValue({
      folder: 'E:\\Data\\session-state\\s1',
      artifacts: [{ name: 'checkpoints\\001-a.md', path: 'E:\\Data\\x.md', type: 'checkpoint', size: 2048, modified_at: 1, readable: true, checkpoint: 1 }],
    });
    const host = await mount();
    expect(host.textContent).toContain('E:\\Data\\session-state\\s1');
    expect(host.textContent).toContain('checkpoints\\001-a.md');
    expect(host.textContent).toContain('2.0 KB');
    expect(host.textContent).toContain('checkpoint 1');
  });

  it('shows the empty state', async () => {
    fetchJson.mockResolvedValue({ folder: null, artifacts: [] });
    const host = await mount();
    expect(host.textContent).toContain('No folder on disk');
    expect(host.textContent).toContain('No files in this session');
  });

  it('separates not-found from other errors', async () => {
    fetchJson.mockRejectedValue(Object.assign(new Error('HTTP 404'), { status: 404 }));
    expect((await mount()).textContent).toContain('No session folder found for s1');
    fetchJson.mockRejectedValue(new Error('HTTP 500'));
    expect((await mount()).textContent).toContain('Failed to load session files');
  });

  it('expands a file and encodes its path in the request', async () => {
    fetchJson.mockImplementation(async (url) => (url.includes('/artifact?')
      ? { content: 'hello file', binary: false, truncated: false, size: 10 }
      : { folder: 'f', artifacts: [{ name: 'a.md', path: 'C:\\x y\\a.md', type: 'plan', size: 10, modified_at: 1, readable: true }] }));
    const host = await mount();
    await act(async () => { host.querySelector('button').click(); });
    await act(async () => { await Promise.resolve(); });
    expect(host.textContent).toContain('hello file');
    expect(fetchJson.mock.calls.some(([u]) => u.includes(encodeURIComponent('C:\\x y\\a.md')))).toBe(true);
  });

  it('offers no open control for a file that may not be read', async () => {
    fetchJson.mockResolvedValue({ folder: 'f', artifacts: [{ name: 'session-store.db#checkpoint/1', path: null, type: 'checkpoint', size: null, modified_at: null, readable: false }] });
    const host = await mount();
    expect(host.querySelector('button')).toBeNull();
    expect(host.textContent).toContain('n/a');
  });
});
