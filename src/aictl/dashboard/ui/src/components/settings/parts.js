// Small pieces shared by the Settings views.
import { html } from 'htm/preact';
import { COLORS } from '../../utils.js';
import { baseName } from '../../utils/paths.js';
import { envName, isEnvSource } from './model.js';

export function Swatch({ id, big = false }) {
  return html`<span class=${'st-sw' + (big ? ' st-sw--big' : '')} aria-hidden="true"
    style=${{ background: COLORS[id] || 'var(--st-fg2)' }}></span>`;
}

export function RiskDot({ label }) {
  return html`<span class="st-dot" role="img" aria-label=${label} title=${label}></span>`;
}

export function NavHead({ children }) {
  return html`<div class="st-nav__h">${children}</div>`;
}

export function ToolChip({ id, label }) {
  return html`<span class="st-chip st-toolchip"><${Swatch} id=${id}/>${label}</span>`;
}

/**
 * `basename:line` (line only when known), full path on hover; opens the file viewer at that line.
 * An `env:<NAME>` source shows the variable's name and opens it in the inspector, never a file.
 */
export function SetIn({ path, line, w, tool = '' }) {
  if (!path) return html`<span class="st-none">—</span>`;
  if (isEnvSource(path)) {
    const name = envName(path);
    if (!name) return html`<span class="st-src st-src--env" title="An environment variable; this aictl version did not name it">environment</span>`;
    return html`<button type="button" class="st-src st-src--env" data-env=${name}
      title=${'Environment variable ' + name + ': where it is set and what it drives'}
      onClick=${e => { e.stopPropagation(); w.openEnv(name, tool); }}><b>${name}</b></button>`;
  }
  const full = path + (line > 0 ? ':' + line : '');
  return html`<button type="button" class="st-src" title=${full}
    onClick=${e => { e.stopPropagation(); w.openAt(path, line); }}>
    <b>${baseName(path)}</b>${line > 0 ? ':' + line : ''}</button>`;
}

export const UNDOCUMENTED_TITLE = 'aictl has no description for this key; the value is shown as found in the file';

export function UndocumentedChip() {
  return html`<span class="st-chip st-chip--muted st-undoc" title=${UNDOCUMENTED_TITLE}>undocumented</span>`;
}
