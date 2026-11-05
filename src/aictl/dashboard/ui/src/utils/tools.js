// ─── Tool identity and ordering ────────────────────────────────
// Lists of tools follow what the machine is actually doing: most active first.

export const VERIFIED_TOOLS = new Set([
  'claude-code', 'claude-desktop',
  'copilot', 'copilot-vscode', 'copilot-cli', 'copilot-desktop',
  'copilot-jetbrains', 'copilot-vs', 'copilot365',
  'codex-cli', 'gemini', 'gemini-cli',
]);

// Used when a tool id is not in the snapshot (a filtered-out or brand new tool).
const FALLBACK_LABELS = {
  any: 'Unattributed',
  'copilot-cli': 'Copilot CLI',
  'copilot-desktop': 'Copilot Desktop',
  'copilot-vscode': 'Copilot VS Code',
  copilot365: 'Microsoft 365 Copilot',
};

/** Human name for a tool id, from the snapshot when it knows the tool. */
export function toolLabel(id, snap) {
  return snap?.tools?.find(t => t.tool === id)?.label || FALLBACK_LABELS[id] || id;
}

function activity(t) {
  const live = t.live || {};
  return [
    live.session_count || 0,
    (t.processes || []).length,
    (live.token_estimate?.input_tokens || 0) + (live.token_estimate?.output_tokens || 0),
  ];
}

/** Most active first, by live sessions, then processes, then tokens; then by name. */
export function orderToolsByActivity(tools) {
  return tools
    .map(t => [activity(t), t])
    .sort(([a, ta], [b, tb]) => (
      b[0] - a[0] || b[1] - a[1] || b[2] - a[2]
      || String(ta.label || ta.tool).localeCompare(String(tb.label || tb.tool))
    ))
    .map(([, t]) => t);
}

/** Tool ids in a session list, the tool with the most sessions first. */
export function orderIdsBySessionCount(sessions) {
  const counts = new Map();
  for (const s of sessions) counts.set(s.tool, (counts.get(s.tool) || 0) + 1);
  return [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b));
}

// Hosted by the vendor: nothing runs or is stored on this machine.
const CLOUD_HOSTED_TOOLS = new Set(['copilot365']);

/** A cloud-hosted tool with no local data at all. */
export function cloudOnly(t) {
  if (!t || !CLOUD_HOSTED_TOOLS.has(t.tool)) return false;
  return !t.live?.session_count && !(t.files || []).length && !(t.processes || []).length;
}

/** True when the filter selects only tools with nothing local to show. */
export function scopeIsCloudOnly(snap, enabledTools) {
  if (!enabledTools?.length) return false;
  return enabledTools.every(id => {
    const row = snap?.tools?.find(t => t.tool === id);
    return row ? cloudOnly(row) : CLOUD_HOSTED_TOOLS.has(id);
  });
}

/** Tooltip for every cost figure: an estimate must never read as a charge. */
export const COST_ESTIMATE_NOTE = 'Estimated from token counts and list prices. Not a billed amount.';
