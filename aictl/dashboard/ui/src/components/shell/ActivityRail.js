import { html } from 'htm/preact';
import { useState, useEffect, useMemo, useCallback } from 'preact/hooks';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-preact';
import Popover from '../ui/Popover.js';
import Icon from '../ui/Icon.js';

const RAIL_KEY = 'aictl-activity-rail-open';

function loadOpen() {
  try { const v = localStorage.getItem(RAIL_KEY); return v == null ? true : v === '1'; }
  catch { return true; }
}
function persistOpen(v) {
  try { localStorage.setItem(RAIL_KEY, v ? '1' : '0'); } catch { /* noop */ }
}

function toolIconName(tool) {
  const t = String(tool || '').toLowerCase();
  if (t.includes('claude')) return 'brain';
  if (t.includes('copilot')) return 'git-branch';
  if (t.includes('gemini')) return 'activity';
  if (t.includes('codex'))  return 'cpu';
  return 'radio';
}

/** Tiny inline SVG sparkband for token burn rate. `data` = [{ts, v}] or [v,v,v]. */
function Sparkband({ values, color = 'var(--accent)' }) {
  if (!values || values.length < 2) return html`<span class="ar-spark-empty"></span>`;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 40, h = 10;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`).join(' ');
  return html`<svg class="ar-spark" viewBox=${`0 0 ${w} ${h}`} aria-hidden="true" width="40" height="10">
    <polyline fill="none" stroke=${color} stroke-width="1.2" points=${pts}/>
  </svg>`;
}

function activeSessions(snap) {
  if (!snap) return [];
  const out = [];
  for (const t of snap.tools || []) {
    const sessions = (t.live && t.live.sessions) || [];
    for (const s of sessions) {
      if (s.active === false) continue;
      out.push({
        id: s.session_id || s.id || (t.tool + ':' + (s.pid || '?')),
        tool: t.tool,
        label: t.label || t.tool,
        tokens: s.estimated_tokens || s.tokens || 0,
        tokenSeries: s.token_series || s.history || null,
        meta: s,
      });
    }
  }
  return out;
}

/**
 * Click routing: dispatches a DOM CustomEvent `aictl:select-session`
 * (detail = { sessionId, tool }) AND sets the active tab to "sessions"
 * via the provided onSelectSession callback. Tab* components that own
 * selection state can subscribe to the event.
 */
export default function ActivityRail({ snap, onSelectSession }) {
  const [open, setOpen] = useState(loadOpen);
  const toggle = useCallback(() => {
    setOpen(v => { persistOpen(!v); return !v; });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-rail-open', open ? '1' : '0');
  }, [open]);

  const sessions = useMemo(() => activeSessions(snap), [snap]);

  const handleClick = useCallback((s) => {
    try {
      document.dispatchEvent(new CustomEvent('aictl:select-session', {
        detail: { sessionId: s.id, tool: s.tool },
      }));
    } catch { /* noop */ }
    if (onSelectSession) onSelectSession(s.id);
  }, [onSelectSession]);

  return html`<aside class=${'activity-rail' + (open ? '' : ' activity-rail--collapsed')}
    role="complementary" aria-label="Active sessions">
    <div class="ar-head">
      ${open ? html`<span class="ar-title">Active</span>` : null}
    </div>
    <div class="ar-list">
      ${sessions.length === 0
        ? (open ? html`<div class="ar-empty text-muted">No active sessions</div>` : null)
        : sessions.map(s => {
            const row = html`<button type="button" class="ar-row"
              onClick=${() => handleClick(s)}
              aria-label=${'Session ' + s.id + ' (' + s.label + ')'}>
              <span class="ar-icon"><${Icon} name=${toolIconName(s.tool)} size="16"/></span>
              ${open ? html`<span class="ar-body">
                <span class="ar-id">${String(s.id).split(':').slice(-1)[0]}</span>
                <${Sparkband} values=${s.tokenSeries}/>
              </span>` : null}
            </button>`;
            if (!open) return html`<div key=${s.id}>${row}</div>`;
            return html`<${Popover} key=${s.id} placement="right"
              trigger=${row}>
              <div class="ar-pop">
                <div><strong>${s.id}</strong></div>
                <div class="text-muted text-xs">${s.label}</div>
                <div class="text-xs" style="margin-top:var(--sp-2)">
                  Tokens: ${s.tokens || 0}
                </div>
              </div>
            </${Popover}>`;
          })
      }
    </div>
    <button type="button" class="ar-toggle" onClick=${toggle}
      aria-label=${open ? 'Collapse activity rail' : 'Expand activity rail'}
      aria-expanded=${open ? 'true' : 'false'}>
      ${open ? html`<${PanelLeftClose} size="14" aria-hidden="true"/>`
             : html`<${PanelLeftOpen}  size="14" aria-hidden="true"/>`}
    </button>
  </aside>`;
}
