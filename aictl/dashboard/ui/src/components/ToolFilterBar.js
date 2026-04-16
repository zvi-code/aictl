// ─── Tool filter bar ───────────────────────────────────────────
import { html } from 'htm/preact';
import { COLORS, ICONS } from '../utils.js';

const VERIFIED = new Set([
  'claude-code', 'claude-desktop',
  'copilot', 'copilot-vscode', 'copilot-cli', 'copilot-jetbrains', 'copilot-vs', 'copilot365',
  'codex-cli', 'gemini', 'gemini-cli',
]);

export default function ToolFilterBar({ snap, enabledTools, onToggle, onSetAll }) {
  if (!snap) return null;
  const allTools = snap.tools.filter(t => !t.meta);
  if (!allTools.length) return null;
  const allEnabled = enabledTools === null;

  return html`<div class="tool-filter-bar">
    <label class="tool-filter-item">
      <input type="checkbox" checked=${allEnabled}
        onChange=${() => onSetAll(allEnabled ? [] : null)} />
      <span class="text-muted">All (${allTools.length})</span>
    </label>
    ${allTools.sort((a, b) => a.label.localeCompare(b.label)).map(t => {
      const verified = VERIFIED.has(t.tool);
      const checked = enabledTools === null || enabledTools.includes(t.tool);
      const c = COLORS[t.tool] || 'var(--fg2)';
      const icon = ICONS[t.tool] || '\u{1F539}';
      return html`<label key=${t.tool}
        class=${'tool-filter-item' + (verified ? '' : ' tool-unverified')}
        title=${verified ? '' : 'Not yet verified — discovery only'}>
        <input type="checkbox" checked=${checked} disabled=${!verified}
          onChange=${() => verified && onToggle(t.tool)} />
        <span style=${'color:' + c}>${icon}</span>
        <span>${t.label}</span>
      </label>`;
    })}
  </div>`;
}
