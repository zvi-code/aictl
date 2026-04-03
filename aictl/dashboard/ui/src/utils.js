// ─── Constants (injected by Python into window at serve-time) ───
export const COLORS = window.COLORS ?? {};
export const ICONS = window.ICONS ?? {};
export const VENDOR_LABELS = window.VENDOR_LABELS ?? {};
export const VENDOR_COLORS = window.VENDOR_COLORS ?? {};
export const HOST_LABELS = window.HOST_LABELS ?? {};
export const TOOL_RELATIONSHIPS = window.TOOL_RELATIONSHIPS ?? {};

export const SC = {running:'var(--green)',stopped:'var(--red)',error:'var(--orange)',unknown:'var(--fg2)'};
export const THEMES = ['auto','dark','light'];
export const THEME_ICONS = {auto:'\u263E',dark:'\u263E',light:'\u2600'};
export const TAIL_LINES = 5;
export const PREVIEW_LINES = 15;
export const MEM_LABELS = {'claude-user-memory':'Claude User Memory','claude-project-memory':'Claude Project Memory','claude-auto-memory':'Claude Auto Memory','copilot-agent-memory':'Copilot Agent Memory','copilot-session-state':'Copilot Session State','copilot-user-memory':'Copilot Instructions','codex-user-memory':'Codex Instructions','windsurf-user-memory':'Windsurf Global Rules'};
export const CAT_ORDER = ['instructions','config','rules','commands','skills','agent','memory','prompt','transcript','temp','runtime','credentials','extensions'];
export const RANGES = [
  {id:'live', label:'Live'},
  {id:'1h', label:'1h'},
  {id:'6h', label:'6h'},
  {id:'24h', label:'24h'},
  {id:'7d', label:'7d'},
];

export const EVENT_COLORS = {
  session_start: 'var(--green)', session_end: 'var(--red)',
  file_modified: 'var(--accent)', config_change: 'var(--yellow)',
  anomaly: 'var(--orange)', model_switch: 'var(--model-switch)',
  mcp_start: 'var(--green)', mcp_stop: 'var(--red)',
  process_exit: 'var(--red)', quota_warning: 'var(--orange)',
};

export const GROUP_MODES = [
  {id:'product', label:'Product'},
  {id:'vendor', label:'Vendor'},
  {id:'host', label:'Host'},
];

import { getFile } from './api.js';

// ─── Module-level shared state ─────────────────────────────────
export const fileCache = new Map(); // { path → { content, ts } }
const FILE_CACHE_TTL = 60_000; // 60 seconds

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
 * @param {number} threshold - min scaled value to use a unit (0.1 = aggressive, 1.0 = standard)
 */
function _compact(value, units, base, threshold = 1.0) {
  for (let i = units.length - 1; i >= 0; i--) {
    const [d, s] = units[i];
    const scaled = value / d;
    if (scaled >= threshold) {
      return _d3(scaled) + s;
    }
  }
  return Math.round(value) + base;
}

const _BYTES = [[1024, 'KB'], [1048576, 'MB'], [1073741824, 'GB'], [1099511627776, 'TB']];
const _DECIMAL = [[1000, 'K'], [1000000, 'M'], [1000000000, 'G']];
// Token-specific scale: same thresholds but 'G' avoids 'B' (bytes) ambiguity
const _TOKENS = [[1000, 'K'], [1000000, 'M'], [1000000000, 'G']];

export function fmtK(n) { return _compact(n, _DECIMAL, ''); }
export function fmtTok(n) { return _compact(n, _TOKENS, ''); }
export function fmtSz(n) { return _compact(n, _BYTES, 'B'); }
// Rates use threshold 0.1 — prefer "0.9KB/s" over "945B/s"
export function fmtRate(n) { return (!n || n <= 0) ? '0B/s' : _compact(n, [[1024, 'KB/s'], [1048576, 'MB/s'], [1073741824, 'GB/s']], 'B/s', 0.1); }
export function fmtPct(n) {
  const v = Number(n) || 0;
  if (v === 0) return '0%';
  if (v >= 10) return Math.round(v) + '%';
  return v.toFixed(1) + '%';
}
export function esc(s){if(!s)return'';const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
export function liveTokenTotal(live){const t=(live&&live.token_estimate)||{};return (t.input_tokens||0)+(t.output_tokens||0);}

/**
 * Universal number formatter for display.
 * All values formatted to max 3 display digits with compact units.
 */
export function fmt(value, unit = 'count') {
  if (value == null || isNaN(value)) return '\u2014';
  switch (unit) {
    case 'bytes':  return fmtSz(value);
    case 'tokens': return fmtK(value);
    case 'bps':    return (!value || value <= 0) ? '0bps' : _compact(value, [[1000, 'Kbps'], [1000000, 'Mbps']], 'bps');
    case 'pct':    return fmtPct(value);
    case 'ms':     return value >= 1000 ? _d3(value / 1000) + 's' : Math.round(value) + 'ms';
    case 'count':
    default:       return fmtK(value);
  }
}

/**
 * Format a UNIX timestamp as a short time string (HH:MM).
 * @param {number} ts - UNIX timestamp in seconds
 * @returns {string}
 */
export function fmtTime(ts) {
  if (!ts) return '\u2014';
  return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}

/** Normalise path separators to forward slashes (Windows compat). */
export function normPath(p) { return p ? p.replace(/\\/g, '/') : p; }

export function scopeLabel(path, root) {
  const p=normPath(path), r=normPath(root);
  if(p.startsWith(r+'/')) return 'project';
  if(p.includes('/.claude/projects/')) return 'shadow';
  if(p.includes('/.claude/')||p.includes('/.config/')||p.includes('/Library/')||p.includes('/AppData/')) return 'global';
  if(p.includes('/.copilot/')||p.includes('/.vscode/')) return 'global';
  return 'external';
}

export function shortDir(path, root) {
  const p=normPath(path), r=normPath(root);
  if(p.startsWith(r+'/')) {
    const rel=p.slice(r.length+1), parts=rel.split('/'); parts.pop();
    return parts.length ? parts.join('/') : '(root)';
  }
  const parts=p.split('/'); parts.pop();
  for(let i=parts.length-1;i>=0;i--) {
    if(parts[i].startsWith('.')&&parts[i].length>1&&parts[i]!=='..') return '~/'+parts.slice(i).join('/');
    if(parts[i]==='Library'||parts[i]==='AppData') return '~/'+parts.slice(i).join('/');
  }
  return parts.slice(-2).join('/');
}

export function groupByDir(files, root) {
  const groups={};
  files.forEach(f=>{const scope=scopeLabel(f.path,root),dir=shortDir(f.path,root);
    const label=scope==='project'?dir:scope+': '+dir;(groups[label]=groups[label]||[]).push(f);});
  const order={project:0,global:1,shadow:2,external:3};
  return Object.entries(groups).sort((a,b)=>{
    const sa=a[1][0]?scopeLabel(a[1][0].path,root):'z',sb=b[1][0]?scopeLabel(b[1][0].path,root):'z';
    return (order[sa]||9)-(order[sb]||9);
  });
}

export function sma3(arr) {
  if(arr.length<3) return arr.slice();
  const out=[arr[0],(arr[0]+arr[1])/2];
  for(let i=2;i<arr.length;i++) out.push((arr[i-2]+arr[i-1]+arr[i])/3);
  return out;
}

export async function fetchFileContent(path) {
  const cached = fileCache.get(path);
  if (cached && Date.now() - cached.ts < FILE_CACHE_TTL) return cached.content;
  const headers = {};
  if (cached && cached.etag) headers['If-None-Match'] = cached.etag;
  const res = await getFile(path, headers);
  if (res.status === 304 && cached) {
    cached.ts = Date.now();
    return cached.content;
  }
  if(!res.ok) throw new Error(res.statusText);
  const text = await res.text();
  const etag = res.headers.get('ETag') || null;
  fileCache.set(path, { content: text, ts: Date.now(), etag });
  return text;
}

export function fmtAgo(mtime) {
  if(!mtime) return '';
  const sec = Math.floor(Date.now()/1000 - mtime);
  if(sec<0) return '';
  if(sec<60) return sec+'s ago';
  if(sec<3600) return Math.floor(sec/60)+'m ago';
  if(sec<86400) return Math.floor(sec/3600)+'h ago';
  return Math.floor(sec/86400)+'d ago';
}

export function s2lColor(val) {
  const v = (val||'').toLowerCase();
  if(v==='yes') return 'var(--green)';
  if(v==='on-demand') return 'var(--yellow)';
  if(v==='conditional'||v==='partial') return 'var(--orange)';
  return 'var(--fg2)';
}

// ─── Value formatting (driven by widget config.format) ──────────
export function fmtValue(val, format, suffix, multiplier) {
  if(val == null || val === '') return '';
  let v = typeof val === 'number' ? val : parseFloat(val) || 0;
  if(multiplier) v *= multiplier;
  let out;
  switch(format) {
    case 'size':    out = fmtSz(v); break;
    case 'rate':    out = fmtRate(v); break;
    case 'kilo':    out = fmtK(v); break;
    case 'percent': out = fmtPct(v); break;
    case 'pct':     out = fmtPct(v); break;
    case 'raw':
    default:        out = Number.isInteger(v) ? String(v) : _d3(v);
  }
  return suffix ? out + suffix : out;
}

// ─── Expression evaluator for yMaxExpr / refLines.valueExpr ─────
export function evalExpr(expr, vars) {
  if(typeof expr === 'number') return expr;
  if(!expr) return undefined;
  try {
    const fn = new Function(...Object.keys(vars), 'return ' + expr);
    return fn(...Object.values(vars));
  } catch(e) { return undefined; }
}
