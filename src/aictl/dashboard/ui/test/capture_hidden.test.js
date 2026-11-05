// Capture modes (full/metadata/off) and the hidden-context slot: both depend on
// backend work that ships separately, so absent fields must stay harmless.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/preact';
import { html } from 'htm/preact';
import { deriveIssues, storageSummary, storageText } from '../src/utils/health.js';
import TextNotRetained, { textWithheld, retentionTitle } from '../src/components/ui/TextNotRetained.js';
import Slot, { loadHiddenContextSummary } from '../src/components/HiddenContextSlot.js';
import { StorageRow } from '../src/components/OverviewNow.js';

afterEach(() => cleanup());

describe('storage summary', () => {
  it('reports concrete disk use against budget', () => {
    const s = storageSummary({ capture_mode: 'metadata', storage_bytes: 500, storage_budget_bytes: 1000 });
    expect(s).toMatchObject({ mode: 'metadata', pct: 50, degraded: false });
    expect(storageText(s)).toContain('50%');
  });
  it('tolerates a server without the new fields', () => {
    const s = storageSummary({ db: { file_size_bytes: 2048 } });
    expect(s).toMatchObject({ mode: null, used: 2048, budget: null, pct: null, degraded: false });
    expect(storageText(s)).toContain('no budget set');
    expect(storageSummary(null)).toBeNull();
  });
  it('degraded storage is an error, near budget is a warning', () => {
    const degraded = deriveIssues({ connected: true, storage: { degraded: true, used: 10, budget: 5, pct: 200 } });
    expect(degraded[0]).toMatchObject({ id: 'storage', level: 'error' });
    const near = deriveIssues({ connected: true, storage: { degraded: false, used: 95, budget: 100, pct: 95 } });
    expect(near[0]).toMatchObject({ id: 'storage', level: 'warn' });
    expect(deriveIssues({ connected: true, storage: { degraded: false, used: 1, budget: 100, pct: 1 } })).toEqual([]);
  });
  it('StorageRow prints the mode and figures', () => {
    const { container } = render(html`<${StorageRow}
      selfStatus=${{ capture_mode: 'off', storage_bytes: 1024, storage_budget_bytes: 2048 }}/>`);
    expect(container.textContent).toContain('off');
    expect(container.textContent).toContain('50%');
    expect(container.querySelector('[role="meter"]').getAttribute('aria-valuenow')).toBe('50');
  });
  it('StorageRow says when the mode is not reported', () => {
    const { container } = render(html`<${StorageRow} selfStatus=${{ db: { file_size_bytes: 10 } }}/>`);
    expect(container.textContent).toContain('not reported');
    expect(container.querySelector('[role="meter"]')).toBeNull();
  });
});

describe('text not retained', () => {
  it('names the mode and how to change it, distinct from empty and error', () => {
    const { getByRole } = render(html`<${TextNotRetained} mode="metadata"/>`);
    const el = getByRole('status');
    expect(el.textContent).toContain('Text not retained: capture=metadata');
    expect(el.textContent).toContain('capture = "full"');
    expect(el.classList.contains('panel-state--withheld')).toBe(true);
  });
  it('only an explicit false withholds: older servers omit the field', () => {
    expect(textWithheld({})).toBe(false);
    expect(textWithheld(null)).toBe(false);
    expect(textWithheld({ content_retained: false })).toBe(true);
  });
  it('is accurate when capture is full now but the session predates it', () => {
    expect(retentionTitle('off')).toContain('capture=off');
    expect(retentionTitle('full')).not.toContain('capture=full');
    expect(retentionTitle(undefined)).toContain('not full');
  });
});

describe('hidden context on the first screen', () => {
  it('found sources are a warning linking to the view, ahead of other warnings', () => {
    const out = deriveIssues({
      connected: true, hiddenContext: { count: 3 }, alerts: [{ level: 'orange', msg: 'x' }],
    });
    expect(out[0]).toMatchObject({ id: 'hidden-context', level: 'warn', tab: 'hidden' });
    expect(out[0].title).toBe('3 unseen context sources found');
  });
  it('says "not checked" with no detector, and nothing while loading or clean', () => {
    expect(deriveIssues({ connected: true, hiddenContext: null })[0].title).toBe('Hidden context not checked');
    expect(deriveIssues({ connected: true, hiddenContext: undefined })).toEqual([]);
    expect(deriveIssues({ connected: true, hiddenContext: { count: 0 } })).toEqual([]);
  });
  it('the reserved view renders whether or not the panel file exists', async () => {
    const { container } = render(html`<${Slot}/>`);
    await waitFor(() => expect(container.textContent.length + container.children.length).toBeGreaterThan(0));
    await expect(loadHiddenContextSummary()).resolves.not.toBeUndefined();
  });
});
