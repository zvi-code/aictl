// Formatting helpers + constants shared across session_detail panels.

export function fmtDur(sec) {
  if (sec == null || isNaN(sec)) return '\u2014';
  const s = Math.round(sec);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return m + 'm ' + r + 's';
  const h = Math.floor(m / 60);
  return h + 'h ' + (m % 60) + 'm';
}

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
