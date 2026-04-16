// Formatting helpers shared by session-flow sub-components.
export function fmtDur(ms) {
  if (ms == null || isNaN(ms) || ms <= 0) return '';
  const sec = Math.round(ms / 1000);
  if (sec < 60) return sec + 's';
  const m = Math.floor(sec / 60);
  if (m < 60) return m + 'm ' + (sec % 60) + 's';
  const h = Math.floor(m / 60);
  return h + 'h ' + (m % 60) + 'm';
}

export function fmtDurSec(sec) {
  if (sec == null || isNaN(sec)) return '\u2014';
  const s = Math.round(sec);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ' + (s % 60) + 's';
  const h = Math.floor(m / 60);
  return h + 'h ' + (m % 60) + 'm';
}

export function fmtHHMM(ts) {
  return new Date(ts * 1000).toLocaleTimeString([], {hourCycle:'h23', hour:'2-digit', minute:'2-digit'});
}

export function fmtHHMMSS(ts) {
  return new Date(ts * 1000).toLocaleTimeString([], {hourCycle:'h23', hour:'2-digit', minute:'2-digit', second:'2-digit'});
}

export function shortModel(m) {
  if (!m) return '';
  return m.replace('claude-', '').replace(/-\d{8}$/, '');
}

// Short session label — PID for correlator IDs, last 6 chars otherwise.
export function shortSid(sid) {
  if (!sid) return '';
  const parts = sid.split(':');
  if (parts.length === 3 && /^\d+$/.test(parts[1])) return parts[1];
  return sid.slice(-6);
}

// Extract the most meaningful field from tool_parameters JSON.
export function extractToolArgs(toolName, params) {
  if (!params) return '';
  let parsed = params;
  if (typeof params === 'string') {
    try { parsed = JSON.parse(params); } catch { return params.slice(0, 80); }
  }
  if (typeof parsed !== 'object' || parsed === null) return String(params).slice(0, 80);
  const keyPriority = [
    'command', 'file_path', 'pattern', 'query', 'path', 'url',
    'prompt', 'description', 'old_string', 'content', 'skill',
  ];
  for (const key of keyPriority) {
    if (parsed[key]) {
      let val = String(parsed[key]);
      if ((key === 'file_path' || key === 'path') && val.length > 60) {
        const parts = val.replace(/\\/g, '/').split('/');
        val = '.../' + parts.slice(-2).join('/');
      }
      return val.slice(0, 100);
    }
  }
  const keys = Object.keys(parsed);
  if (keys.length > 0) return String(parsed[keys[0]]).slice(0, 80);
  return '';
}

// Palette for tool/skill participants — consistent per name via hash.
const _SF_PALETTE = [
  '#f97316','#a78bfa','#60a5fa','#f472b6',
  '#34d399','#fbbf24','#06b6d4','#84cc16',
  '#e11d48','#0ea5e9','#c084fc','#fb923c',
];
const _SF_FIXED = { Bash: '#1a1a1a' };
export function sfColor(name) {
  if (_SF_FIXED[name]) return _SF_FIXED[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return _SF_PALETTE[h % _SF_PALETTE.length];
}
