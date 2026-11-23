import { expect, it } from 'vitest';
import { overlayAgents, statusText, unlinkedProcesses } from '../src/data/runtimeAgents';
import { noActivity } from '../src/panels/overview/agentTree';
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

it('never lists a process that no evidence links to a session as a session row', () => {
  const overlay = overlayAt([
    liveEntity('runtime.agent', 'claw', { id: 'openclaw:58913:1795359706.66', session_id: 'openclaw:58913:1795359706.66',
      native_session_id: null, tool: 'openclaw', pids: [58913], running: true, status: 'unknown', started_at: 100,
      unlinked_reason: 'aictl has no session source for this tool' }),
    liveEntity('runtime.agent', 'bound', { id: '062629b0-4651-4769-a3d8-3d9a1ed0735f', session_id: '062629b0-4651-4769-a3d8-3d9a1ed0735f',
      native_session_id: '062629b0-4651-4769-a3d8-3d9a1ed0735f', tool: 'claude-code', project: '/Users/me/Projects',
      pids: [98891, 98892], running: true, status: 'idle', unlinked_reason: null }),
  ]);
  const agents = overlay([{ id: 's', status: 'ended' }], {});
  expect(agents.map(agent => agent.id).sort()).toEqual(['062629b0-4651-4769-a3d8-3d9a1ed0735f', 's']);
  const bound = agents.find(agent => agent.id.startsWith('0626'))!;
  // A bound session without a record: not named by its raw id, and one note in place of every missing number.
  expect(bound).toMatchObject({ status: 'idle', queryable: false, short: '062629b0' });
  expect(bound.title).toBeFalsy();
  expect(String(bound.no_history)).toMatch(/^No activity recorded in the selected time/);

  const { store, bootstrap, tick } = storeHarness();
  bootstrap([liveEntity('runtime.agent', 'claw', { id: 'openclaw:1:2', session_id: 'openclaw:1:2', native_session_id: null,
    tool: 'openclaw', pids: [1], cpu_percent: 0.5, mem_mb: 40, unlinked_reason: 'aictl has no session source for this tool' })]);
  tick();
  const rows = [...(store.topic('runtime.agent')?.values() ?? [])];
  expect(unlinkedProcesses([], rows)).toEqual([{ id: 'openclaw:1:2', tool: 'openclaw', pids: [1], cpu_percent: 0.5, mem_mb: 40,
    reason: 'aictl has no session source for this tool', project: undefined, started_at: undefined }]);
  // A process the history knows under that id is a recorded session, not an unlinked process.
  expect(unlinkedProcesses([{ id: 'openclaw:1:2' }], rows)).toEqual([]);
});

it('keeps a live agent that reports the selected model under another spelling of its id', () => {
  const live = (models: string[]) => [{ id: 'copilot:1', data: { id: 'copilot:1', tool: 'copilot-cli', pids: [1], models,
    unlinked_reason: 'aictl has no session source for this tool' } }];
  // Copilot reports claude-opus-5.5, Claude Code claude-opus-5-5: the Model menu holds the one canonical id.
  expect(unlinkedProcesses([], live(['claude-opus-5.5']), { model: 'claude-opus-5-5' }).map(p => p.id)).toEqual(['copilot:1']);
  expect(unlinkedProcesses([], live(['claude-opus-5-5']), { model: 'claude-opus-5.5' }).map(p => p.id)).toEqual(['copilot:1']);
  // A different version or model is still not that model.
  expect(unlinkedProcesses([], live(['claude-opus-5']), { model: 'claude-opus-5-5' })).toEqual([]);
  expect(unlinkedProcesses([], live(['gpt-5.5']), { model: 'claude-opus-5-5' })).toEqual([]);
  expect(unlinkedProcesses([], live(['gpt-5.5']), { model: 'gpt-5.5' }).map(p => p.id)).toEqual(['copilot:1']);
});

it('hides sessions with no activity by default and counts them', () => {
  const empty = { id: 'p1', queryable: true, status: 'ended', msgs: { user: 0, assistant: 0, tool: null }, tool_calls: 0 };
  expect(noActivity(empty, false)).toBe(true);
  expect(noActivity({ ...empty, tool_calls: 1 }, false)).toBe(false);
  expect(noActivity({ ...empty, msgs: { assistant: 2 } }, false)).toBe(false);
  expect(noActivity({ ...empty, status: 'idle' }, false)).toBe(false);
  expect(noActivity(empty, true)).toBe(false);
  expect(noActivity({ ...empty, parent_id: 's' }, false)).toBe(false);
  expect(noActivity({ ...empty, queryable: false }, false)).toBe(false);
  const rows = [empty, { ...empty, id: 'p2' }, { id: 's', queryable: true, status: 'ended', msgs: { assistant: 3 } }];
  const hidden = rows.filter(row => noActivity(row, false));
  expect([hidden.length, rows.length - hidden.length]).toEqual([2, 1]);
});
