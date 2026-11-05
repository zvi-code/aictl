// ─── Cost display ──────────────────────────────────────────────
// cost_usd may be null: no price is known, which is different from $0. Billing
// units (credits, premium requests) are what the vendor counts, so they lead;
// list-price figures are estimates and say so.
import { html } from 'htm/preact';

export const NO_COST_REASON = 'No price is known for this usage.';

export function fmtUsd(n, digits = 2) {
  return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtAmount(n) {
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** `ai_credits` -> `AI credits`, `premium_requests` -> `premium requests`. */
export function billingUnitLabel(unit) {
  return String(unit || '').replace(/_/g, ' ').replace(/^ai\b/i, 'AI');
}

/**
 * The figure for a usage row, session row or telemetry row.
 * @returns {{main: string, sub: string, title: string, kind: 'billing'|'estimate'|'none'}}
 */
export function costFigure(row, digits = 2) {
  const reason = row?.cost_reason || '';
  if (row?.billing_unit && row.billing_amount !== null && row.billing_amount !== undefined) {
    const parts = [];
    if (row.premium_requests) parts.push(fmtAmount(row.premium_requests) + ' premium requests');
    if (row.estimated_list_usd !== null && row.estimated_list_usd !== undefined) {
      parts.push('est. ' + fmtUsd(row.estimated_list_usd, digits) + ' at list price');
    }
    return {
      main: fmtAmount(row.billing_amount) + ' ' + billingUnitLabel(row.billing_unit),
      sub: parts.join(', '), title: reason, kind: 'billing',
    };
  }
  if (row?.cost_usd === null || row?.cost_usd === undefined) {
    return { main: 'n/a', sub: '', title: reason || NO_COST_REASON, kind: 'none' };
  }
  return {
    main: fmtUsd(row.cost_usd, digits), sub: 'est.',
    title: reason || 'Estimated from token counts and list prices. Not a billed amount.',
    kind: 'estimate',
  };
}

/** Inline figure with its reason on hover. Never renders an unknown as $0. */
export function CostValue({ row, digits = 2, showSub = true }) {
  const f = costFigure(row, digits);
  return html`<span class=${'cost-value cost-value--' + f.kind} title=${f.title}>${f.main}${showSub && f.sub
    ? html` <small class="cost-value__sub">${f.sub}</small>` : null}</span>`;
}

/** Scope /api/usage to the tool filter and split what is billed from what is estimated. */
export function summarizeUsage(usage, enabledTools) {
  const rows = (usage?.tools || [])
    .filter(r => enabledTools === null || enabledTools === undefined || enabledTools.includes(r.tool))
    .filter(r => r.counted_in_totals !== false);
  const billed = new Map();
  let premium = 0;
  let listUsd = null;
  let unpriced = 0;
  const notes = new Set();
  for (const r of rows) {
    if (r.billing_unit && r.billing_amount !== null && r.billing_amount !== undefined) {
      billed.set(r.billing_unit, (billed.get(r.billing_unit) || 0) + r.billing_amount);
      premium += r.premium_requests || 0;
      continue;
    }
    if (r.cost_usd === null || r.cost_usd === undefined) {
      unpriced += 1;
      if (r.cost_reason) notes.add(r.cost_reason);
      continue;
    }
    listUsd = (listUsd || 0) + r.cost_usd;
  }
  return {
    rows: rows.slice().sort((a, b) => (b.total_tokens || 0) - (a.total_tokens || 0)),
    billed: [...billed.entries()].map(([unit, amount]) => ({ unit, amount })),
    premium,
    listUsd,
    unpriced,
    unpricedReason: [...notes].join(' '),
    tokens: rows.reduce((n, r) => n + (r.total_tokens || 0), 0),
    sessions: rows.reduce((n, r) => n + (r.sessions || 0), 0),
  };
}

/** Sum of known costs; null when nothing is known, so a total can't read as $0. */
export function sumKnownCost(rows) {
  const known = (rows || []).filter(r => r.cost_usd !== null && r.cost_usd !== undefined);
  if (!known.length) return { cost_usd: null, cost_reason: rows?.find(r => r.cost_reason)?.cost_reason };
  const missing = (rows.length - known.length);
  return {
    cost_usd: known.reduce((n, r) => n + r.cost_usd, 0),
    cost_reason: missing ? `${missing} of ${rows.length} rows have no known price and are not included.` : '',
  };
}
