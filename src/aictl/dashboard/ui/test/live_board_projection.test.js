import { expect, it } from 'vitest';
import { liveBoardData } from '../src/components/board/useBoardData.js';
import { buildPanel, statusCell } from '../src/components/board/panels.js';
import { projectBoard } from '../src/live/boardProjection.ts';
import { liveProcessTree, mergeRuntimeAgents } from '../src/live/selectors.js';
import { storeHarness } from './data/harness.ts';
import { liveEntity, liveField } from './fixtures/live.fixture.js';

function stateAt(entities) {
  const { store, bootstrap, tick } = storeHarness();
  bootstrap(entities);
  tick();
  return {
    board: projectBoard(store), capabilities: store.meta.capabilities, scope: store.meta.scope,
    topics: { get: store.topic },
  };
}

it('updates daemon gauges without copying operational hook or OTel activity into the board', () => {
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

it('honors the runtime field allowlist and filters agents after the overlay', () => {
  const history = [{ id: 'a', status: 'running', input: 10, cost_usd: 0.1, activity: [1, 2], tool_calls: 3 }, { id: 'b', status: 'running' }];
  const state = stateAt([
    liveEntity('runtime.agent', 'a', { id: 'a', status: 'idle', native_activity: 'idle', cpu_percent: 5, input: 999, cost_usd: 999, activity: 'idle', tool_calls: 999 }),
    liveField('kpis', { tokens: 10 }),
    liveEntity('runtime.output', 'out', { session_id: 'a', tokens: 999 }),
  ]);
  const agents = mergeRuntimeAgents(history, state, { status: 'idle' });
  expect(agents).toHaveLength(1);
  expect(agents[0]).toMatchObject({ id: 'a', status: 'idle', input: 10, cost_usd: 0.1, activity: [1, 2], tool_calls: 3, cpu_percent: 5 });
  expect(mergeRuntimeAgents(history, state, { status: 'running' })).toEqual([]);
  expect(liveBoardData(state, {}, null).kpis.tokens).toBe(10);
});

it('matches Windows runtime project spellings without folding POSIX case or tool identities by prefix', () => {
  const state = stateAt([
    liveEntity('runtime.agent', 'windows', { tool: 'copilot', project: 'c:\\Projects\\Example\\', status: 'running' }),
    liveEntity('runtime.agent', 'posix', { tool: 'copilot-cli', project: '/home/user/Example', status: 'running' }),
    liveEntity('runtime.agent', 'unc', { tool: 'copilot-cli', project: '\\\\server\\share\\Example', status: 'running' }),
  ]);
  const select = (project, tools) => mergeRuntimeAgents([], state, { project }, tools).map(agent => agent.id);
  expect(select('C:/PROJECTS/EXAMPLE', ['copilot-vscode'])).toEqual(['windows']);
  expect(select('file:///C%3A/Projects/Example/', ['copilot-vscode'])).toEqual(['windows']);
  expect(select('/home/user/example')).toEqual([]);
  expect(select('/home/user/Example')).toEqual(['posix']);
  expect(select('\\\\SERVER\\SHARE\\EXAMPLE\\')).toEqual(['unc']);
  expect(select('C:/Projects/Example', ['copilot-cli'])).toEqual([]);
  expect(select('all', [])).toEqual([]);
});

it('keeps unobserved runtime totals and native-only usage unknown', () => {
  const collector = ready => liveEntity('source.status', 'runtime', { producer: 'runtime-collector', ready });
  expect(liveBoardData(stateAt([collector(false)]), {}, null).kpis.running).toBeNull();
  expect(liveBoardData(stateAt([collector(true)]), {}, null).kpis.running).toBe(0);
  const data = liveBoardData(stateAt([
    collector(true),
    liveEntity('runtime.agent', 'a', { tool: 'copilot', running: true, status: 'unknown', native_activity: 'unknown', cpu_percent: 0, mem_mb: null }),
  ]), { status: 'active' }, null);
  expect(data.kpis).toMatchObject({ running: 1, idle: 0, activity_unknown: 1 });
  expect(data.agents[0]).toMatchObject({ status: 'unknown', queryable: false });
  expect(statusCell(data.agents[0], {})).toMatchObject({ v: 'Running', sub: 'Activity unknown' });
  const panel = buildPanel('agentsT', { data, stopped: {}, nowS: 1, toolName: value => value, actions: {} }, { mode: () => 'tool', folded: {}, setFold: () => {} }, {});
  const group = panel.table.groupRow('copilot', panel.table.rows);
  for (const field of ['input', 'cost', 'calls', 'mem']) expect(group.cells[field].v).toBe('n/a');
  expect(group.cells.cpu.v).toBe('0%');
});

it('binds native process trees by PID when the session identities differ', () => {
  const state = stateAt([
    liveEntity('runtime.process', 'lead', { pid: 10, ppid: 1, session_id: 'monitor', memory_rss_bytes: 1048576 }),
    liveEntity('runtime.process', 'child', { pid: 11, ppid: 10, session_id: 'monitor', memory_rss_bytes: null }),
    liveEntity('runtime.process', 'other', { pid: 20, ppid: 1, session_id: 'other' }),
  ]);
  const tree = liveProcessTree(state, { id: 'native', pid_list: [10, 11] });
  expect(tree.map(process => [process.pid, process.depth, process.mem_mb])).toEqual([[10, 0, 1], [11, 1, null]]);
});
