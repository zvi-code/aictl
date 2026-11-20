import { expect, it } from 'vitest';
import { liveProcessTree, mergeRuntimeAgents } from '../src/live/selectors.ts';
import { storeHarness } from './data/harness.ts';
import { liveEntity } from './fixtures/live.fixture.js';

function stateAt(entities) {
  const { store, bootstrap, tick } = storeHarness();
  bootstrap(entities);
  tick();
  return {
    capabilities: store.meta.capabilities,
    topics: { get: store.topic },
  };
}

it('honors the runtime field allowlist and filters agents after the overlay', () => {
  const history = [{ id: 'a', status: 'running', input: 10, cost_usd: 0.1, activity: [1, 2], tool_calls: 3 }, { id: 'b', status: 'running' }];
  const state = stateAt([
    liveEntity('runtime.agent', 'a', { id: 'a', status: 'idle', native_activity: 'idle', cpu_percent: 5, input: 999, cost_usd: 999, activity: 'idle', tool_calls: 999 }),
    liveEntity('runtime.output', 'out', { session_id: 'a', tokens: 999 }),
  ]);
  const agents = mergeRuntimeAgents(history, state, { status: 'idle' });
  expect(agents).toHaveLength(1);
  expect(agents[0]).toMatchObject({ id: 'a', status: 'idle', input: 10, cost_usd: 0.1, activity: [1, 2], tool_calls: 3, cpu_percent: 5 });
  expect(mergeRuntimeAgents(history, state, { status: 'running' })).toEqual([]);
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

it('binds native process trees by PID when the session identities differ', () => {
  const state = stateAt([
    liveEntity('runtime.process', 'lead', { pid: 10, ppid: 1, session_id: 'monitor', memory_rss_bytes: 1048576 }),
    liveEntity('runtime.process', 'child', { pid: 11, ppid: 10, session_id: 'monitor', memory_rss_bytes: null }),
    liveEntity('runtime.process', 'other', { pid: 20, ppid: 1, session_id: 'other' }),
  ]);
  const tree = liveProcessTree(state, { id: 'native', pid_list: [10, 11] });
  expect(tree.map(process => [process.pid, process.depth, process.mem_mb])).toEqual([[10, 0, 1], [11, 1, null]]);
});
