// Domain-specific helpers for session-flow sub-components.
// Generic formatters (fmtDurMs, fmtDurSec, fmtHHMM, fmtHHMMSS, shortModel,
// shortSid) and the shared colour palette live in src/utils.js.
import { hashColor } from '../../utils.js';

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

// Colour for tool/skill participants — fixed overrides for well-known
// names, deterministic hash into the shared palette otherwise.
// (Bash previously used '#1a1a1a', which is invisible on dark themes.)
const _SF_FIXED = { Bash: '#84cc16' };
export function sfColor(name) {
  if (_SF_FIXED[name]) return _SF_FIXED[name];
  return hashColor(name);
}
