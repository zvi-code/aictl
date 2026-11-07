import { describe, it, expect } from 'vitest';
import { fmtSz, fmtAgo } from '../src/utils.js';

// ─── fmtSz (bytes compact) ────────────────────────────────────
describe('fmtSz', () => {
  it('formats bytes', () => expect(fmtSz(512)).toBe('512B'));
  it('formats KB', () => expect(fmtSz(2048)).toBe('2KB'));
  it('formats MB', () => expect(fmtSz(5 * 1024 * 1024)).toBe('5MB'));
  it('formats GB', () => expect(fmtSz(2.5 * 1024 * 1024 * 1024)).toBe('2.5GB'));
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
