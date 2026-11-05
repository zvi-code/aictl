// A /api/board response that follows the contract. Sample names only.
export const NOW = 1_800_000_000;
const H = 3600;
const starts = Array.from({ length: 24 }, (_, i) => NOW - (24 - i) * H);
const spark = (seed = 1) => Array.from({ length: 12 }, (_, i) => (i * seed) % 7);
const series = (seed = 1) => starts.map((_, i) => ((i * seed) % 9) * 10);
const agent = (o) => ({
  id: o.id, short: o.id.slice(0, 8), title: 'Untitled', parent_id: null, role: null, status: 'ended', tool: 'tool-a', project: 'alpha', models: ['model-a'],
  msgs: { user: 2, assistant: 8, tool: 6 }, input: 4200, output: 2000, cache_read: 8000, cache_write: 300, cached_share: 0.64, cost_usd: 0.12, tool_calls: 6, failures: 0,
  confirms_asked: 1, confirms_denied: 0, pending: null, cpu_percent: null, mem_mb: null, pids: null, started_at: NOW - 2 * H, ended_at: NOW - H, activity: spark(2), ...o,
});

export function boardFixture(overrides = {}) {
  return {
    generated_at: NOW,
    capture_mode: 'full',
    range: { since: starts[0], until: NOW, bucket_s: H, bucket_starts: starts },
    options: {
      tools: [{ id: 'tool-a', label: 'Tool A', agents: 3 }, { id: 'tool-b', label: 'Tool B', agents: 1 }],
      projects: [{ id: 'alpha', agents: 3 }, { id: 'beta', agents: 1 }],
      models: [{ id: 'model-a', agents: 3 }, { id: 'model-b', agents: 2 }],
    },
    scope: { shown_agents: 4, all_agents: 4 },
    kpis: {
      running: 2, subagents_running: 1, messages: 684, tokens: 2_540_000, cached_share: 0.8, cost_usd: 4, tool_calls: 389, failures: 62, fail_rate: 0.123,
      p50_ms: 1900, p95_ms: 4100, loops: 1, prev: { messages: 468, tokens: 1_690_000, cost_usd: 2.55, tool_calls: 265 },
      spark: { running: spark(1), messages: spark(2), tokens: spark(3), cached: spark(4), cost: spark(5), tool_calls: spark(6), failures: spark(1), p95: [1, null, 3, 4, null, 2, 1, 3, 4, 2, 1, 3], loops: spark(1) },
    },
    attention: [
      { kind: 'loop', agent_id: 'loop0001aaaa', title: 'Add contract tests', detail: 'edit_file, then pytest fails, 7 times', tokens: 157000, cost_usd: 0.15, since_ts: NOW - 900 },
      { kind: 'waiting', agent_id: 'wait0001aaaa', title: 'Review the login page', detail: 'Confirm run_command: npm run lint', tokens: 0, cost_usd: 0, since_ts: NOW - 180 },
    ],
    agents: [
      agent({ id: 'run00001aaaa', title: 'Fix retry logic', status: 'running', cpu_percent: 4.2, mem_mb: 318, pids: 3, ended_at: null }),
      agent({ id: 'sub00001aaaa', title: 'test-runner', role: 'test-runner', parent_id: 'run00001aaaa', status: 'running', ended_at: null }),
      agent({ id: 'loop0001aaaa', title: 'Add contract tests', status: 'looping', failures: 11, tool: 'tool-b', project: 'beta', cpu_percent: 9.6, mem_mb: 742, models: ['model-a', 'model-b'], ended_at: null }),
      agent({ id: 'wait0001aaaa', title: 'Review the login page', status: 'waiting', cpu_percent: 0.4, mem_mb: 204, pending: { name: 'run_command', target: 'npm run lint', since_ts: NOW - 180 }, ended_at: null }),
      agent({ id: 'done0001aaaa', title: 'Draft the release notes', status: 'ended', cost_usd: null, input: null, cached_share: null }),
    ],
    by_model: [
      { model: 'model-a', agents: 3, msgs: 305, tokens: 1_120_000, input: 160000, output: 72000, cache_read: 812000, cache_write: 75000, cached_share: 0.78, cost_usd: 2.09, p95_ms: 4000, agent_ids: ['run00001aaaa', 'loop0001aaaa'] },
      { model: 'model-b', agents: 2, msgs: 147, tokens: 615000, input: 72000, output: 28000, cache_read: 515000, cache_write: null, cached_share: 0.88, cost_usd: 0.76, p95_ms: 3900, agent_ids: ['loop0001aaaa'] },
    ],
    by_role: [
      { kind: 'Main agents', runs: 4, msgs: 592, tokens: 2_300_000, cost_usd: 3.57, fail_rate: 0.122 },
      { kind: 'test-runner', runs: 1, msgs: 32, tokens: 100000, cost_usd: 0.08, fail_rate: 0.059 },
    ],
    series: {
      tokens: { cache_read: series(3), input: series(2), cache_write: series(1), output: series(4) },
      cost: { by_tool: { 'tool-a': series(1), 'tool-b': series(2) }, by_project: { alpha: series(1), beta: series(3) }, by_model: { 'model-a': series(2), 'model-b': series(3) } },
      messages: { user: series(1), assistant: series(2), tool: series(3) },
      cached_share: starts.map((_, i) => (i % 5 === 0 ? null : 0.7)),
      latency: { p50: starts.map((_, i) => (i % 6 === 0 ? null : 1000 + i * 40)), p95: starts.map((_, i) => (i % 6 === 0 ? null : 3000 + i * 90)) },
      failures: { tool: series(1), api: series(2) },
      tests: { passed: series(1), failed: series(2) },
      cpu: { 'tool-a': starts.map((_, i) => (i < 3 ? null : 5 + i / 4)) },
      mem: { 'tool-a': starts.map((_, i) => (i < 3 ? null : 400 + i * 10)) },
    },
    saved_usd: 1.23,
    projects: [
      { project: 'alpha', agents: 3, prompts: 12, msgs: 300, tokens: 900000, cached_share: 0.71, cost_usd: 2.2, tool_calls: 180, fail_rate: 0.1, test_runs: 8, test_passed: 6, lines_added: 714, lines_removed: 350, api_errors: 2, loops: 1, p95_ms: 4000 },
      { project: 'beta', agents: 1, prompts: 4, msgs: 80, tokens: 200000, cached_share: null, cost_usd: null, tool_calls: 40, fail_rate: 0, test_runs: 0, test_passed: 0, lines_added: null, lines_removed: null, api_errors: 0, loops: 0, p95_ms: null },
    ],
    prompts: [{ ts: NOW - 60, agent_id: 'run00001aaaa', project: 'alpha', text: 'Fix retry logic. Run the tests when you finish.', prompt_file: '.github/prompts/fix-tests.prompt.md', tokens: 8100 }],
    project_prompts: [{ file: '.github/prompts/fix-tests.prompt.md', project: 'alpha', uses: 1, last_ts: NOW - 60 }, { file: '.claude/commands/deploy.md', project: 'beta', uses: 0, last_ts: null }],
    skills: [{ name: 'run-tests', uses: 4, tokens: 7000, agents: 2 }],
    tools: [{ name: 'read_file', server: false, calls: 130, failed: 1, fail_rate: 0.008, p50_ms: 120, p95_ms: 240, max_ms: 400, trend: spark(3) }, { name: 'github.search', server: true, calls: 8, failed: 2, fail_rate: 0.25, p50_ms: null, p95_ms: null, max_ms: null, trend: spark(1) }],
    confirms: { asked: 20, auto: 60, approved: 17, denied: 3, p95_wait_s: 33, pending: [{ agent_id: 'wait0001aaaa', name: 'run_command', target: 'npm run lint', since_ts: NOW - 180 }], by_tool: [{ name: 'run_command', auto: 30, approved: 10, denied: 2, median_wait_s: 8 }, { name: 'edit_file', auto: 30, approved: 7, denied: 1, median_wait_s: null }] },
    errors: [{ key: 'run_command failed', kind: 'Tool', count: 9, agents: 2, last_ts: NOW - 40, sample: 'pytest test/test_client.py' }, { key: 'Rate limited (429)', kind: 'API', count: 2, agents: 1, last_ts: NOW - 500, sample: 'Rate limited' }],
    latency: [{ what: 'Model reply', count: 300, p50_ms: 1900, p95_ms: 4100, p99_ms: 5000, max_ms: 8000 }, { what: 'Time to first token', count: null, p50_ms: null, p95_ms: null, p99_ms: null, max_ms: null }],
    loops: [{ agent_id: 'loop0001aaaa', title: 'Add contract tests', status: 'looping', pattern: 'edit_file, then pytest fails', repeats: 7, tokens: 157000, cost_usd: 0.15, since_ts: NOW - 900 }],
    changes: { files: [{ path: 'src/client.py', project: 'alpha', lines_added: 40, lines_removed: 12, edits: 3, agents: 1, last_ts: NOW - 300 }, { path: 'src/other.py', project: 'alpha', lines_added: null, lines_removed: null, edits: 1, agents: 1, last_ts: NOW - 600 }], totals: { files: 2, lines_added: 40, lines_removed: 12, edits: 4 } },
    tests: [{ command: 'pytest test/test_client.py', runs: 8, failed: 2, median_ms: 21000, state: 'Flaky', last_ts: NOW - 200 }],
    memory_files: [{ path: 'CLAUDE.md', read_by: 'Tool A', scope: 'Repository', tokens: 1200, lines_added: 12, lines_removed: 2, changed_by: 'run00001aaaa', changed_ts: NOW - 700 }, { path: '~/.config/instructions.md', read_by: 'Tool B', scope: 'User folder', tokens: 3400, lines_added: null, lines_removed: null, changed_by: null, changed_ts: null }],
    processes: [{ name: 'node', pid: 4100, tool: 'tool-a', agent_id: 'run00001aaaa', title: 'Fix retry logic', cpu_percent: 2.2, mem_mb: 180 }],
    sources: [{ tool: 'tool-a', label: 'Tool A', data_from: 'Session files, hooks', last_data_ts: NOW - 2 }, { tool: 'tool-b', label: 'Tool B', data_from: 'Nothing found on this machine', last_data_ts: null }],
    coverage: { rows: [{ key: 'tokens', label: 'Input, output and cache read tokens', cells: { 'tool-a': { state: 'Exact', why: 'Reported.' }, 'tool-b': { state: 'Partial', why: 'Some calls only.' } } }] },
    self: { cpu_percent: 0.3, memory_rss_bytes: 96_000_000, children: [{ pid: 9, name: 'helper', cpu_percent: 0.1, memory_rss_bytes: 18_000_000 }], history_bytes: 640_000_000, history_limit_bytes: 1_000_000_000, retention_days: 30 },
    ...overrides,
  };
}

export function agentDetailFixture(id = 'run00001aaaa') {
  const board = boardFixture();
  const a = board.agents.find(x => x.id === id) || board.agents[0];
  return {
    agent: a,
    by_model: [{ model: 'model-a', msgs: 10, input: 4200, output: 2000, cache_read: 8000, cache_write: 300, cost_usd: 0.12 }],
    subagents: board.agents.filter(x => x.parent_id === a.id),
    process: { cpu_percent: a.cpu_percent, mem_mb: a.mem_mb, pids: a.pids, started_at: a.started_at },
    turns: [{ ts: NOW - 100, text: 'Fix it', tools: ['read_file', 'edit_file'], model: 'model-a', input: 100, output: 50, cache_read: 400, reply_ms: 1200 }],
    tool_calls: [{ ts: NOW - 90, name: 'edit_file', target: 'src/client.py', duration_ms: 300, failed: false, confirm: 'auto' }],
    files: [{ path: 'src/client.py', lines_added: 4, lines_removed: 1, edits: 1 }],
    tests: [{ ts: NOW - 80, command: 'pytest', passed: false, duration_ms: 21000 }],
    loop: null,
    errors: [{ ts: NOW - 80, key: 'run_command failed', detail: 'pytest' }],
  };
}

export const fileDetailFixture = (path = 'src/client.py') => ({
  path,
  edits: [{ ts: NOW - 300, agent_id: 'run00001aaaa', title: 'Fix retry logic', lines_added: 4, lines_removed: 1 }],
  diff: [{ kind: 'same', n: 84, text: 'attempt = 0' }, { kind: 'add', n: 85, text: 'deadline = now()' }, { kind: 'del', n: 86, text: 'timeout = 1' }],
});
