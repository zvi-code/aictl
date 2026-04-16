import { html } from 'htm/preact';
import Badge from '../ui/Badge.js';
import Tooltip from '../ui/Tooltip.js';

/**
 * Small directional badge: ▲/▼ N% with colour that depends on whether
 * the "good" direction for the metric is up (default) or down (set
 * `inverse` for error rates, latency, etc).
 *
 * Props:
 *   pct        — number (absolute % change)
 *   direction  — 'up' | 'down' | 'flat'
 *   inverse    — boolean, true if "up" is bad
 *   compareLabel — e.g. "1h ago" (tooltip text)
 */
export default function DeltaBadge({ pct, direction, inverse = false, compareLabel }) {
  if (pct == null || direction == null) return null;
  const flat = direction === 'flat' || pct === 0;
  const arrow = flat ? '•' : direction === 'up' ? '▲' : '▼';
  let variant = 'neutral';
  if (!flat) {
    const good = inverse ? direction === 'down' : direction === 'up';
    variant = good ? 'success' : 'danger';
  }
  const rounded = Number.isFinite(pct) ? Math.abs(pct).toFixed(Math.abs(pct) >= 10 ? 0 : 1) : '0';
  const badge = html`<${Badge} variant=${variant} size="sm"
    aria-label=${'Delta: ' + arrow + ' ' + rounded + '%' + (compareLabel ? ' vs ' + compareLabel : '')}
  >${arrow} ${rounded}%</${Badge}>`;
  if (compareLabel) {
    return html`<${Tooltip} content=${'vs. ' + compareLabel}>${badge}</${Tooltip}>`;
  }
  return badge;
}
