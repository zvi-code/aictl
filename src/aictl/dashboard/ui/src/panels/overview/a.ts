import type { PanelDef } from '../types'
import { loadRows, loadSeries } from '../kinds/adapters'
import { bucketAxis, cost, count, field, messageColumns, stamp, tokens } from './aFields'

const flow = { kind: 'agent', field: 'id', tab: 'flow' } as const
const context = (path: string) => ({ route: '/api/board/context', path }) as const
const share = (path = 'cached_share', label = 'Cached share') => field(path, label, 'board.kpi.cached_share')
const agentMetric = (path: string, label: string, key: string) => field(path, label, `board.agent.${key}`)

export const overviewA: readonly PanelDef[] = [
  {
    // The time series, ranked totals and failure rate share a scope, not an axis or row identity.
    id: 'agentActivity', title: 'Recorded agent activity', kind: 'custom', defaultSize: 'medium', requiredCapabilities: [],
    sources: [{ field: 'series', path: 'messages' }, { field: 'range' }, { field: 'by_model' }, { field: 'scope' }, { field: 'kpis' }],
    columns: messageColumns, actions: [{ kind: 'filter', field: 'model', filter: 'model', label: 'Filter by model' }],
    load: () => import('./AgentActivity'),
  },
  {
    // A tree of sessions and the subagents they started; the generic table cannot show kind, chips and evidence.
    id: 'agentsT', title: 'Agents and subagents', kind: 'custom', defaultSize: 'large', requiredCapabilities: [],
    sources: [{ field: 'agents' }, { topic: 'runtime.agent' }, { field: 'scope' }, { field: 'tool_labels' }, { route: '/api/board/nodes' }],
    columns: [
      field('title', 'Agent'), { ...agentMetric('status', 'Status', 'status'), hint: 'status_evidence' },
      field('status_evidence', 'Status evidence'), agentMetric('tool', 'Tool', 'tool'),
      agentMetric('messages', 'Messages', 'msgs'),
      agentMetric('tool_calls', 'Tool calls', 'tool_calls'), agentMetric('failures', 'Failures', 'failures'),
      agentMetric('project', 'Project', 'project'), agentMetric('model_names', 'Models', 'model'),
      agentMetric('input', 'Input', 'input'), agentMetric('output', 'Output', 'output'),
      tokens('cache_read', 'Cache read'), tokens('cache_write', 'Cache write'), share(), cost(),
      agentMetric('confirms_asked', 'Confirmations asked', 'confirms_asked'),
      count('confirms_denied', 'Confirmations denied', 'board.agent.confirms_asked'),
      agentMetric('cpu_percent', 'CPU', 'cpu'), { ...agentMetric('mem_mb', 'RAM', 'mem'), scale: 1048576 },
      field('pid_text', 'PIDs'), agentMetric('duration', 'Duration', 'duration'),
      agentMetric('activity_total', 'Activity', 'activity'),
    ],
    actions: [{ ...flow, when: row => row.queryable === true }],
    empty: 'No individual agent records match these filters.', load: () => import('./AgentsTree'),
  },
  {
    id: 'byModel', title: 'Usage by model', kind: 'table', defaultSize: 'medium', requiredCapabilities: [],
    sources: [{ field: 'by_model' }, { field: 'agents' }],
    columns: [agentMetric('model', 'Model', 'model'), count('agents', 'Agents', 'board.project.agents'),
      tokens('tokens', 'Tokens'), cost(), count('msgs', 'Calls'), tokens('input', 'Input'), tokens('output', 'Output'),
      tokens('cache_read', 'Cache read'), tokens('cache_write', 'Cache write'), share(),
      { ...field('p95_ms', 'p95 reply', 'board.kpi.p95_ms'), scale: 0.001 }],
    actions: [{ ...flow, field: 'agent_id' }, { kind: 'filter', field: 'model', filter: 'model', label: 'Toggle model filter' }],
    rowIdentity: ['model'], empty: 'No model usage reported.', load: () => loadRows(import('./agentRows').then(m => m.modelRows)),
  },
  {
    id: 'byRole', title: 'Main agents and subagents', kind: 'table',
    defaultSize: 'medium', requiredCapabilities: [], sources: [{ field: 'by_role' }],
    columns: [field('kind', 'Kind of agent'), count('runs', 'Runs'), field('tokens', 'Tokens', 'board.role.row'),
      count('msgs', 'Messages'), cost(), field('fail_rate', 'Tool failure rate', 'board.kpi.fail_rate')],
    actions: [], rowIdentity: ['kind'], empty: 'No role aggregates reported.',
    load: () => loadRows(import('./agentRows').then(m => m.roleRows)),
  },
  {
    // Paging and debounced search need a request controller that a table does not provide.
    id: 'sessionsT', title: 'Find a session', kind: 'custom', defaultSize: 'large', requiredCapabilities: [],
    sources: [{ route: '/api/board/sessions' }, { field: 'tool_labels' }],
    columns: [field('title', 'Title'), field('named_by', 'Named by'), field('short_id', 'Id'),
      agentMetric('tool', 'Tool', 'tool'), agentMetric('project', 'Project', 'project'),
      field('model', 'Model'), stamp('started_at', 'Started'), stamp('ended_at', 'Ended'), agentMetric('duration', 'Duration', 'duration'),
      tokens('tokens', 'Tokens'), cost(), count('tool_calls', 'Tool calls', 'board.kpi.tool_calls'),
      count('prompts', 'Prompts', 'board.prompt.total'), count('artifacts', 'Artifacts'), count('commits', 'Commits')],
    actions: [flow], load: () => import('./Sessions'),
  },
  {
    id: 'kpis', title: 'Overview summary', kind: 'custom',
    sources: [{ field: 'kpis' }, { field: 'by_model' }, { topic: 'runtime.agent' }],
    columns: [], actions: [], defaultSize: 'medium', requiredCapabilities: [],
    load: () => import('./Kpis'),
  },
  {
    id: 'attention', title: 'Needs you now', kind: 'table', sources: [{ field: 'attention' }],
    columns: [
      { path: 'title', label: 'Agent' }, { path: 'detail', label: 'What needs attention' },
      { path: 'since_ts', label: 'Since', format: 'timestamp' },
      { path: 'cost_usd', label: 'Cost', datapoint: 'board.kpi.cost_usd' },
    ],
    rowIdentity: ['kind', 'agent_id', 'since_ts'],
    actions: [{ kind: 'agent', field: 'agent_id', tabs: { field: 'kind', values: { waiting: 'tools', wait: 'tools', loop: 'errors' } },
      tab: 'errors', excludeStopped: true }],
    defaultSize: 'small', requiredCapabilities: [],
    load: () => loadRows(import('./RowSummaries').then(m => m.attentionOptions)),
  },
  {
    id: 'tokens', title: 'Tokens, cached and not cached', kind: 'chart',
    sources: [{ field: 'series', path: 'tokens', wholeRange: true }],
    columns: [
      { path: 'cache_read', label: 'Cache read', datapoint: 'board.kpi.tokens' },
      { path: 'input', label: 'Input', datapoint: 'board.kpi.tokens' },
      { path: 'cache_write', label: 'Cache write', datapoint: 'board.kpi.tokens' },
      { path: 'output', label: 'Output', datapoint: 'board.kpi.tokens' },
    ],
    actions: [], defaultSize: 'large', requiredCapabilities: [], empty: 'No token samples.',
    chart: { x: { field: 'range', path: 'bucket_starts', wholeRange: true },
      description: 'Tokens per time bucket. Gaps indicate unreported data.', time: true, stack: true, select: true },
  },
  {
    id: 'cacheRate', title: 'Cache hit rate', kind: 'chart', defaultSize: 'large', requiredCapabilities: [],
    sources: [{ field: 'series', path: 'cached_share', wholeRange: true }, { field: 'kpis' }, { field: 'saved_usd' }],
    columns: [field('', 'Cached share of input', 'board.series.cache_rate')], actions: [],
    empty: 'No cache rate samples.', load: () => loadSeries(import('./cacheOptions').then(m => m.cacheOptions)),
    chart: { x: bucketAxis, description: 'Share of input served from cache.', time: true, select: true, namedControls: true },
  },
  {
    id: 'cost', title: 'Cost', kind: 'chart', defaultSize: 'large', requiredCapabilities: [],
    sources: [{ field: 'series', path: 'cost', wholeRange: true }, { field: 'kpis' }, { field: 'unpriced' },
      { field: 'credits' }, { field: 'tool_labels' }],
    columns: [field('by_tool', 'Tool', 'board.series.cost'), field('by_project', 'Project', 'board.series.cost'),
      field('by_model', 'Model', 'board.series.cost')], actions: [],
    empty: 'No cost samples.', load: () => loadSeries(import('./usageOptions').then(m => m.costOptions)),
    chart: { x: bucketAxis, description: 'List price per time bucket. This is not a bill.', time: true, stack: true, select: true, namedControls: true },
  },
  {
    id: 'messages', title: 'Messages', kind: 'chart', defaultSize: 'large', requiredCapabilities: [],
    sources: [{ field: 'series', path: 'messages', wholeRange: true }, { field: 'kpis' }, { field: 'scope' }],
    columns: messageColumns,
    actions: [], empty: 'No message samples.', load: () => loadSeries(import('./usageOptions').then(m => m.messagesOptions)),
    chart: { x: bucketAxis, description: 'Messages by role per time bucket.', time: true, stack: true, select: true, namedControls: true },
  },
  {
    id: 'projects', title: 'Projects', kind: 'table', defaultSize: 'medium', requiredCapabilities: [],
    sources: [{ field: 'projects' }], rowIdentity: ['project'],
    columns: [
      field('project', 'Project'), count('agents', 'Agents', 'board.project.agents'), count('prompts', 'Prompts', 'board.project.prompts'),
      count('msgs', 'Messages', 'board.project.msgs'), field('tokens', 'Tokens', 'board.project.tokens'),
      field('cached_share', 'Cached share', 'board.project.cached'), field('cost_usd', 'Cost', 'board.project.cost'),
      count('tool_calls', 'Tool calls', 'board.project.tool_calls'), field('fail_rate', 'Tool failure rate', 'board.project.tool_fail'),
      count('test_passed', 'Tests passed', 'board.project.tests'), count('test_runs', 'Test runs', 'board.project.tests'),
      count('lines_added', 'Lines added', 'board.project.lines'), count('lines_removed', 'Lines removed', 'board.project.lines'),
      count('api_errors', 'API errors', 'board.project.api_errors'), count('loops', 'Loops', 'board.project.loops'),
      { ...field('p95_ms', 'p95 reply', 'board.project.p95'), scale: 0.001 },
    ],
    actions: [{ kind: 'filter', field: 'project', filter: 'project', label: 'Toggle project filter' }], empty: 'No projects match these filters.',
  },
  {
    id: 'promptsL', title: 'Prompts', kind: 'list', defaultSize: 'medium', requiredCapabilities: [],
    sources: [{ field: 'prompts' }, { field: 'capture_mode' }, { field: 'prompts_total' }], rowIdentity: ['id', 'session_id', 'agent_id'],
    columns: [field('text', 'Prompt'), stamp('ts', 'Time'), field('project', 'Project'), tokens('tokens', 'Tokens'),
      field('prompt_file', 'Prompt file')],
    actions: [{ kind: 'detail', field: 'session_id', type: 'prompt' }], empty: 'No prompts match these filters.',
    load: () => loadRows(import('./usageOptions').then(m => m.promptOptions)),
  },
  {
    id: 'skills', title: 'Skills used', kind: 'table', defaultSize: 'medium', requiredCapabilities: [],
    sources: [{ field: 'skills' }], rowIdentity: ['name'],
    columns: [field('name', 'Skill'), field('scope', 'Scope'), count('agents', 'Agents', 'board.project.agents'),
      count('uses', 'Uses', 'board.skill.row'), tokens('tokens', 'Turn tokens')],
    actions: [{ kind: 'detail', field: 'name', type: 'skill' }], empty: 'No skill was used in this time.',
    load: () => loadRows(import('./usageOptions').then(m => m.skillOptions)),
  },
  {
    id: 'workflows', title: 'Workflows and prompt files', kind: 'table', defaultSize: 'medium', requiredCapabilities: [],
    sources: [context('workflows')], rowIdentity: ['path'],
    // Files of one name in several repositories differ by Project; the full path is the name's hint.
    columns: [{ ...field('name', 'Name'), hint: 'path' }, field('project', 'Project'), field('type', 'Type'), field('tool', 'Tool'),
      field('tokens', 'File tokens', 'board.context.file'), stamp('mtime', 'Changed')],
    actions: [{ kind: 'detail', field: 'path', type: 'file' }], empty: 'No workflow or prompt files found.',
    load: () => loadRows(import('./contextOptions').then(m => m.workflowOptions)),
  },
  {
    id: 'budget', title: 'Context window budget', kind: 'table', defaultSize: 'medium', requiredCapabilities: [],
    sources: [context('budget.tools')], rowIdentity: ['tool'],
    columns: [field('label', 'Tool or project'), field('model', 'Model'), field('window', 'Token window', 'board.context.window'),
      field('policy', 'Model and limit from'), field('always', 'Always loaded', 'budget.context_window.always_loaded'),
      share('always_share', 'Always loaded share'), field('on_demand', 'On demand', 'budget.context_window.on_demand'),
      field('conditional', 'Conditional', 'budget.context_window.conditional'), field('cacheable', 'Cacheable', 'budget.context_window.cacheable'),
      tokens('max_potential', 'Max potential'), share('potential_share', 'Potential share')],
    actions: [], empty: 'No tool reported a file it loads into the model.', load: () => loadRows(import('./contextOptions').then(m => m.budgetOptions)),
  },
  {
    // Category bars select a related file table and an independent file preview.
    id: 'tokenSplit', title: 'Tokens by category', kind: 'custom', defaultSize: 'large', requiredCapabilities: [],
    sources: [context('categories'), context('files')],
    columns: [field('name', 'File'), field('project', 'Project'), field('tokens', 'File tokens', 'board.context.file'),
      field('load', 'Loaded'), stamp('mtime', 'Changed')],
    actions: [{ kind: 'detail', field: 'path', type: 'file' }], empty: 'No file a tool loads into the model was reported.',
    load: () => import('./TokenSplit'),
  },
  {
    // The map uses segmented bars and a linked project file table.
    id: 'ctxMap', title: 'Context window map', kind: 'custom', defaultSize: 'large', requiredCapabilities: [],
    sources: [context('map.rows'), context('map.items'), context('map.total')],
    columns: [field('name', 'File'), field('kind', 'Category'), field('tokens', 'File tokens', 'board.context.map_item')],
    actions: [], empty: 'No file a tool loads into the model was reported.', load: () => import('./ContextMap'),
  },
  {
    // Memory combines an independent trend with a folded file inventory and file preview.
    id: 'memory', title: 'Agent memory', kind: 'custom', defaultSize: 'large', requiredCapabilities: [],
    sources: [context('memory.entries'), context('memory.growth'), context('memory.tokens')],
    columns: [field('name', 'File or group'), field('tokens', 'Memory tokens', 'memory.entry.tokens'),
      count('lines', 'Lines', 'board.project.lines'), stamp('mtime', 'Changed')],
    actions: [{ kind: 'detail', field: 'file', type: 'file' }], empty: 'No agent memory files were reported.',
    load: () => import('./Memory'),
  },
  {
    id: 'dailyModels', title: 'Daily usage by model', kind: 'chart', defaultSize: 'large', requiredCapabilities: [],
    sources: [context('daily.rows')], columns: [
      field('date', 'Day'), field('model', 'Model'), count('requests', 'Calls'), tokens('input', 'Input'),
      tokens('output', 'Output'), tokens('cache_read', 'Cache read'), tokens('cache_write', 'Cache write'),
      field('tokens', 'Tokens', 'board.context.daily_row'), cost(),
    ],
    actions: [], empty: 'No model calls in the last seven days.', load: () => loadSeries(import('./contextOptions').then(m => m.dailyOptions)),
    chart: { x: context('daily.days'), description: 'Usage per calendar day, independent of the board time range.',
      time: true, stack: true, namedControls: true },
  },
]
