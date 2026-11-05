// ─── PanelState — one vocabulary for loading/empty/error/stale ──
// Every data panel answers the same four questions the same way: is it still
// loading, did it fail (and can I retry), is it empty (why, and what do I do),
// and how old is what I am looking at.
import { html } from 'htm/preact';
import Skeleton from './Skeleton.js';
import Icon from './Icon.js';
import { fmtDurSec } from '../../utils.js';

/** Stale once data is older than this. Panels poll at 30-60 s. */
export const DEFAULT_STALE_MS = 180000;

/**
 * Reduce a resource to one state. Data that survived a failed refresh is
 * 'stale', not 'error': old numbers with a warning beat a blank panel.
 */
export function panelStatus({ loading, error, data, isEmpty, updatedAt, staleMs = DEFAULT_STALE_MS, now = Date.now() }) {
  const hasData = data !== null && data !== undefined;
  if (!hasData) {
    if (error) return 'error';
    if (loading) return 'loading';
    return 'empty';
  }
  if (isEmpty && isEmpty(data)) return error ? 'error' : 'empty';
  if (error) return 'stale';
  if (updatedAt && now - updatedAt > staleMs) return 'stale';
  return 'ready';
}

/** Plain-language error text: never a bare "undefined" or a stack. */
export function errorText(error) {
  if (!error) return 'The request failed.';
  const msg = typeof error === 'string' ? error : error.message;
  return msg || 'The request failed.';
}

export default function PanelState({
  status, error, updatedAt, onRetry,
  emptyTitle = 'No data', emptyHint, emptyFix,
  skeletonHeight = '72px', label, children,
}) {
  if (status === 'loading') {
    return html`<div class="panel-state panel-state--loading" role="status" aria-busy="true"
      aria-label=${'Loading ' + (label || 'panel')}>
      <${Skeleton} height=${skeletonHeight} radius="var(--radius-sm)"/>
    </div>`;
  }
  if (status === 'error') {
    return html`<div class="panel-state panel-state--error" role="alert">
      <${Icon} name="alert-triangle" size="14"/>
      <div>
        <div class="panel-state__title">Could not load ${label || 'this panel'}</div>
        <div class="panel-state__hint">${errorText(error)}</div>
      </div>
      ${onRetry && html`<button type="button" class="range-btn" onClick=${onRetry}>Retry</button>`}
    </div>`;
  }
  if (status === 'empty') {
    return html`<div class="panel-state panel-state--empty" role="status">
      <div class="panel-state__title">${emptyTitle}</div>
      ${emptyHint && html`<div class="panel-state__hint">${emptyHint}</div>`}
      ${emptyFix && html`<code class="panel-state__fix">${emptyFix}</code>`}
    </div>`;
  }
  const ageS = updatedAt ? Math.max(0, Math.round((Date.now() - updatedAt) / 1000)) : null;
  return html`
    ${status === 'stale' && html`<div class="panel-state panel-state--stale" role="status">
      <${Icon} name="clock" size="12"/>
      <span>${error ? 'Refresh failed. ' : ''}Showing data from ${ageS != null ? fmtDurSec(ageS) + ' ago' : 'an earlier fetch'}.</span>
      ${onRetry && html`<button type="button" class="panel-state__retry" onClick=${onRetry}>Retry</button>`}
    </div>`}
    ${children}`;
}
