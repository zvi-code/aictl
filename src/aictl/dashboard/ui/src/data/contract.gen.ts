// Generated from dashboard/contract. Do not edit. Run npm run gen:contract.
// Schema digest: f4d9710b2f8a569ca3eff112a1686132f973b60ac595ec17106674dbe6116890

export const CONTRACT_VERSION = 1 as const;

export type BoardAgentRow = {
  id: string;
  short: string;
  title: string;
  parent_id: string | null;
  role: string | null;
  status: string;
  tool: string;
  project: string;
  models: Array<string>;
  primary_model?: string | null;
  input: number | null;
  output: number | null;
  cache_read: number | null;
  cache_write: number | null;
  cached_share: number | null;
  cost_usd: number | null;
  tool_calls: number | null;
  failures: number | null;
  confirms_asked: number | null;
  confirms_denied: number | null;
  started_at: number | null;
  ended_at: number | null;
  activity: Array<number>;
  placeholder?: boolean;
  status_evidence?: string | null;
  end_reason?: string;
  node_id?: string;
  native_id?: string;
  session_id?: string;
  native_session_id?: string;
  msgs: {
    user: number | null;
    assistant: number | null;
    tool: number | null;
  };
  pending: PendingConfirmation | null;
  cpu_percent: number | null;
  mem_mb: number | null;
  pids: Array<number>;
  kind?: "main" | "subagent";
  name_source?: string | null;
  prompt_line?: string | null;
  agent_type?: string | null;
  model_alias?: string | null;
  resolved_model?: string | null;
  description?: string | null;
  spawned_at?: number | null;
  spawned_by?: string | null;
  last_activity_at?: number | null;
  now?: string | null;
  subagent_count?: number;
  subagents_running?: number;
  subagents_live?: number;
  main_input?: number | null;
  main_output?: number | null;
  main_cost_usd?: number | null;
  main_tool_calls?: number | null;
  main_failures?: number | null;
  includes_subagents?: boolean;
};

export type BoardAgents = Array<BoardAgentRow>;

export type BoardAttention = Array<{
  kind: string;
  agent_id: string;
  title: string;
  detail: string;
  tokens: number | null;
  cost_usd: number | null;
  since_ts: number;
}>;

export type BoardByModel = Array<{
  model: string;
  reported_as?: Array<{
    id: string;
    tools: Array<string>;
  }>;
  agents: number;
  msgs: number;
  tokens: number;
  input: number | null;
  output: number | null;
  cache_read: number | null;
  cache_write: number | null;
  cached_share: number | null;
  cost_usd: number | null;
  p95_ms: number | null;
  agent_ids: Array<string>;
}>;

export type BoardByRole = Array<{
  kind: string;
  runs: number;
  msgs: number;
  tokens: number;
  cost_usd: number | null;
  fail_rate: number | null;
}>;

export type BoardCaptureMode = string | null;

export type BoardChanges = {
  files: Array<{
    path: string;
    project: string;
    lines_added: number | null;
    lines_removed: number | null;
    edits: number;
    sessions?: number;
    last_ts: number;
    node_id?: string;
    record?: string;
  }>;
  totals: {
    files: number;
    lines_added: number | null;
    lines_removed: number | null;
    edits: number;
  };
};

export type BoardConfirms = {
  asked: number | null;
  blocked: number | null;
  auto: number | null;
  approved: number | null;
  denied: number | null;
  p95_wait_s: number | null;
  pending: Array<{
    agent_id: string;
    name: string;
    target: string | null;
    since_ts: number;
  }>;
  by_tool: Array<{
    name: string;
    auto: number;
    approved: number;
    denied: number;
    blocked: number;
    median_wait_s: number | null;
  }>;
};

export type BoardCoverage = {
  rows: Array<{
    key: string;
    label: string;
    cells: Record<string, {
      state: string;
      why: string;
    }>;
  }>;
  notes: Array<{
    tool: string;
    text: string;
  }>;
};

export type BoardCredits = {
  amount: number | null;
  by_tool: Record<string, number>;
  approximate: boolean;
  unit: "ai_credits";
} | null;

export type BoardErrors = Array<{
  key: string;
  kind: string;
  count: number;
  agents: number;
  last_ts: number | null;
  sample: string | null;
}>;

export type BoardGeneratedAt = number;

export type BoardKpis = {
  running: number;
  idle: number;
  subagents_running: number;
  messages: number;
  tokens: number;
  cached_share: number | null;
  cost_usd: number | null;
  tool_calls: number | null;
  failures: number | null;
  fail_rate: number | null;
  p50_ms: number | null;
  p95_ms: number | null;
  loops: number;
  prev: {
    messages: number | null;
    tokens: number | null;
    cost_usd: number | null;
    tool_calls: number | null;
  };
  spark: {
    running: Array<number>;
    messages: Array<number>;
    tokens: Array<number>;
    cached: Array<number | null>;
    cost: Array<number | null>;
    tool_calls: Array<number | null>;
    failures: Array<number | null>;
    p95: Array<number | null>;
    loops: Array<number>;
  };
};

export type BoardLatency = Array<{
  what: string;
  count: number | null;
  p50_ms: number | null;
  p95_ms: number | null;
  p99_ms: number | null;
  max_ms: number | null;
}>;

export type BoardLoopRow = {
  agent_id: string;
  title: string;
  status: string;
  pattern: string;
  repeats: number;
  tokens: number | null;
  cost_usd: number | null;
  since_ts: number;
  at_end: boolean;
};

export type BoardLoops = Array<BoardLoopRow>;

export type BoardMemoryFiles = Array<{
  path: string;
  read_by: string;
  category?: string;
  scope: string;
  tokens: number | null;
  lines_added: number | null;
  lines_removed: number | null;
  changed_by: string | null;
  changed_ts: number | null;
  node_id?: string;
}>;

export type BoardNodeScope = NodeScope;

export type BoardOptions = {
  tools: Array<{
    id: string;
    label: string;
    agents: number;
  }>;
  projects: Array<{
    id: string;
    agents: number;
  }>;
  models: Array<{
    id: string;
    agents: number;
    reported_as?: Array<{
      id: string;
      tools: Array<string>;
    }>;
  }>;
};

export type BoardProcesses = Array<{
  name: string;
  pid: number;
  tool: string;
  agent_id: string | null;
  title: string | null;
  cpu_percent: number | null;
  mem_mb: number | null;
}>;

export type BoardProjectPromptsSearched = Array<string>;

export type BoardProjectPrompts = Array<{
  file: string;
  project: string;
  uses: number;
  last_ts: number | null;
  node_id?: string;
}>;

export type BoardProjects = Array<{
  project: string;
  agents: number;
  prompts: number | null;
  msgs: number;
  tokens: number;
  cached_share: number | null;
  cost_usd: number | null;
  tool_calls: number | null;
  fail_rate: number | null;
  test_runs: number | null;
  test_passed: number | null;
  lines_added: number | null;
  lines_removed: number | null;
  api_errors: number;
  loops: number;
  p95_ms: number | null;
}>;

export type BoardPromptsTotal = number;

export type BoardPrompts = Array<{
  id?: string;
  node_id?: string;
  ts: number;
  session_id: string;
  agent_id: string;
  project: string;
  text: string;
  prompt_file: string | null;
  tokens: number | null;
}>;

export type BoardRange = {
  since: number;
  until: number;
  bucket_s: number;
  bucket_starts: Array<number>;
  partial_bucket: number | null;
};

export type BoardSavedUsd = number | null;

export type BoardScope = {
  shown_agents: number;
  shown_sessions: number;
  all_agents: number;
  listed_agents?: number;
};

export type BoardSelf = {
  cpu_percent: number | null;
  memory_rss_bytes: number | null;
  history_bytes: number | null;
  history_live_bytes: number | null;
  history_limit_bytes: number | null;
  retention_days: number | null;
  children: Array<{
    pid: number;
    name: string;
    cpu_percent: number | null;
    memory_rss_bytes: number | null;
  }>;
} | null;

export type BoardSeries = {
  tokens: {
    cache_read: Array<number | null>;
    input: Array<number | null>;
    cache_write: Array<number | null>;
    output: Array<number | null>;
  };
  cost: {
    by_tool: Record<string, Array<number | null>>;
    by_project: Record<string, Array<number | null>>;
    by_model: Record<string, Array<number | null>>;
  };
  messages: {
    user: Array<number | null>;
    assistant: Array<number | null>;
    tool: Array<number | null>;
  };
  cached_share: Array<number | null>;
  latency: {
    p50: Array<number | null>;
    p95: Array<number | null>;
  };
  failures: {
    tool: Array<number | null>;
    api: Array<number | null>;
  };
  tests: {
    passed: Array<number | null>;
    failed: Array<number | null>;
  };
  cpu: Record<string, Array<number | null>>;
  mem: Record<string, Array<number | null>>;
};

export type BoardSettingsAt = number | null;

export type BoardSkills = Array<{
  name: string;
  uses: number;
  tokens: number | null;
  agents: number;
  scope?: string | null;
  path?: string | null;
  description?: string | null;
  file_tokens?: number | null;
}>;

export type BoardSources = Array<{
  tool: string;
  label: string;
  data_from: string | null;
  last_data_ts: number | null;
  locations: Array<{
    path: string;
    found_by: string;
  }>;
}>;

export type BoardTestsPiped = number;

export type BoardTests = Array<{
  command: string;
  runs: number;
  failed: number;
  median_ms: number | null;
  state: string;
  last_ts: number;
  project?: string;
  node_id?: string;
}>;

export type BoardToolLabels = Record<string, string>;

export type BoardTools = Array<{
  name: string;
  server: boolean;
  calls: number;
  failed: number;
  fail_rate: number | null;
  p50_ms: number | null;
  p95_ms: number | null;
  max_ms: number | null;
  mcp_server: string | null;
  avg_input_bytes: number | null;
  avg_output_bytes: number | null;
  output_bytes: number | null;
  trend: Array<number | null>;
}>;

export type BoardUnpriced = {
  tokens: number;
  share: number | null;
  models: Array<{
    model: string;
    tokens: number;
  }>;
};

export type ContextLocal = {
  generated_at: number;
  root: string;
  source?: string;
  configuration_scope?: string;
  policy_note?: string;
  budget: {
    tools: Array<{
      tool: string;
      label: string;
      window: number | null;
      model: string | null;
      model_from: string | null;
      always: number;
      always_share: number | null;
      cacheable: number;
      conditional: number;
      global_tokens: number;
      largest_project: string | null;
      max_potential: number;
      never_sent_files: number;
      on_demand: number;
      potential_share: number | null;
      projects: Array<{
        project: string;
        always: number;
        on_demand: number;
        conditional: number;
        tokens: number;
        estimate: number;
        share: number;
      }>;
      raw_total: number;
      survives_compaction: number;
      unknown_policy_tokens: number | null;
      window_assumed: boolean;
    }>;
    totals: {
      always: number;
      cacheable: number;
      conditional: number;
      max_potential: number;
      never_sent_files: number;
      on_demand: number;
    };
  };
  categories: Array<{
    tool: string;
    label: string;
    never_sent: number;
    sent: number;
    tokens: number;
    unknown?: number;
    kinds: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
  }>;
  map: {
    total: number;
    policy: Record<string, number>;
    items: Array<{
      kind: string;
      name: string;
      project: string;
      tokens: number;
    }>;
    rows: Array<{
      files: number;
      kind: string;
      policy: string;
      project: string;
      scope: string;
      tokens: number;
      tool: string;
    }>;
  };
  memory: {
    tokens: number;
    entries: Array<{
      file: string;
      lines: number;
      mtime: number | null;
      name: string;
      profile: string | null;
      recent: boolean;
      source: string | null;
      source_label: string | null;
      tokens: number;
    }>;
    growth: Array<{
      mem_tokens: number;
      memory_entries: number;
      ts: number;
    }>;
  };
  files: Array<{
    count: number;
    files: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
    label: string;
    tool: string;
    truncated: boolean;
  }>;
  telemetry: Array<{
    tool: string;
    label: string;
    source: string;
    messages: number;
    input: number;
    output: number;
    cache_read: number;
    cache_write: number;
    cost_usd: number | null;
    cost_quality: string | null;
    cost_reason: string | null;
    confidence: number | null;
    sessions: number;
    active: number | null;
    as_of: string | null;
    by_model: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
    errors: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
    premium_requests: number | null;
    token_quality: string | null;
    quota: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null> | null;
  }>;
  daily: {
    since: number;
    days: Array<string>;
    available?: boolean;
    error?: string;
    incomplete?: boolean;
    reason?: string;
    retryable?: boolean;
    unresolved_families?: Array<string>;
    models: Array<{
      cost_usd: number | null;
      model: string;
      requests: number;
      tokens: number;
    }>;
    rows: Array<{
      cache_read: number;
      cache_write: number;
      cost_usd: number | null;
      date: string;
      input: number;
      model: string;
      output: number;
      requests: number;
      tokens: number;
    }>;
  };
  workflows: Array<{
    tool: string;
    label?: string;
    path?: string;
    name?: string;
    kind?: string;
    files?: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
  }>;
};

export type CopilotArtifactRow = {
  path: string;
  name: string;
  type: string;
  size: number;
  modified_at: number | null;
  readable: boolean;
  symlink?: boolean;
  checkpoint?: number;
};

export type CopilotSessionRecord = {
  id: string;
  surface: string;
  surface_source: string;
  aliases: Array<string>;
  folder: string | null;
  roots: Array<string>;
  project: string | null;
  git_root: string | null;
  repository: string | null;
  branch: string | null;
  title: string | null;
  started_at: number | null;
  last_activity_at: number | null;
  state: string;
  models: Array<string>;
  pids: Array<number>;
  artifact_count: number | null;
  artifact_bytes: number | null;
  sources: Array<string>;
  partial: boolean;
  turns?: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
  sub_agents: Array<{
    id: string | null;
    name: string | null;
    model: string | null;
  }>;
};

export type DetailAgentFlow = {
  session_id: string;
  turns: Array<FlowEvent>;
  summary: FlowSummary;
  capture_mode: string;
  node_id: string | null;
  session_kql_url: string | null;
  node_scope?: NodeScope;
  flow_scope?: {
    kind: ("agent" | "session") & (string);
    agent_id: string;
    session_id: string;
    subagent: boolean;
  };
  scope: {
    start: number | null;
    end: number | null;
    matched: number;
    total: number;
    agents: Array<string>;
    tools: Array<string>;
    models: Array<string>;
    skills: Array<string>;
  };
};

export type DetailAgentTranscript = {
  session_id: string;
  summary: FlowSummary;
  capture_mode: string;
  replies_kept: boolean;
  reply_note: string | null;
  is_live: boolean;
  node_scope?: NodeScope;
  turns: Array<TranscriptTurn>;
} | {
  session_id: string;
  summary: FlowSummary;
  capture_mode: string;
  replies_kept: boolean;
  reply_note: string | null;
  is_live: boolean;
  node_scope?: NodeScope;
  turn: TranscriptTurn;
};

export type DetailAgent = {
  agent: BoardAgentRow;
  subagents: Array<BoardAgentRow>;
  loop: BoardLoopRow | null;
  node_scope?: NodeScope;
  memory_changes?: Array<{
    ts: number;
    path: string;
    mechanism: string;
    operation: string;
    tool_name?: string;
    agent_id: string;
    actor: string;
    prompt_id?: string;
    turn_index?: number | null;
    lines_added?: number | null;
    lines_removed?: number | null;
    before_hash: string;
    after_hash: string;
    before_bytes?: number | null;
    after_bytes?: number | null;
    before_source: string;
    after_source: string;
    tool_call_id?: string;
  }>;
  config_timeline?: Array<{
    ts: number;
    kind: string;
    agent_id: string;
    tool?: string;
    source?: string;
    setting: string;
    previous_value: string;
    new_value: string;
    previous_effort?: string;
    new_effort?: string;
    turn_index?: number | null;
    prompt_id?: string;
    detail: Record<string, unknown>;
  }>;
  checkpoints?: Array<{
    ts: number;
    kind: string;
    agent_id: string;
    trigger: string;
    checkpoint_no?: number | null;
    message_id: string;
    files_count?: number | null;
    lines_added?: number | null;
    lines_removed?: number | null;
    before_tokens?: number | null;
    after_tokens?: number | null;
    dropped_messages?: number | null;
    dropped_tokens?: number | null;
    cumulative_dropped_tokens?: number | null;
    preserved_messages?: number | null;
    path: string;
    tool_call_id?: string;
    prompt_id?: string;
    turn_index?: number | null;
    detail: Record<string, unknown>;
    summary: null | {
      kind: string;
      seq: number;
      title: string;
      text: string | null;
      hash: string;
      bytes: number | null;
    };
  }>;
  artifacts_total: number;
  artifacts_bytes: number;
  prs_note: string | null;
  artifacts: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
  commits: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
  by_model: Array<{
    model: string;
    msgs: number;
    input: number | null;
    output: number | null;
    cache_read: number | null;
    cache_write: number | null;
    cost_usd: number | null;
    tokens: number;
    cached_share: number | null;
    estimated?: boolean;
  }>;
  process: {
    cpu_percent: number | null;
    mem_mb: number | null;
    pids: Array<number>;
    started_at: number | null;
  };
  turns: Array<{
    ts: number;
    text: string;
    tools: number;
    model: string | null;
    input: number | null;
    output: number | null;
    cache_read: number | null;
    cache_write: number | null;
    cost_usd: number | null;
    subagent_calls: number | null;
    reply_ms: number | null;
  }>;
  tool_calls: Array<{
    ts: number;
    name: string;
    target: string;
    duration_ms: number | null;
    failed: boolean;
    confirm: string | null;
    input_bytes: number | null;
    output_bytes: number | null;
  }>;
  files: Array<{
    path: string;
    lines_added: number | null;
    lines_removed: number | null;
    edits: number;
  }>;
  tests: Array<{
    ts: number;
    command: string;
    passed: boolean | null;
    duration_ms: number | null;
  }>;
  errors: Array<{
    ts: number;
    key: string;
    detail: string;
  }>;
  git: {
    branch: string | null;
    commit: string | null;
    commits_in_session: number;
  };
  runs: Array<{
    session_id: string;
    started_at: number | null;
    ended_at: number | null;
    duration_s: number | null;
    tokens: number | null;
    file_churn: number | null;
    cost_usd: number | null;
    current: boolean;
    duration_ratio: number | null;
    tokens_ratio: number | null;
    churn_ratio: number | null;
  }>;
  tool_totals: Array<{
    name: string;
    mcp_server: string | null;
    calls: number;
    failed: number;
    total_ms: number | null;
    p50_ms: number | null;
    p95_ms: number | null;
    max_ms: number | null;
    input_bytes: number | null;
    output_bytes: number | null;
    avg_input_bytes: number | null;
    avg_output_bytes: number | null;
    max_output_bytes: number | null;
  }>;
  skills: Array<{
    name: string;
    uses: number;
    agents: number;
    started_by: string | null;
    first_ts: number | null;
    last_ts: number | null;
  }>;
  sources: {
    session_file: number;
    otel_spans: number;
    otel_span_events: number;
    otel_last_ts: number | null;
    hooks: number;
    hooks_last_ts: number | null;
  };
  context_files: {
    git_root: string | null;
    read: boolean;
    source: string;
    total: number;
    files: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
    loaded: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
  };
  resources: {
    bytes_in: number | null;
    bytes_out: number | null;
    state_writes: number | null;
    cpu_peak: number | null;
    tool_calls_per_min: number | null;
    rate_limit: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null> | null;
    lm_by_extension: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>> | null;
    process_tree: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
    subprocesses: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
  };
  context: {
    tool_tokens: number | null;
    prompt_limit: number | null;
    limit_share: number | null;
    request_bytes_last: number | null;
    request_bytes_peak: number | null;
    available_tools: number | null;
    compactions: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
    split: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null> | null;
    calls: number | null;
    first: number | null;
    last: number | null;
    peak: number | null;
    drops: number | null;
    series: Array<number | null>;
    by_agent: Array<{
      agent_id: string;
      address: string;
      calls: number;
      first: number;
      last: number;
      peak: number;
    }>;
    breakdown: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null> | null;
  } | null;
  otel?: {
    calls: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
    logs: {
      count: number;
      last_ts: number | null;
    };
    spans: {
      count: number;
      last_ts: number | null;
    };
    span_events: {
      count: number;
      last_ts: number | null;
    };
    mcp_servers: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
    metrics: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null> | null;
    context: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null> | null;
    totals: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>;
    in_context: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null> | null;
    mcp_lifecycle: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
  } | null;
};

export type DetailApiCalls = {
  calls: Array<{
    session_id: string | null;
    ts: number;
    model: string | null;
    input_tokens: number | null;
    output_tokens: number | null;
    duration_ms: number | null;
    http_status?: number | null;
    finish_reason?: string | null;
    error_type?: string | null;
    status?: string;
  }>;
  summary: {
    total_calls: number;
    total_errors: number;
    avg_latency_ms: number | null;
    p95_latency_ms: number | null;
    by_model: Record<string, number>;
  };
};

export type DetailBoardHistory = {
  node_scope: BoardNodeScope;
  range: BoardRange;
  series: BoardSeries;
  generated_at?: BoardGeneratedAt;
  agents?: BoardAgents;
  attention?: BoardAttention;
  by_model?: BoardByModel;
  by_role?: BoardByRole;
  capture_mode?: BoardCaptureMode;
  changes?: BoardChanges;
  confirms?: BoardConfirms;
  coverage?: BoardCoverage;
  credits?: BoardCredits;
  errors?: BoardErrors;
  kpis?: BoardKpis;
  latency?: BoardLatency;
  loops?: BoardLoops;
  memory_files?: BoardMemoryFiles;
  options?: BoardOptions;
  project_prompts?: BoardProjectPrompts;
  project_prompts_searched?: BoardProjectPromptsSearched;
  projects?: BoardProjects;
  prompts?: BoardPrompts;
  prompts_total?: BoardPromptsTotal;
  saved_usd?: BoardSavedUsd;
  scope?: BoardScope;
  skills?: BoardSkills;
  sources?: BoardSources;
  tests?: BoardTests;
  tests_piped?: BoardTestsPiped;
  tool_labels?: BoardToolLabels;
  tools?: BoardTools;
  unpriced?: BoardUnpriced;
};

export type DetailCheckpointFiles = {
  message_id: string;
  files: Array<{
    path: string;
    ts: number;
    origin: string;
    mechanism: string;
    version: number | null;
    state: string;
    blob_hash: string;
    size_bytes: number | null;
    lines: number | null;
    lines_added: number | null;
    lines_removed: number | null;
  }>;
  node_scope?: NodeScope;
};

export type DetailContextAudit = {
  status: string;
  elapsed_s: number;
  step: string;
} | {
  project: string;
  scanned_at: number;
  duration_ms: number;
  capture_mode: string;
  effective_models: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>;
  counts: Record<string, number>;
  sources: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
  sources_per_tool: Record<string, number>;
  transcripts_read: number;
  findings: Array<{
    rule?: string;
    severity?: string;
    tool?: string;
    tools?: Array<string>;
    path?: string;
    line?: number;
    snippet?: string;
    why?: string;
    action?: string;
    session_id?: string;
  }>;
  drift: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>;
  unknown_loaded: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
  unattributed: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
  failed_steps: Array<string>;
  incomplete: Array<string>;
  timings_ms: Record<string, number>;
};

export type DetailContext = ContextLocal | {
  generated_at: number;
  node_scope?: NodeScope;
  nodes: Array<(ContextLocal) & ({
    node_id: string;
  })>;
};

export type DetailCopilotArtifact = {
  path: string;
  size: number;
  binary: boolean;
  truncated: boolean;
  content: string | null;
};

export type DetailCopilotArtifacts = {
  id: string;
  folder: string | null;
  artifacts: Array<CopilotArtifactRow>;
};

export type DetailCopilotSession = CopilotSessionRecord;

export type DetailCopilotSessions = {
  total: number;
  sessions: Array<CopilotSessionRecord>;
};

export type DetailEffectiveModels = Record<string, {
  tool: string;
  value: string | null;
  source: string | null;
  scope: string | null;
  line: number | null;
  in_project: boolean;
  verified: boolean;
  why_in_effect: string | null;
  conflicts: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
  narrower_pins: number;
}>;

export type DetailError = {
  key: string;
  node_scope?: NodeScope;
  items: Array<{
    ts: number;
    detail: string;
    agent_id: string;
    title: string;
  }>;
};

export type DetailEventsCount = {
  count: number;
};

export type DetailEvents = Array<{
  ts: number;
  kind: string;
  tool: string;
  detail: Record<string, unknown> | string | null;
  seq?: number | null;
  session_id?: string | null;
}>;

export type DetailExcerpt = {
  line: number;
  lines: Array<ExcerptLine>;
  path: string;
};

export type DetailFile = {
  path: string;
  diff_as_of: number | null;
  node_scope?: NodeScope;
  edits: Array<{
    ts: number;
    agent_id: string;
    title: string;
    lines_added: number | null;
    lines_removed: number | null;
  }>;
  diff: Array<{
    n: number | null;
    text: string;
    kind: "same" | "add" | "del";
  }> | null;
};

export type DetailHooksStatus = {
  generated_at: number;
  window_seconds: number;
  server_port: number | null;
  total_configured: number;
  total_fired_24h: number;
  last_fire_ts: number | null;
  counts_by_kind: Record<string, number>;
  counts_by_tool_kind: Record<string, Record<string, number>>;
  warnings: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
  tools: Record<string, {
    tool: string;
    configured: boolean;
    configured_count: number;
    configured_events: Array<string>;
    missing_events: Array<string>;
    fired_24h: number;
    last_fire_ts: number | null;
    status: string;
    warnings: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
    sources: Array<{
      tool: string;
      scope: string;
      path: string;
      exists: boolean;
      schema: string;
      host_enabled: boolean | null;
      host_reason: string | null;
      configured: boolean;
      configured_count: number;
      configured_events: Array<string>;
      missing_events: Array<string>;
      status: string;
      checks: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
    }>;
  }>;
  sources: Array<{
    tool: string;
    scope: string;
    path: string;
    exists: boolean;
    schema: string;
    host_enabled: boolean | null;
    host_reason: string | null;
    configured: boolean;
    configured_count: number;
    configured_events: Array<string>;
    missing_events: Array<string>;
    status: string;
    checks: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
  }>;
  vscode: {
    settings_path: string | null;
    use_hooks: boolean | null;
    hook_files_locations: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>;
  };
  skill_usage: {
    total_calls_24h: number;
    by_skill: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
    by_tool: Record<string, number>;
    by_tool_skill: Record<string, Record<string, number>>;
  };
  subagents: {
    starts_24h: number;
    stops_24h: number;
    by_tool: Record<string, Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
    recent: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
  };
  tool_calls: {
    total_calls_24h: number;
    by_name: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
    by_tool: Record<string, number>;
    by_tool_name: Record<string, Record<string, number>>;
  };
};

export type DetailKqlTemplates = {
  presets: Array<{
    id: string;
    label: string;
    title: string;
    description: string;
    model: boolean;
    tool: boolean;
    keyword: boolean;
    fleet: boolean;
    all_sessions: boolean;
  }>;
  tables: Array<string>;
  fields: Array<string>;
  operators: Array<string>;
} | {
  query: string;
};

export type DetailMachine = (MachineLocal) & ({
  pipeline: MachinePipeline;
  node_scope?: NodeScope;
}) | {
  generated_at: number;
  recorded_total: number;
  node_scope?: NodeScope;
  hosts: Array<{
    node_id: string;
    status: string;
    ts: number;
    host_cpu_percent: number | null;
    host_memory_used_mb: number | null;
    host_memory_total_mb: number | null;
    live_sessions: number | null;
    active_processes: number | null;
    daemon_pid: number | null;
    files: number | null;
    live_in_rate: number | null;
    live_out_rate: number | null;
    ai_token_rate: number | null;
  }>;
  recorded_processes: Array<{
    node_id: string;
    session_id: string;
    pid: number;
    tool: string;
    role: string | null;
    joined_at: number | null;
  }>;
};

export type DetailMemoryDiff = {
  first: {
    hash: string;
    state: "kept" | "absent" | "not_recorded" | "not_kept" | "expired";
    bytes: number | null;
    text: string | null;
  };
  second: {
    hash: string;
    state: "kept" | "absent" | "not_recorded" | "not_kept" | "expired";
    bytes: number | null;
    text: string | null;
  };
  diff: Array<{
    n: number | null;
    text: string;
    kind: "same" | "add" | "del";
  }> | null;
  truncated: boolean;
  node_scope?: NodeScope;
};

export type DetailMemoryRecalls = {
  recalls: Array<{
    ts: number;
    agent_id: string;
    tool: string;
    trigger: string;
    path: string;
    content_hash: string;
    tool_call_id: string;
    prompt_id: string;
    turn_index: number | null;
    bytes: number | null;
  }>;
  node_scope?: NodeScope;
};

export type DetailMemoryVersions = {
  path: string;
  mechanism: string;
  versions: Array<{
    ts: number;
    origin: string;
    session_id: string;
    title: string;
    agent_id: string;
    actor: string;
    operation: string;
    content_hash: string;
    size_bytes: number | null;
    before_hash: string;
    before_source: string;
    after_source: string;
    lines_added: number | null;
    lines_removed: number | null;
    state: string;
  }>;
  node_scope?: NodeScope;
};

export type DetailNodes = {
  scope: string;
  local_node: LocalNode;
  fleet_available: boolean;
  generated_at: number;
  read_only: boolean;
  view: "identity";
  rows: Array<never>;
} | {
  scope: string;
  local_node: LocalNode;
  fleet_available: boolean;
  generated_at: number;
  read_only: boolean;
  truncated?: boolean;
  view: "nodes";
  rows: Array<{
    node_id: string;
    captured_at: number | null;
  }>;
} | {
  scope: string;
  local_node: LocalNode;
  fleet_available: boolean;
  generated_at: number;
  read_only: boolean;
  since: number;
  until: number;
  truncated: boolean;
  view: "overview";
  rows: Array<{
    node_id: string;
    sessions: number;
    requests: number;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number | null;
  }>;
  totals: {
    sessions: number;
    requests: number;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number | null;
  };
  sessions: Array<{
    node_id: string;
    session_id: string;
    started_at: number | null;
    ended_at: number | null;
    tool: string;
    project_path: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    request_count: number;
    cost_usd: number | null;
  }>;
} | {
  scope: string;
  local_node: LocalNode;
  fleet_available: boolean;
  generated_at: number;
  read_only: boolean;
  view: "session";
  rows: Array<{
    node_id: string;
    session_id: string;
    started_at: number | null;
    ended_at: number | null;
    tool: string;
    project_path: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    request_count: number;
    cost_usd: number | null;
  }>;
} | {
  scope: string;
  local_node: LocalNode;
  fleet_available: boolean;
  generated_at: number;
  read_only: boolean;
  truncated?: boolean;
  view: "runtime";
  rows: Array<{
    node_id: string;
    captured_at: number | null;
    status: string;
    cpu_percent: number | null;
    memory_used_mb: number | null;
    memory_total_mb: number | null;
    active_sessions: number | null;
    active_processes: number | null;
    daemon_pid: number | null;
    activity_at: number | null;
    inbound_bps?: number | null;
    outbound_bps?: number | null;
    agents?: {
      captured_at: number;
      total: number;
      rows: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
    } | null;
  }>;
} | {
  scope: string;
  local_node: LocalNode;
  fleet_available: boolean;
  generated_at: number;
  read_only: boolean;
  truncated?: boolean;
  view: "health";
  rows: Array<{
    node_id: string;
    captured_at: number | null;
    status: string;
    cpu_percent: number | null;
    memory_used_mb: number | null;
    memory_total_mb: number | null;
    active_sessions: number | null;
    active_processes: number | null;
    daemon_pid: number | null;
    activity_at: number | null;
    inbound_bps?: number | null;
    outbound_bps?: number | null;
    agents?: {
      captured_at: number;
      total: number;
      rows: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
    } | null;
    client_sample?: {
      at?: number;
      pid?: number;
      store?: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null> & {
        query_cpu?: QueryCpu;
        writer?: {
          status: string;
          tables: Record<string, {
            queue_depth?: number;
            queue_bytes?: number;
            in_flight?: number;
            rows_sent?: number;
            rows_dropped?: number;
            lost_at_exit?: number;
            ingest_requests?: number;
            ingest_failures?: number;
            bytes_sent?: number;
            last_sent_at?: number;
            last_error_at?: number;
          }>;
        };
      };
      runtime?: Record<string, unknown>;
    } | null;
  }>;
  shared_kusto: {
    scope: string;
    cluster: string;
    database: string;
    capacity_available?: number | null;
    capacity_total?: number | null;
    capacity_status?: string | null;
    capacity_checked_at?: number | null;
    policies?: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null> | null;
    cluster_resources?: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null> | null;
    table_inventory?: TableInventory | null;
  } | null;
  local_runtime?: HealthLocal;
} | {
  scope: string;
  local_node: LocalNode;
  fleet_available: boolean;
  generated_at: number;
  read_only: boolean;
  truncated: boolean;
  view: "settings";
  rows: Array<{
    node_id: string;
    captured_at: number | null;
    status: string;
    node_source: string | null;
    capture: string | null;
    ingestion: string | null;
    retention_days: number | null;
    content_retention_days: number | null;
  }>;
} | {
  scope: string;
  local_node: LocalNode;
  fleet_available: boolean;
  generated_at: number;
  read_only: boolean;
  since: number;
  until: number;
  step: number;
  truncated: boolean;
  view: "flows";
  tables: Array<{
    table: string;
    t: number;
    rows_per_s: number | null;
    bytes_per_s: number | null;
    requests_per_s: number | null;
    failures: number | null;
    rows_dropped: number | null;
    queue_depth: number | null;
    nodes: number | null;
  }>;
  nodes: Array<{
    node_id: string;
    table: string;
    mode: string | null;
    rows: number | null;
    bytes: number | null;
    requests: number | null;
    failures: number | null;
    rows_dropped: number | null;
    peak_rows_per_s: number | null;
    queue_depth: number | null;
    last_at: number | null;
  }>;
} | {
  scope: string;
  local_node: LocalNode;
  fleet_available: boolean;
  generated_at: number;
  read_only: boolean;
  since: number;
  until: number;
  step: number;
  view: "backend";
  database: string;
  checked_at: number;
  measurement_scope: string;
  series: Array<{
    t: number;
    work: "aictl_queries" | "other_queries" | "ingestion" | "maintenance";
    commands: number | null;
    failed: number | null;
    cpu_s: number | null;
    memory_peak: number | null;
  }>;
  views: Array<{
    view: string;
    commands: number | null;
    failed: number | null;
    cpu_s: number | null;
    mean_ms: number | null;
    max_ms: number | null;
    memory_peak: number | null;
  }>;
} | {
  scope: string;
  local_node: LocalNode;
  fleet_available: boolean;
  generated_at: number;
  read_only: boolean;
  since: number;
  until: number;
  step: number;
  truncated: boolean;
  view: "series";
  rows: Array<{
    node_id: string;
    t: number;
    samples: number;
    restarts: number;
    host_cpu: number | null;
    host_cpu_max: number | null;
    host_mem_mb: number | null;
    host_mem_total_mb: number | null;
    tools_cpu: number | null;
    tools_mem_mb: number | null;
    daemon_cpu: number | null;
    daemon_cpu_max: number | null;
    daemon_rss_mb: number | null;
    daemon_threads: number | null;
    sessions: number | null;
    processes: number | null;
    in_rate: number | null;
    out_rate: number | null;
    reads_per_s: number | null;
    writes_per_s: number | null;
    commands_per_s: number | null;
    read_ms: number | null;
    read_ms_max: number | null;
    write_ms: number | null;
    write_ms_max: number | null;
    reads_in_flight: number | null;
    writes_in_flight: number | null;
    query_cpu: number | null;
    bytes_per_s: number | null;
    streaming_rows_per_s: number | null;
    queued_rows_per_s: number | null;
    inline_rows_per_s: number | null;
    otel_metrics_per_s: number | null;
    otel_events_per_s: number | null;
    queue_depth: number | null;
    queue_bytes: number | null;
    read_failures: number | null;
    write_failures: number | null;
    command_failures: number | null;
    ingest_failures: number | null;
    rows_dropped: number | null;
    otel_errors: number | null;
    otel_dropped: number | null;
    sink_dropped: number | null;
  }>;
};

export type DetailOtelStatus = (OtelReceiverStatus) & ({
  kusto?: {
    requests: number;
    convert_errors: number;
    rows_queued: number;
    rows_sent: number;
    rows_dropped_queue_full: number;
    rows_rejected: number;
    ingest_requests: number;
    ingest_failures: number;
    bytes_sent: number;
    pending_rows: number;
    pending_bytes: number;
    last_sent_at: number | null;
    last_error: string | null;
    last_error_at: number | null;
    converted: Record<string, number>;
    tables: Record<string, Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
  };
});

export type DetailPrompt = {
  text: string;
  prompt_file: string | null;
  project: string;
  title: string;
  input: number | null;
  output: number | null;
  cache_read: number | null;
  cache_write: number | null;
  cost_usd: number | null;
  calls: number;
  subagent_calls: number;
  reply_ms: number | null;
  tool_calls: number;
  node_scope?: NodeScope;
};

export type DetailSamples = Array<{
  ts: number;
  value: number | null;
  tags: Record<string, unknown>;
}>;

export type DetailSessionCommits = {
  session_id: string;
  branch: string;
  commits: Array<{
    sha: string;
    short_sha: string;
    author_name: string;
    author_email: string;
    ts: number;
    subject: string;
    current_branch_match: boolean;
  }>;
};

export type DetailSessionEvidence = {
  session_id: string;
  rows: Array<SessionEvidenceRow>;
  has_more: boolean;
  offset: number;
  limit: number;
  node_scope?: NodeScope;
};

export type DetailSessionMcpUsage = {
  session_id: string;
  total_calls: number;
  configured_servers: Array<string>;
  servers: Array<SessionMcpRow>;
};

export type DetailSessionProcesses = {
  session_id: string;
  total: number;
  by_role: Record<string, number>;
  processes: Array<SessionProcessRow>;
};

export type DetailSessionRecords = {
  node_id: string;
  node_scope: NodeScope;
  total: number;
  rows: Array<{
    ts: number;
    kind: string;
    tool: string;
    seq: number | null;
    detail: string | null;
  }>;
} | {
  node_id: string;
  node_scope: NodeScope;
  total: number;
  processes: Array<{
    pid: number;
    tool: string | null;
    role: string | null;
    joined_at: number | null;
    left_at?: number | null;
  }>;
} | {
  node_id: string;
  node_scope: NodeScope;
  total_calls: number;
  servers: Array<{
    server_name: string;
    call_count: number;
    err_count: number;
    total_duration_ms: number | null;
    last_ts: number | null;
  }>;
} | {
  node_id: string;
  node_scope: NodeScope;
  calls: Array<{
    session_id: string;
    ts: number;
    model: string | null;
    input_tokens: number | null;
    output_tokens: number | null;
    cache_read_tokens: number | null;
    duration_ms: number | null;
    error_type?: string | null;
    is_error: boolean | number | null;
    http_status: number | null;
    finish_reason: string | null;
    status: "ok" | "error";
  }>;
  summary: {
    avg_latency_ms: number | null;
    p95_latency_ms: number | null;
    total_calls: number;
    total_errors: number;
    by_model: Record<string, number>;
  };
};

export type DetailSessionTeam = {
  session_id: string;
  agents: Array<{
    agent_id: string;
    parent_agent_id?: string;
    state?: string;
    task?: string;
    agent_type?: string;
    relationship?: string;
    started_at?: number;
    ended_at?: number | null;
    duration_s?: number;
    input_tokens?: number;
    output_tokens?: number;
    tool_calls?: number;
    model?: string;
  }>;
  tasks: Array<{
    task_id: string;
    agent_id?: string;
    name?: string;
    state?: string;
    created_at?: number;
    completed_at?: number | null;
  }>;
} | {
  error: string;
};

export type DetailSessions = {
  total: number;
  unfiltered: number;
  node_scope?: NodeScope;
  facets: {
    sessions: number;
    running: number;
    ended: number;
    inferred: number;
    importing: number;
    not_imported: number;
  };
  without: {
    status: number;
    model: number;
    name_source: number;
    errors: number;
    min_tokens: number;
    min_cost: number;
  };
  query: {
    q: string;
    tools: Array<string> | null;
    since: number | null;
    until: number | null;
    project: string;
    model: string;
    status: string;
    name_source: string;
    errors: boolean;
    min_tokens: number;
    min_cost: number;
    sort: string;
    order: "asc" | "desc";
    limit: number;
    offset: number;
  };
  rows: Array<{
    id: string;
    title: string;
    title_source: string;
    project: string;
    tool: string;
    model: string;
    started_at: number | null;
    ended_at: number | null;
    last_activity_at: number | null;
    duration: number | null;
    status: "running" | "ended" | "inferred" | "not_imported";
    status_evidence: string;
    end_reason: string;
    pids: Array<number>;
    import_state: "complete" | "reading" | "partial" | "waiting" | "none";
    import_evidence: string;
    import: {
      files: number;
      complete: number;
      reading: number;
      waiting: number;
      outside_window: number;
      size_bytes: number | null;
      bytes_read: number | null;
      modified_at: number | null;
      source_file: string;
    } | null;
    openable: boolean;
    closed_reason: string | null;
    artifacts: number | null;
    commits: number | null;
    cost_usd: number | null;
    prompts: number | null;
    errors: number | null;
    tokens: number | null;
    tool_calls: number | null;
    match: string;
    match_text: string;
    node_id?: string;
    session_id?: string;
  }>;
  by_node?: Array<{
    node_id: string;
    sessions: number;
  }>;
};

export type DetailSettingsFile = {
  path: string;
  mtime: number;
  size: number;
  text: string;
  masked: boolean;
};

export type DetailSettingsFiles = {
  generated_at: number;
  files: Array<{
    path: string;
    exists: boolean;
    is_dir: boolean;
    kind: string;
    loading: string;
    location: string;
    location_root: string;
    name: string;
    scope: string;
    bytes: number | null;
    mtime: number | null;
    settings: number | null;
    tools: Array<string>;
    git_state: string | null;
  }>;
};

export type DetailSettingsTools = {
  generated_at: number;
  tool_configs: Array<SettingsToolConfig>;
  tools: Array<{
    tool: string;
    label: string;
  }>;
  monitor: {
    diagnostics: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>;
    state_paths: Array<string>;
    workspace_paths: Array<string>;
  };
};

export type DetailSkill = {
  name: string;
  agents: number;
  file_reads: number;
  first_ts: number | null;
  last_ts: number | null;
  total_uses: number;
  uses: number;
  node_scope?: NodeScope;
  calls: Array<{
    agent_id: string;
    project: string;
    title: string;
    tool: string;
    trigger: string | null;
    ts: number;
  }>;
  reads: Array<{
    agent_id: string | null;
    project?: string;
    title?: string;
    tool?: string;
    path?: string;
    ts: number;
  }>;
  locations: Array<{
    path: string;
    tools: Array<string>;
    scope: string | null;
    owner: string | null;
    reach: string | null;
    description: string | null;
    content: string | null;
    truncated: boolean | null;
    note: string | null;
    allowed_tools: Record<string, unknown> | Array<unknown> | string | number | boolean | null;
    git_state: string | null;
    same_as: string | null;
    starter: string | null;
  }>;
};

export type DetailTerminalEvents = Array<{
  ts: number;
  tool: string;
  kind: string;
  detail: Record<string, unknown>;
  session_id: string;
  pid: number;
}>;

export type DetailTerminalFile = {
  text: string;
  truncated: boolean;
};

export type DetailTerminalMetrics = Array<{
  metric: string;
  count: number;
  latest_ts?: number | null;
  last_value: number | null;
}> | {
  ts: Array<number>;
  value: Array<number>;
};

export type DetailTerminalResources = {
  timestamp: number;
  root: string;
  tools: Array<{
    tool: string;
    label: string;
    vendor?: string;
    host?: string;
    meta?: boolean;
    files: Array<TerminalResourceFile>;
    processes: Array<TerminalResourceProcess>;
    mcp_servers: Array<{
      name: string;
      config: Record<string, unknown>;
    }>;
    memory?: Record<string, unknown> | null;
    live?: TerminalResourceLiveTool | null;
    token_breakdown?: Record<string, unknown>;
  }>;
  agent_memory: Array<{
    source: string;
    profile: string;
    file: string;
    content: string;
    tokens: number;
    lines: number;
    mtime?: number;
  }>;
  mcp_detail: Array<{
    name: string;
    tool: string;
    config?: Record<string, unknown>;
    status: string;
    transport: string;
    endpoint: string;
    pid: number | null;
    cpu_pct: string;
    mem_mb: string;
  }>;
  tool_configs: Array<{
    tool: string;
    hints?: Array<string>;
  }>;
  tool_telemetry: Array<{
    tool: string;
    input_tokens?: number;
    output_tokens?: number;
    cache_read_tokens?: number;
    cache_creation_tokens?: number;
    cost_usd?: number | null;
    total_sessions?: number;
    model?: string | null;
  }>;
  live_monitor: {
    platform?: string;
    diagnostics?: Record<string, {
      status?: string;
      mode?: string;
      detail?: string;
    }>;
  };
  agent_teams?: Array<Record<string, unknown>>;
  cpu_cores: number;
  cpu_per_core: Array<number>;
};

export type DetailTerminalSessions = Array<{
  session_id: string;
  tool: string;
  label?: string;
  root_pid?: number;
  project?: string;
  started_at?: number;
  last_seen_at?: number;
  duration_s?: number;
  pids: Array<number>;
  workspaces?: Array<string>;
  files_touched?: Array<string>;
  files_touched_limited?: boolean;
  files_loaded?: Array<string>;
  file_events?: number;
  cpu_percent?: number;
  peak_cpu_percent?: number;
  inbound_bytes?: number;
  outbound_bytes?: number;
  state_bytes_written?: number;
  exact_input_tokens?: number;
  exact_output_tokens?: number;
  subprocess_count?: Record<string, number>;
  recent_subprocesses?: Array<Record<string, unknown>>;
  process_tree?: Array<Record<string, unknown>>;
}>;

export type DetailToolConfig = {
  tool: string;
  scope: string;
  path: string;
  exists: boolean;
  mtime: number | null;
  backup_path?: string | null;
  editable_fields: Array<string>;
  permissions: Record<string, Array<string>>;
  raw: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>;
};

export type DetailTool = {
  name: string;
  total: number;
  node_scope?: NodeScope;
  calls: Array<{
    ts: number;
    target: string;
    agent_id: string;
    title: string;
    duration_ms: number | null;
    failed: boolean;
    confirm: string | null;
  }>;
};

export type ExcerptLine = {
  n: number;
  text: string;
};

export type FlowEvent = {
  type: string;
  ts: number;
  source: string;
  rt_tokens: number | null;
  cum_tokens: number | null;
  turn_index?: number | null;
  agent_id?: string | null;
  parent_agent_id?: string | null;
  agent_name?: string | null;
  api_calls?: number;
  confirm?: string | null;
  compaction_count?: number | null;
  before_tokens?: number | null;
  after_tokens?: number | null;
  context_tokens?: number | null;
  completed?: boolean | null;
  cost_usd?: number | null;
  duration_ms?: number | null;
  end_ts?: number | null;
  exit_code?: number | null;
  finish_reason?: string | null;
  from?: string | null;
  input_preview?: string | null;
  is_error?: boolean;
  error_type?: string | null;
  error_message?: string | null;
  hook_name?: string | null;
  hook_input?: string | null;
  hook_output?: string | null;
  message?: string | null;
  model?: string | null;
  name?: string | null;
  params?: string | null;
  phase?: string | null;
  preview?: string | null;
  prompt?: string | null;
  prompt_length?: number;
  redacted?: boolean;
  result_summary?: string | null;
  result_size?: number | null;
  result_preview?: string | null;
  reported_spans?: number | null;
  request_preview?: string | null;
  response?: string | null;
  response_preview?: string | null;
  subtype?: string | null;
  decision?: string | null;
  cwd?: string | null;
  step_key?: string | null;
  success?: boolean | null;
  target?: string | null;
  text_status?: string | null;
  to?: string | null;
  tokens?: UsageTokens;
  ttft_ms?: number | null;
  turn_id?: string | null;
  round_id?: string | null;
  request_id?: string | null;
  message_id?: string | null;
  tool_call_id?: string | null;
  span_id?: string | null;
  trace_id?: string | null;
  wall_ms?: number | null;
  step?: number;
  request_n?: number;
  http_status?: number | null;
  request_bytes?: number | null;
  thinking_chars?: number | null;
  reasoning_tokens?: number | null;
  input_bytes?: number | null;
  output_bytes?: number | null;
  result_tokens_est?: number | null;
  confirm_wait_ms?: number | null;
  outcome?: string;
  spawned_agent_id?: string;
  spawned_by_ts?: number;
};

export type FlowSummary = {
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_tokens: number;
  total_cache_creation_tokens?: number;
  total_cost_usd?: number | null;
  priced_calls?: number;
  total_steps?: number;
  total_tokens: number;
  avg_tokens_per_call: number | null;
  duration_s: number;
  source: string;
  total_turns: number;
  total_api_calls: number;
  total_tool_uses: number;
  compactions: number;
  errors: number;
  subagents: number;
  event_count: number;
  cumulative_tokens?: number;
  largest_turn_tokens?: number;
  ttft_calls?: number;
  ttft_ms?: number | null;
  hooks?: number;
  shown_events?: number;
  omitted_events?: number;
  offset?: number;
  matched_events?: number;
  turn_marks?: Array<TurnMark>;
};

export type HealthLocal = {
  generated_at: number;
  monitor: MachineMonitor;
  pipeline: MachinePipeline;
  store: HealthStore | null;
  resources: {
    host: {
      scope: string;
      node_id: string;
      checked_at: number;
      cpu_percent: number | null;
      cpu_checked_at: number | null;
      memory_total_bytes: number | null;
      memory_used_bytes: number | null;
      memory_available_bytes: number | null;
      memory_checked_at: number | null;
      activity_at: number | null;
      active_sessions: number | null;
      active_processes: number | null;
      inbound_bps: number | null;
      outbound_bps: number | null;
    };
    daemon: {
      scope: string;
      checked_at: number;
      cpu_percent: number | null;
      rss_bytes: number | null;
      threads: number | null;
    };
    cluster: {
      resource_id: string | null;
      source: string | null;
      status: string;
      checked_at: number | null;
      attempted_at: number | null;
      last_error: string | null;
      refresh_interval_s: number;
      monitor_status?: string;
      samples?: Record<string, {
        value: number;
        at: number;
      }>;
      native?: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null | null>;
    } | null;
  };
};

export type HealthStore = {
  kind: string | null;
  destination: string | null;
  cluster_url?: string | null;
  database?: string | null;
  ingestion_mode?: string | null;
  measurement_scope?: string | null;
  counter_scope?: string | null;
  commands_scope?: string | null;
  capacity_scope?: string | null;
  write_volume_scope?: string | null;
  storage_budget_bytes?: number | null;
  queued_history_rows_unconfirmed?: number | null;
  table_inventory?: TableInventory | null;
  query_cpu?: QueryCpu;
  reader?: {
    status: string;
    queries?: number;
    query_failures?: number;
    last_latency_ms?: number | null;
    last_error?: string | null;
  } | null;
  writer?: {
    status: string;
    warning?: string | null;
    tables?: Record<string, {
      mode: string;
      queue_depth: number;
      queue_bytes: number;
      in_flight: number;
      rows_sent: number;
      rows_dropped: number;
      lost_at_exit: number;
      last_error: string | null;
      ingest_requests: number;
      ingest_failures: number;
      bytes_sent: number;
      last_sent_at: number | null;
      last_error_at: number | null;
    }>;
  } | null;
  reads?: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null> | null;
  writes?: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null> | null;
  commands?: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null> | null;
  ingestion_capacity?: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null> | null;
  ingestion_details?: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null> | null;
  ingestion_traffic?: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null> | null;
  traffic_groups?: Array<{
    id: string;
    label: string;
    tables: Array<string>;
    ingestion_modes: Array<string>;
    rows: number | null;
    rows_per_s: number | null;
    bytes: number | null;
    bytes_per_s: number | null;
    rate_per_s: number | null;
    failed: number | null;
    requests: number | null;
    pending: number | null;
    measurement_scope: string;
  }>;
  volume?: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null | null>;
  otel_sink?: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null> | null;
  health?: {
    state?: string;
    scope?: string;
    checked_at?: number | null;
    last_error?: string | null;
    last_success_at?: number | null;
  } | null;
};

export type HistoryAgentRow = {
  id: string;
  short: string;
  title: string;
  parent_id: string | null;
  role: string | null;
  status: string;
  tool: string;
  project: string;
  models: Array<string>;
  primary_model?: string | null;
  input: number | null;
  output: number | null;
  cache_read: number | null;
  cache_write: number | null;
  cached_share: number | null;
  cost_usd: number | null;
  tool_calls: number | null;
  failures: number | null;
  confirms_asked: number | null;
  confirms_denied: number | null;
  started_at: number | null;
  ended_at: number | null;
  activity: Array<number>;
  placeholder?: boolean;
  status_evidence?: string | null;
  end_reason?: string;
  node_id?: string;
  native_id?: string;
  session_id?: string;
  native_session_id?: string;
  msgs: {
    user: number | null;
    assistant: number | null;
    tool: number | null;
  };
  pending: PendingConfirmation | null;
  historical_status: string | null;
};

export type HistoryKpis = {
  subagents_running?: number;
  messages: number;
  tokens: number;
  cached_share: number | null;
  cost_usd: number | null;
  tool_calls: number | null;
  failures: number | null;
  fail_rate: number | null;
  p50_ms: number | null;
  p95_ms: number | null;
  loops: number;
  prev: {
    messages: number | null;
    tokens: number | null;
    cost_usd: number | null;
    tool_calls: number | null;
  };
  spark: {
    running: Array<number>;
    messages: Array<number>;
    tokens: Array<number>;
    cached: Array<number | null>;
    cost: Array<number | null>;
    tool_calls: Array<number | null>;
    failures: Array<number | null>;
    p95: Array<number | null>;
    loops: Array<number>;
  };
};

export type LiveCapabilities = {
  enabled: boolean;
  protocol: number;
  contract_version: number;
  stream: string | null;
  source_policy: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>;
  datapoint_catalog: string;
  history: string;
  configuration: string;
  sequence: string;
  topics: Record<string, {
    sources: Array<string>;
    fields?: Array<string>;
    delivery: "latest" | "ordered";
  }>;
};

export type LiveEntity = {
  topic: "catalog.board";
  id: string;
  revision: number;
  source: "catalog";
  data: TopicCatalogBoard;
} | {
  topic: "configuration.board";
  id: string;
  revision: number;
  source: "filesystem.config";
  data: TopicConfigurationBoard;
} | {
  topic: "configuration.file";
  id: string;
  revision: number;
  source: "filesystem.config";
  data: TopicConfigurationFile;
} | {
  topic: "configuration.loaded";
  id: string;
  revision: number;
  source: "runtime.evidence" | "runtime.native";
  data: TopicConfigurationLoaded;
} | {
  topic: "history.agent";
  id: string;
  revision: number;
  source: "kusto.queryable";
  data: TopicHistoryAgent;
} | {
  topic: "history.board";
  id: string;
  revision: number;
  source: "kusto.queryable";
  data: TopicHistoryBoard;
} | {
  topic: "runtime.agent";
  id: string;
  revision: number;
  source: "runtime.collector";
  data: TopicRuntimeAgent;
} | {
  topic: "runtime.health";
  id: string;
  revision: number;
  source: "runtime.operational";
  data: TopicRuntimeHealth;
} | {
  topic: "runtime.machine";
  id: string;
  revision: number;
  source: "runtime.collector";
  data: TopicRuntimeMachine;
} | {
  topic: "runtime.output";
  id: string;
  revision: number;
  source: "runtime.native";
  data: TopicRuntimeOutput;
} | {
  topic: "runtime.process";
  id: string;
  revision: number;
  source: "runtime.collector";
  data: TopicRuntimeProcess;
} | {
  topic: "source.status";
  id: string;
  revision: number;
  source: "runtime.operational";
  data: TopicSourceStatus;
};

export type LocalNode = {
  node_id: string;
  source: string;
};

export type MachineLocal = {
  generated_at: number;
  monitor: MachineMonitor;
  cpu_cores: number | null;
  cpu_per_core: Array<number | null>;
  processes: Array<{
    pid: number;
    ppid: number | null;
    parent_name: string | null;
    name: string;
    tool: string;
    process_type: string | null;
    cpu_pct: number | null;
    mem_mb: number | null;
    cmdline: string | null;
    cleanup_cmd: string | null;
    zombie_risk: string | null;
    anomalies: Array<{
      kind: string;
      severity: string;
      label: string;
      text: string;
    }>;
  }>;
  alerts: Array<{
    kind: string;
    severity: string;
    text: string;
    detail: string | null;
    pids: Array<number>;
    pid: number | null;
    tool: string | null;
    action: string | null;
  }>;
};

export type MachineMonitor = {
  collectors: Array<{
    name: string;
    mode: string | null;
    status: string;
    detail: string | null;
  }>;
  roots: Array<{
    kind: string;
    path: string;
  }>;
  per_tool: Array<{
    tool: string;
    label: string;
    sessions: number | null;
    pids: number | null;
    inbound_bps: number | null;
    outbound_bps: number | null;
    est_tokens?: number | null;
    est_confidence?: number | null;
    est_source?: string | null;
    file_events?: number | null;
    files_touched?: number | null;
    cpu_pct: number | null;
    cpu_peak: number | null;
    workspace_bytes?: number | null;
    workspaces: Array<string>;
    last_seen: number | null;
    mcp_loop?: {
      detected: boolean;
      loops: number;
      confidence: number | null;
    } | null;
  }>;
};

export type MachinePipeline = {
  self: {
    pid: number | null;
    cpu: number | null;
    rss: number | null;
    uptime_s: number | null;
    threads: number | null;
    db_bytes: number | null;
    db_rows: number | null;
    db_tables: Record<string, number>;
    writes: Array<Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
    started_at?: number | null;
    code_changed_at?: number | null;
  } | null;
  sink: {
    emitted: number;
    flushed: number;
    dropped: number;
    flood: boolean;
    flood_drops: number;
    buffered: number;
    tracked: number;
  } | null;
  otel_receiver: {
    active: boolean;
    api_calls_total: number;
    api_errors_total: number;
    dropped: number;
    errors: number;
    events_received: number;
    last_receive_at: number | null;
    metrics_received: number;
    by_tool: Record<string, {
      metrics?: number;
      events?: number;
      last_at?: number | null;
    }>;
  } | null;
  otel_setup?: Record<string, {
    source: string | null;
    status: string;
    text: string;
    value: Record<string, unknown> | Array<unknown> | string | number | boolean | null;
    variable: string;
  }>;
  hooks: Record<string, {
    count: number;
    last_fire_ts: number | null;
  }>;
  ingesters: Array<{
    name: string;
    status: string;
    last_ok: number | null;
    last_poll: number | null;
    error: string | null;
    rows: number | null;
    rows_total: number | null;
    source: string | null;
    last_poll_duration_ms?: number | null;
    poll_in_flight?: boolean | null;
    source_path?: string | null;
  }>;
  data_quality: Array<{
    ts: number;
    component: string;
    source: string | null;
    kind: string;
    status: string;
    severity: string;
    text: string;
    error: string | null;
    tool: string | null;
    count: number;
    last_ok: number | null;
  }>;
  freshness: Array<{
    tool: string;
    label: string;
    last_seen: number | null;
    source: string | null;
    confidence: number | null;
    errors: number | null;
    last_error: string | null;
  }>;
  stream: {
    connected_clients: number | null;
    snapshot_ts: number | null;
    snapshot_age_s: number | null;
  };
};

export type NodeScope = {
  kind: string;
  node_id: string | null;
};

export type OtelReceiverStatus = {
  metrics_received: number;
  events_received: number;
  last_receive_at: number | null;
  errors: number;
  api_calls_total: number;
  api_errors_total: number;
  dropped: number;
  active: boolean;
  by_tool: Record<string, {
    metrics?: number;
    events?: number;
    last_at?: number | null;
  }>;
};

export type PendingConfirmation = {
  name: string;
  target: string | null;
  since_ts: number;
};

export type QueryCpu = {
  started_at: number;
  queries: number;
  failed: number;
  reported: number;
  total_cpu_s: number | null;
};

export type SessionEvidenceRow = {
  step_key: string;
  session_id: string;
  kind: string;
  source: string;
  tool: string;
  ts: number;
  text_status: string;
  text_preview: string | null;
  text?: string | null;
  agent_id?: string | null;
  agent_name?: string | null;
  project_path?: string | null;
  parent_agent_id?: string | null;
  parent_span_id?: string | null;
  phase?: string | null;
  model?: string | null;
  name?: string | null;
  span_id?: string | null;
  trace_id?: string | null;
  turn_id?: string | null;
  round_id?: string | null;
  message_id?: string | null;
  request_id?: string | null;
  role?: string | null;
  tool_call_id?: string | null;
  source_order?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_tokens?: number | null;
  cache_write_tokens?: number | null;
  reasoning_tokens?: number | null;
  context_limit?: number | null;
  context_tokens?: number | null;
  duration_ms?: number | null;
  estimated?: number | null;
  exit_code?: number | null;
  before_tokens?: number | null;
  after_tokens?: number | null;
  system_tokens?: number | null;
  conversation_tokens?: number | null;
  tool_tokens?: number | null;
  reported_skills?: Array<string>;
  reported_mcp_servers?: Array<string>;
};

export type SessionMcpRow = {
  server_name: string;
  call_count: number;
  err_count: number;
  first_ts?: number | null;
  last_ts: number | null;
  total_duration_ms: number | null;
};

export type SessionProcessRow = {
  pid: number;
  tool: string | null;
  role: string | null;
  joined_at: number | null;
};

export type SettingsPermissionWrite = {
  scope: string;
  expected_mtime: number | null;
  permissions: {
    allow: Array<string>;
    ask?: Array<string>;
    deny: Array<string>;
  };
};

export type SettingsToolConfig = {
  tool: string;
  model?: string | null;
  auto_update?: boolean | null;
  launch_at_startup?: boolean | null;
  configured_only?: boolean;
  config_files?: Array<string>;
  extensions?: Array<string>;
  hints?: Array<string>;
  mcp_servers?: Array<string>;
  features?: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>;
  feature_groups?: Record<string, Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>>;
  settings?: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>;
  sections?: Array<{
    id?: string;
    title?: string;
    key?: string;
    label?: string;
    rows: Array<{
      key: string;
      label?: string;
      value?: Record<string, unknown> | Array<unknown> | string | number | boolean | null;
      source?: string | null;
      set?: boolean;
      kind?: string;
      group?: string | null;
      scope?: string;
      line?: number;
      note?: string;
      wins?: number;
      locked?: boolean;
      danger?: boolean;
      documented?: boolean;
      chain?: Array<{
        scope?: string;
        value?: Record<string, unknown> | Array<unknown> | string | number | boolean | null;
        source?: string | null;
        line?: number;
        set?: boolean;
        locked?: boolean;
        wins?: boolean;
      }>;
      agent?: {
        name?: string;
        description?: string;
        model?: string;
        model_policy?: string;
        effort?: string;
        context_tier?: string;
        target?: string;
        tools?: Array<string>;
        defined_in?: string;
        defined_line?: number;
        pinned_in?: string;
        pinned_line?: number;
        inherits?: boolean;
        scope_defined?: string;
        scope_pinned?: string;
      };
    }>;
  }>;
  scopes?: Array<{
    id?: string;
    path?: string;
    scope?: string;
    label?: string;
    name?: string;
    exists?: boolean;
    changeable?: boolean;
    note?: string;
    vars?: Array<string>;
  }>;
  env_vars?: Array<{
    name?: string;
    key?: string;
    value?: string | null;
    set?: boolean;
    masked?: boolean;
    in_process?: boolean;
    process?: string | null;
    label?: string;
    description?: string;
    drives?: Array<{
      key: string;
      label: string;
    }>;
    persisted?: Array<{
      origin: string;
      kind: string;
      value: string | null;
    }>;
    source?: string | null;
  }>;
  otel?: {
    enabled?: boolean | null;
    endpoint?: string | null;
    exporter?: string | null;
    capture_content?: boolean | null;
    source?: string | null;
  };
  configurable_models?: Array<{
    id?: string;
    name?: string;
    label?: string;
  }>;
  local_data?: Record<string, boolean>;
};

export type TableInventory = {
  attempted_at: number | null;
  checked_at: number | null;
  last_error: string | null;
  limit: number;
  refresh_interval_s: number;
  scope: string;
  size_scope: string;
  status: string;
  truncated: boolean | null;
  tables: Array<{
    name: string;
    rows: number | null;
    compressed_bytes: number | null;
    extent_bytes: number | null;
    extent_count: number | null;
    hot_bytes: number | null;
    original_bytes: number | null;
    retention_days?: number | null;
  }>;
};

export type TerminalResourceFile = {
  path: string;
  kind: string;
  size: number;
  tokens: number;
  tool?: string;
  scope?: string;
  sent_to_llm?: string;
  loaded_when?: string;
  cacheable?: string;
  survives_compaction?: string;
  mtime?: number;
};

export type TerminalResourceLiveTool = {
  session_count?: number;
  pid_count?: number;
  inbound_bytes?: number;
  outbound_bytes?: number;
  inbound_rate_bps?: number;
  outbound_rate_bps?: number;
  cpu_percent?: number;
  peak_cpu_percent?: number;
  workspace_size_mb?: number;
  files_touched?: number;
  file_events?: number;
  state_bytes_written?: number;
  token_estimate?: {
    input_tokens?: number;
    output_tokens?: number;
    source?: string;
  };
  mcp?: {
    detected?: boolean;
    loops?: number;
  };
};

export type TerminalResourceProcess = {
  pid: number;
  tool?: string;
  name: string;
  cmdline: string;
  process_type?: string;
  expected_mem_mb?: string;
  known_leak?: boolean;
  zombie_risk?: string;
  cleanup_cmd?: string;
  anomalies?: Array<Record<string, unknown>>;
};

export type TopicCatalogBoard = {
  scope: string;
  field: "tool_labels";
  value: BoardToolLabels;
};

export type TopicConfigurationBoard = {
  scope: string;
  field: "settings_at";
  value: BoardSettingsAt;
} | {
  scope: string;
  field: "project_prompts_searched";
  value: [];
  collection: true;
} | {
  scope: string;
  field: "project_prompts_searched";
  value: string;
  key: string;
  order: number;
  merge?: boolean;
} | {
  scope: string;
  field: "skills";
  value: {
    scope: string | null;
    path: string | null;
    description: string | null;
    file_tokens: number | null;
  };
  key: string;
  order: number;
  merge?: boolean;
} | {
  scope: string;
  field: "project_prompts";
  value: {
    file: string;
    project: string;
    configured_only: true;
  };
  key: string;
  order: number;
  merge?: boolean;
};

export type TopicConfigurationFile = {
  configured_only: boolean;
  tool_configs: Array<SettingsToolConfig>;
};

export type TopicConfigurationLoaded = {
  session_id: string;
  native_session_id: string | null;
  tool: string;
  configured_on_disk: boolean;
  effective_known: boolean;
  unknown: Array<string>;
  evidence: Array<{
    key: string;
    observed_at: number;
    source: string;
    value: Record<string, unknown> | Array<unknown> | string | number | boolean | null;
  }>;
};

export type TopicHistoryAgent = {
  agent_id: string;
  view: "detail";
  status: 200;
  value: DetailAgent;
} | {
  agent_id: string;
  view: "flow";
  status: 200;
  value: DetailAgentFlow;
} | {
  agent_id: string;
  view: "transcript";
  status: 200;
  value: DetailAgentTranscript;
} | {
  agent_id: string;
  view: "detail" | "flow" | "transcript";
  status: number;
  value: null;
};

export type TopicHistoryBoard = {
  scope: string;
  field: "agents";
  value: [];
  collection: true;
} | {
  scope: string;
  field: "agents";
  value: HistoryAgentRow;
  key: string;
  order: number;
  merge?: boolean;
} | {
  scope: string;
  field: "attention";
  value: [];
  collection: true;
} | {
  scope: string;
  field: "attention";
  value: {
    kind: string;
    agent_id: string;
    title: string;
    detail: string;
    tokens: number | null;
    cost_usd: number | null;
    since_ts: number;
  };
  key: string;
  order: number;
  merge?: boolean;
} | {
  scope: string;
  field: "by_model";
  value: [];
  collection: true;
} | {
  scope: string;
  field: "by_model";
  value: {
    model: string;
    agents: number;
    msgs: number;
    tokens: number;
    input: number | null;
    output: number | null;
    cache_read: number | null;
    cache_write: number | null;
    cached_share: number | null;
    cost_usd: number | null;
    p95_ms: number | null;
    agent_ids: Array<string>;
  };
  key: string;
  order: number;
  merge?: boolean;
} | {
  scope: string;
  field: "by_role";
  value: [];
  collection: true;
} | {
  scope: string;
  field: "by_role";
  value: {
    kind: string;
    runs: number;
    msgs: number;
    tokens: number;
    cost_usd: number | null;
    fail_rate: number | null;
  };
  key: string;
  order: number;
  merge?: boolean;
} | {
  scope: string;
  field: "capture_mode";
  value: BoardCaptureMode;
} | {
  scope: string;
  field: "changes";
  value: BoardChanges;
} | {
  scope: string;
  field: "confirms";
  value: BoardConfirms;
} | {
  scope: string;
  field: "coverage";
  value: BoardCoverage;
} | {
  scope: string;
  field: "credits";
  value: BoardCredits;
} | {
  scope: string;
  field: "errors";
  value: [];
  collection: true;
} | {
  scope: string;
  field: "errors";
  value: {
    key: string;
    kind: string;
    count: number;
    agents: number;
    last_ts: number | null;
    sample: string | null;
  };
  key: string;
  order: number;
  merge?: boolean;
} | {
  scope: string;
  field: "generated_at";
  value: BoardGeneratedAt;
} | {
  scope: string;
  field: "kpis";
  value: HistoryKpis;
} | {
  scope: string;
  field: "latency";
  value: [];
  collection: true;
} | {
  scope: string;
  field: "latency";
  value: {
    what: string;
    count: number | null;
    p50_ms: number | null;
    p95_ms: number | null;
    p99_ms: number | null;
    max_ms: number | null;
  };
  key: string;
  order: number;
  merge?: boolean;
} | {
  scope: string;
  field: "loops";
  value: [];
  collection: true;
} | {
  scope: string;
  field: "loops";
  value: BoardLoopRow;
  key: string;
  order: number;
  merge?: boolean;
} | {
  scope: string;
  field: "memory_files";
  value: [];
  collection: true;
} | {
  scope: string;
  field: "memory_files";
  value: {
    path: string;
    read_by: string;
    category?: string;
    scope: string;
    tokens: number | null;
    lines_added: number | null;
    lines_removed: number | null;
    changed_by: string | null;
    changed_ts: number | null;
    node_id?: string;
  };
  key: string;
  order: number;
  merge?: boolean;
} | {
  scope: string;
  field: "options";
  value: BoardOptions;
} | {
  scope: string;
  field: "project_prompts";
  value: [];
  collection: true;
} | {
  scope: string;
  field: "project_prompts";
  value: {
    project: string;
    file?: string;
    uses: number;
    last_ts: number | null;
    recorded_file: string;
  };
  key: string;
  order: number;
  merge?: boolean;
} | {
  scope: string;
  field: "projects";
  value: [];
  collection: true;
} | {
  scope: string;
  field: "projects";
  value: {
    project: string;
    agents: number;
    prompts: number | null;
    msgs: number;
    tokens: number;
    cached_share: number | null;
    cost_usd: number | null;
    tool_calls: number | null;
    fail_rate: number | null;
    test_runs: number | null;
    test_passed: number | null;
    lines_added: number | null;
    lines_removed: number | null;
    api_errors: number;
    loops: number;
    p95_ms: number | null;
  };
  key: string;
  order: number;
  merge?: boolean;
} | {
  scope: string;
  field: "prompts";
  value: [];
  collection: true;
} | {
  scope: string;
  field: "prompts";
  value: {
    id?: string;
    node_id?: string;
    ts: number;
    session_id: string;
    agent_id: string;
    project: string;
    text: string;
    prompt_file: string | null;
    tokens: number | null;
  };
  key: string;
  order: number;
  merge?: boolean;
} | {
  scope: string;
  field: "prompts_total";
  value: BoardPromptsTotal;
} | {
  scope: string;
  field: "range";
  value: BoardRange;
} | {
  scope: string;
  field: "saved_usd";
  value: BoardSavedUsd;
} | {
  scope: string;
  field: "scope";
  value: BoardScope;
} | {
  scope: string;
  field: "series";
  value: BoardSeries;
} | {
  scope: string;
  field: "skills";
  value: [];
  collection: true;
} | {
  scope: string;
  field: "skills";
  value: {
    name: string;
    uses: number;
    tokens: number | null;
    agents: number;
    scope?: string | null;
    path?: string | null;
    description?: string | null;
    file_tokens?: number | null;
  };
  key: string;
  order: number;
  merge?: boolean;
} | {
  scope: string;
  field: "sources";
  value: [];
  collection: true;
} | {
  scope: string;
  field: "sources";
  value: {
    tool: string;
    label: string;
    data_from: string;
    last_data_ts: number | null;
    locations: Array<{
      path: string;
      found_by: string;
    }>;
  };
  key: string;
  order: number;
  merge?: boolean;
} | {
  scope: string;
  field: "tests";
  value: [];
  collection: true;
} | {
  scope: string;
  field: "tests";
  value: {
    command: string;
    runs: number;
    failed: number;
    median_ms: number | null;
    state: string;
    last_ts: number;
    project?: string;
    node_id?: string;
  };
  key: string;
  order: number;
  merge?: boolean;
} | {
  scope: string;
  field: "tests_piped";
  value: BoardTestsPiped;
} | {
  scope: string;
  field: "tools";
  value: [];
  collection: true;
} | {
  scope: string;
  field: "tools";
  value: {
    name: string;
    server: boolean;
    calls: number;
    failed: number;
    fail_rate: number | null;
    p50_ms: number | null;
    p95_ms: number | null;
    max_ms: number | null;
    mcp_server: string | null;
    avg_input_bytes: number | null;
    avg_output_bytes: number | null;
    output_bytes: number | null;
    trend: Array<number | null>;
  };
  key: string;
  order: number;
  merge?: boolean;
} | {
  scope: string;
  field: "unpriced";
  value: BoardUnpriced;
};

export type TopicRuntimeAgent = {
  id: string;
  session_id: string;
  native_session_id: string | null;
  monitor_session_id: string | null;
  tool: string;
  project: string;
  project_path: string;
  pids: Array<number>;
  running: boolean;
  native_activity: string;
  status: string;
  cpu_percent: number | null;
  mem_mb: number | null;
  started_at: number | null;
  last_native_at: number | null;
  status_evidence?: string | null;
  unlinked_reason?: string | null;
  title?: string | null;
  parent_id?: string | null;
};

export type TopicRuntimeHealth = HealthLocal | {
  inventory: TableInventory;
};

export type TopicRuntimeMachine = MachineLocal;

export type TopicRuntimeOutput = {
  session_id: string;
  native_session_id: string | null;
  tool: string;
  entry_id: string;
  event_id: string;
  order: number;
  kind: string;
  text: string;
  ts: number;
  agent_id: string | null;
  progress: string | null;
  content_retained: boolean;
  text_suppressed: boolean;
  text_truncated: boolean;
  tail_truncated: boolean;
};

export type TopicRuntimeProcess = {
  pid: number;
  ppid: number | null;
  created_at: number | null;
  name: string;
  tool: string;
  cwd: string | null;
  cpu_percent: number | null;
  memory_rss_bytes: number | null;
  present: boolean;
  session_id: string | null;
};

export type TopicSourceStatus = {
  ready: boolean;
  pending: boolean;
  stale: boolean;
  error: string | null;
  reason: string | null;
  topic: string;
  producer: string;
  component: "configuration";
} | {
  ready: boolean;
  pending: boolean;
  stale: boolean;
  error: string | null;
  reason: string | null;
  topic: string;
  topics: Array<string>;
  computed_at?: number;
  checked_at?: number;
  component: "health";
} | {
  ready: boolean;
  pending: boolean;
  stale: boolean;
  error: string | null;
  reason: string | null;
  topic: string;
  scope: string;
  computed_at?: number;
  attempted_at?: number;
  consistency?: string;
  reader_ready?: boolean;
  refresh_pending?: boolean;
  incomplete?: boolean;
  retryable?: boolean;
  unresolved_families?: Array<string>;
  frontier?: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>;
  component: "history";
} | {
  ready: boolean;
  stale: boolean;
  reason: string | null;
  frontier: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>;
  details: Record<string, Record<string, unknown> | Array<unknown> | string | number | boolean | null>;
  component: "history_reader";
} | {
  producer: string;
  mode: string;
  observed_at: number | null;
  process_count: number | null;
  ready: boolean;
} | {
  producer: string;
  mode: string;
  fallback: boolean;
  poll_interval_s: number;
  discovery_batch: number;
  discovery_reconcile_s: number;
  active_files: number;
  native_file_capacity: number;
  native_file_capacity_reached: boolean;
  capture: string;
  candidate_capacity_reached: boolean;
  discarded_oversize_lines: number;
  native_record_gaps: number;
  tail_truncated: boolean;
  native_metadata_limited: boolean;
  detail: string;
};

export type TranscriptTurn = {
  ts: number;
  end_ts: number;
  prompt: string;
  prompt_preview: string;
  prompt_event: boolean;
  response: string;
  response_preview: string;
  model: string;
  tokens: UsageTokens;
  api_calls: number;
  duration_ms: number;
  wall_ms: number;
  reply_ms: number | null;
  tool_use_count: number;
  detail?: boolean;
  actions: Array<{
    kind: string;
    ts: number;
    name?: string | null;
    target?: string | null;
    text?: string | null;
    summary?: string | null;
    duration_ms?: number | null;
    success?: boolean | null;
    model?: string | null;
    tokens?: UsageTokens;
  }>;
};

export type TurnMark = {
  turn: number;
  offset: number;
  ts: number;
  end_ts: number;
  events: number;
  tokens: number;
  tools: number;
  errors: number;
  subagents: number;
  prompt: string;
};

export type UsageTokens = {
  input: number | null;
  output: number | null;
  cache_read: number | null;
  cache_creation: number | null;
  total?: number | null;
};

export interface BoardFields {
  agents: BoardAgents;
  attention: BoardAttention;
  by_model: BoardByModel;
  by_role: BoardByRole;
  capture_mode: BoardCaptureMode;
  changes: BoardChanges;
  confirms: BoardConfirms;
  coverage: BoardCoverage;
  credits: BoardCredits;
  errors: BoardErrors;
  generated_at: BoardGeneratedAt;
  kpis: BoardKpis;
  latency: BoardLatency;
  loops: BoardLoops;
  memory_files: BoardMemoryFiles;
  node_scope: BoardNodeScope;
  options: BoardOptions;
  processes: BoardProcesses;
  project_prompts: BoardProjectPrompts;
  project_prompts_searched: BoardProjectPromptsSearched;
  projects: BoardProjects;
  prompts: BoardPrompts;
  prompts_total: BoardPromptsTotal;
  range: BoardRange;
  saved_usd: BoardSavedUsd;
  scope: BoardScope;
  self: BoardSelf;
  series: BoardSeries;
  settings_at: BoardSettingsAt;
  skills: BoardSkills;
  sources: BoardSources;
  tests: BoardTests;
  tests_piped: BoardTestsPiped;
  tool_labels: BoardToolLabels;
  tools: BoardTools;
  unpriced: BoardUnpriced;
}

export interface LiveTopicData {
  "catalog.board": TopicCatalogBoard;
  "configuration.board": TopicConfigurationBoard;
  "configuration.file": TopicConfigurationFile;
  "configuration.loaded": TopicConfigurationLoaded;
  "history.agent": TopicHistoryAgent;
  "history.board": TopicHistoryBoard;
  "runtime.agent": TopicRuntimeAgent;
  "runtime.health": TopicRuntimeHealth;
  "runtime.machine": TopicRuntimeMachine;
  "runtime.output": TopicRuntimeOutput;
  "runtime.process": TopicRuntimeProcess;
  "source.status": TopicSourceStatus;
}

export interface DetailResponses {
  "/api/api-calls": DetailApiCalls;
  "/api/board/agent": DetailAgent;
  "/api/board/agent/checkpoint/files": DetailCheckpointFiles;
  "/api/board/agent/flow": DetailAgentFlow;
  "/api/board/agent/kql": DetailKqlTemplates;
  "/api/board/agent/recalls": DetailMemoryRecalls;
  "/api/board/agent/transcript": DetailAgentTranscript;
  "/api/board/context": DetailContext;
  "/api/board/error": DetailError;
  "/api/board/excerpt": DetailExcerpt;
  "/api/board/file": DetailFile;
  "/api/board/machine": DetailMachine;
  "/api/board/memory/diff": DetailMemoryDiff;
  "/api/board/memory/versions": DetailMemoryVersions;
  "/api/board/nodes": DetailNodes;
  "/api/board/prompt": DetailPrompt;
  "/api/board/session/records": DetailSessionRecords;
  "/api/board/sessions": DetailSessions;
  "/api/board/skill": DetailSkill;
  "/api/board/terminal/events": DetailTerminalEvents;
  "/api/board/terminal/file": DetailTerminalFile;
  "/api/board/terminal/metrics": DetailTerminalMetrics;
  "/api/board/terminal/resources": DetailTerminalResources;
  "/api/board/terminal/sessions": DetailTerminalSessions;
  "/api/board/tool": DetailTool;
  "/api/context-audit": DetailContextAudit;
  "/api/copilot-sessions": DetailCopilotSessions;
  "/api/copilot-sessions/{id}": DetailCopilotSession;
  "/api/copilot-sessions/{id}/artifact": DetailCopilotArtifact;
  "/api/copilot-sessions/{id}/artifacts": DetailCopilotArtifacts;
  "/api/effective-models": DetailEffectiveModels;
  "/api/events": DetailEvents;
  "/api/events/count": DetailEventsCount;
  "/api/history/board": DetailBoardHistory;
  "/api/hooks-status": DetailHooksStatus;
  "/api/otel-status": DetailOtelStatus;
  "/api/samples": DetailSamples;
  "/api/session-commits": DetailSessionCommits;
  "/api/session-evidence": DetailSessionEvidence;
  "/api/session-mcp-usage": DetailSessionMcpUsage;
  "/api/session-processes": DetailSessionProcesses;
  "/api/session-stats": DetailSessionTeam;
  "/api/settings/file": DetailSettingsFile;
  "/api/settings/files": DetailSettingsFiles;
  "/api/settings/tools": DetailSettingsTools;
  "/api/tool-config/{tool}": DetailToolConfig;
}
