import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the normalizeFlowToTranscript function and the API functions.
// The component itself needs rendering tests but we focus on data logic here.

import * as api from '../src/api.js';

describe('Transcript API', () => {
  beforeEach(() => {
    api.setBaseUrl('');
    globalThis.fetch = vi.fn();
  });

  it('getTranscript calls correct URL', async () => {
    globalThis.fetch.mockResolvedValue({
      json: () => Promise.resolve({ session_id: 'abc', turns: [] }),
    });
    const result = await api.getTranscript('abc');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/transcript/abc');
    expect(result.session_id).toBe('abc');
  });

  it('getTranscript encodes session ID', async () => {
    globalThis.fetch.mockResolvedValue({
      json: () => Promise.resolve({}),
    });
    await api.getTranscript('tool:123:456');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/transcript/tool%3A123%3A456');
  });

  it('getTranscripts calls with cutoff', async () => {
    globalThis.fetch.mockResolvedValue({
      json: () => Promise.resolve({ transcripts: [], count: 0 }),
    });
    const result = await api.getTranscripts(600);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/transcripts?cutoff=600');
    expect(result.count).toBe(0);
  });

  it('getTranscripts defaults cutoff to 300', async () => {
    globalThis.fetch.mockResolvedValue({
      json: () => Promise.resolve({ transcripts: [] }),
    });
    await api.getTranscripts();
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/transcripts?cutoff=300');
  });
});
