// dedupeSessions — defensive frontend dedup of /api/session-timeline rows.
// Backend dedup is handled separately; the UI must still collapse
// (1) exact session_id duplicates and (2) multi-source near-duplicates
// (same tool, started_at within 15s, duration within 5s — the
// duplicate-chip signature), while never merging distinct sessions.
import { describe, it, expect } from 'vitest';
import { dedupeSessions } from '../src/selectors.js';

const NOW = 1_770_000_000;

function sess(overrides = {}) {
  return {
    session_id: 'claude:sess-1',
    tool: 'claude-code',
    started_at: NOW - 600,
    ended_at: NOW - 300,
    duration_s: 300,
    input_tokens: 1000,
    output_tokens: 200,
    files_modified: 2,
    project: '/Users/zvi/Projects/aictl',
    ...overrides,
  };
}

describe('dedupeSessions — exact id duplicates', () => {
  it('collapses rows with the same session_id into one', () => {
    const rows = dedupeSessions([sess(), sess()]);
    expect(rows).toHaveLength(1);
    expect(rows[0].session_id).toBe('claude:sess-1');
  });

  it('keeps the row with the most recent activity', () => {
    const stale = sess({ ended_at: NOW - 400, duration_s: 200, git_branch: null });
    const fresh = sess({ ended_at: NOW - 100, duration_s: 500, git_branch: 'main' });
    const rows = dedupeSessions([stale, fresh]);
    expect(rows).toHaveLength(1);
    expect(rows[0].ended_at).toBe(NOW - 100);
    expect(rows[0].git_branch).toBe('main');
  });

  it('merges token/file counters as maxima so a stale dup cannot shrink them', () => {
    const partial = sess({ input_tokens: 5000, output_tokens: 900, files_modified: 7,
                           ended_at: NOW - 400 });
    const fresh   = sess({ input_tokens: 1000, output_tokens: 200, files_modified: 2,
                           ended_at: NOW - 100 });
    const [row] = dedupeSessions([partial, fresh]);
    expect(row.ended_at).toBe(NOW - 100);   // fresh row wins identity
    expect(row.input_tokens).toBe(5000);    // but counters merge as max
    expect(row.output_tokens).toBe(900);
    expect(row.files_modified).toBe(7);
  });

  it('dedups by fallback `id` field when session_id is missing (live snapshot rows)', () => {
    const a = { id: 'live-1', tool: 'claude-code', estimated_tokens: 10 };
    const b = { id: 'live-1', tool: 'claude-code', estimated_tokens: 20 };
    expect(dedupeSessions([a, b])).toHaveLength(1);
  });
});

describe('dedupeSessions — multi-source near-duplicates', () => {
  it('collapses same tool + started_at 3s apart + same duration (different ids)', () => {
    const fromOtel = sess({ session_id: 'otel:abc', started_at: NOW - 600, duration_s: 300 });
    const fromLog  = sess({ session_id: 'log:def',  started_at: NOW - 597, duration_s: 300 });
    const rows = dedupeSessions([fromOtel, fromLog]);
    expect(rows).toHaveLength(1);
  });

  it('collapses when durations differ within the 5s window', () => {
    const a = sess({ session_id: 'src-a', started_at: NOW - 600, duration_s: 300 });
    const b = sess({ session_id: 'src-b', started_at: NOW - 590, duration_s: 304,
                     ended_at: NOW - 286 });
    expect(dedupeSessions([a, b])).toHaveLength(1);
  });

  it('collapses two live rows (no duration yet) of the same tool started 3s apart', () => {
    const a = sess({ session_id: 'src-a', started_at: NOW - 60, ended_at: null, duration_s: null });
    const b = sess({ session_id: 'src-b', started_at: NOW - 57, ended_at: null, duration_s: null });
    expect(dedupeSessions([a, b])).toHaveLength(1);
  });
});

describe('dedupeSessions — non-duplicates must NOT merge', () => {
  it('same tool, started 10 minutes apart', () => {
    const a = sess({ session_id: 'run-1', started_at: NOW - 1200, ended_at: NOW - 900 });
    const b = sess({ session_id: 'run-2', started_at: NOW - 600,  ended_at: NOW - 300 });
    expect(dedupeSessions([a, b])).toHaveLength(2);
  });

  it('different tools with identical timing', () => {
    const a = sess({ session_id: 'claude:x', tool: 'claude-code' });
    const b = sess({ session_id: 'codex:y',  tool: 'codex-cli' });
    expect(dedupeSessions([a, b])).toHaveLength(2);
  });

  it('same tool, close start, but durations differ beyond 5s', () => {
    const a = sess({ session_id: 'p-1', started_at: NOW - 600, duration_s: 300 });
    const b = sess({ session_id: 'p-2', started_at: NOW - 595, duration_s: 60,
                     ended_at: NOW - 535 });
    expect(dedupeSessions([a, b])).toHaveLength(2);
  });

  it('same tool, close start, one ended and one still live', () => {
    const done = sess({ session_id: 'd-1', started_at: NOW - 600, duration_s: 300 });
    const live = sess({ session_id: 'l-1', started_at: NOW - 597, ended_at: null,
                        duration_s: null });
    expect(dedupeSessions([done, live])).toHaveLength(2);
  });
});

describe('dedupeSessions — input hygiene', () => {
  it('returns [] for non-array input', () => {
    expect(dedupeSessions(null)).toEqual([]);
    expect(dedupeSessions(undefined)).toEqual([]);
  });

  it('passes through empty and single-row arrays', () => {
    expect(dedupeSessions([])).toEqual([]);
    const one = [sess()];
    expect(dedupeSessions(one)).toHaveLength(1);
  });

  it('does not mutate the input array', () => {
    const input = [sess(), sess({ session_id: 'other', started_at: NOW - 5000 })];
    const snapshot = JSON.parse(JSON.stringify(input));
    dedupeSessions(input);
    expect(input).toEqual(snapshot);
  });
});
