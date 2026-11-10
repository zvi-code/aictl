import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLiveController, GAUGE_FLUSH_MS } from '../src/live/controller.js';
import { canonicalScope, initialLiveState, liveProcessTree, MAX_REMOVAL_REVISIONS, mergeRuntimeAgents, nativeOutput, projectedBoard, reduceLiveEnvelope, topicData } from '../src/live/model.js';
import { liveBoardData } from '../src/components/board/useBoardData.js';
import { buildPanel, statusCell } from '../src/components/board/panels.js';
import { ControlledEventSource, liveBootstrap, liveCapabilities, liveEntity, liveEnvelope, liveField } from './fixtures/live.fixture.js';

const stateAt = (entities, query = '') => reduceLiveEnvelope({ ...initialLiveState(), scope: canonicalScope(query) }, 'bootstrap', liveBootstrap(entities, query));
const change = (state, sequence, upserts = [], removals = []) => reduceLiveEnvelope(state, 'change', liveEnvelope(sequence, { upserts, removals }, state.scope));

describe('shared live reducer', () => {
  it('accepts sequence jumps, ignores duplicates and older entity revisions, and retains removal tombstones', () => {
    let state = stateAt([liveEntity('runtime.agent', 'a', { id: 'a', cpu_percent: 1 })]);
    state = change(state, 20, [liveEntity('runtime.agent', 'a', { id: 'a', cpu_percent: 4 }, 5)]);
    expect(topicData(state, 'runtime.agent').cpu_percent).toBe(4);
    expect(change(state, 20, [liveEntity('runtime.agent', 'a', { cpu_percent: 99 }, 8)])).toBe(state);
    state = change(state, 30, [liveEntity('runtime.agent', 'a', { id: 'a', cpu_percent: 2 }, 3)]);
    expect(topicData(state, 'runtime.agent').cpu_percent).toBe(4);
    state = change(state, 40, [], [{ topic: 'runtime.agent', id: 'a', revision: 6 }]);
    state = change(state, 50, [liveEntity('runtime.agent', 'a', { id: 'a' }, 5)]);
    expect(topicData(state, 'runtime.agent')).toBeNull();
    state = change(state, 60, [liveEntity('runtime.agent', 'a', { id: 'a', cpu_percent: 7 }, 7)]);
    expect(topicData(state, 'runtime.agent').cpu_percent).toBe(7);
    expect(change(state, 59, [liveEntity('runtime.agent', 'a', { cpu_percent: 99 }, 99)])).toBe(state);
  });

  it('replaces state and revision domains on a fresh epoch and declares ordered gaps', () => {
    const old = stateAt([liveEntity('runtime.output', 'old', { session_id: 'a', order: 1, text: 'old' }, 80)]);
    const reset = reduceLiveEnvelope(old, 'bootstrap', {
      ...liveBootstrap([liveEntity('runtime.output', 'new', { session_id: 'a', order: 2, text: 'new' })]),
      epoch: 'restarted', cursor: 'restarted:1', reason: 'resume_miss', ordered_gap: true,
    });
    expect(nativeOutput(reset, 'a').map(entity => entity.id)).toEqual(['new']);
    expect(reset.orderedGap).toBe(true);
    expect(reset.resetReason).toBe('resume_miss');
    expect(() => change(reset, 2)).toThrow('new snapshot');
  });

  it('assembles stable ordered collection rows and removes them without replacing unrelated fields', () => {
    let state = stateAt([
      liveField('agents', [], '', 1, { collection: true }),
      liveField('agents', { id: 'b' }, '', 1, { key: 'b', order: 2 }),
      liveField('agents', { id: 'a' }, '', 1, { key: 'a', order: 1 }),
      liveField('kpis', { tokens: 10 }),
    ]);
    expect(projectedBoard(state).agents.map(agent => agent.id)).toEqual(['a', 'b']);
    const kpis = projectedBoard(state).kpis;
    state = change(state, 2, [], [{ topic: 'history.board', id: 'agents:a', revision: 2 }]);
    expect(projectedBoard(state).agents).toEqual([{ id: 'b' }]);
    expect(projectedBoard(state).kpis).toBe(kpis);
  });

  it('preserves projected field and collection identity across unrelated runtime updates', () => {
    const state = stateAt([liveField('agents', [], '', 1, { collection: true }), liveField('agents', { id: 'a' }, '', 1, { key: 'a' })]);
    const board = projectedBoard(state);
    const runtime = change(state, 2, [liveEntity('runtime.agent', 'a', { id: 'a', cpu_percent: 5 }, 2)]);
    expect(projectedBoard(runtime)).toBe(board);
    const kpis = change(runtime, 3, [liveField('kpis', { tokens: 10 }, '', 3)]);
    expect(projectedBoard(kpis).agents).toBe(board.agents);
  });

  it('requests a fresh revision domain instead of retaining removal tombstones without a bound', () => {
    const entities = Array.from({ length: MAX_REMOVAL_REVISIONS + 1 }, (_, index) => liveEntity('runtime.process', String(index), { pid: index }));
    const state = stateAt(entities);
    expect(() => change(state, 2, [], entities.map(entity => ({ topic: entity.topic, id: entity.id, revision: 2 })))).toThrow('new snapshot');
  });

  it('merges complementary configuration metadata with queryable usage by field and stable row key', () => {
    const config = liveEntity('configuration.board', 'skill-config', {
      scope: '', field: 'skills', key: 'check', merge: true, value: { name: 'check', path: 'check.md', description: 'Current configuration' },
    });
    let state = stateAt([config, liveField('skills', { name: 'check', uses: 3, tokens: 20 }, '', 1, { key: 'check', merge: true })]);
    expect(projectedBoard(state).skills).toEqual([{ name: 'check', path: 'check.md', description: 'Current configuration', uses: 3, tokens: 20 }]);
    state = change(state, 2, [], [{ topic: 'history.board', id: 'skills:check', revision: 2 }]);
    expect(projectedBoard(state).skills).toEqual([{ name: 'check', path: 'check.md', description: 'Current configuration' }]);
  });

  it('rejects a mismatched source and never accepts history from native or operational counters', () => {
    const state = stateAt([]);
    expect(() => change(state, 2, [liveEntity('history.board', 'kpis', { field: 'kpis', value: { tokens: 999 } }, 2, 'runtime.native')])).toThrow('source authority');
    const next = change(state, 2, [liveEntity('runtime.health', 'local', { store: { otel_sink: { pending_rows: 900 }, writes: { rows: 800 } } }, 2)]);
    expect(projectedBoard(next)).toEqual({});
    expect(liveBoardData(next, {}, null).kpis.tokens).toBeUndefined();
  });

  it('updates daemon gauges from operational health without copying hook or OTel activity into the board', () => {
    const state = stateAt([liveEntity('runtime.health', 'local', {
      pipeline: {
        self: { cpu: 2, rss: 1048576, started_at: 10 },
        stream: { snapshot_age_s: 3 },
        hooks: { copilot: { count: 100 } },
        otel_receiver: { api_calls_total: 200 },
      },
    })]);
    const data = liveBoardData(state, {}, null);
    expect(data.self).toMatchObject({ cpu_percent: 2, memory_rss_bytes: 1048576 });
    expect(data.machine.pipeline.self.started_at).toBe(10);
    expect(data.machine.pipeline.stream.snapshot_age_s).toBe(3);
    expect(data.machine.pipeline.hooks).toEqual({});
    expect(data.machine.pipeline.otel_receiver).toBeNull();
    expect(data.kpis.tokens).toBeUndefined();
  });

  it('uses the advertised runtime field allowlist without replacing historical usage or activity arrays', () => {
    const state = stateAt([
      liveEntity('runtime.agent', 'a', {
        id: 'a', status: 'running', native_activity: 'working', cpu_percent: 5,
        input: 999, cost_usd: 999, activity: 'working', tool_calls: 999,
      }),
    ]);
    const historical = [{ id: 'a', status: 'ended', input: 10, cost_usd: 0.1, activity: [1, 2], tool_calls: 3 }];
    const agent = mergeRuntimeAgents(historical, state)[0];
    expect(agent).toMatchObject({ status: 'running', native_activity: 'working', input: 10, cost_usd: 0.1, activity: [1, 2], tool_calls: 3, cpu_percent: 5 });
    const unqueryable = mergeRuntimeAgents([], state)[0];
    expect(unqueryable.input).toBeUndefined();
    expect(unqueryable.cost_usd).toBeUndefined();
    expect(unqueryable.queryable).toBe(false);
  });

  it('applies current-state filters after native overlay, including historical rows with no current evidence', () => {
    const state = stateAt([liveEntity('runtime.agent', 'a', { id: 'a', status: 'idle' })]);
    const history = [{ id: 'a', status: 'running' }, { id: 'b', status: 'running' }, { id: 'c', status: 'ended' }];
    expect(mergeRuntimeAgents(history, state, { status: 'idle' }).map(agent => agent.id)).toEqual(['a']);
    expect(mergeRuntimeAgents(history, state, { status: 'running' })).toEqual([]);
    expect(mergeRuntimeAgents(history, state, { status: 'ended' }).map(agent => agent.id)).toEqual(['c']);
  });

  it('matches Windows runtime project spellings without folding POSIX case or tool identities by prefix', () => {
    const state = stateAt([
      liveEntity('runtime.agent', 'windows', { id: 'windows', tool: 'copilot', project: 'c:\\Projects\\Example\\', status: 'running' }),
      liveEntity('runtime.agent', 'posix', { id: 'posix', tool: 'copilot-cli', project: '/home/user/Example', status: 'running' }),
      liveEntity('runtime.agent', 'unc', { id: 'unc', tool: 'copilot-cli', project: '\\\\server\\share\\Example', status: 'running' }),
    ]);
    expect(mergeRuntimeAgents([], state, { project: 'C:/PROJECTS/EXAMPLE' }, ['copilot-vscode']).map(agent => agent.id)).toEqual(['windows']);
    expect(mergeRuntimeAgents([], state, { project: 'file:///C%3A/Projects/Example/' }, ['copilot-vscode']).map(agent => agent.id)).toEqual(['windows']);
    expect(mergeRuntimeAgents([], state, { project: '/home/user/example' })).toEqual([]);
    expect(mergeRuntimeAgents([], state, { project: '/home/user/Example/' }).map(agent => agent.id)).toEqual(['posix']);
    expect(mergeRuntimeAgents([], state, { project: '\\\\SERVER\\SHARE\\EXAMPLE\\' }).map(agent => agent.id)).toEqual(['unc']);
    expect(mergeRuntimeAgents([], state, { project: 'C:/Projects/Example' }, ['copilot-cli'])).toEqual([]);
    expect(mergeRuntimeAgents([], state, {}, [])).toEqual([]);
  });

  it('keeps native output in stable native order without adding it to historical totals', () => {
    let state = stateAt([liveField('kpis', { tokens: 7, cost_usd: 0.2 })]);
    state = change(state, 2, [liveEntity('runtime.output', 'second', { session_id: 'a', entry_id: '2', order: 2, text: 'second', tokens: 999 }, 2)]);
    state = change(state, 3, [liveEntity('runtime.output', 'first', { session_id: 'a', entry_id: '1', order: 1, text: 'first' }, 3)]);
    expect(nativeOutput(state, 'a').map(entity => entity.data.text)).toEqual(['first', 'second']);
    expect(liveBoardData(state, {}, null).kpis).toMatchObject({ tokens: 7, cost_usd: 0.2 });
  });

  it('keeps an unobserved runtime baseline unknown and reports zero only after a complete empty collector sample', () => {
    const pending = stateAt([liveEntity('source.status', 'runtime', { producer: 'runtime-collector', ready: false, process_count: null })]);
    expect(liveBoardData(pending, {}, null).kpis.running).toBeNull();
    const ready = change(pending, 2, [liveEntity('source.status', 'runtime', { producer: 'runtime-collector', ready: true, process_count: 0 }, 2)]);
    expect(liveBoardData(ready, {}, null).kpis.running).toBe(0);
  });

  it('distinguishes process presence from working/idle evidence and keeps native-only group usage unknown', () => {
    const state = stateAt([
      liveEntity('source.status', 'runtime', { producer: 'runtime-collector', ready: true }),
      liveEntity('runtime.agent', 'a', { id: 'a', tool: 'copilot', running: true, status: 'unknown', native_activity: 'unknown', cpu_percent: 0, mem_mb: null }),
    ]);
    const data = liveBoardData(state, { status: 'active' }, null);
    expect(data.kpis).toMatchObject({ running: 1, idle: 0, activity_unknown: 1 });
    expect(data.agents[0].status).toBe('unknown');
    expect(statusCell(data.agents[0], {})).toMatchObject({ v: 'Running', sub: 'Activity unknown' });
    const panel = buildPanel('agentsT', { data, stopped: {}, nowS: 1, toolName: value => value, actions: {} }, { mode: () => 'tool', folded: {}, setFold: () => {} }, {});
    const group = panel.table.groupRow('copilot', panel.table.rows);
    expect(group.cells.input.v).toBe('n/a');
    expect(group.cells.cost.v).toBe('n/a');
    expect(group.cells.calls.v).toBe('n/a');
    expect(group.cells.mem.v).toBe('n/a');
    expect(group.cells.cpu.v).toBe('0%');
  });

  it('binds native process trees by actual PIDs when monitor and native session identities differ', () => {
    const state = stateAt([
      liveEntity('runtime.process', 'lead', { pid: 10, ppid: 1, session_id: 'monitor', memory_rss_bytes: 1048576 }),
      liveEntity('runtime.process', 'child', { pid: 11, ppid: 10, session_id: 'monitor', memory_rss_bytes: null }),
      liveEntity('runtime.process', 'other', { pid: 20, ppid: 1, session_id: 'other' }),
    ]);
    const tree = liveProcessTree(state, { id: 'native', pid_list: [10, 11] });
    expect(tree.map(process => [process.pid, process.depth, process.mem_mb])).toEqual([[10, 0, 1], [11, 1, null]]);
  });

  it('matches server scope encoding while preserving blank filters and excluding transport controls', () => {
    expect(canonicalScope('q=~*!%27%28%29+a&tool=b&history=0&cursor=e%3A1&empty=&tool=a')).toBe("empty=&q=~%2A%21%27%28%29+a&tool=a&tool=b");
    expect(canonicalScope('tool=&history=0&cursor=')).toBe('tool=');
    expect(canonicalScope('tool=')).not.toBe(canonicalScope(''));
  });
});

describe('one live connection controller', () => {
  let client;
  beforeEach(() => {
    ControlledEventSource.instances = [];
    vi.useFakeTimers();
  });
  afterEach(() => { client?.stop(); client = null; vi.useRealTimers(); });
  async function start(query = '', options = {}) {
    const capabilities = vi.fn(async () => liveCapabilities);
    client = createLiveController({ getCapabilities: capabilities, EventSourceClass: ControlledEventSource });
    client.configure({ query, history: true, live: true, ...options });
    client.start();
    await Promise.resolve();
    return { source: ControlledEventSource.instances.at(-1), capabilities };
  }

  it('shares one transport and coalesces gauges, but retains every ordered output entry', async () => {
    const { source, capabilities } = await start();
    const first = vi.fn();
    const second = vi.fn();
    client.subscribe(first);
    client.subscribe(second);
    source.open();
    source.emit('bootstrap', liveBootstrap([]));
    first.mockClear(); second.mockClear();
    for (let i = 2; i < 12; i++) source.emit('change', liveEnvelope(i, { upserts: [liveEntity('runtime.agent', 'a', { id: 'a', cpu_percent: i }, i)] }));
    expect(first).not.toHaveBeenCalled();
    vi.advanceTimersByTime(GAUGE_FLUSH_MS);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(topicData(client.getState(), 'runtime.agent').cpu_percent).toBe(11);
    for (let i = 12; i < 15; i++) source.emit('change', liveEnvelope(i, { upserts: [liveEntity('runtime.output', String(i), { session_id: 'a', order: i, text: String(i) }, i)] }));
    expect(nativeOutput(client.getState(), 'a').map(entity => entity.data.text)).toEqual(['12', '13', '14']);
    expect(first).toHaveBeenCalledTimes(4);
    expect(ControlledEventSource.instances).toHaveLength(1);
    expect(capabilities).toHaveBeenCalledTimes(1);
  });

  it('reconnects with its accepted cursor and applies exact replay without duplicating output', async () => {
    const { source } = await start('since=1&until=9');
    source.emit('bootstrap', liveBootstrap([liveEntity('runtime.output', 'one', { session_id: 'a', order: 1, text: 'one' })], 'since=1&until=9'));
    source.fail();
    expect(source.closed).toBe(true);
    vi.advanceTimersByTime(1000);
    const resumed = ControlledEventSource.instances.at(-1);
    expect(new URL(resumed.url, 'http://x').searchParams.get('cursor')).toBe('daemon:1');
    resumed.emit('change', liveEnvelope(2, { upserts: [liveEntity('runtime.output', 'one', { session_id: 'a', order: 1, text: 'one' }, 1)] }, 'since=1&until=9'));
    expect(nativeOutput(client.getState(), 'a')).toHaveLength(1);
    resumed.emit('bootstrap', liveBootstrap([], 'since=1&until=9', 3, { reason: 'overflow', ordered_gap: true }));
    expect(nativeOutput(client.getState(), 'a')).toHaveLength(0);
    expect(client.getState().orderedGap).toBe(true);
  });

  it('replaces the stream and requests a fresh filter baseline while keeping runtime independent', async () => {
    const { source } = await start('project=one');
    source.emit('bootstrap', liveBootstrap([liveField('kpis', { tokens: 1 }, 'project=one'), liveEntity('runtime.agent', 'a', { id: 'a' })], 'project=one'));
    client.configure({ query: 'project=two', history: true, live: true });
    const replacement = ControlledEventSource.instances.at(-1);
    expect(source.closed).toBe(true);
    expect(new URL(replacement.url, 'http://x').searchParams.has('cursor')).toBe(false);
    expect(projectedBoard(client.getState())).toEqual({});
    expect(topicData(client.getState(), 'runtime.agent').id).toBe('a');
    source.emit('change', liveEnvelope(3, { upserts: [liveField('kpis', { tokens: 99 }, 'project=one', 3)] }, 'project=one'));
    replacement.emit('bootstrap', liveBootstrap([liveField('kpis', { tokens: 2 }, 'project=two')], 'project=two', 4));
    expect(projectedBoard(client.getState()).kpis.tokens).toBe(2);
    expect(ControlledEventSource.instances.filter(instance => !instance.closed)).toHaveLength(1);
  });

  it('replaces an all-tools subscription when the next scope explicitly selects no tool', async () => {
    const { source } = await start();
    source.emit('bootstrap', liveBootstrap([]));
    client.configure({ query: 'tool=', history: true, live: true });
    const replacement = ControlledEventSource.instances.at(-1);
    expect(source.closed).toBe(true);
    expect(client.getState().scope).toBe('tool=');
    expect(new URL(replacement.url, 'http://x').searchParams.get('tool')).toBe('');
    expect(new URL(replacement.url, 'http://x').searchParams.has('cursor')).toBe(false);
  });

  it('keeps a paused Board subscribed after a pending bootstrap until history and runtime baselines arrive', async () => {
    const { source } = await start('', { live: false, requiredTopics: ['history.board', 'runtime.machine'] });
    source.emit('bootstrap', liveBootstrap([
      liveEntity('source.status', 'history:scope', { component: 'history', topic: 'history.board', scope: '', ready: false, pending: true, error: null }),
    ]));
    expect(source.closed).toBe(false);
    source.emit('change', liveEnvelope(2, { upserts: [
      liveField('kpis', { tokens: 42 }, '', 2),
      liveEntity('source.status', 'history:scope', { component: 'history', topic: 'history.board', scope: '', ready: true, pending: false, error: null }, 2),
    ] }));
    expect(source.closed).toBe(false);
    source.emit('change', liveEnvelope(3, { upserts: [
      liveEntity('runtime.machine', 'local', { cpu_per_core: [5] }, 3),
      liveEntity('source.status', 'health', { component: 'health', topic: 'runtime.health', topics: ['runtime.health', 'runtime.machine'], ready: true, pending: false, error: null }, 3),
    ] }));
    expect(source.closed).toBe(true);
    expect(projectedBoard(client.getState()).kpis.tokens).toBe(42);
    expect(ControlledEventSource.instances).toHaveLength(1);
  });

  it.each([
    ['Health', 'runtime.health', 'health', 'local', { store: { kind: 'kusto' } }],
    ['Settings', 'configuration.file', 'configuration', 'current', { configured_only: true, tool_configs: [] }],
  ])('keeps paused %s subscribed after an empty bootstrap until its actual data arrives', async (_, topic, component, id, data) => {
    const { source } = await start('', { history: false, live: false, requiredTopics: [topic] });
    source.emit('bootstrap', liveBootstrap([]));
    expect(source.closed).toBe(false);
    source.emit('change', liveEnvelope(2, { upserts: [
      liveEntity('source.status', component, { component, topic, ready: false, pending: true, stale: false, error: null }, 2),
    ] }));
    expect(source.closed).toBe(false);
    source.emit('change', liveEnvelope(3, { upserts: [
      liveEntity(topic, id, data, 3),
      liveEntity('source.status', component, { component, topic, ready: true, pending: false, stale: false, error: null }, 3),
    ] }));
    expect(source.closed).toBe(true);
    expect(topicData(client.getState(), topic, id)).toEqual(data);
  });

  it.each([
    ['history.board', 'history', { scope: '' }],
    ['runtime.health', 'health', {}],
    ['runtime.machine', 'health', { topic: 'runtime.health', topics: ['runtime.health', 'runtime.machine'] }],
    ['configuration.file', 'configuration', {}],
  ])('finishes a paused %s baseline on explicit failure, not on unrelated errors or staleness', async (topic, component, extra) => {
    const { source } = await start('', { history: topic === 'history.board', live: false, requiredTopics: [topic] });
    source.emit('bootstrap', liveBootstrap([
      liveEntity('source.status', component, { component, topic, ...extra, ready: false, pending: true, stale: true, error: null }),
      liveEntity('source.status', 'unrelated', { topic: 'unrelated', ready: false, pending: false, error: 'unrelated failure' }),
    ]));
    expect(source.closed).toBe(false);
    source.emit('change', liveEnvelope(2, { upserts: [
      liveEntity('source.status', component, { component, topic, ...extra, ready: false, pending: false, stale: true, error: 'source unavailable' }, 2),
    ] }));
    expect(source.closed).toBe(true);
  });

  it('reconnects a paused pending baseline by cursor instead of treating wire readiness as complete', async () => {
    const { source } = await start('', { live: false });
    source.emit('bootstrap', liveBootstrap([
      liveEntity('source.status', 'history:scope', { component: 'history', topic: 'history.board', scope: '', ready: false, pending: true }),
    ]));
    source.fail();
    vi.advanceTimersByTime(1000);
    const replacement = ControlledEventSource.instances.at(-1);
    expect(replacement).not.toBe(source);
    expect(new URL(replacement.url, 'http://x').searchParams.get('cursor')).toBe('daemon:1');
    replacement.emit('change', liveEnvelope(2, { upserts: [
      liveField('kpis', { tokens: 10 }, '', 2),
      liveEntity('source.status', 'history:scope', { component: 'history', topic: 'history.board', scope: '', ready: true, pending: false }, 2),
    ] }));
    expect(replacement.closed).toBe(true);
    expect(projectedBoard(client.getState()).kpis.tokens).toBe(10);
  });

  it('requests a cursorless snapshot after a protocol/source error instead of falling back to whole-board reads', async () => {
    const { source } = await start();
    source.emit('bootstrap', liveBootstrap([]));
    source.emit('change', liveEnvelope(2, { upserts: [liveEntity('history.board', 'bad', {}, 2, 'runtime.native')] }));
    expect(client.getState().mode).toBe('incremental');
    expect(client.getState().error.message).toContain('source authority');
    vi.advanceTimersByTime(1000);
    expect(new URL(ControlledEventSource.instances.at(-1).url, 'http://x').searchParams.has('cursor')).toBe(false);
  });

  it('uses the disabled SQLite capability without opening a new-protocol stream', async () => {
    client = createLiveController({ getCapabilities: async () => ({ ...liveCapabilities, enabled: false }), EventSourceClass: ControlledEventSource });
    client.start();
    await Promise.resolve();
    expect(client.getState().mode).toBe('legacy');
    expect(ControlledEventSource.instances).toHaveLength(0);
  });

  it('retries transient capability discovery errors without silently enabling the legacy Kusto path', async () => {
    const capabilities = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(liveCapabilities);
    client = createLiveController({ getCapabilities: capabilities, EventSourceClass: ControlledEventSource });
    client.start();
    await Promise.resolve(); await Promise.resolve();
    expect(client.getState().mode).toBe('unavailable');
    expect(ControlledEventSource.instances).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1000);
    expect(client.getState().mode).toBe('incremental');
    expect(ControlledEventSource.instances).toHaveLength(1);
  });

  it('does not silently use legacy reads for an advertised but unsupported protocol', async () => {
    client = createLiveController({ getCapabilities: async () => ({ ...liveCapabilities, protocol: 2 }), EventSourceClass: ControlledEventSource });
    client.start();
    await Promise.resolve();
    expect(client.getState().mode).toBe('unavailable');
    expect(client.getState().error.message).toContain('not supported');
    expect(ControlledEventSource.instances).toHaveLength(0);
  });

  it('closes a paused snapshot, resumes by cursor, and cancels reconnect work on stop', async () => {
    const { source } = await start();
    source.emit('bootstrap', liveBootstrap([
      liveEntity('source.status', 'history:scope', { component: 'history', topic: 'history.board', scope: '', ready: true, pending: false }),
    ]));
    client.configure({ query: '', history: true, live: false });
    expect(source.closed).toBe(true);
    client.configure({ query: '', history: true, live: true });
    const resumed = ControlledEventSource.instances.at(-1);
    expect(new URL(resumed.url, 'http://x').searchParams.get('cursor')).toBe('daemon:1');
    resumed.fail();
    client.stop();
    vi.advanceTimersByTime(30000);
    expect(ControlledEventSource.instances).toHaveLength(2);
  });
});
