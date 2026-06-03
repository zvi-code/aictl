// ─── ToolIcon — vendor-identity silhouette in brand color ──────────
//
// Replaces the old per-tool emoji (🟣 🟠 🤖 💎 …) with a monochrome
// silhouette shared by every product from the same vendor, tinted with
// the tool's brand colour from the registry (window.COLORS).
//
//   Anthropic → sunburst   ·  GitHub / Microsoft (Copilot) → goggles
//   OpenAI    → hexagon     ·  Google (Gemini)             → sparkle
//   Cursor    → caret       ·  Codeium (Windsurf)          → sail/wave
//   Community → claw        ·  fallback                    → dot
//
// Vendor per tool comes from window.TOOL_VENDORS (injected by Python from
// the single-source TOOL_TAXONOMY); a static fallback keeps it working in
// dev / tests where the injection is absent.
import { html } from 'htm/preact';
import { COLORS } from '../../utils.js';

const TOOL_VENDORS = window.TOOL_VENDORS ?? {};

// Fallback vendor map — mirrors TOOL_TAXONOMY in src/aictl/tools.py.
// Only used when window.TOOL_VENDORS is unavailable.
const FALLBACK_VENDOR = {
  'claude-code': 'anthropic', 'claude-desktop': 'anthropic', 'claude-mcp-memory': 'anthropic',
  'copilot': 'github', 'copilot-vscode': 'github', 'copilot-cli': 'github',
  'copilot-jetbrains': 'github', 'copilot-vs': 'github', 'copilot365': 'microsoft',
  'codex-cli': 'openai', 'chatgpt-desktop': 'openai', 'chatgpt-lencx': 'openai',
  'gemini': 'google', 'gemini-cli': 'google',
  'cursor': 'cursor-inc', 'windsurf': 'codeium', 'openclaw': 'community',
  'vscode': 'microsoft',
};

// Inner SVG markup per vendor, drawn on a 0 0 24 24 grid and tinted via
// currentColor (stroke for outlines, fill for solids).
const VENDOR_SHAPES = {
  anthropic:
    '<path d="M12 4.5V19.5"/><path d="M4.5 12H19.5"/><path d="M6.7 6.7 17.3 17.3"/><path d="M17.3 6.7 6.7 17.3"/>',
  github:
    '<rect x="3.5" y="6.5" width="17" height="11" rx="5.5" fill="none"/>' +
    '<circle cx="9.2" cy="12" r="1.6" stroke="none" fill="currentColor"/>' +
    '<circle cx="14.8" cy="12" r="1.6" stroke="none" fill="currentColor"/>',
  microsoft:
    '<rect x="3.5" y="6.5" width="17" height="11" rx="5.5" fill="none"/>' +
    '<circle cx="9.2" cy="12" r="1.6" stroke="none" fill="currentColor"/>' +
    '<circle cx="14.8" cy="12" r="1.6" stroke="none" fill="currentColor"/>',
  openai:
    '<path d="M12 3.2 19.6 7.6V16.4L12 20.8 4.4 16.4V7.6Z" fill="none"/>',
  google:
    '<path d="M12 3.2C12 8 16 12 20.8 12C16 12 12 16 12 20.8C12 16 8 12 3.2 12C8 12 12 8 12 3.2Z" stroke="none" fill="currentColor"/>',
  'cursor-inc':
    '<path d="M6 3.5 6 18 10 14 12.6 19.5 15 18.4 12.4 13 18 13Z" fill="none" stroke-linejoin="round"/>',
  codeium:
    '<path d="M11.5 4 16 12.5H11.5Z" stroke="none" fill="currentColor"/>' +
    '<path d="M4 16C7 12.5 9.5 12.5 12 16 14.5 19.5 17 19.5 20 16" fill="none" stroke-linecap="round"/>',
  community:
    '<path d="M17 4.5C10 5.5 5.5 9.5 5.5 13.5 5.5 17 8 19.5 11.5 19.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M17 4.5 13.5 6M17 4.5 18.8 7.8" stroke-linecap="round"/>',
  _fallback:
    '<circle cx="12" cy="12" r="4.5" stroke="none" fill="currentColor"/>',
};

export function toolVendor(tool) {
  return TOOL_VENDORS[tool] || FALLBACK_VENDOR[tool] || '';
}

/**
 * Render a vendor-identity silhouette for a tool.
 * @param {string} tool   - tool id (e.g. 'claude-code')
 * @param {string} size   - CSS length (default '1em')
 */
export default function ToolIcon({ tool, size = '1em', strokeWidth = 2, ...rest }) {
  const vendor = toolVendor(tool);
  const inner = VENDOR_SHAPES[vendor] || VENDOR_SHAPES._fallback;
  const color = COLORS[tool] || 'var(--fg2)';
  return html`<svg class="tool-ico" viewBox="0 0 24 24" width=${size} height=${size}
    fill="none" stroke="currentColor" stroke-width=${strokeWidth} stroke-linecap="round"
    style=${'color:' + color} aria-hidden="true" ...${rest}
    dangerouslySetInnerHTML=${{ __html: inner }}></svg>`;
}
