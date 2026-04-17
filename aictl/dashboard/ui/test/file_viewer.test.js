import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/preact';
import { html } from 'htm/preact';

import FileViewer from '../src/components/FileViewer.js';
import * as utils from '../src/utils.js';
import { SnapContext } from '../src/context.js';

beforeEach(() => cleanup());
afterEach(() => vi.restoreAllMocks());

describe('FileViewer historical mode', () => {
  it('calls fetchFileContentAt when "at" is provided and renders the content', async () => {
    const spyAt = vi.spyOn(utils, 'fetchFileContentAt').mockResolvedValue('historical body');
    const spyLive = vi.spyOn(utils, 'fetchFileContent').mockResolvedValue('live body');
    const ctxValue = { snap: { tools: [], agent_memory: [] } };

    const { container } = render(html`<${SnapContext.Provider} value=${ctxValue}>
      <${FileViewer} path="/src/a.js" at=${1700000000} onClose=${() => {}}/>
    </${SnapContext.Provider}>`);

    await waitFor(() => expect(spyAt).toHaveBeenCalledWith('/src/a.js', 1700000000));
    expect(spyLive).not.toHaveBeenCalled();
    await waitFor(() => expect(container.textContent).toContain('historical body'));
  });

  it('calls fetchFileContent (live) when "at" is absent', async () => {
    const spyAt = vi.spyOn(utils, 'fetchFileContentAt').mockResolvedValue('historical');
    const spyLive = vi.spyOn(utils, 'fetchFileContent').mockResolvedValue('live body');
    const ctxValue = { snap: { tools: [], agent_memory: [] } };

    render(html`<${SnapContext.Provider} value=${ctxValue}>
      <${FileViewer} path="/src/b.js" onClose=${() => {}}/>
    </${SnapContext.Provider}>`);

    await waitFor(() => expect(spyLive).toHaveBeenCalledWith('/src/b.js'));
    expect(spyAt).not.toHaveBeenCalled();
  });
});
