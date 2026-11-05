// Static dashboard layout configuration.
// Replaces the former schema-driven layout fetched from /api/layout.

export const LAYOUT = {
  sparklines: [
    {
      field: 'files', label: 'Files',
      color: 'var(--accent)', format: 'raw', dp: 'overview.files', iconName: 'file-text',
    },
    {
      field: 'tokens', label: 'Tokens',
      color: 'var(--green)', format: 'kilo', dp: 'overview.tokens', iconName: 'coins',
    },
    {
      field: 'cpu', label: 'CPU',
      color: 'var(--orange)', format: 'percent', smooth: true, dp: 'overview.cpu', iconName: 'cpu',
      refLines: [
        { valueExpr: '100', label: '1 core' },
      ],
    },
    {
      field: 'mem_mb', label: 'Proc RAM',
      color: 'var(--yellow)', format: 'size', smooth: true, multiply: 1048576, dp: 'overview.mem_mb', iconName: 'server',
    },
  ],

  inventory: [
    { field: 'total_processes', label: 'Processes', format: 'raw', dp: 'overview.total_processes' },
    { field: 'total_size', label: 'Disk Size', format: 'size', dp: 'overview.total_size' },
    { field: 'total_mcp_servers', label: 'MCP Servers', format: 'raw', dp: 'overview.total_mcp_servers' },
    { field: 'total_memory_tokens', label: 'AI Context', format: 'kilo', suffix: 't', dp: 'overview.total_memory_tokens' },
  ],

  liveMetrics: [
    { field: 'total_live_sessions', label: 'Sessions', format: 'raw', accent: true, dp: 'overview.total_live_sessions' },
    { field: 'total_live_estimated_tokens', label: 'Est. Tokens', format: 'kilo', suffix: 't', dp: 'overview.total_live_estimated_tokens' },
    { field: 'total_live_outbound_rate_bps', label: '\u2191 Outbound', format: 'rate', dp: 'overview.total_live_outbound_rate_bps' },
    { field: 'total_live_inbound_rate_bps', label: '\u2193 Inbound', format: 'rate', dp: 'overview.total_live_inbound_rate_bps' },
  ],

  // Navigation groups answer four questions: what is happening, what ran, what
  // did it cost, how is it set up. Ids are stable deep-link values; retired ids
  // resolve through TAB_ALIASES in hooks/urlState.js.
  navGroups: [
    { id: 'monitor', label: 'Monitor' },
    { id: 'work',    label: 'Sessions' },
    { id: 'spend',   label: 'Spend' },
    { id: 'setup',   label: 'Setup' },
  ],
  tabs: [
    { id: 'overview',  group: 'monitor', label: 'Overview',      iconName: 'layout-dashboard', key: '1' },
    { id: 'hidden',    group: 'monitor', label: 'Hidden context', iconName: 'eye-off',       key: 'h' },
    { id: 'live',      group: 'monitor', label: 'Live',          iconName: 'radio',            key: '2' },
    { id: 'procs',     group: 'monitor', label: 'Processes',     iconName: 'cpu',              key: '3' },
    { id: 'events',    group: 'monitor', label: 'Events',        iconName: 'activity',         key: '4' },
    { id: 'explorer',  group: 'work',    label: 'Explorer',      iconName: 'search',           key: '5' },
    { id: 'agents',    group: 'work',    label: 'Agents',        iconName: 'bot',              key: '6' },
    { id: 'prompts',   group: 'work',    label: 'Prompts',       iconName: 'pen',              key: '7' },
    { id: 'budget',    group: 'spend',   label: 'Budget',        iconName: 'coins',            key: '8' },
    { id: 'analytics', group: 'spend',   label: 'Analytics',     iconName: 'bar-chart-3',      key: '9' },
    { id: 'memory',    group: 'setup',   label: 'AI context',    iconName: 'brain',            key: '0' },
    { id: 'config',    group: 'setup',   label: 'Configuration', iconName: 'settings',         key: '-' },
  ],

  eventTimeline: { maxDots: 200 },

  resourceBars: {
    traffic: true,
    files: true,
  },
};
