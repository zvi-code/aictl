// ─── HiddenContextSlot — the place reserved for HiddenContextPanel ──
// HiddenContextPanel.js is built separately and is self-contained. The glob
// finds it when the file exists and resolves to nothing when it does not, so the
// build works either way and no wiring change is needed when it lands.
//
// The first screen's figure comes from the module's getHiddenContextSummary() if
// it exports one, otherwise from /api/context-audit.
import { html } from 'htm/preact';
import { lazy, Suspense } from 'preact/compat';
import PanelState from './ui/PanelState.js';
import { fetchJson } from '../api.js';
import { scopeAudit } from '../utils/auditScope.js';

const loader = import.meta.glob('./HiddenContextPanel.js')['./HiddenContextPanel.js'];
const Panel = loader ? lazy(loader) : null;

/** Resolves to the summary, or null when no detector is available yet. */
export async function loadHiddenContextSummary(enabledTools = null) {
  if (!loader) return null;
  const mod = await loader();
  if (mod.getHiddenContextSummary) return mod.getHiddenContextSummary(enabledTools);
  try {
    return summaryFromAudit(scopeAudit(await fetchJson('/api/context-audit'), enabledTools));
  } catch {
    return null;
  }
}

/** First-screen figure from /api/context-audit: findings above info severity. */
export function summaryFromAudit(audit) {
  if (!audit?.counts) return null;
  const parts = ['high', 'medium', 'low'].filter(k => audit.counts[k]).map(k => `${audit.counts[k]} ${k}`);
  return {
    count: ['high', 'medium', 'low'].reduce((n, k) => n + (audit.counts[k] || 0), 0),
    detail: parts.length ? `Findings by severity: ${parts.join(', ')}.` : '',
  };
}

export default function HiddenContextSlot() {
  if (!Panel) {
    return html`<section class="now-panel" data-slot="hidden-context" aria-label="Hidden context">
      <${PanelState} status="empty" emptyTitle="Hidden context detection is not in this build"
        emptyHint="This view lists prompts and context sources that reach a model without appearing in its visible configuration. Rebuild the dashboard once the detector ships."/>
    </section>`;
  }
  return html`<${Suspense} fallback=${html`<${PanelState} status="loading" label="hidden context"/>`}>
    <${Panel}/>
  </${Suspense}>`;
}
