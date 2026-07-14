import { useState, useEffect } from 'preact/hooks';
import { html } from 'htm/preact';
import { fmtHHMMSS } from '../../utils.js';
import * as api from '../../api.js';
import { useAsyncResource } from '../../hooks/useAsyncResource.js';

// Conversation messages merged from OTel prompts and the copilot/cursor/
// vscode chat ingesters (/api/session-messages). Chronological, role-
// differentiated, with per-message expand for full content.

const PREVIEW_CHARS = 240;

const ROLE_COLOR = {
  user: 'var(--accent)',
  assistant: 'var(--green)',
};

export default function ConversationPanel({ sessionId }) {
  const [expanded, setExpanded] = useState({});
  const { data, loading, error } = useAsyncResource(
    () => api.getSessionMessages(sessionId),
    [sessionId],
    { enabled: !!sessionId },
  );

  // Collapse per-message expansion when switching sessions (this used to
  // live inside the fetch effect).
  useEffect(() => { setExpanded({}); }, [sessionId]);

  const messages = Array.isArray(data?.messages) ? data.messages : [];

  if (loading) return html`<p class="loading-state">Loading conversation...</p>`;
  if (error) return html`<p class="error-state">Failed to load conversation${error.message ? ` (${error.message})` : ''}.</p>`;
  if (!messages.length) return html`<p class="empty-state">No conversation captured for this session.</p>`;

  return html`<div class="sd-conversation">
    ${messages.map((m, i) => {
      const role = m.role || 'unknown';
      const roleColor = ROLE_COLOR[role] || 'var(--fg2)';
      const content = String(m.content || '');
      const truncated = content.length > PREVIEW_CHARS;
      // Stable key: refetches keep the same expansion state per message.
      const key = `${m.ts}-${role}-${i}`;
      const isOpen = !!expanded[key];
      return html`<div key=${key} style="padding:var(--sp-2) 0;border-bottom:1px solid var(--bg3)">
        <div class="flex-row gap-sm" style="align-items:center">
          <span class="badge text-xs" style="background:${roleColor};color:var(--bg)">${role}</span>
          <span class="badge--muted badge text-xs" title=${'Captured via ' + (m.source || 'unknown')}>${m.source || '?'}</span>
          <span class="text-xs text-muted mono" style="margin-left:auto">${fmtHHMMSS(m.ts)}</span>
        </div>
        <div class="mono" style="font-size:var(--fs-sm);margin-top:var(--sp-1);white-space:pre-wrap;word-break:break-word">
          ${isOpen || !truncated ? content : content.slice(0, PREVIEW_CHARS) + '…'}
        </div>
        ${truncated && html`<button type="button"
          aria-expanded=${isOpen ? 'true' : 'false'}
          onClick=${() => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))}
          style="background:none;border:none;padding:0;cursor:pointer;color:var(--accent);font-size:var(--fs-xs);font-family:inherit">
          ${isOpen ? 'Show less' : `Show all ${content.length} chars`}
        </button>`}
      </div>`;
    })}
  </div>`;
}
