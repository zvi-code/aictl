// Unit tests for the consolidated formatters in src/utils.js.
// These were previously duplicated across session_flow/helpers.js,
// transcript/helpers.js, session_detail/helpers.js, TabTimelineChart.js
// and several C*-tabs; utils.js is now the single canonical home.
import { describe, it, expect } from 'vitest';
import {
  fmtDurSec, fmtDurMs, fmtHHMM, fmtHHMMSS,
  shortSid, shortModel, hashColor, HASH_PALETTE, toolColor,
} from '../src/utils.js';

describe('fmtDurSec (input is SECONDS)', () => {
  it('returns em dash for missing values', () => {
    expect(fmtDurSec(null)).toBe('—');
    expect(fmtDurSec(undefined)).toBe('—');
    expect(fmtDurSec(NaN)).toBe('—');
  });

  it('formats seconds, minutes and hours', () => {
    expect(fmtDurSec(0)).toBe('0s');
    expect(fmtDurSec(45)).toBe('45s');
    expect(fmtDurSec(125)).toBe('2m 5s');
    expect(fmtDurSec(3725)).toBe('1h 2m');
  });

  it('rounds fractional seconds', () => {
    expect(fmtDurSec(59.6)).toBe('1m 0s');
    expect(fmtDurSec(1.4)).toBe('1s');
  });
});

describe('fmtDurMs (input is MILLISECONDS)', () => {
  it('returns empty string for missing/zero values', () => {
    expect(fmtDurMs(null)).toBe('');
    expect(fmtDurMs(undefined)).toBe('');
    expect(fmtDurMs(0)).toBe('');
    expect(fmtDurMs(NaN)).toBe('');
  });

  it('keeps millisecond precision below one second', () => {
    expect(fmtDurMs(500)).toBe('500ms');
    expect(fmtDurMs(42)).toBe('42ms');
  });

  it('shows decisecond precision below ten seconds', () => {
    expect(fmtDurMs(1500)).toBe('1.5s');
    expect(fmtDurMs(5000)).toBe('5s');
  });

  it('formats minutes and hours like fmtDurSec', () => {
    expect(fmtDurMs(65_000)).toBe('1m 5s');
    expect(fmtDurMs(3_725_000)).toBe('1h 2m');
  });

  it('is NOT interchangeable with fmtDurSec — the sec/ms distinction', () => {
    // 90 seconds vs 90 milliseconds: the old ambiguous fmtDur() copies
    // silently mixed these up when moved between directories.
    expect(fmtDurSec(90)).toBe('1m 30s');
    expect(fmtDurMs(90)).toBe('90ms');
    expect(fmtDurMs(90_000)).toBe('1m 30s');
  });
});

describe('fmtHHMM / fmtHHMMSS', () => {
  it('returns empty string for falsy timestamps', () => {
    expect(fmtHHMM(0)).toBe('');
    expect(fmtHHMM(null)).toBe('');
    expect(fmtHHMMSS(0)).toBe('');
    expect(fmtHHMMSS(null)).toBe('');
  });

  it('formats 24h clock times (locale-independent shape)', () => {
    const ts = 1_700_000_000;
    expect(fmtHHMM(ts)).toMatch(/^\d{2}:\d{2}$/);
    expect(fmtHHMMSS(ts)).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    // HH:MM:SS starts with the same HH:MM
    expect(fmtHHMMSS(ts).startsWith(fmtHHMM(ts))).toBe(true);
  });
});

describe('shortSid', () => {
  it('returns pid for correlator format tool:pid:ts', () => {
    expect(shortSid('claude:1234:1700000000')).toBe('1234');
  });

  it('returns last 6 chars otherwise', () => {
    expect(shortSid('abcdefghijkl')).toBe('ghijkl');
  });

  it('returns empty string for falsy input', () => {
    expect(shortSid(null)).toBe('');
    expect(shortSid('')).toBe('');
  });
});

describe('shortModel', () => {
  it('strips claude- prefix and date suffix', () => {
    expect(shortModel('claude-sonnet-4-20250101')).toBe('sonnet-4');
  });

  it('strips gpt- prefix (superset of the old session_flow variant)', () => {
    expect(shortModel('gpt-5.4')).toBe('5.4');
  });

  it('handles empty input', () => {
    expect(shortModel('')).toBe('');
    expect(shortModel(null)).toBe('');
  });
});

describe('hashColor', () => {
  it('is stable: same input → same colour', () => {
    expect(hashColor('Foo')).toBe(hashColor('Foo'));
    expect(hashColor('grinder')).toBe(hashColor('grinder'));
  });

  it('matches the old palette index for known names (h*31 & 0xffff hash)', () => {
    // Expected values computed with the exact algorithm that lived in
    // session_flow/helpers.js and TabTimelineChart.js before the move.
    const expected = (name) => {
      let h = 0;
      for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
      return HASH_PALETTE[h % HASH_PALETTE.length];
    };
    for (const name of ['Bash', 'Read', 'Foo', 'grinder', 'WebSearch', 'mcp__github']) {
      expect(hashColor(name)).toBe(expected(name));
    }
    // And pin two literal values so a palette reorder can't slip through:
    expect(hashColor('Bash')).toBe('#f97316');
    expect(hashColor('Foo')).toBe('#06b6d4');
  });

  it('falls back for empty names', () => {
    expect(hashColor('')).toBe('var(--fg2)');
    expect(hashColor(null)).toBe('var(--fg2)');
  });

  it('always returns a palette colour for non-empty names', () => {
    for (const name of ['a', 'zz', 'Agent', 'Skill:foo']) {
      expect(HASH_PALETTE).toContain(hashColor(name));
    }
  });
});

describe('toolColor', () => {
  it('falls back to var(--fg2) for unknown tools', () => {
    // window.COLORS is {} in tests (see test/setup.js)
    expect(toolColor('nonexistent-tool')).toBe('var(--fg2)');
    expect(toolColor(undefined)).toBe('var(--fg2)');
  });
});
