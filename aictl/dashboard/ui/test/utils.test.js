import { describe, it, expect } from 'vitest';
import {
  fmtK, fmtSz, fmtRate, fmtPct, fmtTok, fmtValue, fmtTime, fmtAgo,
  fmt, evalExpr, scopeLabel, shortDir, normPath, sma3, s2lColor, esc,
  liveTokenTotal,
} from '../src/utils.js';

// ─── fmtK (decimal compact) ────────────────────────────────────
describe('fmtK', () => {
  it('formats 0', () => expect(fmtK(0)).toBe('0'));
  it('formats small', () => expect(fmtK(42)).toBe('42'));
  it('formats thousands', () => expect(fmtK(1500)).toBe('1.5K'));
  it('formats millions', () => expect(fmtK(2500000)).toBe('2.5M'));
  it('formats 999', () => expect(fmtK(999)).toBe('999'));
  it('formats 1000', () => expect(fmtK(1000)).toBe('1K'));
});

// ─── fmtTok ────────────────────────────────────────────────────
describe('fmtTok', () => {
  it('formats zero', () => expect(fmtTok(0)).toBe('0'));
  it('formats large', () => expect(fmtTok(1200000)).toBe('1.2M'));
});

// ─── fmtSz (bytes compact) ────────────────────────────────────
describe('fmtSz', () => {
  it('formats bytes', () => expect(fmtSz(512)).toBe('512B'));
  it('formats KB', () => expect(fmtSz(2048)).toBe('2KB'));
  it('formats MB', () => expect(fmtSz(5 * 1024 * 1024)).toBe('5MB'));
  it('formats GB', () => expect(fmtSz(2.5 * 1024 * 1024 * 1024)).toBe('2.5GB'));
});

// ─── fmtRate ───────────────────────────────────────────────────
describe('fmtRate', () => {
  it('formats zero', () => expect(fmtRate(0)).toBe('0B/s'));
  it('formats null', () => expect(fmtRate(null)).toBe('0B/s'));
  it('formats negative', () => expect(fmtRate(-1)).toBe('0B/s'));
  it('formats bytes', () => expect(fmtRate(500)).toBe('0.5KB/s')); // threshold 0.1 means 500B→0.5KB
  it('formats KB', () => expect(fmtRate(2048)).toBe('2KB/s'));
});

// ─── fmtPct ────────────────────────────────────────────────────
describe('fmtPct', () => {
  it('formats zero', () => expect(fmtPct(0)).toBe('0%'));
  it('formats small', () => expect(fmtPct(3.7)).toBe('3.7%'));
  it('formats large', () => expect(fmtPct(85.3)).toBe('85%'));
  it('handles NaN', () => expect(fmtPct(NaN)).toBe('0%'));
});

// ─── fmtValue (widget-driven formatting) ───────────────────────
describe('fmtValue', () => {
  it('returns empty for null', () => expect(fmtValue(null)).toBe(''));
  it('returns empty for empty string', () => expect(fmtValue('')).toBe(''));
  it('formats size', () => expect(fmtValue(1048576, 'size')).toBe('1MB'));
  it('formats rate', () => expect(fmtValue(2048, 'rate')).toBe('2KB/s'));
  it('formats kilo', () => expect(fmtValue(5000, 'kilo')).toBe('5K'));
  it('formats percent', () => expect(fmtValue(45.6, 'percent')).toBe('46%'));
  it('applies multiplier', () => expect(fmtValue(5, 'raw', '', 10)).toBe('50'));
  it('appends suffix', () => expect(fmtValue(42, 'raw', ' items')).toBe('42 items'));
});

// ─── fmt (universal formatter) ─────────────────────────────────
describe('fmt', () => {
  it('returns dash for null', () => expect(fmt(null)).toBe('—'));
  it('returns dash for NaN', () => expect(fmt(NaN)).toBe('—'));
  it('formats bytes', () => expect(fmt(1024, 'bytes')).toBe('1KB'));
  it('formats tokens', () => expect(fmt(1500, 'tokens')).toBe('1.5K'));
  it('formats count default', () => expect(fmt(2000)).toBe('2K'));
  it('formats ms', () => expect(fmt(1500, 'ms')).toBe('1.5s'));
  it('formats small ms', () => expect(fmt(42, 'ms')).toBe('42ms'));
  it('formats pct', () => expect(fmt(45, 'pct')).toBe('45%'));
  it('formats bps', () => expect(fmt(0, 'bps')).toBe('0bps'));
});

// ─── fmtTime ───────────────────────────────────────────────────
describe('fmtTime', () => {
  it('returns dash for 0', () => expect(fmtTime(0)).toBe('—'));
  it('returns dash for null', () => expect(fmtTime(null)).toBe('—'));
  it('formats valid timestamp', () => {
    const ts = new Date('2024-06-15T10:30:00Z').getTime() / 1000;
    const result = fmtTime(ts);
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

// ─── fmtAgo ────────────────────────────────────────────────────
describe('fmtAgo', () => {
  it('returns empty for null', () => expect(fmtAgo(null)).toBe(''));
  it('returns seconds ago', () => {
    const ts = Date.now() / 1000 - 30;
    expect(fmtAgo(ts)).toMatch(/\d+s ago/);
  });
  it('returns minutes ago', () => {
    const ts = Date.now() / 1000 - 300;
    expect(fmtAgo(ts)).toMatch(/\d+m ago/);
  });
  it('returns hours ago', () => {
    const ts = Date.now() / 1000 - 7200;
    expect(fmtAgo(ts)).toMatch(/\d+h ago/);
  });
  it('returns days ago', () => {
    const ts = Date.now() / 1000 - 172800;
    expect(fmtAgo(ts)).toMatch(/\d+d ago/);
  });
});

// ─── evalExpr ──────────────────────────────────────────────────
describe('evalExpr', () => {
  it('returns number directly', () => expect(evalExpr(42, {})).toBe(42));
  it('evaluates expression', () => expect(evalExpr('a + b', { a: 10, b: 20 })).toBe(30));
  it('returns undefined for empty', () => expect(evalExpr('', {})).toBeUndefined());
  it('returns undefined for null', () => expect(evalExpr(null, {})).toBeUndefined());
  it('handles errors gracefully', () => expect(evalExpr('throw 1', {})).toBeUndefined());
});

// ─── scopeLabel ────────────────────────────────────────────────
describe('scopeLabel', () => {
  it('identifies project files', () => {
    expect(scopeLabel('/home/user/project/src/main.py', '/home/user/project')).toBe('project');
  });
  it('identifies shadow (claude projects)', () => {
    expect(scopeLabel('/home/user/.claude/projects/abc/file', '/other')).toBe('shadow');
  });
  it('identifies global (config)', () => {
    expect(scopeLabel('/home/user/.config/something', '/other')).toBe('global');
  });
  it('identifies global (claude)', () => {
    expect(scopeLabel('/home/user/.claude/settings.json', '/other')).toBe('global');
  });
  it('identifies global (copilot)', () => {
    expect(scopeLabel('/home/user/.copilot/config', '/other')).toBe('global');
  });
  it('identifies external', () => {
    expect(scopeLabel('/usr/lib/something', '/home/user/project')).toBe('external');
  });
});

// ─── shortDir ──────────────────────────────────────────────────
describe('shortDir', () => {
  it('returns relative dir for project files', () => {
    expect(shortDir('/home/user/project/src/main.py', '/home/user/project')).toBe('src');
  });
  it('returns (root) for root-level project files', () => {
    expect(shortDir('/home/user/project/main.py', '/home/user/project')).toBe('(root)');
  });
  it('returns dot-prefixed for dotfiles', () => {
    const result = shortDir('/home/user/.claude/settings.json', '/other');
    expect(result).toContain('.claude');
  });
});

// ─── normPath ──────────────────────────────────────────────────
describe('normPath', () => {
  it('converts backslashes', () => expect(normPath('C:\\Users\\test')).toBe('C:/Users/test'));
  it('passes forward slashes', () => expect(normPath('/home/user')).toBe('/home/user'));
  it('handles null', () => expect(normPath(null)).toBe(null));
});

// ─── sma3 (3-point moving average) ─────────────────────────────
describe('sma3', () => {
  it('handles empty array', () => expect(sma3([])).toEqual([]));
  it('handles single element', () => expect(sma3([5])).toEqual([5]));
  it('handles two elements', () => expect(sma3([2, 4])).toEqual([2, 4]));
  it('computes 3-point average', () => {
    const result = sma3([3, 6, 9, 12]);
    expect(result[0]).toBe(3);
    expect(result[1]).toBe((3 + 6) / 2);
    expect(result[2]).toBe((3 + 6 + 9) / 3);
    expect(result[3]).toBe((6 + 9 + 12) / 3);
  });
});

// ─── s2lColor ──────────────────────────────────────────────────
describe('s2lColor', () => {
  it('returns green for yes', () => expect(s2lColor('yes')).toBe('var(--green)'));
  it('returns green for YES', () => expect(s2lColor('YES')).toBe('var(--green)'));
  it('returns yellow for on-demand', () => expect(s2lColor('on-demand')).toBe('var(--yellow)'));
  it('returns orange for conditional', () => expect(s2lColor('conditional')).toBe('var(--orange)'));
  it('returns fg2 for unknown', () => expect(s2lColor('no')).toBe('var(--fg2)'));
  it('handles null', () => expect(s2lColor(null)).toBe('var(--fg2)'));
});

// ─── esc (HTML escaping) ───────────────────────────────────────
describe('esc', () => {
  it('returns empty for falsy', () => expect(esc('')).toBe(''));
  it('returns empty for null', () => expect(esc(null)).toBe(''));
  it('escapes HTML entities', () => {
    expect(esc('<script>alert("xss")</script>')).not.toContain('<script>');
  });
  it('preserves plain text', () => expect(esc('hello world')).toBe('hello world'));
});

// ─── liveTokenTotal ────────────────────────────────────────────
describe('liveTokenTotal', () => {
  it('sums input and output', () => {
    expect(liveTokenTotal({ token_estimate: { input_tokens: 100, output_tokens: 50 } })).toBe(150);
  });
  it('returns 0 for null', () => expect(liveTokenTotal(null)).toBe(0));
  it('returns 0 for empty', () => expect(liveTokenTotal({})).toBe(0));
});
