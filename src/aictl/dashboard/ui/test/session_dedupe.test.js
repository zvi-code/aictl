// dedupeSessions — defensive frontend dedup of /api/session-timeline rows.
// Backend dedup is handled separately; the UI must still collapse
// (1) exact session_id duplicates and (2) multi-source near-duplicates
// (same tool, started_at within 15s, duration within 5s — the
// duplicate-chip signature), while never merging distinct sessions.
import { describe, it, expect } from 'vitest';
import { dedupeSessions, sessionIdCandidates, findSessionRow } from '../src/selectors.js';

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

describe('dedupeSessions — merged identity keeps every id', () => {
  const UUID = 'fb1fced0-59a8-4c9e-b6cf-1e6b1f4d9a01';
  const PID_ID = 'claude-code:4242:1769999400';

  it('near-duplicate merge prefers the UUID id — the one flow data lives under', () => {
    // The empty-Flow-tab regression: a hook/JSONL UUID row (rich flow
    // data) merged with the concurrently-created correlator PID row, and
    // the merged chip kept the PID identity — flow/transcript queries by
    // that id find no turns. The PID row wins the field data (most
    // recent activity) but the UUID must win the identity.
    const pidRow  = sess({ session_id: PID_ID, started_at: NOW - 600,
                           ended_at: null, duration_s: null, last_activity: NOW - 10 });
    const uuidRow = sess({ session_id: UUID, started_at: NOW - 595,
                           ended_at: null, duration_s: null, last_activity: NOW - 300 });
    const rows = dedupeSessions([pidRow, uuidRow]);
    expect(rows).toHaveLength(1);
    expect(rows[0].session_id).toBe(UUID);
    expect(rows[0].alt_session_ids).toEqual([PID_ID]);
    // Field data still comes from the most-recently-active row.
    expect(rows[0].started_at).toBe(NOW - 600);
  });

  it('keeps the activity-winner id when neither id carries a UUID', () => {
    const a = sess({ session_id: 'otel:abc', started_at: NOW - 600, duration_s: 300,
                     last_activity: NOW - 10 });
    const b = sess({ session_id: 'log:def', started_at: NOW - 597, duration_s: 300,
                     last_activity: NOW - 200 });
    const [row] = dedupeSessions([a, b]);
    expect(row.session_id).toBe('otel:abc');
    expect(row.alt_session_ids).toEqual(['log:def']);
  });

  it('unions alt_session_ids the backend already attached to merged profiles', () => {
    const backendMerged = sess({ session_id: UUID, alt_session_ids: [PID_ID],
                                 started_at: NOW - 600, duration_s: 300 });
    const extra = sess({ session_id: 'claude-code:9999:1769999401',
                         started_at: NOW - 598, duration_s: 302, ended_at: NOW - 296 });
    const [row] = dedupeSessions([backendMerged, extra]);
    expect(row.session_id).toBe(UUID);
    expect(row.alt_session_ids).toEqual(
      expect.arrayContaining([PID_ID, 'claude-code:9999:1769999401']));
    expect(row.alt_session_ids).toHaveLength(2);
  });

  it('accumulates ids across a chain of three merged rows', () => {
    const a = sess({ session_id: 'claude-code:1:1769999400', started_at: NOW - 600, duration_s: 300 });
    const b = sess({ session_id: UUID, started_at: NOW - 598, duration_s: 301, ended_at: NOW - 297 });
    const c = sess({ session_id: 'claude-code:2:1769999401', started_at: NOW - 596, duration_s: 302,
                     ended_at: NOW - 294 });
    const [row] = dedupeSessions([a, b, c]);
    expect(row.session_id).toBe(UUID);
    expect(row.alt_session_ids).toEqual(
      expect.arrayContaining(['claude-code:1:1769999400', 'claude-code:2:1769999401']));
    expect(row.alt_session_ids).toHaveLength(2);
  });

  it('exact-id duplicates do not grow alt_session_ids', () => {
    const [row] = dedupeSessions([sess(), sess()]);
    expect(row.alt_session_ids).toBeUndefined();
  });
});

describe('sessionIdCandidates / findSessionRow', () => {
  const UUID = 'fb1fced0-59a8-4c9e-b6cf-1e6b1f4d9a01';
  const PID_ID = 'claude-code:4242:1769999400';

  it('candidates list the primary id first, then alternates, deduped', () => {
    const row = { session_id: UUID, alt_session_ids: [PID_ID, UUID] };
    expect(sessionIdCandidates(row)).toEqual([UUID, PID_ID]);
  });

  it('candidates fall back to the live-row `id` field', () => {
    expect(sessionIdCandidates({ id: 'live-1' })).toEqual(['live-1']);
  });

  it('findSessionRow matches by primary and by alternate id', () => {
    const rows = [{ session_id: UUID, alt_session_ids: [PID_ID] },
                  { session_id: 'other' }];
    expect(findSessionRow(rows, UUID)).toBe(rows[0]);
    expect(findSessionRow(rows, PID_ID)).toBe(rows[0]);
    expect(findSessionRow(rows, 'other')).toBe(rows[1]);
    expect(findSessionRow(rows, 'missing')).toBeUndefined();
    expect(findSessionRow(rows, null)).toBeUndefined();
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
