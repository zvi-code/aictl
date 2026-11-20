import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/preact';
import { html } from 'htm/preact';
import TranscriptTab from '../src/components/board/agent/TranscriptTab.js';
import Drawer from '../src/components/board/Drawer.js';
import { LiveProvider } from '../src/live/context.ts';
import { createLiveClient } from '../src/data/live.ts';
import { canonicalScope } from '../src/data/store.ts';
import { ControlledEventSource, liveBootstrap, liveEntity, liveEnvelope } from './fixtures/live.fixture.js';

const queryOf = source => canonicalScope(new URL(source.url, 'http://x').search.slice(1));
const runtimeAgent = { id: 'native-1', session_id: 'native-1', tool: 'copilot', title: 'Live native agent', running: true, status: 'running', native_activity: 'working', cpu_percent: 5, mem_mb: 12, pids: [10] };
function controller() {
  return createLiveClient({ frames: { request: queueMicrotask } });
}
async function sourceOf() {
  await waitFor(() => expect(ControlledEventSource.instances.length).toBeGreaterThan(0));
  return ControlledEventSource.instances.at(-1);
}
async function bootstrap(source, entities) {
  await act(async () => {
    source.open();
    source.emit('bootstrap', liveBootstrap(entities, queryOf(source)));
  });
}

beforeEach(() => {
  ControlledEventSource.instances = [];
  vi.stubGlobal('EventSource', ControlledEventSource);
  window.history.replaceState(null, '', '/');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('native output and historical transcript separation', () => {
  it('updates active-agent configuration evidence even while its historical detail request is pending', async () => {
    const fetch = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal('fetch', fetch);
    const client = controller();
    const actions = { openDrawer: vi.fn(), setDrawerTab: vi.fn(), drawerBack: vi.fn(), drawerClose: vi.fn(), copy: vi.fn(), stopAgent: vi.fn() };
    const ctx = { data: { agents: [runtimeAgent], capture_mode: 'full' }, stopped: {}, toolName: value => value, refreshKey: 0 };
    const view = render(html`<${LiveProvider} controller=${client}><${Drawer} stack=${[{ type: 'agent', id: 'native-1', tab: 'overview' }]} ctx=${ctx} act=${actions}/><//>`);
    const source = await sourceOf();
    const evidence = value => liveEntity('configuration.loaded', 'native-1', {
      session_id: 'native-1', tool: 'copilot', effective_known: true,
      evidence: [{ key: 'model', value, source: 'native-session-report' }], unknown: ['reasoning_effort'],
    }, value === 'initial-model' ? 1 : 2);
    await bootstrap(source, [evidence('initial-model')]);
    const detail = await view.findByRole('group', { name: 'Effective runtime settings' });
    fireEvent.click(detail.querySelector('summary'));
    expect(detail.textContent).toContain('initial-model');
    await act(async () => source.emit('change', liveEnvelope(2, { upserts: [evidence('updated-model')] })));
    await waitFor(() => expect(detail.textContent).toContain('updated-model'));
    expect(detail.textContent).not.toContain('initial-model');
    expect(detail.textContent).toContain('Unknown: reasoning_effort');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(ControlledEventSource.instances).toHaveLength(1);
  });

  it('renders ordered native output while history is pending, does not poll it, and honors capture suppression', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const fetch = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal('fetch', fetch);
    const client = controller();
    const a = { id: 'native-1', session_id: 'native-1' };
    const ctx = { data: { capture_mode: 'full' } };
    const view = render(html`<${LiveProvider} controller=${client}><${TranscriptTab} a=${a} st="running" ctx=${ctx}/><//>`);
    const source = await sourceOf();
    await bootstrap(source, [
      liveEntity('runtime.output', 'second', { session_id: 'native-1', entry_id: 'second', order: 2, kind: 'assistant', text: 'Second reply', content_retained: true }),
      liveEntity('runtime.output', 'first', { session_id: 'native-1', entry_id: 'first', order: 1, kind: 'assistant', text: 'First reply', content_retained: true }),
    ]);
    const output = await view.findByRole('list', { name: 'Ordered native output' });
    expect([...output.children].map(element => element.querySelector('.bd-ag-text').textContent)).toEqual(['First reply', 'Second reply']);
    await act(async () => { vi.advanceTimersByTime(15000); });
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => source.emit('change', liveEnvelope(2, { upserts: [
      liveEntity('runtime.output', 'second', { session_id: 'native-1', entry_id: 'second', order: 2, kind: 'assistant', text: 'Second reply extended', content_retained: true, text_truncated: true }, 2),
    ] })));
    expect(output.children).toHaveLength(2);
    expect(output.textContent).toContain('Second reply extended');
    expect(view.container.textContent).toContain('Some retained native text is truncated');
    view.rerender(html`<${LiveProvider} controller=${client}><${TranscriptTab} a=${a} st="running" ctx=${{ data: { capture_mode: 'metadata' } }}/><//>`);
    expect(output.textContent).not.toContain('First reply');
    expect(within(output).getAllByText('Text not retained.')).toHaveLength(2);
    expect(ControlledEventSource.instances).toHaveLength(1);
  });
});
