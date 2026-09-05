// Domain-specific constants shared across session_detail panels.
// Duration formatting moved to src/utils.js (fmtDurSec — takes SECONDS).
// Model context windows live in src/models.js (contextWindowFor).

// Known base overhead components (approximate token counts)
export const BASE_COMPONENTS = [
  {name: 'System prompt', tokens: 4200, color: 'var(--accent)'},
  {name: 'Environment info', tokens: 280, color: 'var(--fg2)'},
];

export const COMPACTION_PCT = 95;
