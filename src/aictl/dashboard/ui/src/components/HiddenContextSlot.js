// ─── HiddenContextSlot — the place reserved for HiddenContextPanel ──
// HiddenContextPanel.js is built separately and is self-contained. The glob
// finds it when the file exists and resolves to nothing when it does not, so the
// build works either way and no wiring change is needed when it lands.
//
// Optional contract for the first screen: the panel module may also export
//   getHiddenContextSummary(): Promise<{ count: number, detail?: string }>
// which feeds "Needs attention" on the Overview.
import { html } from 'htm/preact';
import { lazy, Suspense } from 'preact/compat';
import PanelState from './ui/PanelState.js';

const loader = import.meta.glob('./HiddenContextPanel.js')['./HiddenContextPanel.js'];
const Panel = loader ? lazy(loader) : null;

/** Resolves to the summary, or null when no detector is available yet. */
export async function loadHiddenContextSummary() {
  if (!loader) return null;
  const mod = await loader();
  return mod.getHiddenContextSummary ? mod.getHiddenContextSummary() : null;
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
