// Domain-specific constants shared across session_detail panels.
// Duration formatting moved to src/utils.js (fmtDurSec — takes SECONDS).

// Approximate context window size per model
export const MODEL_WINDOWS = {
  'claude-opus-4-6': 1000000, 'claude-sonnet-4.6': 1000000,
  'claude-sonnet-4': 200000, 'claude-haiku-4.5': 200000,
  'gpt-5.4': 200000, 'gpt-5': 128000,
};

// Known base overhead components (approximate token counts)
export const BASE_COMPONENTS = [
  {name: 'System prompt', tokens: 4200, color: 'var(--accent)'},
  {name: 'Environment info', tokens: 280, color: 'var(--fg2)'},
];

export const COMPACTION_PCT = 95;
