import { describe, it, expect } from 'vitest';
import {
  isSessionFlowFormat, normalizeFlowToTranscript,
} from '../src/components/transcript/normalize.js';

describe('transcript/normalize', () => {
  it('isSessionFlowFormat detects flat events', () => {
    expect(isSessionFlowFormat(null)).toBe(false);
    expect(isSessionFlowFormat({ turns: [] })).toBe(false);
    expect(isSessionFlowFormat({ turns: [{ type: 'api_call' }] })).toBe(true);
    expect(isSessionFlowFormat({ turns: [{ prompt: 'hi', actions: [] }] })).toBe(false);
  });

  it('normalizeFlowToTranscript groups by user_message', () => {
    const flow = {
      turns: [
        { type: 'user_message', ts: 1, message: 'hello' },
        { type: 'api_call', ts: 2, tokens: { input: 10, output: 5 } },
        { type: 'user_message', ts: 3, message: 'again' },
        { type: 'tool_use', ts: 4, to: 'Bash' },
      ],
      summary: { total_turns: 2 },
    };
    const out = normalizeFlowToTranscript(flow, 'sess-1');
    expect(out.session_id).toBe('sess-1');
    expect(out.turns).toHaveLength(2);
    expect(out.turns[0].prompt).toBe('hello');
    expect(out.turns[0].actions[0].kind).toBe('api_call');
    expect(out.turns[0].tokens.input).toBe(10);
    expect(out.turns[1].prompt).toBe('again');
    expect(out.turns[1].tool_use_count).toBe(1);
  });

  it('synthesizes a turn when api_call arrives first', () => {
    const flow = {
      turns: [
        { type: 'api_call', ts: 1, tokens: { input: 3, output: 1 } },
      ],
    };
    const out = normalizeFlowToTranscript(flow, 'sess-x');
    expect(out.turns).toHaveLength(1);
    expect(out.turns[0].prompt).toBe('');
    expect(out.turns[0].actions[0].kind).toBe('api_call');
  });

  it('skips session_start/end and compaction events', () => {
    const flow = {
      turns: [
        { type: 'session_start', ts: 0 },
        { type: 'user_message', ts: 1, message: 'hi' },
        { type: 'compaction', ts: 2 },
        { type: 'session_end', ts: 3 },
      ],
    };
    const out = normalizeFlowToTranscript(flow, 's');
    expect(out.turns).toHaveLength(1);
    expect(out.turns[0].actions).toHaveLength(0);
  });
});
