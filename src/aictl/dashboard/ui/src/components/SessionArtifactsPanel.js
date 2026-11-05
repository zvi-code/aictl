import { html } from 'htm/preact';
import { useState } from 'preact/hooks';
import { fetchJson } from '../api.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';

const fmtBytes = (n) => {
  if (n === null || n === undefined) return 'n/a';
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
};

const fmtTime = (ts) => (ts ? new Date(ts * 1000).toLocaleString() : 'n/a');

const isNotFound = (error) => error && (error.status === 404 || /\b404\b/.test(error.message || ''));

const PATH_STYLE = 'white-space:pre-wrap;overflow-wrap:anywhere';

function ArtifactBody({ sessionId, artifact }) {
  const { data, loading, error } = useAsyncResource(
    () => fetchJson(`/api/copilot-sessions/${encodeURIComponent(sessionId)}/artifact?path=${encodeURIComponent(artifact.path)}`),
    [sessionId, artifact.path],
  );
  if (loading) return html`<div class="text-xs text-muted loading-state" style="padding:0">Loading file…</div>`;
  if (error) return html`<div class="error-state text-xs" style="padding:0">Could not read this file${error.message ? ` (${error.message})` : ''}.</div>`;
  if (data.binary) return html`<div class="text-xs text-muted">Binary file, ${fmtBytes(data.size)}. Not shown.</div>`;
  return html`<div>
    ${data.truncated && html`<div class="text-xs text-muted">First part of ${fmtBytes(data.size)} shown.</div>`}
    <pre class="mono text-xs" style="max-height:320px;overflow:auto;background:var(--bg3);padding:var(--sp-2);${PATH_STYLE}">${data.content}</pre>
  </div>`;
}

function ArtifactRow({ sessionId, artifact }) {
  const [open, setOpen] = useState(false);
  const canOpen = artifact.readable && artifact.path;
  return html`<li style="padding:var(--sp-1) 0;border-bottom:1px solid var(--border-subtle)">
    <div class="text-xs" style="display:flex;gap:var(--sp-2);flex-wrap:wrap;align-items:baseline">
      <span class="text-muted">${artifact.type}</span>
      ${canOpen
        ? html`<button type="button" class="mono text-xs" aria-expanded=${open} style="background:none;border:none;color:var(--accent);cursor:pointer;padding:0;text-align:left;${PATH_STYLE}" onClick=${() => setOpen(!open)}>${artifact.name}</button>`
        : html`<span class="mono" style=${PATH_STYLE}>${artifact.name}</span>`}
      <span class="text-muted">${fmtBytes(artifact.size)}</span>
      <span class="text-muted">${fmtTime(artifact.modified_at)}</span>
      ${artifact.checkpoint !== undefined && html`<span class="text-muted">checkpoint ${artifact.checkpoint}</span>`}
    </div>
    ${open && html`<${ArtifactBody} sessionId=${sessionId} artifact=${artifact}/>`}
  </li>`;
}

/** Folder and files of one Copilot session, from /api/copilot-sessions. */
export default function SessionArtifactsPanel({ sessionId }) {
  const { data, loading, error } = useAsyncResource(
    () => fetchJson(`/api/copilot-sessions/${encodeURIComponent(sessionId)}/artifacts`),
    [sessionId],
    { enabled: !!sessionId },
  );
  if (loading) return html`<div class="text-xs text-muted loading-state" style="padding:0">Loading session files…</div>`;
  if (isNotFound(error)) return html`<div class="text-xs text-muted">No session folder found for ${sessionId}.</div>`;
  if (error) return html`<div class="error-state text-xs" style="padding:0">Failed to load session files${error.message ? ` (${error.message})` : ''}.</div>`;
  const artifacts = (data && Array.isArray(data.artifacts)) ? data.artifacts : [];
  return html`<div>
    <div class="mono text-xs" style=${PATH_STYLE} title="Session folder">${data && data.folder ? data.folder : 'No folder on disk'}</div>
    ${artifacts.length === 0
      ? html`<div class="text-xs text-muted">No files in this session.</div>`
      : html`<ul style="list-style:none;margin:var(--sp-2) 0 0;padding:0">
          ${artifacts.map(a => html`<${ArtifactRow} key=${a.name} sessionId=${sessionId} artifact=${a}/>`)}
        </ul>`}
  </div>`;
}
