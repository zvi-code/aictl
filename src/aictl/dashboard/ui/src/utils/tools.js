// ─── Tool identity ─────────────────────────────────────────────

// Used when a tool id is not in the snapshot (a filtered-out or brand new tool).
const FALLBACK_LABELS = {
  any: 'Unattributed',
  'claude-code': 'Claude Code',
  'claude-desktop': 'Claude Desktop',
  'codex-cli': 'Codex CLI',
  'gemini-cli': 'Gemini CLI',
  'copilot-cli': 'Copilot CLI',
  'copilot-desktop': 'Copilot Desktop',
  'copilot-vscode': 'Copilot VS Code',
  copilot365: 'Microsoft 365 Copilot',
};

/** Human name for a tool id, from the snapshot when it knows the tool. */
export function toolLabel(id, snap) {
  return snap?.tools?.find(t => t.tool === id)?.label || FALLBACK_LABELS[id] || id;
}
