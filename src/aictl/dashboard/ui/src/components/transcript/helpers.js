// Domain-specific helpers for transcript sub-components.
// Generic formatters (fmtDurMs, fmtHHMMSS, shortModel) live in src/utils.js.

export function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// Action-kind → Lucide icon name (rendered via components/ui/Icon.js).
export const ACTION_ICONS = {
  tool_use: 'wrench',
  api_call: 'globe',
  api_response: 'mail',
  file_edit: 'file-pen',
  compaction: 'archive',
  subagent: 'bot',
  error: 'x',
};

export const ACTION_COLORS = {
  tool_use: 'var(--accent)',
  api_call: 'var(--green)',
  api_response: 'var(--fg2)',
  file_edit: 'var(--orange)',
  compaction: 'var(--yellow)',
  subagent: 'var(--accent)',
  error: 'var(--red)',
};
