import type { BoardSource, FieldRef, PanelDef } from '../types'
import { loadRows } from '../kinds/adapters'

export const metric = (path: string, datapoint: string, label?: string): FieldRef => ({ path, datapoint, label })
export const field = (path: string, label: string): FieldRef => ({ path, label })
export const stamp = (path: string, label: string): FieldRef => ({ path, label, format: 'timestamp' })
const count = (path: string, label: string) => metric(path, 'board.kpi.tool_calls', label)
const token = (path: string, label: string) => metric(path, 'board.kpi.tokens', label)
const duration = (path: string, label: string, key = 'board.latency.tool'): FieldRef =>
  ({ ...metric(path, key, label), scale: 0.001 })
const money = (path: string, label: string) => metric(path, 'board.kpi.cost_usd', label)
const base = { defaultSize: 'large', requiredCapabilities: [], actions: [] } as const
export const buckets = { field: 'range', path: 'bucket_starts', wholeRange: true } as const
const history = (path: string): BoardSource => ({ field: 'series', path, wholeRange: true })
export const machine = { topic: 'runtime.machine', entity: 'local' } as const
export const processes = { topic: 'runtime.process' } as const
export const health = { topic: 'runtime.health', entity: 'local' } as const

export const breakdown = {
  errors: [metric('tool', 'board.kpi.failures', 'Tool failures'), metric('api', 'board.kpi.failures', 'API errors')],
  latency: [duration('p50', 'p50 reply', 'board.latency.reply'), duration('p95', 'p95 reply', 'board.latency.reply')],
  tests: [count('passed', 'Runs passed'), count('failed', 'Runs failed')],
}
const failures = history('failures')
const latency = history('latency')
const tests = history('tests')
const ram = history('mem')
const timeChart = (description: string, stack = false) => ({ x: buckets, description, time: true, select: true, stack })

export const overviewB: readonly PanelDef[] = [
  // The inventory needs grouped rows, folding and a scope-aware file preview.
  { ...base, id: 'inventory', title: 'Files each tool reads', kind: 'custom',
    sources: [{ field: 'agents' }, { field: 'tool_labels' }], empty: 'No files found for these tools.',
    columns: [field('name', 'File'), field('tool', 'Tool'), field('kind', 'Kind'), field('scope', 'Scope'),
      metric('size', 'files.item.size', 'Size'), metric('tokens', 'files.item.tokens', 'Tokens'),
      metric('sent_to_llm', 'files.item.sent_to_llm', 'Sent to model'), field('loaded_when', 'Loaded when'),
      stamp('mtime', 'Changed'), field('session_count', 'Sessions'), field('editor', 'Last editor')],
    load: () => import('./b/Context').then(m => ({ default: m.Inventory })) },
  // Lifetime totals need expandable per-tool model and error tables.
  { ...base, id: 'lifetime', title: 'Lifetime totals', kind: 'custom',
    sources: [{ field: 'tool_labels' }], empty: 'No tool reports lifetime totals.',
    columns: [field('label', 'Tool'), field('source', 'Source'), metric('as_of', 'board.context.lifetime_as_of', 'As of'),
      ...(['input', 'output', 'cache_read', 'cache_write', 'sessions', 'messages', 'cost_usd', 'premium_requests'] as const)
        .map(key => metric(key, `procs.tool.telemetry.${key === 'input' || key === 'output' ? `${key}_tokens` : key}`)),
      duration('quota.api_duration_ms', 'API time', 'procs.tool.telemetry.api_duration_ms'),
      field('cost_quality', 'Cost basis'), field('token_quality', 'Token quality')],
    load: () => import('./b/Context').then(m => ({ default: m.Lifetime })) },
  // A tool table needs drawer actions, trends and a separate unnamed-call count.
  { ...base, id: 'toolCalls', title: 'Tool calls', kind: 'custom', sources: [{ field: 'tools' }, { field: 'kpis', path: 'tool_calls' }],
    columns: [field('name', 'Tool'), field('mcp_server', 'MCP server'), count('calls', 'Calls'),
      metric('failed', 'board.kpi.failures', 'Failed'), metric('fail_rate', 'board.kpi.fail_rate', 'Failure rate'),
      duration('p50_ms', 'p50'), duration('p95_ms', 'p95'), duration('max_ms', 'Max'),
      { ...field('avg_output_bytes', 'Avg. result'), datapoint: 'files.item.size' }, field('trend', 'Calls by bucket')],
    empty: 'No tool calls in this time.', load: () => import('./b/History').then(m => ({ default: m.ToolCalls })) },
  // Confirmations combine outcome totals with separate pending and per-tool rows.
  { ...base, id: 'confirms', title: 'Tool confirmations', kind: 'custom', sources: [{ field: 'confirms' }],
    columns: [field('name', 'Tool'), count('auto', 'Auto approved'), count('approved', 'You approved'), count('denied', 'You denied'),
      count('blocked', 'Blocked by a rule'), field('median_wait_s', 'Median wait (s)')],
    empty: 'No confirmations in this time.', load: () => import('./b/History').then(m => ({ default: m.Confirmations })) },
  // Failure history needs a chart and a separate table of grouped error keys.
  { ...base, id: 'errors', title: 'Failures and errors', kind: 'chart', sources: [failures, { field: 'errors' }, buckets],
    columns: [field('key', 'Error'), field('sample', 'Example'), field('kind', 'Kind'),
      metric('count', 'board.kpi.failures', 'Count'), field('agents', 'Agents'), stamp('last_ts', 'Last')],
    chart: timeChart('Tool failures and API errors per bucket.', true),
    empty: 'No failures in this time.', load: () => import('./b/History').then(m => ({ default: m.HistoryBreakdown })) },
  // Latency needs a chart and a separate table of duration distributions.
  { ...base, id: 'latency', title: 'Latency and durations', kind: 'chart', sources: [latency, { field: 'latency' }, buckets],
    columns: [field('what', 'What'), count('count', 'Count'), duration('p50_ms', 'p50', 'board.latency.reply'),
      duration('p95_ms', 'p95', 'board.latency.reply'), duration('p99_ms', 'p99', 'board.latency.reply'),
      duration('max_ms', 'Max', 'board.latency.reply')],
    chart: timeChart('Model reply latency per bucket. Gaps indicate unreported data.'),
    empty: 'No durations in this time.', load: () => import('./b/History').then(m => ({ default: m.HistoryBreakdown })) },
  { ...base, id: 'loops', title: 'Loops', kind: 'table', defaultSize: 'medium', sources: [{ field: 'loops' }],
    rowIdentity: ['agent_id', 'pattern', 'since_ts'], actions: [{ kind: 'agent', field: 'agent_id', tab: 'errors' }],
    columns: [field('title', 'Agent'), field('status', 'Status'), field('pattern', 'What repeats'),
      metric('repeats', 'board.loop.row', 'Repeats'), token('tokens', 'Tokens spent'), money('cost_usd', 'Cost'), stamp('since_ts', 'Since')],
    empty: 'No loops in this time.', load: () => loadRows(import('./RowSummaries').then(m => m.loopOptions)) },
  // Changes pair the reported totals with a capped file table and source links.
  { ...base, id: 'changesT', title: 'Changes', kind: 'custom', sources: [{ field: 'changes' }],
    columns: [field('path', 'File'), field('project', 'Project'), metric('lines_added', 'board.project.lines', 'Added'),
      metric('lines_removed', 'board.project.lines', 'Removed'), count('edits', 'Edits'), field('agents', 'Agents'), stamp('last_ts', 'Last')],
    empty: 'No file changes in this time.', load: () => import('./b/History').then(m => ({ default: m.Changes })) },
  // Testing needs a chart, a command table and the pipe status caveat.
  { ...base, id: 'tests', title: 'Testing', kind: 'chart', sources: [tests, { field: 'tests' }, buckets, { field: 'tests_piped' }],
    columns: [field('command', 'Command'), count('runs', 'Runs'), count('failed', 'Failed'),
      duration('median_ms', 'Median', 'board.latency.turn'), field('state', 'Result'), stamp('last_ts', 'Last')],
    chart: timeChart('Reported pass and fail counts per bucket.', true),
    empty: 'No test runs in this time.', load: () => import('./b/History').then(m => ({ default: m.HistoryBreakdown })) },
  // The file table needs file drawer actions and a join to resolve editor names.
  { ...base, id: 'memfiles', title: 'Memory and instruction files', kind: 'custom',
    sources: [{ field: 'memory_files' }, { field: 'agents' }],
    columns: [field('path', 'File'), field('read_by', 'Read by'), field('scope', 'Where'), token('tokens', 'Tokens each call'),
      metric('lines_added', 'board.project.lines', 'Added'), metric('lines_removed', 'board.project.lines', 'Removed'),
      field('editor', 'Changed by'), stamp('changed_ts', 'When')],
    empty: 'No instruction or memory files found.', load: () => import('./b/History').then(m => ({ default: m.MemoryFiles })) },
  // CPU needs dynamic tool series, cross-tool totals and live whole-machine core bars.
  { ...base, id: 'cpu', title: 'CPU', kind: 'custom', sources: [history('cpu'), buckets, processes, machine],
    columns: [metric('cpu_percent', 'overview.cpu', 'CPU')], empty: 'No CPU samples.',
    load: () => import('./b/Machine').then(m => ({ default: m.ResourceHistory })) },
  // RAM needs dynamic tool series and a current or latest recorded cross-tool total.
  { ...base, id: 'ram', title: 'RAM', kind: 'chart', sources: [ram, buckets, processes],
    columns: [{ ...metric('mem_mb', 'overview.mem_mb', 'RAM'), scale: 1048576 }], empty: 'No RAM samples.',
    chart: timeChart('Resident memory by tool over time (MiB).'),
    load: () => import('./b/Machine').then(m => ({ default: m.ResourceHistory })) },
  // Alerts need PID-list cells, stopped-session filtering and copy actions.
  { ...base, id: 'alerts', title: 'Needs a look', kind: 'custom', defaultSize: 'medium',
    sources: [{ ...machine, path: 'alerts' }, { topic: 'runtime.agent' }],
    columns: [field('severity', 'Severity'), field('text', 'Finding'), field('detail', 'Detail'),
      field('tool', 'Tool'), field('pid_list', 'PIDs'), metric('action', 'board.machine.cleanup', 'Command')],
    empty: 'No process anomalies found on this node.', load: () => import('./b/Machine').then(m => ({ default: m.Alerts })) },
  // Processes need list/tree views, an owner join and local cleanup controls.
  { ...base, id: 'procs', title: 'Processes', kind: 'custom',
    sources: [processes, { ...machine, path: 'processes' }, { topic: 'runtime.agent' }, { field: 'agents' }],
    columns: [metric('name', 'board.machine.process_name', 'Process'), field('pid', 'PID'), field('tool', 'Tool'),
      field('owner', 'Agent'), metric('process_type', 'procs.tool.process_type', 'Type'), metric('ppid', 'board.machine.process_parent', 'Parent PID'),
      metric('anomaly_text', 'procs.tool.anomaly', 'Anomalies'), metric('zombie_risk', 'procs.tool.zombie_risk', 'Zombie risk'),
      metric('cpu_percent', 'procs.tool.cpu_pct', 'CPU'), { ...metric('mem_mb', 'procs.tool.mem_rss', 'RAM'), scale: 1048576 }],
    empty: 'No processes reported.', load: () => import('./b/Machine').then(m => ({ default: m.Processes })) },
  // Traffic switches between per-tool live metrics and per-node recorded host metrics.
  { ...base, id: 'traffic', title: 'Network, tokens and files', kind: 'custom', sources: [{ ...machine, path: 'monitor.per_tool' }],
    columns: [field('label', 'Tool or host'), metric('sessions', 'procs.tool.live.session_count', 'Sessions'),
      metric('pids', 'procs.tool.live.pid_count', 'Processes'), metric('inbound_bps', 'events.tool.live.inbound_rate_bps', 'Received'),
      metric('outbound_bps', 'events.tool.live.outbound_rate_bps', 'Sent'), metric('est_tokens', 'procs.tool.live.tokens', 'Tokens (estimate)'),
      metric('est_confidence', 'board.machine.traffic.token_confidence', 'Estimate confidence'), field('est_source', 'Estimate source'),
      metric('mcp_loop.detected', 'procs.tool.live.mcp_detected', 'MCP loop'), field('mcp_loop.loops', 'Loops'),
      metric('file_events', 'board.machine.traffic.file_events', 'File events'),
      metric('files_touched', 'procs.tool.live.files_touched', 'Files'), metric('cpu_pct', 'procs.tool.live.cpu', 'CPU'),
      metric('cpu_peak', 'procs.tool.live.cpu', 'Peak CPU'), metric('workspace_bytes', 'board.machine.traffic.workspace', 'Workspace size'),
      metric('workspace_list', 'procs.tool.live.workspaces', 'Workspaces')],
    empty: 'No traffic reports.', load: () => import('./b/Machine').then(m => ({ default: m.Traffic })) },
  // Daemon resources combine stats, helper rows and a Health navigation action.
  { ...base, id: 'daemon', title: 'aictl resources and history', kind: 'custom',
    sources: [{ field: 'self' }, { ...health, path: 'pipeline.self' }, { ...health, path: 'pipeline.stream' }],
    columns: [metric('cpu', 'self.cpu_percent', 'CPU'), metric('rss', 'self.memory_rss', 'RAM'),
      metric('uptime_s', 'self.uptime', 'Uptime'), metric('threads', 'self.threads', 'Threads'),
      metric('db_bytes', 'self.db_size', 'History size'), metric('db_rows', 'self.db_rows', 'History rows')],
    empty: 'No daemon resources reported.', load: () => import('./b/Machine').then(m => ({ default: m.Daemon })) },
  // Findings need scan progress, grouped places and action-specific controls.
  { ...base, id: 'findings', title: 'Hidden changes and conflicts', kind: 'custom', sources: [{ field: 'tool_labels' }],
    columns: [field('what', 'Finding'), field('severity', 'Severity'), field('tool', 'Tool'),
      field('whereFull', 'Where'), field('effect', 'Effect')],
    empty: 'No open findings.', load: () => import('./b/Effects').then(m => ({ default: m.Findings })) },
  // The settings matrix needs one column per selected tool and source actions.
  { ...base, id: 'settings', title: 'Values in force', kind: 'custom', sources: [{ field: 'options' }, { field: 'sources' }],
    columns: [field('label', 'Setting')], empty: 'No setting values reported.',
    load: () => import('./b/Effects').then(m => ({ default: m.Settings })) },
  // Coverage needs dynamic tool columns with both a state and its reason.
  { ...base, id: 'coverage', title: 'What each tool reports', kind: 'custom', sources: [{ field: 'coverage', path: 'rows' }, { field: 'options' }],
    columns: [field('label', 'Data')], empty: 'No coverage rows for the selected tools.',
    load: () => import('./b/Effects').then(m => ({ default: m.Coverage })) },
]
