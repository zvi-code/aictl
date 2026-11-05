// A session's list of touched files has a limit, so its count must not read as exact.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { html } from 'htm/preact';
import { SnapContext } from '../src/context.js';
import DeliverablesPanel from '../src/components/session_detail/DeliverablesPanel.js';

afterEach(() => cleanup());

describe('DeliverablesPanel', () => {
  const session = over => ({ files_touched: ['/w/a', '/w/b'], file_events: 9, ...over });
  it('shows the exact count under the limit', () => {
    const { container } = render(html`<${SnapContext.Provider} value=${{ openViewer() {} }}><${DeliverablesPanel} session=${session()}/></${SnapContext.Provider}>`);
    expect(container.textContent).toContain('Files Modified2');
  });
  it('marks the count when the list reached its limit', () => {
    const { container } = render(html`<${SnapContext.Provider} value=${{ openViewer() {} }}><${DeliverablesPanel} session=${session({ files_touched_limited: true })}/></${SnapContext.Provider}>`);
    expect(container.textContent).toContain('Files Modified2+');
  });
});
