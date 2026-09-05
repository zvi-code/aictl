import { describe, it, expect } from 'vitest';
import {
  MODEL_WINDOWS, DEFAULT_CONTEXT_WINDOW,
  normalizeModelId, resolveModelKey, isKnownModel, contextWindowFor,
} from '../src/models.js';

// Regression guard: TabBudget and session_detail each carried their own
// MODEL_WINDOWS table; neither knew the Claude 5 family and one used dotted
// keys that never matched a real id, so every current 1M-context model fell
// back to 200K and context percentages read 5x too high.
describe('models.js — context windows', () => {
  it('knows the current Claude 5 family at 1M', () => {
    for (const id of ['claude-fable-5-1', 'claude-opus-5', 'claude-sonnet-5']) {
      expect(isKnownModel(id)).toBe(true);
      expect(contextWindowFor(id)).toBe(1000000);
    }
    expect(contextWindowFor('claude-haiku-4-5')).toBe(200000);
  });

  it('resolves snapshot suffixes and dotted versions to table keys', () => {
    expect(normalizeModelId('claude-haiku-4-5-20251001')).toBe('claude-haiku-4-5');
    expect(normalizeModelId('Claude-Sonnet-4.6')).toBe('claude-sonnet-4-6');
    expect(resolveModelKey('claude-sonnet-4.6')).toBe('claude-sonnet-4-6');
    expect(contextWindowFor('claude-haiku-4-5-20251001')).toBe(200000);
  });

  it('prefix-matches on a hyphen boundary only', () => {
    expect(resolveModelKey('claude-sonnet-5-preview')).toBe('claude-sonnet-5');
    expect(resolveModelKey('claude-opus-50')).toBe('');
  });

  it('falls back to the default window for unknown or empty models', () => {
    expect(contextWindowFor('')).toBe(DEFAULT_CONTEXT_WINDOW);
    expect(contextWindowFor(undefined)).toBe(DEFAULT_CONTEXT_WINDOW);
    expect(contextWindowFor('gpt-5.6-sol')).toBe(DEFAULT_CONTEXT_WINDOW);
    expect(isKnownModel('gpt-5.6-sol')).toBe(false);
  });

  it('table keys are already normalized (no dots in Claude ids, no date suffixes)', () => {
    for (const key of Object.keys(MODEL_WINDOWS)) {
      expect(normalizeModelId(key)).toBe(key);
    }
  });
});
