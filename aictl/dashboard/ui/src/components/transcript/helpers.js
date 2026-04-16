// Formatting helpers shared by transcript sub-components.
export function fmtDur(ms) {
  if (ms == null || isNaN(ms) || ms <= 0) return '';
  const sec = Math.round(ms / 1000);
  if (sec < 60) return sec + 's';
  const m = Math.floor(sec / 60);
  if (m < 60) return m + 'm ' + (sec % 60) + 's';
  const h = Math.floor(m / 60);
  return h + 'h ' + (m % 60) + 'm';
}

export function fmtHHMMSS(ts) {
  return new Date(ts * 1000).toLocaleTimeString([], {
    hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function shortModel(m) {
  if (!m) return '';
  return m.replace('claude-', '').replace('gpt-', '').replace(/-\d{8}$/, '');
}

export function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '\u2026' : s;
}

export const ACTION_ICONS = {
  tool_use: '\uD83D\uDD27',
  api_call: '\uD83C\uDF10',
  api_response: '\uD83D\uDCE8',
  file_edit: '\uD83D\uDCDD',
  compaction: '\uD83D\uDDDC\uFE0F',
  subagent: '\uD83E\uDD16',
  error: '\u274C',
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
