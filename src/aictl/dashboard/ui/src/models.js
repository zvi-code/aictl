// Model metadata shared across dashboard components.
//
// Single source of truth for context-window sizes. Two components used to
// carry their own divergent tables (one with dotted keys like
// 'claude-sonnet-4.6' that never matched a real model id), and neither knew
// the Claude 5 family, so every current 1M-context model silently fell back
// to 200K and context percentages read 5x too high.

export const DEFAULT_CONTEXT_WINDOW = 200000;

// Context window (input tokens) per model id, as the tools report them.
export const MODEL_WINDOWS = {
  // Anthropic — Claude 5 family and 4.x still in service
  'claude-fable-5-1': 1000000, 'claude-fable-5': 1000000, 'claude-mythos-5-1': 1000000,
  'claude-opus-5': 1000000, 'claude-opus-4-8': 1000000, 'claude-opus-4-7': 1000000,
  'claude-opus-4-6': 1000000, 'claude-opus-4-5': 1000000,
  'claude-sonnet-5': 1000000, 'claude-sonnet-4-6': 1000000, 'claude-sonnet-4-5': 1000000,
  'claude-haiku-5-5': 1000000,
  'claude-sonnet-4': 200000, 'claude-haiku-4-5': 200000, 'claude-3-5-sonnet': 200000,
  // OpenAI (Copilot / Codex)
  'gpt-5.4': 200000, 'gpt-5': 128000,
  'gpt-4.1': 1000000, 'gpt-4.1-mini': 1000000, 'gpt-4o': 128000, 'gpt-4o-mini': 128000,
  'o3': 200000, 'o4-mini': 200000,
  // Google
  'gemini-2.5-pro': 1000000, 'gemini-2.5-flash': 1000000,
};

// Lower-case, drop a trailing -YYYYMMDD snapshot suffix, and map dotted
// Claude versions ('claude-sonnet-4.6') to the hyphenated API form.
export function normalizeModelId(model) {
  if (!model) return '';
  let m = String(model).trim().toLowerCase().replace(/-\d{8}$/, '');
  if (m.startsWith('claude-')) m = m.replace(/\./g, '-');
  return m;
}

// The table key that prices/sizes `model`, or '' when unknown.
// Exact match first, then the longest known key that prefixes the id on a
// hyphen boundary ('claude-sonnet-5-preview' → 'claude-sonnet-5').
export function resolveModelKey(model) {
  const m = normalizeModelId(model);
  if (!m) return '';
  if (m in MODEL_WINDOWS) return m;
  let best = '';
  for (const key of Object.keys(MODEL_WINDOWS)) {
    if (m.startsWith(key + '-') && key.length > best.length) best = key;
  }
  return best;
}

export function isKnownModel(model) {
  return resolveModelKey(model) !== '';
}

// Context window for `model`, falling back to DEFAULT_CONTEXT_WINDOW.
export function contextWindowFor(model) {
  const key = resolveModelKey(model);
  return key ? MODEL_WINDOWS[key] : DEFAULT_CONTEXT_WINDOW;
}
