import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { html } from 'htm/preact';
import { getDatapoints } from '../api.js';

// Module-level cache — shared across mounts, fetched once per page load.
let _catalog = null;

function fetchCatalog() {
  if (_catalog) return Promise.resolve(_catalog);
  return getDatapoints()
    .then(rows => {
      const map = {};
      for (const r of (rows || [])) {
        map[r.key] = r;
      }
      _catalog = map;
      return map;
    })
    .catch(() => ({}));
}

function firstSentence(text) {
  if (!text) return '';
  const s = text.replace(/\s+/g, ' ').trim();
  const m = s.match(/^[^.!?]+[.!?]/);
  return m ? m[0].trim() : s.slice(0, 120);
}

const UNIT_LABELS = {
  tokens: 'tokens', bytes: 'bytes', percent: '%', count: 'count',
  rate_bps: 'bytes/s', usd: 'USD', seconds: 'sec', ratio: 'ratio',
};

const SOURCE_BADGES = {
  raw: 'raw', deduced: 'deduced', aggregated: 'agg',
};

export default function DatapointTooltip() {
  const [entry, setEntry] = useState(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [expanded, setExpanded] = useState(false);
  const tipRef = useRef(null);
  const hideTimer = useRef(null);

  const show = useCallback((el) => {
    const key = el.getAttribute('data-dp');
    if (!key) return;
    fetchCatalog().then(cat => {
      const e = cat[key];
      if (!e) return;
      const rect = el.getBoundingClientRect();
      setPos({ x: rect.left, y: rect.bottom + 4 });
      setEntry(e);
      setExpanded(false);
    });
  }, []);

  const hide = useCallback(() => {
    hideTimer.current = setTimeout(() => {
      setEntry(null);
      setExpanded(false);
    }, 120);
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
  }, []);

  useEffect(() => {
    function onOver(e) {
      const el = e.target.closest('[data-dp]');
      if (el) { cancelHide(); show(el); }
    }
    function onOut(e) {
      const el = e.target.closest('[data-dp]');
      if (el) hide();
    }
    function onClick(e) {
      const el = e.target.closest('[data-dp]');
      if (el && entry) {
        e.preventDefault();
        setExpanded(v => !v);
      }
    }
    document.addEventListener('mouseover', onOver, true);
    document.addEventListener('mouseout', onOut, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('mouseover', onOver, true);
      document.removeEventListener('mouseout', onOut, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [show, hide, cancelHide, entry]);

  if (!entry) return null;

  // Clamp position to viewport
  const tipW = 320;
  const x = Math.min(pos.x, window.innerWidth - tipW - 8);
  const y = Math.min(pos.y, window.innerHeight - 180);

  const badge = SOURCE_BADGES[entry.source_type] || entry.source_type;
  const unit = UNIT_LABELS[entry.unit] || entry.unit;

  return html`<div class="dp-tooltip" ref=${tipRef}
    style=${'left:'+x+'px;top:'+y+'px'}
    onMouseEnter=${cancelHide} onMouseLeave=${hide}>
    <div class="dp-tooltip-head">
      <span class="dp-tooltip-key">${entry.key}</span>
      <span class="dp-tooltip-badge dp-badge-${entry.source_type}">${badge}</span>
      ${unit && html`<span class="dp-tooltip-unit">${unit}</span>`}
    </div>
    <div class="dp-tooltip-body">${firstSentence(entry.explanation)}</div>
    ${expanded && html`<div class="dp-tooltip-detail">
      <div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">Source</div>
        <div>${entry.source_static || entry.source || '—'}</div>
      </div>
      ${entry.source_dynamic && html`<div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">Live provenance</div>
        <div>${typeof entry.source_dynamic === 'string' ? entry.source_dynamic : JSON.stringify(entry.source_dynamic)}</div>
      </div>`}
      ${entry.query && html`<div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">Query</div>
        <code class="dp-tooltip-code">${entry.query}</code>
      </div>`}
      ${entry.otel_metric && html`<div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">OTel metric</div>
        <code>${entry.otel_metric}</code>
      </div>`}
    </div>`}
    ${!expanded && html`<div class="dp-tooltip-hint">click for details</div>`}
  </div>`;
}
