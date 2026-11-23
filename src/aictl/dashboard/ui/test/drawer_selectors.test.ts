import { expect, it } from 'vitest';
import { overlayAgents, statusText } from '../src/data/runtimeAgents';
import { storeHarness } from './data/harness';
import { liveCapabilities, liveEntity } from './fixtures/live.fixture';

function overlayAt(entities: ReturnType<typeof liveEntity>[]) {
  const { store, bootstrap, tick } = storeHarness();
  bootstrap(entities);
  tick();
  const rows = [...(store.topic('runtime.agent')?.values() ?? [])];
  const fields = liveCapabilities.topics['runtime.agent'].fields;
  return (history: Parameters<typeof overlayAgents>[0], filters: Parameters<typeof overlayAgents>[3],
    tools?: string[]) => overlayAgents(history, rows, fields, filters, tools);
}

it('shows why a status holds and marks an inferred end as inferred', () => {
  expect(statusText('ended', 'idle')).toBe('ended (inferred)');
  expect(statusText('ended', 'process_exit')).toBe('ended');
  expect(statusText('running', '')).toBe('running');
  const overlay = overlayAt([liveEntity('runtime.agent', 's', {
    id: 's', session_id: 's', status: 'idle', native_activity: 'idle', running: true,
    status_evidence: 'process 4312 running; session file reports idle' })]);
  const [agent] = overlay([{ id: 's', status: 'running', status_evidence: 'no process seen; last activity 1 min ago' }], {});
  expect(agent).toMatchObject({ status: 'idle', status_evidence: 'process 4312 running; session file reports idle' });
});

it('honors the runtime field allowlist and filters agents after the overlay', () => {
  const history = [{ id: 'a', status: 'running', input: 10, cost_usd: 0.1, activity: [1, 2], tool_calls: 3 }, { id: 'b', status: 'running' }];
  const overlay = overlayAt([
    liveEntity('runtime.agent', 'a', { id: 'a', status: 'idle', native_activity: 'idle', cpu_percent: 5, input: 999, cost_usd: 999, activity: 'idle', tool_calls: 999 }),
    liveEntity('runtime.output', 'out', { session_id: 'a', tokens: 999 }),
  ]);
  const agents = overlay(history, { status: 'idle' });
  expect(agents).toHaveLength(1);
  expect(agents[0]).toMatchObject({ id: 'a', status: 'idle', input: 10, cost_usd: 0.1, activity: [1, 2], tool_calls: 3, cpu_percent: 5 });
  expect(overlay(history, { status: 'running' })).toEqual([]);
});

it('matches Windows runtime project spellings without folding POSIX case or tool identities by prefix', () => {
  const overlay = overlayAt([
    liveEntity('runtime.agent', 'windows', { tool: 'copilot', project: 'c:\\Projects\\Example\\', status: 'running' }),
    liveEntity('runtime.agent', 'posix', { tool: 'copilot-cli', project: '/home/user/Example', status: 'running' }),
    liveEntity('runtime.agent', 'unc', { tool: 'copilot-cli', project: '\\\\server\\share\\Example', status: 'running' }),
  ]);
  const select = (project: string, tools?: string[]) => overlay([], { project }, tools).map(agent => agent.id);
  expect(select('C:/PROJECTS/EXAMPLE', ['copilot-vscode'])).toEqual(['windows']);
  expect(select('file:///C%3A/Projects/Example/', ['copilot-vscode'])).toEqual(['windows']);
  expect(select('/home/user/example')).toEqual([]);
  expect(select('/home/user/Example')).toEqual(['posix']);
  expect(select('\\\\SERVER\\SHARE\\EXAMPLE\\')).toEqual(['unc']);
  expect(select('C:/Projects/Example', ['copilot-cli'])).toEqual([]);
  expect(select('all', [])).toEqual([]);
});

it('keeps a subagent status read from its transcript; only sessions wait for the runtime report', () => {
  const overlay = overlayAt([]);
  const agents = overlay([
    { id: 's', status: 'running' },
    { id: 'a1', parent_id: 's', status: 'running', status_evidence: 'last line 12 s ago' },
  ], {});
  expect(agents.map(agent => [agent.id, agent.status])).toEqual([['s', 'unknown'], ['a1', 'running']]);
});
