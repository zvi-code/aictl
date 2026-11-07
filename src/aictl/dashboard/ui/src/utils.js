// ─── Constants (injected by Python into window at serve-time) ───
export const COLORS = window.COLORS ?? {};

export const THEMES = ['auto','dark','light'];

// ─── Number formatting (max 3 display digits, compact units) ──

/**
 * Format a scaled value to at most 3 display digits.
 *   0.1 → "0.1", 1.23 → "1.2", 9.87 → "9.9", 12.3 → "12", 999 → "999"
 */
function _d3(v) {
  if (v >= 10) return String(Math.round(v));
  const s = v.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

/**
 * Pick the right unit and format to ≤3 digits.
 * @param {number} value - raw value
 * @param {Array<[number, string]>} units - [[divisor, suffix], ...] smallest-first
 * @param {string} base - base suffix when value is below smallest unit
 */
function _compact(value, units, base) {
  for (let i = units.length - 1; i >= 0; i--) {
    const [d, s] = units[i];
    const scaled = value / d;
    if (scaled >= 1.0) {
      return _d3(scaled) + s;
    }
  }
  return Math.round(value) + base;
}

const _BYTES = [[1024, 'KB'], [1048576, 'MB'], [1073741824, 'GB'], [1099511627776, 'TB']];

export function fmtSz(n) { return _compact(n, _BYTES, 'B'); }

export function fmtAgo(mtime) {
  if(!mtime) return '';
  const sec = Math.floor(Date.now()/1000 - mtime);
  if(sec<0) return '';
  if(sec<60) return sec+'s ago';
  if(sec<3600) return Math.floor(sec/60)+'m ago';
  if(sec<86400) return Math.floor(sec/3600)+'h ago';
  return Math.floor(sec/86400)+'d ago';
}
