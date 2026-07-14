import { describe, it, expect } from 'vitest';
import { extractToolArgs, sfColor } from '../src/components/session_flow/helpers.js';
import { hashColor, HASH_PALETTE } from '../src/utils.js';
import { discoverParticipants } from '../src/components/session_flow/participants.js';

// Generic formatters (fmtDurMs, fmtDurSec, shortModel, shortSid) moved to
// src/utils.js — see test/formatters.test.js. This file keeps the
// session_flow-specific helpers only.

describe('session_flow/helpers', () => {
  it('extractToolArgs picks meaningful key', () => {
    expect(extractToolArgs('Bash', { command: 'ls -la' })).toBe('ls -la');
    expect(extractToolArgs('Read', '{"file_path":"/a/b/c.py"}')).toBe('/a/b/c.py');
    expect(extractToolArgs('x', null)).toBe('');
  });

  it('sfColor is stable for a given name and delegates to the shared palette', () => {
    expect(sfColor('Foo')).toBe(sfColor('Foo'));
    expect(sfColor('Foo')).toBe(hashColor('Foo'));
    expect(HASH_PALETTE).toContain(sfColor('Foo'));
  });

  it('sfColor gives Bash a theme-safe palette colour (not near-black)', () => {
    // Regression: Bash used to be fixed to #1a1a1a, invisible on dark themes.
    expect(sfColor('Bash')).not.toBe('#1a1a1a');
    expect(HASH_PALETTE).toContain(sfColor('Bash'));
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
