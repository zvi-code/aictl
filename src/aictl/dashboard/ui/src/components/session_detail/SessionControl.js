import { useState } from 'preact/hooks';
import { html } from 'htm/preact';
import * as api from '../../api.js';

// Inline control to signal a live session's process tree. Two-step confirm so a
// stray click can't tear down a running agent: first click arms, second click
// (within the armed state) actually sends SIGTERM.
export default function SessionControl({sessionId, onKilled}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function doKill() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.killSession(sessionId, 'TERM');
      setResult(r);
      setArmed(false);
      if (onKilled) onKilled(r);
    } catch (e) {
      setError(e.message || 'Failed to signal session');
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return html`<span class="text-xs" style="color:var(--green)" title=${JSON.stringify(result)}>
      Signaled ${result.signaled.length} pid${result.signaled.length === 1 ? '' : 's'}
      ${result.failed.length ? html` \u00b7 ${result.failed.length} failed` : ''}
    </span>`;
  }

  if (!armed) {
    return html`<button class="badge" style="background:transparent;border:1px solid var(--red);color:var(--red);cursor:pointer;font-size:var(--fs-xs)"
      onClick=${() => setArmed(true)} title="Send SIGTERM to this session's process tree">
      Kill
    </button>`;
  }

  return html`<span class="flex-row gap-sm" style="align-items:center">
    <span class="text-xs" style="color:var(--red)">Confirm kill?</span>
    <button class="badge" style="background:var(--red);color:var(--bg);cursor:pointer;font-size:var(--fs-xs)"
      disabled=${busy} onClick=${doKill}>${busy ? '\u2026' : 'Yes, SIGTERM'}</button>
    <button class="badge" style="cursor:pointer;font-size:var(--fs-xs)" onClick=${() => setArmed(false)}>Cancel</button>
    ${error && html`<span class="text-xs" style="color:var(--red)">${error}</span>`}
  </span>`;
}
