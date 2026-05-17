import { describe, it, expect } from 'vitest';
import {
  fmtDur, fmtDurSec, shortModel, shortSid,
  extractToolArgs, sfColor,
} from '../src/components/session_flow/helpers.js';
import { discoverParticipants } from '../src/components/session_flow/participants.js';

describe('session_flow/helpers', () => {
  it('fmtDur formats ms to human string', () => {
    expect(fmtDur(null)).toBe('');
    expect(fmtDur(0)).toBe('');
    expect(fmtDur(500)).toBe('1s');
    expect(fmtDur(65_000)).toBe('1m 5s');
    expect(fmtDur(3_725_000)).toBe('1h 2m');
  });

  it('fmtDurSec formats seconds', () => {
    expect(fmtDurSec(null)).toBe('\u2014');
    expect(fmtDurSec(45)).toBe('45s');
    expect(fmtDurSec(125)).toBe('2m 5s');
  });

  it('shortModel strips prefix and date suffix', () => {
    expect(shortModel('claude-sonnet-4-20250101')).toBe('sonnet-4');
    expect(shortModel('')).toBe('');
  });

  it('shortSid returns pid for correlator format', () => {
    expect(shortSid('claude:1234:1700000000')).toBe('1234');
    expect(shortSid('abcdefghijkl')).toBe('ghijkl');
    expect(shortSid(null)).toBe('');
  });

  it('extractToolArgs picks meaningful key', () => {
    expect(extractToolArgs('Bash', { command: 'ls -la' })).toBe('ls -la');
    expect(extractToolArgs('Read', '{"file_path":"/a/b/c.py"}')).toBe('/a/b/c.py');
    expect(extractToolArgs('x', null)).toBe('');
  });

  it('sfColor is stable for a given name', () => {
    expect(sfColor('Bash')).toBe('#1a1a1a');
    expect(sfColor('Foo')).toBe(sfColor('Foo'));
  });
});

describe('session_flow/participants.discoverParticipants', () => {
  it('always seeds user + tool', () => {
    const parts = discoverParticipants([], 'claude');
    expect(parts.map(p => p.id)).toEqual(['user', 'tool']);
  });

  it('adds api, skill, subagent, hook on-demand', () => {
    const turns = [
      { type: 'api_call' },
      { type: 'tool_use', to: 'Bash' },
      { type: 'subagent', to: 'grinder' },
      { type: 'hook' },
    ];
    const ids = discoverParticipants(turns, 'claude').map(p => p.id);
    expect(ids).toContain('api');
    expect(ids).toContain('skill:Bash');
    expect(ids).toContain('subagent:grinder');
    expect(ids).toContain('hook');
  });
});
