// Static dashboard layout configuration.
// Replaces the former schema-driven layout fetched from /api/layout.

export const LAYOUT = {
  sparklines: [
    {
      field: 'files', label: 'Files',
      color: 'var(--accent)', format: 'raw', dp: 'overview.files',
    },
    {
      field: 'tokens', label: 'Tokens',
      color: 'var(--green)', format: 'kilo', dp: 'overview.tokens',
    },
    {
      field: 'cpu', label: 'CPU',
      color: 'var(--orange)', format: 'percent', smooth: true, dp: 'overview.cpu',
      refLines: [
        { valueExpr: '100', label: '1 core' },
      ],
    },
    {
      field: 'mem_mb', label: 'Proc RAM',
      color: 'var(--yellow)', format: 'size', smooth: true, multiply: 1048576, dp: 'overview.mem_mb',
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

  tabs: [
    // iconName: Lucide icon for use with <Icon name=/>. Emoji `icon` kept for
    // backward-compat until app.js migrates tab buttons to the Icon primitive.
    // TODO(agent-J): migrate tab icons to <Icon name={t.iconName}/> and drop `icon`.
    { id: 'overview', label: 'Dashboard',        icon: '\uD83D\uDCCA', iconName: 'layout-dashboard', key: '1' },
    { id: 'explorer', label: 'Session Explorer', icon: '\uD83D\uDD0D', iconName: 'search',           key: '7' },
    { id: 'procs',    label: 'Processes',        icon: '\u2699\uFE0F', iconName: 'cpu',              key: '2' },
    { id: 'memory',   label: 'AI Context',       icon: '\uD83D\uDCDD', iconName: 'brain',            key: '3' },
    { id: 'live',     label: 'Live Monitor',     icon: '\uD83D\uDCE1', iconName: 'radio',            key: '4' },
    { id: 'events',   label: 'Events & Stats',   icon: '\uD83D\uDCC8', iconName: 'activity',         key: '5' },
    { id: 'budget',   label: 'Token Budget',     icon: '\uD83D\uDCB0', iconName: 'coins',           key: '6' },
    { id: 'analytics', label: 'Analytics',        icon: '\uD83D\uDD2C', iconName: 'bar-chart-3',      key: '8' },
    { id: 'config',   label: 'Configuration',     icon: '\u2699\uFE0F', iconName: 'settings',         key: '0' },
    { id: 'agents',   label: 'Agents',             icon: '\uD83E\uDD16', iconName: 'bot',              key: '' },
    { id: 'prompts',  label: 'Prompts',             icon: '\u270F',       iconName: 'pen',              key: '' },
  ],

  eventTimeline: { maxDots: 200 },

  resourceBars: {
    traffic: true,
    files: true,
  },
};
