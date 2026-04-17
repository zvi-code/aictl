// RunTrendStrip — compares the current session to the last N prior runs
// for the same (project, tool). Shows deltas vs the median of up to 5
// prior runs, with neutral/up/down markers. Empty state when <2 prior runs.

import { useEffect, useState } from 'preact/hooks';
import { html } from 'htm/preact';
import * as api from '../../api.js';
import { fmtK } from '../../utils.js';
import { fmtDur } from './helpers.js';

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Returns {dir: 'up'|'down'|'flat', pct: number}.
// Lower-is-better metrics (duration, tokens, file_churn): 'up' = regression (red),
// 'down' = improvement (green). Flat when |delta| < 5%.
function deltaMarker(current, med) {
  if (!med || med <= 0) return { dir: 'flat', pct: 0 };
  const pct = (current - med) / med;
  if (Math.abs(pct) < 0.05) return { dir: 'flat', pct };
  return { dir: pct > 0 ? 'up' : 'down', pct };
}

function Metric({ label, value, formatted, med, fmt }) {
  const m = deltaMarker(value, med);
  // For duration/tokens/churn, higher = worse → red up-arrow, green down-arrow.
  const color =
    m.dir === 'flat' ? 'var(--fg2)'
    : m.dir === 'up' ? 'var(--red)'
    : 'var(--green)';
  const arrow = m.dir === 'flat' ? '·' : m.dir === 'up' ? '↑' : '↓';
  const pctLabel = m.dir === 'flat'
    ? '~'
    : (m.pct > 0 ? '+' : '') + Math.round(m.pct * 100) + '%';
  const medLabel = med > 0 ? ' · median ' + fmt(med) : '';
  return html`<div class="run-trend-metric"
      title=${label + ': current ' + fmt(value) + medLabel}>
    <span class="run-trend-label">${label}</span>
    <span class="run-trend-value">${formatted}</span>
    <span class="run-trend-delta" style="color:${color}"
        data-dir=${m.dir}
        aria-label=${label + ' ' + (m.dir === 'flat' ? 'unchanged' : m.dir === 'up' ? 'up' : 'down') + ' ' + pctLabel}>
      ${arrow} ${pctLabel}
    </span>
  </div>`;
}

export default function RunTrendStrip({
  sessionId,
  project,
  tool,
  currentDurationS = 0,
  currentTokens = 0,
  currentFileChurn = 0,
}) {
  const [runs, setRuns] = useState(null);

  useEffect(() => {
    if (!project || !tool) {
      setRuns(null);
      return;
    }
    let cancelled = false;
    api.getSessionRuns(project, tool, 30, 20)
      .then(data => { if (!cancelled) setRuns(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setRuns([]); });
    return () => { cancelled = true; };
  }, [project, tool]);

  if (!project || !tool) return null;
  if (runs === null) return null;

  // Exclude the current session and take the most recent 5 prior runs.
  const prior = runs.filter(r => r.session_id !== sessionId).slice(0, 5);

  if (prior.length < 2) {
    return html`<div class="run-trend-strip run-trend-empty"
        role="group" aria-label="Run trend (not enough history)">
      <span class="run-trend-label">Run trend</span>
      <span class="run-trend-empty-msg">Not enough prior runs for comparison (need ≥2).</span>
    </div>`;
  }

  const medDur = median(prior.map(r => r.duration_s || 0));
  const medTok = median(prior.map(r => r.total_tokens || 0));
  const medChurn = median(prior.map(r => r.file_churn || 0));

  return html`<div class="run-trend-strip"
      role="group"
      aria-label="Run trend vs last ${prior.length} runs">
    <span class="run-trend-header" title="Compared against median of last ${prior.length} runs">
      vs last ${prior.length} runs
    </span>
    <${Metric} label="Duration" value=${currentDurationS}
      formatted=${fmtDur(currentDurationS)} med=${medDur} fmt=${fmtDur}/>
    <${Metric} label="Tokens" value=${currentTokens}
      formatted=${fmtK(currentTokens) + 't'} med=${medTok}
      fmt=${v => fmtK(v) + 't'}/>
    <${Metric} label="Files" value=${currentFileChurn}
      formatted=${String(currentFileChurn)} med=${medChurn}
      fmt=${v => String(Math.round(v))}/>
  </div>`;
}
